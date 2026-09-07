/**
 * GenerationController
 * Production-grade background job engine for email variant generation.
 * Coordinates Web Worker execution, batch persistence to IndexedDB,
 * persistent Job records, checkpointing, telemetry metrics, state machine transitions,
 * and throttled UI subscriptions for lag-free performance.
 */

import { db } from '../database/db';
import { GmailDotVariantGenerator } from './GmailDotVariantGenerator';
import { GenerationCheckpoint, GenerationState, GeneratorProgress, PersistentJob, JobStatus } from '../types';
import { WorkerMessageIn, WorkerMessageOut } from '../workers/generator.worker';

export type ProgressCallback = (progress: GeneratorProgress) => void;
export type CompleteCallback = (total: number) => void;

export interface StartGenerationOptions {
  workspaceId: string;
  username: string;
  domain?: string;
  baseEmail?: string;
  startIndex?: bigint | number | string;
  batchSize?: number;
  checkpointFrequency?: number;
  jobId?: string;
  jobName?: string;
}

export class GenerationController {
  private worker: Worker | null = null;
  private gmailGenerator = new GmailDotVariantGenerator();

  private state: GenerationState = 'idle';
  private isPaused = false;
  private isCancelled = false;
  private isRunning = false;

  private currentJobId: string = '';
  private currentJobName: string = '';
  private currentWorkspaceId: string = '';
  private baseEmail: string = '';
  private username: string = '';
  private domain: string = 'gmail.com';

  private totalCombinations: bigint = 0n;
  private generatedCount: number = 0;
  private persistedCount: number = 0;
  private processedCount: number = 0;
  private errorCount: number = 0;
  private errorMessage?: string;
  private currentCombinationIndex: bigint = 0n;

  private currentBatch: number = 0;
  private totalBatches: number = 0;
  private batchSize: number = 5000;

  private startTime: number = 0;
  private completionTime?: number;
  private pausedTimeAccumulator: number = 0;
  private lastPauseTimestamp: number = 0;

  private subscribers: Set<ProgressCallback> = new Set();
  private completeSubscribers: Set<CompleteCallback> = new Set();
  private isPersisting: boolean = false;

  // Throttled notification timer to prevent React render saturation
  private notifyThrottleTimeout: any = null;
  private lastNotifyTime: number = 0;
  private readonly NOTIFY_THROTTLE_MS = 120; // Max ~8 UI renders per second during heavy batch ingestion

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      if (typeof Worker !== 'undefined') {
        if (this.worker) {
          try {
            this.worker.terminate();
          } catch {
            // ignore
          }
          this.worker = null;
        }

        this.worker = new Worker(
          new URL('../workers/generator.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = async (e: MessageEvent<WorkerMessageOut>) => {
          await this.handleWorkerMessage(e.data);
        };

        this.worker.onerror = (err) => {
          console.warn('Worker error event triggered:', err);
          if (this.isRunning && this.state !== 'completed') {
            this.errorCount++;
            this.errorMessage = 'Background worker encountered an issue; falling back to in-thread generation.';
            this.notifyImmediate();
            // Seamless fallback to in-thread generation from current progress
            this.runInThreadGeneration(
              this.currentWorkspaceId,
              this.username,
              this.domain,
              this.currentCombinationIndex,
              this.batchSize
            );
          }
        };
      }
    } catch (e) {
      console.warn('Web Worker creation failed; in-thread generator enabled', e);
      this.worker = null;
    }
  }

  subscribe(callback: ProgressCallback): () => void {
    this.subscribers.add(callback);
    callback(this.getProgress());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  onProgress(callback: ProgressCallback): () => void {
    return this.subscribe(callback);
  }

  onComplete(callback: CompleteCallback): () => void {
    this.completeSubscribers.add(callback);
    return () => {
      this.completeSubscribers.delete(callback);
    };
  }

  /**
   * Throttled UI notification: prevents React re-render lag during heavy background generation
   */
  private notify() {
    const now = Date.now();
    if (now - this.lastNotifyTime >= this.NOTIFY_THROTTLE_MS) {
      this.lastNotifyTime = now;
      if (this.notifyThrottleTimeout) {
        clearTimeout(this.notifyThrottleTimeout);
        this.notifyThrottleTimeout = null;
      }
      this.notifyImmediate();
    } else if (!this.notifyThrottleTimeout) {
      this.notifyThrottleTimeout = setTimeout(() => {
        this.lastNotifyTime = Date.now();
        this.notifyThrottleTimeout = null;
        this.notifyImmediate();
      }, this.NOTIFY_THROTTLE_MS - (now - this.lastNotifyTime));
    }
  }

  /**
   * Immediate notification for state transitions (starting, pause, resume, complete, cancel, error)
   */
  private notifyImmediate() {
    const p = this.getProgress();
    for (const sub of this.subscribers) {
      try {
        sub(p);
      } catch (err) {
        console.error('Progress subscriber error:', err);
      }
    }
  }

  private notifyComplete(total: number) {
    for (const sub of this.completeSubscribers) {
      try {
        sub(total);
      } catch (err) {
        console.error('Complete subscriber error:', err);
      }
    }
  }

  getState(): GenerationState {
    return this.state;
  }

  getJobId(): string {
    return this.currentJobId;
  }

  getJobName(): string {
    return this.currentJobName;
  }

  getProgress(): GeneratorProgress {
    const isNowRunning = this.state === 'running' || this.state === 'starting';
    const isCompleted = this.state === 'completed';

    let elapsed = 0;
    if (this.startTime > 0) {
      if (this.completionTime) {
        elapsed = this.completionTime - this.startTime - this.pausedTimeAccumulator;
      } else if (this.isPaused && this.lastPauseTimestamp > 0) {
        elapsed = this.lastPauseTimestamp - this.startTime - this.pausedTimeAccumulator;
      } else if (isNowRunning) {
        elapsed = Date.now() - this.startTime - this.pausedTimeAccumulator;
      }
    }
    elapsed = Math.max(0, elapsed);

    const elapsedSeconds = elapsed > 0 ? elapsed / 1000 : 0;
    const rate =
      elapsedSeconds > 0.2 ? Math.round(this.persistedCount / elapsedSeconds) : 0;

    const remaining =
      this.totalCombinations > BigInt(this.persistedCount)
        ? this.totalCombinations - BigInt(this.persistedCount)
        : 0n;

    const percentage =
      this.totalCombinations > 0n
        ? Math.min(
            100,
            Number((BigInt(this.persistedCount) * 10000n) / this.totalCombinations) / 100
          )
        : 0;

    const estimatedRemainingSeconds =
      rate > 0 && remaining > 0n ? Math.max(0, Math.ceil(Number(remaining) / rate)) : 0;

    return {
      state: this.state,
      workspaceId: this.currentWorkspaceId,
      baseEmail: this.baseEmail,
      username: this.username,
      domain: this.domain,
      totalCombinations: this.totalCombinations,
      generatedCount: this.generatedCount,
      persistedCount: this.persistedCount,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      errorMessage: this.errorMessage,
      remaining,
      percentage: isCompleted ? 100 : percentage,
      currentBatch: this.currentBatch,
      totalBatches: this.totalBatches,
      batchSize: this.batchSize,
      ratePerSecond: rate,
      elapsedMs: elapsed,
      estimatedRemainingSeconds,
      startTime: this.startTime,
      completionTime: this.completionTime,
      isPaused: this.isPaused,
      isCancelled: this.isCancelled,
      isComplete: isCompleted,
      currentCombinationIndex: this.currentCombinationIndex,
    };
  }

  /**
   * Persists the current job status to IndexedDB for cross-session survival
   */
  private async persistJobState(statusOverride?: JobStatus) {
    if (!this.currentJobId || !this.currentWorkspaceId) return;

    const prog = this.getProgress();
    const status: JobStatus = statusOverride || (this.state === 'running' || this.state === 'starting'
      ? 'Running'
      : this.state === 'paused'
      ? 'Paused'
      : this.state === 'completed'
      ? 'Completed'
      : this.state === 'cancelled'
      ? 'Cancelled'
      : this.state === 'failed'
      ? 'Failed'
      : this.state === 'recovering'
      ? 'Recovering'
      : 'Pending');

    const totalTarget = Number(this.totalCombinations);
    const processed = this.persistedCount;
    const now = Date.now();

    const jobRecord: PersistentJob = {
      // Canonical fields
      jobId: this.currentJobId,
      type: 'variant_generation',
      status,
      createdAt: this.startTime || now,
      startedAt: this.startTime || now,
      updatedAt: now,
      completedAt: status === 'Completed' ? this.completionTime || now : undefined,
      progress: prog.percentage,
      total: totalTarget,
      processed,
      failed: this.errorCount,
      error: this.errorMessage,
      metadata: {
        username: this.username,
        domain: this.domain,
        baseEmail: this.baseEmail,
        startIndex: this.currentCombinationIndex.toString(),
        batchSize: this.batchSize,
      },
      // Backward compatibility aliases
      id: this.currentJobId,
      workspaceId: this.currentWorkspaceId,
      name: this.currentJobName || `Dot Generation (${this.baseEmail})`,
      totalTarget,
      generatedCount: this.generatedCount,
      persistedCount: this.persistedCount,
      remainingCount: Number(prog.remaining),
      progressPercent: prog.percentage,
      ratePerSecond: prog.ratePerSecond,
      elapsedMs: prog.elapsedMs,
      estimatedRemainingSeconds: prog.estimatedRemainingSeconds,
      startTime: this.startTime,
      lastUpdated: now,
      completionTime: this.completionTime,
      config: {
        username: this.username,
        domain: this.domain,
        baseEmail: this.baseEmail,
        startIndex: this.currentCombinationIndex.toString(),
        batchSize: this.batchSize,
      },
    };

    try {
      await db.saveJob(jobRecord);
    } catch (e) {
      console.warn('Failed to persist job record to IndexedDB:', e);
    }
  }

  /**
   * Reconnects to any active or interrupted job on application launch or page refresh
   */
  async reconnectActiveJob(workspaceId?: string): Promise<boolean> {
    try {
      // 1. Check for active job in IndexedDB
      const activeJob = await db.getActiveJob(workspaceId);
      if (activeJob) {
        console.log('Found active persistent job:', activeJob.jobId || activeJob.id);
        this.currentJobId = activeJob.jobId || activeJob.id;
        this.currentJobName = activeJob.name;
        this.currentWorkspaceId = activeJob.workspaceId || workspaceId || '';
        this.username = activeJob.config?.username || activeJob.metadata?.username || '';
        this.domain = activeJob.config?.domain || activeJob.metadata?.domain || 'gmail.com';
        this.baseEmail = activeJob.config?.baseEmail || activeJob.metadata?.baseEmail || `${this.username}@${this.domain}`;
        this.totalCombinations = BigInt(activeJob.total || activeJob.totalTarget || 0);
        this.batchSize = activeJob.config?.batchSize || activeJob.metadata?.batchSize || 5000;
        this.persistedCount = activeJob.processed || activeJob.persistedCount || 0;
        this.generatedCount = activeJob.generatedCount || this.persistedCount;
        this.startTime = activeJob.startedAt || activeJob.startTime || Date.now();
        this.currentCombinationIndex = BigInt(activeJob.config?.startIndex || activeJob.processed || activeJob.persistedCount || '0');

        // Check if there is a more advanced checkpoint
        if (this.currentWorkspaceId) {
          const cp = await db.getCheckpoint(this.currentWorkspaceId);
          if (cp && !cp.isComplete) {
            const cpIndex = BigInt(cp.currentCombination || '0');
            if (cpIndex > this.currentCombinationIndex) {
              this.currentCombinationIndex = cpIndex;
              this.persistedCount = cp.generatedCount;
              this.generatedCount = cp.generatedCount;
            }
          }
        }

        const statusStr = (activeJob.status || '').toLowerCase();
        if (statusStr === 'paused') {
          this.state = 'paused';
          this.isPaused = true;
          this.isRunning = true;
          this.notifyImmediate();
          return true;
        }

        // If job was running or recovering, resume generation seamlessly from the checkpoint index (NEVER start from 0)
        if (statusStr === 'running' || statusStr === 'pending' || statusStr === 'recovering') {
          this.state = 'recovering';
          this.notifyImmediate();

          await this.startGeneration(
            this.currentWorkspaceId,
            this.username,
            this.domain,
            this.currentCombinationIndex,
            this.batchSize,
            this.currentJobId,
            this.currentJobName
          );
          return true;
        }
      }

      // 2. Check for leftover incomplete generation checkpoint
      if (workspaceId) {
        const cp = await db.getCheckpoint(workspaceId);
        if (cp && !cp.isComplete && Number(cp.totalEstimated) > cp.generatedCount) {
          console.log('Found incomplete generation checkpoint for workspace:', workspaceId);
          const startIndex = BigInt(cp.currentCombination || cp.generatedCount.toString());
          const cleanUsername = cp.username || cp.baseEmail.split('@')[0];
          const domain = cp.baseEmail.split('@')[1] || 'gmail.com';

          await this.startGeneration(
            workspaceId,
            cleanUsername,
            domain,
            startIndex,
            this.batchSize
          );
          return true;
        }
      }

      return false;
    } catch (err) {
      console.warn('Error during active job reconnection:', err);
      return false;
    }
  }

  async start(options: StartGenerationOptions) {
    const startIndex =
      options.startIndex !== undefined ? BigInt(options.startIndex.toString()) : 0n;
    const batchSize = options.batchSize ?? 5000;
    const domain =
      options.domain ||
      (options.baseEmail ? options.baseEmail.split('@')[1] : 'gmail.com') ||
      'gmail.com';
    return this.startGeneration(
      options.workspaceId,
      options.username,
      domain,
      startIndex,
      batchSize,
      options.jobId,
      options.jobName
    );
  }

  async startGeneration(
    workspaceId: string,
    username: string,
    domain: string = 'gmail.com',
    startIndex: bigint = 0n,
    batchSize: number = 5000,
    jobId?: string,
    jobName?: string
  ) {
    // If already running the exact same job, attach rather than duplicating
    if (this.isRunning && this.state === 'running' && this.currentWorkspaceId === workspaceId) {
      console.log('Already running generation for workspace, attaching...');
      this.notifyImmediate();
      return;
    }

    const cleanUsername = username.replace(/\./g, '').trim();
    if (!cleanUsername) return;

    this.currentWorkspaceId = workspaceId;
    this.username = cleanUsername;
    this.domain = domain;
    this.baseEmail = `${cleanUsername}@${domain}`;
    this.totalCombinations = this.gmailGenerator.estimate(cleanUsername, domain);
    this.batchSize = Math.max(100, Math.min(25000, batchSize));

    this.currentJobId = jobId || `job_gen_${workspaceId}_${Date.now()}`;
    this.currentJobName = jobName || `Generate ${Number(this.totalCombinations).toLocaleString()} Dot Variants (${this.baseEmail})`;

    const totalCombosNum = Number(this.totalCombinations);
    this.totalBatches = Math.ceil(totalCombosNum / this.batchSize);
    this.currentBatch = Math.floor(Number(startIndex) / this.batchSize);

    this.currentCombinationIndex = startIndex;
    this.generatedCount = Number(startIndex);
    this.persistedCount = Number(startIndex);
    this.processedCount = Number(startIndex);
    this.errorCount = 0;
    this.errorMessage = undefined;

    this.startTime = this.startTime > 0 ? this.startTime : Date.now();
    this.completionTime = undefined;
    this.pausedTimeAccumulator = 0;
    this.lastPauseTimestamp = 0;

    this.isPaused = false;
    this.isCancelled = false;
    this.isRunning = true;
    this.state = 'starting';

    this.notifyImmediate();
    await this.persistJobState('running');

    // Re-initialize worker if needed
    if (!this.worker) {
      this.initWorker();
    }

    if (this.worker) {
      this.worker.postMessage({
        action: 'START',
        workspaceId,
        username: cleanUsername,
        domain,
        startIndex: startIndex.toString(),
        batchSize: this.batchSize,
      } as WorkerMessageIn);
    } else {
      this.runInThreadGeneration(
        workspaceId,
        cleanUsername,
        domain,
        startIndex,
        this.batchSize
      );
    }
  }

  private async handleWorkerMessage(data: WorkerMessageOut) {
    if (data.workspaceId !== this.currentWorkspaceId && this.currentWorkspaceId !== '') {
      return;
    }

    if (data.type === 'STARTED') {
      this.state = 'running';
      this.totalBatches = data.totalBatches || this.totalBatches;
      this.notifyImmediate();
      await this.persistJobState('running');
      return;
    }

    if (data.type === 'CHUNK' && data.variants) {
      if (this.isCancelled) return;

      this.state = 'running';
      this.generatedCount = data.generatedCount;
      this.currentCombinationIndex = BigInt(data.currentCombination);
      this.currentBatch = data.currentBatch;
      this.totalBatches = data.totalBatches || this.totalBatches;

      try {
        this.isPersisting = true;
        // Batch write to IndexedDB
        await db.bulkInsertVariants(data.variants);
        this.persistedCount += data.variants.length;
        this.processedCount += data.variants.length;

        // Checkpoint & Persistent Job State every batch
        if (this.currentWorkspaceId) {
          const cp: GenerationCheckpoint = {
            workspaceId: this.currentWorkspaceId,
            baseEmail: this.baseEmail,
            username: this.username,
            currentCombination: this.currentCombinationIndex.toString(),
            generatedCount: this.persistedCount,
            totalEstimated: this.totalCombinations.toString(),
            timestamp: Date.now(),
            isComplete: data.isComplete || this.persistedCount >= Number(this.totalCombinations),
          };
          await db.saveCheckpoint(cp);
          await this.persistJobState('running');
        }
      } catch (err: any) {
        console.error('Error persisting variant batch to IndexedDB:', err);
        this.errorCount++;
        this.errorMessage = err.message || 'Database write error';
      } finally {
        this.isPersisting = false;
      }

      // Smooth throttled UI notification
      this.notify();

      // Backpressure acknowledgement: request the next chunk if not paused/cancelled/complete
      if (!this.isPaused && !this.isCancelled && !data.isComplete && this.worker) {
        this.worker.postMessage({ action: 'NEXT' } as WorkerMessageIn);
      }
      return;
    }

    if (data.type === 'COMPLETE') {
      this.state = 'completed';
      this.isRunning = false;
      this.isPaused = false;
      this.completionTime = Date.now();
      this.persistedCount = Number(this.totalCombinations);
      this.generatedCount = Number(this.totalCombinations);
      this.processedCount = Number(this.totalCombinations);
      this.currentBatch = this.totalBatches;

      try {
        await db.deleteCheckpoint(this.currentWorkspaceId);
        await this.persistJobState('completed');
        await db.addLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: this.currentWorkspaceId,
          type: 'generate',
          details: `Successfully generated all ${this.persistedCount.toLocaleString()} email variants for ${this.baseEmail}`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('Logging error on complete:', err);
      }

      this.notifyImmediate();
      this.notifyComplete(this.persistedCount);
      return;
    }

    if (data.type === 'PAUSED') {
      this.state = 'paused';
      this.isPaused = true;
      if (this.lastPauseTimestamp === 0) {
        this.lastPauseTimestamp = Date.now();
      }
      this.notifyImmediate();
      await this.persistJobState('paused');
      return;
    }

    if (data.type === 'RESUMED') {
      this.state = 'running';
      this.isPaused = false;
      if (this.lastPauseTimestamp > 0) {
        this.pausedTimeAccumulator += Date.now() - this.lastPauseTimestamp;
        this.lastPauseTimestamp = 0;
      }
      this.notifyImmediate();
      await this.persistJobState('running');
      return;
    }

    if (data.type === 'CANCELLED') {
      this.state = 'cancelled';
      this.isCancelled = true;
      this.isRunning = false;
      this.isPaused = false;
      this.notifyImmediate();
      await this.persistJobState('cancelled');
      return;
    }

    if (data.type === 'ERROR') {
      this.state = 'failed';
      this.isRunning = false;
      this.errorCount++;
      this.errorMessage = data.error || 'Generation worker error occurred';
      this.notifyImmediate();
      await this.persistJobState('failed');
      return;
    }
  }

  private async runInThreadGeneration(
    workspaceId: string,
    username: string,
    domain: string,
    startIndex: bigint,
    batchSize: number
  ) {
    let index = startIndex;
    const total = this.totalCombinations;
    this.state = 'running';
    await this.persistJobState('running');

    while (index < total && !this.isCancelled && this.isRunning) {
      if (this.isPaused) {
        await new Promise((res) => setTimeout(res, 150));
        continue;
      }

      const chunkCount = Math.min(batchSize, Number(total - index));
      const variants = this.gmailGenerator.generateChunk(
        workspaceId,
        username,
        domain,
        index,
        chunkCount
      );

      index += BigInt(variants.length);
      this.generatedCount = Number(index);
      this.currentCombinationIndex = index;
      this.currentBatch++;

      try {
        await db.bulkInsertVariants(variants);
        this.persistedCount += variants.length;
        this.processedCount += variants.length;

        const cp: GenerationCheckpoint = {
          workspaceId,
          baseEmail: this.baseEmail,
          username: this.username,
          currentCombination: this.currentCombinationIndex.toString(),
          generatedCount: this.persistedCount,
          totalEstimated: this.totalCombinations.toString(),
          timestamp: Date.now(),
          isComplete: this.persistedCount >= Number(this.totalCombinations),
        };
        await db.saveCheckpoint(cp);
        await this.persistJobState('running');
      } catch (err: any) {
        this.errorCount++;
        this.errorMessage = err.message || 'Database write failed in thread';
      }

      this.notify();

      // Cooperative yield to keep UI responsive
      await new Promise((res) => setTimeout(res, 10));
    }

    if (index >= total && !this.isCancelled) {
      this.state = 'completed';
      this.isRunning = false;
      this.completionTime = Date.now();
      await db.deleteCheckpoint(workspaceId);
      await this.persistJobState('completed');
      await db.addLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        workspaceId,
        type: 'generate',
        details: `Successfully generated all ${this.persistedCount.toLocaleString()} email variants for ${this.baseEmail}`,
        timestamp: Date.now(),
      });
      this.notifyImmediate();
      this.notifyComplete(this.persistedCount);
    }
  }

  async pause() {
    if (!this.isRunning || this.isPaused || this.state === 'completed') return;
    this.isPaused = true;
    this.state = 'paused';
    this.lastPauseTimestamp = Date.now();
    if (this.worker) {
      this.worker.postMessage({ action: 'PAUSE' } as WorkerMessageIn);
    }
    this.notifyImmediate();
    await this.persistJobState('paused');
  }

  async resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.state = 'running';
    if (this.lastPauseTimestamp > 0) {
      this.pausedTimeAccumulator += Date.now() - this.lastPauseTimestamp;
      this.lastPauseTimestamp = 0;
    }
    if (this.worker) {
      this.worker.postMessage({ action: 'RESUME' } as WorkerMessageIn);
    }
    this.notifyImmediate();
    await this.persistJobState('running');
  }

  async cancel() {
    if (this.state === 'idle' || this.state === 'completed') {
      return;
    }
    this.isCancelled = true;
    this.isRunning = false;
    this.isPaused = false;
    this.state = 'cancelled';
    if (this.worker) {
      try {
        this.worker.postMessage({ action: 'CANCEL' } as WorkerMessageIn);
        this.worker.terminate();
      } catch (e) {
        console.warn('Error terminating worker on cancel:', e);
      }
      this.worker = null;
      this.initWorker();
    }
    this.notifyImmediate();
    await this.persistJobState('Cancelled');
  }

  reset() {
    if (this.isRunning) {
      this.cancel();
    }
    this.state = 'idle';
    this.isPaused = false;
    this.isCancelled = false;
    this.isRunning = false;
    this.currentJobId = '';
    this.currentJobName = '';
    this.generatedCount = 0;
    this.persistedCount = 0;
    this.processedCount = 0;
    this.errorCount = 0;
    this.errorMessage = undefined;
    this.totalCombinations = 0n;
    this.currentCombinationIndex = 0n;
    this.startTime = 0;
    this.completionTime = undefined;
    this.pausedTimeAccumulator = 0;
    this.lastPauseTimestamp = 0;
    this.notifyImmediate();
  }

  async resumeFromCheckpoint(checkpoint: GenerationCheckpoint) {
    const startIndex = BigInt(checkpoint.currentCombination || '0');
    await this.startGeneration(
      checkpoint.workspaceId,
      checkpoint.username,
      checkpoint.baseEmail.split('@')[1] || 'gmail.com',
      startIndex
    );
  }
}

export const generationController = new GenerationController();


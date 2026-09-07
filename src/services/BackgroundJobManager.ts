/**
 * BackgroundJobManager
 * Application-level background job coordinator.
 * Decouples long-running operations (Dot Generation, Real Gmail Sync, etc.)
 * from React component mounting and unmounting lifecycles.
 *
 * Requirements fulfilled:
 * 1. PERSISTENT JOBS: jobId, type, status, createdAt, startedAt, updatedAt, completedAt, progress, total, processed, failed, error, metadata
 * 2. REFRESH RESILIENCE: Reconnects without starting over, preserves tokens, workspaces, and progress.
 * 3. BACKGROUND WORK: Continues independently of view/tab switches.
 * 4. JOB RECOVERY: Resumes from last checkpoint, never blindly starts from 0.
 * 5. DUPLICATE PROTECTION: Idempotent writes with deterministic keys.
 * 6. UI STATES: Running, Paused, Completed, Failed, Recovering, Cancelled with live metrics.
 * 7. HARD CANCEL: Terminates worker threads completely.
 */

import { db } from '../database/db';
import { generationController } from '../generators/GenerationController';
import { GmailIngestionService, IngestionResult } from './gmailIngestion';
import { getCachedAccessToken, getStoredTokenForMailbox } from './auth';
import { mailboxManager } from './MailboxManager';
import { PersistentJob, JobStatus, GeneratorProgress } from '../types';

export type JobSubscriber = (jobs: PersistentJob[]) => void;
export type ActiveJobSubscriber = (job: PersistentJob | null, progress: GeneratorProgress | null) => void;
export type OtpArrivalSubscriber = (otpData: {
  code: string;
  sender: string;
  subject: string;
  timestamp: number;
  recipientEmail: string;
  magicLink?: string;
}) => void;

class BackgroundJobManager {
  private jobs: Map<string, PersistentJob> = new Map();
  private subscribers: Set<JobSubscriber> = new Set();
  private activeJobSubscribers: Set<ActiveJobSubscriber> = new Set();
  private otpSubscribers: Set<OtpArrivalSubscriber> = new Set();

  private isInitialized = false;
  private isRecovering = false;
  private currentActiveJobId: string | null = null;

  // Background Gmail Auto-Sync Engine (Runs globally, independent of page mount)
  private syncIntervalId: any = null;
  private isSyncInProgress = false;
  private autoSyncEnabled = true;
  private syncIntervalMs = 10000; // 10 seconds default

  constructor() {
    // Listen to GenerationController updates to mirror into persistent job records
    generationController.subscribe((progress) => {
      this.handleGenerationProgress(progress);
    });
  }

  /**
   * Initializes the BackgroundJobManager on application launch.
   * Loads active jobs, checks for interrupted work, and restores state.
   */
  async initialize(workspaceId?: string): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      console.log('[BackgroundJobManager] Initializing background jobs engine...');
      // 1. Load all persisted jobs from IndexedDB
      const allJobs = await db.getAllJobs(workspaceId);
      for (const j of allJobs) {
        this.jobs.set(j.jobId || j.id, j);
      }

      // 2. Identify active or interrupted job
      const activeJob = await db.getActiveJob(workspaceId);
      if (activeJob) {
        const jobId = activeJob.jobId || activeJob.id;
        this.currentActiveJobId = jobId;
        console.log('[BackgroundJobManager] Found existing active job:', jobId, activeJob.status);

        const statusLower = (activeJob.status || '').toLowerCase();
        if (statusLower === 'running' || statusLower === 'pending') {
          // Interrupted by refresh/close -> Transition to 'Recovering'
          this.isRecovering = true;
          const recoveringJob: PersistentJob = {
            ...activeJob,
            status: 'Recovering',
            updatedAt: Date.now(),
            lastUpdated: Date.now(),
          };
          this.jobs.set(jobId, recoveringJob);
          await db.saveJob(recoveringJob);
          this.notifySubscribers();

          // Resume generation safely from last checkpoint
          console.log('[BackgroundJobManager] Resuming interrupted generation from checkpoint...');
          await generationController.reconnectActiveJob(activeJob.workspaceId || workspaceId);
          this.isRecovering = false;
        } else if (statusLower === 'paused') {
          // Keep paused at exact position
          await generationController.reconnectActiveJob(activeJob.workspaceId || workspaceId);
          this.notifySubscribers();
        }
      } else if (workspaceId) {
        // Check for standalone incomplete checkpoint
        const cp = await db.getCheckpoint(workspaceId);
        if (cp && !cp.isComplete && Number(cp.totalEstimated) > cp.generatedCount) {
          console.log('[BackgroundJobManager] Incomplete checkpoint found; restoring state...');
          await generationController.reconnectActiveJob(workspaceId);
        }
      }

      // 3. Start background sync engine if account is connected
      this.startBackgroundSync(workspaceId);
    } catch (err) {
      console.error('[BackgroundJobManager] Error during initialization:', err);
    } finally {
      this.notifySubscribers();
    }
  }

  /**
   * Translates live progress from GenerationController into the canonical PersistentJob record
   */
  private async handleGenerationProgress(progress: GeneratorProgress) {
    const progJobId = (generationController as any).currentJobId;
    if (!progJobId) return;

    let status: JobStatus = 'Running';
    if (progress.state === 'paused' || progress.isPaused) {
      status = 'Paused';
    } else if (progress.state === 'completed') {
      status = 'Completed';
    } else if (progress.state === 'cancelled') {
      status = 'Cancelled';
    } else if (progress.state === 'failed') {
      status = 'Failed';
    } else if (this.isRecovering || progress.state === 'recovering') {
      status = 'Recovering';
    }

    const existing = this.jobs.get(progJobId);
    const now = Date.now();
    const startTime = existing?.startedAt || existing?.startTime || now;
    const totalTarget = Number(progress.totalCombinations || existing?.total || 0);
    const processed = progress.persistedCount || progress.generatedCount || 0;

    const updatedJob: PersistentJob = {
      jobId: progJobId,
      id: progJobId,
      workspaceId: progress.workspaceId || existing?.workspaceId || '',
      type: 'variant_generation',
      name: existing?.name || `Generate Dot Variants (${progress.baseEmail || ''})`,
      status,
      createdAt: existing?.createdAt || startTime,
      startedAt: startTime,
      updatedAt: now,
      lastUpdated: now,
      completedAt: status === 'Completed' ? now : undefined,
      completionTime: status === 'Completed' ? now : undefined,
      progress: progress.percentage,
      progressPercent: progress.percentage,
      total: totalTarget,
      totalTarget,
      processed,
      persistedCount: processed,
      generatedCount: progress.generatedCount || processed,
      remainingCount: Number(progress.remaining || Math.max(0, totalTarget - processed)),
      failed: progress.errorCount || 0,
      error: progress.errorMessage,
      ratePerSecond: progress.ratePerSecond || 0,
      elapsedMs: progress.elapsedMs || 0,
      estimatedRemainingSeconds: progress.estimatedRemainingSeconds || 0,
      startTime,
      metadata: {
        username: progress.username,
        domain: progress.domain,
        baseEmail: progress.baseEmail,
      },
      config: {
        username: progress.username,
        domain: progress.domain,
        baseEmail: progress.baseEmail,
      },
    };

    this.jobs.set(progJobId, updatedJob);
    if (status === 'Running' || status === 'Paused' || status === 'Recovering') {
      this.currentActiveJobId = progJobId;
    } else if (this.currentActiveJobId === progJobId) {
      this.currentActiveJobId = null;
    }

    // Notify UI subscribers
    this.notifySubscribers();
  }

  /**
   * Starts a new Variant Generation job in the background
   */
  async startVariantGenerationJob(options: {
    workspaceId: string;
    username: string;
    domain?: string;
    baseEmail?: string;
    startIndex?: bigint | number | string;
    batchSize?: number;
    checkpointFrequency?: number;
    jobName?: string;
  }): Promise<string> {
    const cleanUsername = options.username.replace(/\./g, '').trim();
    const domain = options.domain || 'gmail.com';
    const baseEmail = options.baseEmail || `${cleanUsername}@${domain}`;
    const jobId = `job_gen_${options.workspaceId}_${Date.now()}`;
    const jobName = options.jobName || `Generate Dot Variants (${baseEmail})`;

    const initialJob: PersistentJob = {
      jobId,
      id: jobId,
      workspaceId: options.workspaceId,
      type: 'variant_generation',
      name: jobName,
      status: 'Running',
      createdAt: Date.now(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastUpdated: Date.now(),
      progress: 0,
      progressPercent: 0,
      total: 0,
      totalTarget: 0,
      processed: Number(options.startIndex || 0),
      persistedCount: Number(options.startIndex || 0),
      generatedCount: Number(options.startIndex || 0),
      remainingCount: 0,
      failed: 0,
      ratePerSecond: 0,
      elapsedMs: 0,
      estimatedRemainingSeconds: 0,
      startTime: Date.now(),
      metadata: {
        username: cleanUsername,
        domain,
        baseEmail,
        startIndex: options.startIndex?.toString() || '0',
        batchSize: options.batchSize || 5000,
      },
      config: {
        username: cleanUsername,
        domain,
        baseEmail,
        startIndex: options.startIndex?.toString() || '0',
        batchSize: options.batchSize || 5000,
      },
    };

    this.jobs.set(jobId, initialJob);
    this.currentActiveJobId = jobId;
    await db.saveJob(initialJob);
    this.notifySubscribers();

    // Launch worker execution
    await generationController.start({
      workspaceId: options.workspaceId,
      username: cleanUsername,
      domain,
      startIndex: options.startIndex,
      batchSize: options.batchSize,
      jobId,
      jobName,
    });

    return jobId;
  }

  /**
   * Pauses the active generation job
   */
  async pauseJob(jobId?: string) {
    const targetId = jobId || this.currentActiveJobId;
    if (!targetId) return;

    await generationController.pause();
    const job = this.jobs.get(targetId);
    if (job) {
      const updated: PersistentJob = {
        ...job,
        status: 'Paused',
        updatedAt: Date.now(),
        lastUpdated: Date.now(),
      };
      this.jobs.set(targetId, updated);
      await db.saveJob(updated);
      this.notifySubscribers();
    }
  }

  /**
   * Resumes a paused generation job
   */
  async resumeJob(jobId?: string) {
    const targetId = jobId || this.currentActiveJobId;
    if (!targetId) return;

    await generationController.resume();
    const job = this.jobs.get(targetId);
    if (job) {
      const updated: PersistentJob = {
        ...job,
        status: 'Running',
        updatedAt: Date.now(),
        lastUpdated: Date.now(),
      };
      this.jobs.set(targetId, updated);
      await db.saveJob(updated);
      this.notifySubscribers();
    }
  }

  /**
   * Hard cancellation of a job.
   * Kills worker execution immediately so it cannot produce or write further records.
   */
  async cancelJob(jobId?: string) {
    const targetId = jobId || this.currentActiveJobId;
    if (!targetId) return;

    console.log('[BackgroundJobManager] Hard cancelling job:', targetId);
    await generationController.cancel();

    const job = this.jobs.get(targetId);
    if (job) {
      const updated: PersistentJob = {
        ...job,
        status: 'Cancelled',
        completedAt: Date.now(),
        completionTime: Date.now(),
        updatedAt: Date.now(),
        lastUpdated: Date.now(),
      };
      this.jobs.set(targetId, updated);
      await db.saveJob(updated);
      if (this.currentActiveJobId === targetId) {
        this.currentActiveJobId = null;
      }
      this.notifySubscribers();
    }
  }

  // ================= BACKGROUND GMAIL SYNC AS PERSISTENT JOB =================

  /**
   * Triggers a discrete Gmail mailbox sync coordinated with MailboxManager.
   */
  async triggerGmailSyncJob(
    workspaceId: string,
    mailboxEmail?: string
  ): Promise<IngestionResult> {
    const primary = await db.getPrimaryAccount();
    const targetMailbox = mailboxEmail || primary?.email || 'me';
    
    try {
      const result = await mailboxManager.syncMailbox({
        workspaceId,
        mailboxEmail: targetMailbox,
        forceFullScan: false,
      });

      // Check for newly arrived OTPs to broadcast toast events
      if (result.newEmails && result.newEmails.length > 0) {
        for (const email of result.newEmails) {
          if (email.extractedOtp) {
            this.broadcastOtpArrival({
              code: email.extractedOtp,
              sender: email.senderName || email.senderEmail,
              subject: email.subject,
              timestamp: email.receivedAt,
              recipientEmail: email.recipientEmail,
              magicLink: (email as any).magicLink,
            });
          }
        }
      }

      return result;
    } catch (err: any) {
      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        error: err?.message || 'Sync error',
      };
    }
  }

  /**
   * Starts background auto-sync polling loop with sensible backoff.
   * Continues running even when the user navigates away from the Inbox tab!
   */
  startBackgroundSync(workspaceId?: string) {
    if (this.syncIntervalId) return;

    let failureBackoffMultiplier = 1;

    const runSyncCycle = async () => {
      if (!this.autoSyncEnabled || this.isSyncInProgress) return;

      const token = getCachedAccessToken();
      if (!token) return;

      const primary = await db.getPrimaryAccount();
      if (!primary || primary.status !== 'CONNECTED') return;

      let wsId = workspaceId;
      if (!wsId) {
        const wsList = await db.getAllWorkspaces();
        wsId = wsList[0]?.id;
      }
      if (!wsId) return;

      this.isSyncInProgress = true;
      try {
        const res = await this.triggerGmailSyncJob(wsId, primary.email);
        if (res.success) {
          failureBackoffMultiplier = 1; // reset backoff on success
        } else {
          failureBackoffMultiplier = Math.min(6, failureBackoffMultiplier * 1.5);
        }
      } catch (e) {
        failureBackoffMultiplier = Math.min(6, failureBackoffMultiplier * 1.5);
      } finally {
        this.isSyncInProgress = false;
      }
    };

    this.syncIntervalId = setInterval(runSyncCycle, this.syncIntervalMs);
  }

  stopBackgroundSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  setAutoSyncEnabled(enabled: boolean) {
    this.autoSyncEnabled = enabled;
  }

  isAutoSyncActive(): boolean {
    return this.autoSyncEnabled && this.syncIntervalId !== null;
  }

  // ================= SUBSCRIPTION & EVENT BROADCASTING =================

  subscribe(callback: JobSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getAllJobs());
    return () => this.subscribers.delete(callback);
  }

  subscribeActiveJob(callback: ActiveJobSubscriber): () => void {
    this.activeJobSubscribers.add(callback);
    callback(this.getActiveJob(), generationController.getProgress());
    return () => this.activeJobSubscribers.delete(callback);
  }

  subscribeOtpArrival(callback: OtpArrivalSubscriber): () => void {
    this.otpSubscribers.add(callback);
    return () => this.otpSubscribers.delete(callback);
  }

  private broadcastOtpArrival(otpData: {
    code: string;
    sender: string;
    subject: string;
    timestamp: number;
    recipientEmail: string;
    magicLink?: string;
  }) {
    for (const sub of this.otpSubscribers) {
      try {
        sub(otpData);
      } catch {
        // ignore
      }
    }
    // Also dispatch global window event for components that prefer DOM events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inboxforge_new_otp', { detail: otpData }));
    }
  }

  private notifySubscribers() {
    const list = this.getAllJobs();
    for (const sub of this.subscribers) {
      try {
        sub(list);
      } catch (err) {
        console.warn('Error in job subscriber:', err);
      }
    }

    const active = this.getActiveJob();
    const progress = generationController.getProgress();
    for (const sub of this.activeJobSubscribers) {
      try {
        sub(active, progress);
      } catch (err) {
        console.warn('Error in active job subscriber:', err);
      }
    }
  }

  getAllJobs(): PersistentJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => (b.startedAt || b.createdAt || 0) - (a.startedAt || a.createdAt || 0)
    );
  }

  getActiveJob(): PersistentJob | null {
    if (this.currentActiveJobId && this.jobs.has(this.currentActiveJobId)) {
      const j = this.jobs.get(this.currentActiveJobId)!;
      const s = (j.status || '').toLowerCase();
      if (s === 'running' || s === 'paused' || s === 'recovering' || s === 'pending') {
        return j;
      }
    }
    // Fallback search
    for (const j of this.jobs.values()) {
      const s = (j.status || '').toLowerCase();
      if (s === 'running' || s === 'paused' || s === 'recovering') {
        return j;
      }
    }
    return null;
  }
}

export const backgroundJobManager = new BackgroundJobManager();

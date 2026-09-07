/**
 * Web Worker for high-performance Gmail dot-variant generation
 */

import { Variant } from '../types';
import { generateSyntheticIdentity } from '../generators/SyntheticIdentityGenerator';

export interface WorkerMessageIn {
  action: 'START' | 'NEXT' | 'PAUSE' | 'RESUME' | 'CANCEL';
  workspaceId?: string;
  username?: string;
  domain?: string;
  startIndex?: string; // stringified BigInt
  batchSize?: number;
  checkpointInterval?: number;
}

export interface WorkerMessageOut {
  type: 'STARTED' | 'CHUNK' | 'PROGRESS' | 'COMPLETE' | 'PAUSED' | 'RESUMED' | 'CANCELLED' | 'ERROR';
  workspaceId: string;
  variants?: Variant[];
  generatedCount: number;
  currentCombination: string;
  totalCombinations: string;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  isComplete?: boolean;
  error?: string;
}

let isPaused = false;
let isCancelled = false;
let isRunning = false;

let currentWorkspaceId = '';
let currentCleanUsername = '';
let currentDomain = 'gmail.com';
let currentBaseEmail = '';
let totalCombos = 0n;
let currentIndex = 0n;
let batchSize = 5000;
let currentBatchNumber = 0;
let totalBatches = 0;

function estimateCombinations(username: string): bigint {
  const clean = username.replace(/\./g, '');
  const len = clean.length;
  if (len <= 1) return 1n;
  return 1n << BigInt(len - 1);
}

function getVariantAt(cleanUsername: string, domain: string, index: bigint): string {
  const len = cleanUsername.length;
  if (len <= 1) return `${cleanUsername}@${domain}`;
  let out = '';
  for (let i = 0; i < len; i++) {
    out += cleanUsername[i];
    if (i < len - 1) {
      if ((index >> BigInt(i)) & 1n) {
        out += '.';
      }
    }
  }
  return `${out}@${domain}`;
}

function generateNextChunk() {
  if (!isRunning || isCancelled) return;

  if (isPaused) {
    self.postMessage({
      type: 'PAUSED',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 100,
    } as WorkerMessageOut);
    return;
  }

  if (currentIndex >= totalCombos) {
    isRunning = false;
    self.postMessage({
      type: 'COMPLETE',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(totalCombos),
      currentCombination: totalCombos.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: totalBatches,
      totalBatches,
      percentage: 100,
      isComplete: true,
    } as WorkerMessageOut);
    return;
  }

  try {
    const chunkVariants: Variant[] = [];
    const now = Date.now();
    const currentBatchLimit = Math.min(batchSize, Number(totalCombos - currentIndex));

    for (let i = 0; i < currentBatchLimit; i++) {
      const combo = currentIndex + BigInt(i);
      const email = getVariantAt(currentCleanUsername, currentDomain, combo);
      const synth = generateSyntheticIdentity(currentCleanUsername, Number(combo % 1000000n));
      const id = `${currentWorkspaceId}_var_${combo.toString()}`;

      chunkVariants.push({
        id,
        workspaceId: currentWorkspaceId,
        email,
        baseEmail: currentBaseEmail,
        username: currentCleanUsername,
        status: 'unused',
        starred: false,
        labelIds: [],
        notes: '',
        createdAt: now,
        updatedAt: now,
        copyCount: 0,
        usageCount: 0,
        identityName: synth.identityName,
        identityType: synth.identityType,
        identityCategory: synth.identityCategory,
        subCategory: synth.subCategory,
        syntheticUsername: synth.username,
        isSyntheticTestIdentity: true,
        organization: synth.organization,
        roleTitle: synth.roleTitle,
        avatarSeed: synth.avatarSeed,
        tags: synth.tags,
        suffix: synth.suffix,
      });
    }

    currentIndex += BigInt(chunkVariants.length);
    currentBatchNumber++;

    const progressPercent =
      totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 100;
    const isComplete = currentIndex >= totalCombos;

    self.postMessage({
      type: 'CHUNK',
      workspaceId: currentWorkspaceId,
      variants: chunkVariants,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: progressPercent,
      isComplete,
    } as WorkerMessageOut);
  } catch (err: any) {
    isRunning = false;
    self.postMessage({
      type: 'ERROR',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: 0,
      error: err.message || 'Worker batch generation failure',
    } as WorkerMessageOut);
  }
}

self.onmessage = async (e: MessageEvent<WorkerMessageIn>) => {
  const { action } = e.data;

  if (action === 'PAUSE') {
    isPaused = true;
    self.postMessage({
      type: 'PAUSED',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 100,
    } as WorkerMessageOut);
    return;
  }

  if (action === 'CANCEL') {
    isCancelled = true;
    isRunning = false;
    isPaused = false;
    self.postMessage({
      type: 'CANCELLED',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 0,
    } as WorkerMessageOut);
    return;
  }

  if (action === 'RESUME') {
    isPaused = false;
    self.postMessage({
      type: 'RESUMED',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 100,
    } as WorkerMessageOut);
    generateNextChunk();
    return;
  }

  if (action === 'NEXT') {
    generateNextChunk();
    return;
  }

  if (action === 'START') {
    const {
      workspaceId = 'default',
      username = '',
      domain = 'gmail.com',
      startIndex = '0',
      batchSize: reqBatchSize = 5000,
    } = e.data;

    currentWorkspaceId = workspaceId;
    currentCleanUsername = username.replace(/\./g, '');
    currentDomain = domain;
    currentBaseEmail = `${currentCleanUsername}@${domain}`;
    totalCombos = estimateCombinations(currentCleanUsername);
    batchSize = Math.max(100, Math.min(25000, reqBatchSize));
    currentIndex = BigInt(startIndex);
    currentBatchNumber = Math.floor(Number(currentIndex) / batchSize);
    totalBatches = Math.ceil(Number(totalCombos) / batchSize);

    isPaused = false;
    isCancelled = false;
    isRunning = true;

    self.postMessage({
      type: 'STARTED',
      workspaceId: currentWorkspaceId,
      generatedCount: Number(currentIndex),
      currentCombination: currentIndex.toString(),
      totalCombinations: totalCombos.toString(),
      currentBatch: currentBatchNumber,
      totalBatches,
      percentage: totalCombos > 0n ? Math.min(100, Number((currentIndex * 10000n) / totalCombos) / 100) : 0,
    } as WorkerMessageOut);

    // Generate first chunk
    generateNextChunk();
  }
};


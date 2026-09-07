import React, { useState } from 'react';
import {
  Zap,
  Cpu,
  Database,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Info,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  Activity,
  Layers,
  RotateCcw,
  Eye,
  Minimize2,
} from 'lucide-react';
import { GeneratorProgress, Workspace } from '../types';
import { defaultGmailGenerator } from '../generators/GmailDotVariantGenerator';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  progress: GeneratorProgress;
  onStartGeneration: (startIndex?: bigint, batchSize?: number) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onViewIdentities?: () => void;
  onReset?: () => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({
  isOpen,
  onClose,
  workspace,
  progress,
  onStartGeneration,
  onPause,
  onResume,
  onCancel,
  onViewIdentities,
  onReset,
}) => {
  const [batchSize, setBatchSize] = useState<number>(5000);

  if (!isOpen || !workspace) return null;

  const totalCombos = defaultGmailGenerator.estimate(workspace.username, workspace.domain);
  const gaps = Math.max(0, workspace.username.replace(/\./g, '').length - 1);
  const cleanUsername = workspace.username.replace(/\./g, '');

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return '< 1s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleStart = () => {
    onStartGeneration(0n, batchSize);
  };

  const isConfigState = progress.state === 'idle';
  const isRunningState = progress.state === 'running' || progress.state === 'starting';
  const isPausedState = progress.state === 'paused';
  const isCompletedState = progress.state === 'completed';
  const isFailedState = progress.state === 'failed';
  const isCancelledState = progress.state === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col">
        {/* Header with Dynamic Status */}
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition ${
                isCompletedState
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : isFailedState
                  ? 'bg-rose-600 shadow-rose-600/30'
                  : isPausedState
                  ? 'bg-amber-600 shadow-amber-600/30'
                  : isRunningState
                  ? 'bg-indigo-600 shadow-indigo-600/30 animate-pulse'
                  : 'bg-indigo-600 shadow-indigo-600/30'
              }`}
            >
              {isCompletedState ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : isFailedState ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : isPausedState ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isCompletedState
                    ? 'GENERATION COMPLETE'
                    : isFailedState
                    ? 'GENERATION FAILED'
                    : isCancelledState
                    ? 'GENERATION CANCELLED'
                    : isRunningState || isPausedState
                    ? 'GENERATION IN PROGRESS'
                    : 'Generate Gmail Dot Variants'}
                </h3>
                {!isConfigState && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      isCompletedState
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isFailedState
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isPausedState
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse'
                    }`}
                  >
                    {progress.state.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {workspace.baseEmail} &bull; {totalCombos.toLocaleString()} total variants
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close / Minimize to Background"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          {/* ========================================================================= */}
          {/* 1. CONFIGURATION SCREEN (IDLE STATE) */}
          {/* ========================================================================= */}
          {isConfigState && (
            <>
              {/* Finite space breakdown */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Finite Space Formula
                  </span>
                  <span className="font-mono text-indigo-300 font-bold text-xs bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/20">
                    2^(N-1) = 2^{gaps}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Username Length
                    </div>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {cleanUsername.length} characters ({gaps} gaps)
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Total Combinations
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                      {totalCombos.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engine Parameters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Worker Batch Buffer Size
                  </label>
                  <span className="font-mono text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                    {batchSize.toLocaleString()} variants / chunk
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={25000}
                  step={1000}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>1,000 (Low RAM)</span>
                  <span>5,000 (Recommended)</span>
                  <span>25,000 (Max Speed)</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  The generator will stream records in background Web Workers directly into IndexedDB batch transactions with zero UI freeze.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>START GENERATION</span>
                </button>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. ACTIVE PROGRESS SCREEN (STARTING / RUNNING / PAUSED) */}
          {/* ========================================================================= */}
          {(isRunningState || isPausedState) && (
            <div className="space-y-6">
              {/* Visual Progress Bar with Large Percentage Display */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Overall Progress
                    </div>
                    <div className="text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                      {progress.percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold">
                      {progress.persistedCount.toLocaleString()}
                    </span>{' '}
                    / {progress.totalCombinations.toLocaleString()}
                  </div>
                </div>

                <div className="w-full h-3.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      isPausedState
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 shadow-md shadow-indigo-500/50'
                    }`}
                    style={{ width: `${Math.max(1, progress.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Comprehensive 6-Metric Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-indigo-400" />
                    Generated
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {progress.generatedCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    Processed / Persisted
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    {progress.persistedCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Errors
                  </div>
                  <div
                    className={`text-base font-bold font-mono mt-1 ${
                      progress.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {progress.errorCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    Throughput
                  </div>
                  <div className="text-base font-bold font-mono text-indigo-300 mt-1">
                    {progress.ratePerSecond.toLocaleString()}/sec
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    ETA
                  </div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-1">
                    {formatEta(progress.estimatedRemainingSeconds)}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-violet-400" />
                    Batch Progress
                  </div>
                  <div className="text-base font-bold font-mono text-violet-300 mt-1">
                    {progress.currentBatch} / {progress.totalBatches || 1}
                  </div>
                </div>
              </div>

              {/* Progress Control Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Run in Background
                </button>

                <div className="flex items-center gap-2.5">
                  {isPausedState ? (
                    <button
                      onClick={onResume}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>RESUME</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPause}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>PAUSE</span>
                    </button>
                  )}

                  <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>CANCEL</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. COMPLETION SCREEN */}
          {/* ========================================================================= */}
          {isCompletedState && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">All Variants Generated Successfully!</h4>
                <p className="text-xs text-slate-400">
                  {progress.persistedCount.toLocaleString()} unique Gmail dot-variant identities are now saved and ready in your workspace.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Generated</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    {progress.persistedCount.toLocaleString()} / {progress.totalCombinations.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Errors</div>
                  <div className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                    {progress.errorCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Time</div>
                  <div className="text-sm font-mono font-bold text-indigo-300 mt-0.5">
                    {formatElapsed(progress.elapsedMs)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                {onReset && (
                  <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reconfigure</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>

                {onViewIdentities && (
                  <button
                    onClick={onViewIdentities}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>VIEW IDENTITIES</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. FAILED SCREEN */}
          {/* ========================================================================= */}
          {isFailedState && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Generation Stopped With Error</h4>
                <p className="text-xs text-rose-300 font-mono bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30">
                  {progress.errorMessage || 'An unhandled storage or worker error occurred.'}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 text-left">
                <div className="font-bold text-white mb-1">Safe Recovery Status:</div>
                <div>
                  {progress.persistedCount.toLocaleString()} variants were safely written to IndexedDB before the failure. You can resume without data loss.
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => onStartGeneration(BigInt(progress.persistedCount), batchSize)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RETRY / RESUME</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. CANCELLED SCREEN */}
          {/* ========================================================================= */}
          {isCancelledState && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Generation Cancelled</h4>
                <p className="text-xs text-slate-400">
                  Worker stopped. All {progress.persistedCount.toLocaleString()} previously persisted variants have been preserved in your workspace.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
                {onReset && (
                  <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>START NEW GENERATION</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

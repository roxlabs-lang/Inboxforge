import React from 'react';
import {
  Play,
  Pause,
  XCircle,
  RotateCcw,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  HardDrive,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { GenerationCheckpoint, GeneratorProgress } from '../types';

interface GenerationControlPanelProps {
  progress: GeneratorProgress;
  checkpoint: GenerationCheckpoint | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onResumeCheckpoint: (cp: GenerationCheckpoint) => void;
  onOpenGeneratorDialog: () => void;
}

export const GenerationControlPanel: React.FC<GenerationControlPanelProps> = ({
  progress,
  checkpoint,
  onPause,
  onResume,
  onCancel,
  onResumeCheckpoint,
  onOpenGeneratorDialog,
}) => {
  const isGenerating = progress.state === 'running' || progress.state === 'starting';
  const isRecovering = progress.state === 'recovering';
  const isPaused = progress.state === 'paused' || progress.isPaused;
  const isCompleted = progress.state === 'completed';
  const isCancelled = progress.state === 'cancelled' || progress.isCancelled;
  const isFailed = progress.state === 'failed';

  const showActiveBanner =
    isGenerating || isRecovering || isPaused || isCompleted || (isCancelled && progress.generatedCount > 0);

  const formatElapsed = (ms: number) => {
    if (!ms || ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRemaining = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Determine current canonical status label
  const statusLabel = isRecovering
    ? 'Recovering'
    : isPaused
    ? 'Paused'
    : isGenerating
    ? 'Running'
    : isCompleted
    ? 'Completed'
    : isCancelled
    ? 'Cancelled'
    : isFailed
    ? 'Failed'
    : 'Idle';

  const statusBadgeStyle = isRecovering
    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
    : isPaused
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : isGenerating
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : isCompleted
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    : isCancelled
    ? 'bg-slate-800 text-slate-400 border-slate-700'
    : isFailed
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="space-y-3">
      {/* Checkpoint Recovery Prompt */}
      {checkpoint && !checkpoint.isComplete && !showActiveBanner && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Crash / Interruption Recovery Available
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Previous generation checkpoint saved at{' '}
                <span className="font-mono font-bold text-amber-300">
                  {checkpoint.generatedCount.toLocaleString()}
                </span>{' '}
                of {checkpoint.totalEstimated} identities for {checkpoint.baseEmail}.
              </div>
            </div>
          </div>
          <button
            onClick={() => onResumeCheckpoint(checkpoint)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESUME FROM CHECKPOINT</span>
          </button>
        </div>
      )}

      {/* Live Generation Progress Banner */}
      {showActiveBanner && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl shadow-indigo-950/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            {/* Title & Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isRecovering
                    ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-400 animate-spin'
                    : isGenerating
                    ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-400 animate-pulse'
                    : isPaused
                    ? 'bg-amber-600/30 border-amber-500/40 text-amber-400'
                    : isCompleted
                    ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isRecovering ? (
                  <RefreshCw className="w-5 h-5" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    High-Scale Dot-Variant Generation
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusBadgeStyle}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isRecovering
                    ? 'Restoring checkpoint and resuming background worker...'
                    : 'Web Worker multi-threaded stream · Idempotent IndexedDB transactions'}
                </div>
              </div>
            </div>

            {/* Control Buttons: PAUSE, RESUME, CANCEL */}
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>RESUME</span>
                </button>
              ) : isGenerating ? (
                <button
                  onClick={onPause}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </button>
              ) : null}

              {(isGenerating || isPaused || isRecovering) && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>CANCEL</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Required Exact Metrics (processed / total, percentage) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-2">
                <span>Processed:</span>
                <span className="text-slate-200 font-bold">
                  {progress.persistedCount.toLocaleString()} / {progress.totalCombinations.toLocaleString()}
                </span>
              </span>
              <span className="text-indigo-300 font-bold">{progress.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-indigo-500/50"
                style={{ width: `${Math.max(1, progress.percentage)}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid: processed / total, percentage, generation rate, elapsed time, estimated remaining time */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                Processed / Total
              </div>
              <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5 truncate">
                {progress.persistedCount.toLocaleString()} / {progress.totalCombinations.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-400" />
                Generation Rate
              </div>
              <div className="text-xs font-bold font-mono text-indigo-300 mt-0.5">
                {progress.ratePerSecond.toLocaleString()}/s
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Elapsed Time
              </div>
              <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                {formatElapsed(progress.elapsedMs)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                Estimated Remaining
              </div>
              <div className="text-xs font-bold font-mono text-amber-300 mt-0.5">
                {formatRemaining(progress.estimatedRemainingSeconds)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-violet-400" />
                Progress Percentage
              </div>
              <div className="text-xs font-bold font-mono text-violet-300 mt-0.5">
                {progress.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  HardDrive,
  XCircle,
} from 'lucide-react';
import { PersistentJob } from '../types';
import { db } from '../database/db';
import { backgroundJobManager } from '../services/BackgroundJobManager';

interface JobsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSelectJob?: (job: PersistentJob) => void;
}

export const JobsDashboardModal: React.FC<JobsDashboardModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSelectJob,
}) => {
  const [jobs, setJobs] = useState<PersistentJob[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to live background jobs from BackgroundJobManager
    const unsubscribe = backgroundJobManager.subscribe((allJobs) => {
      if (workspaceId) {
        setJobs(allJobs.filter((j) => !j.workspaceId || j.workspaceId === workspaceId));
      } else {
        setJobs(allJobs);
      }
    });

    return () => unsubscribe();
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleClearCompleted = async () => {
    await db.clearCompletedJobs(workspaceId);
    const refreshed = await db.getAllJobs(workspaceId);
    setJobs(refreshed);
  };

  const handleDeleteJob = async (id: string) => {
    await db.deleteJob(id);
    const refreshed = await db.getAllJobs(workspaceId);
    setJobs(refreshed);
  };

  const handlePause = async (jobId: string) => {
    await backgroundJobManager.pauseJob(jobId);
  };

  const handleResume = async (jobId: string) => {
    await backgroundJobManager.resumeJob(jobId);
  };

  const handleCancel = async (jobId: string) => {
    await backgroundJobManager.cancelJob(jobId);
  };

  const formatElapsed = (ms?: number) => {
    if (!ms || ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRemaining = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Persistent Jobs & Operations
              </h2>
              <p className="text-xs text-slate-400">
                Independent background tasks persist across browser refreshes and page navigation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {jobs.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
              <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-300">No Active or Recorded Jobs</div>
              <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Generate dot variants or trigger mailbox sync to monitor asynchronous operations here.
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {jobs.map((job) => {
                const s = (job.status || '').toLowerCase();
                const isRunning = s === 'running';
                const isPaused = s === 'paused';
                const isRecovering = s === 'recovering';
                const isComplete = s === 'completed';
                const isCancelled = s === 'cancelled';
                const isFailed = s === 'failed';

                // Display Status Label
                const displayStatus = isRecovering
                  ? 'Recovering'
                  : isRunning
                  ? 'Running'
                  : isPaused
                  ? 'Paused'
                  : isComplete
                  ? 'Completed'
                  : isCancelled
                  ? 'Cancelled'
                  : isFailed
                  ? 'Failed'
                  : job.status;

                // Status Badge Color
                const badgeClass = isRecovering
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                  : isRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isComplete
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : isCancelled
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : isFailed
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700';

                const processed = job.processed !== undefined ? job.processed : (job.persistedCount || 0);
                const total = job.total !== undefined ? job.total : (job.totalTarget || 0);
                const progressPct = job.progress !== undefined ? job.progress : (job.progressPercent || 0);
                const rate = job.ratePerSecond || 0;
                const elapsedMs = job.elapsedMs || 0;
                const remainingSec = job.estimatedRemainingSeconds || 0;

                return (
                  <div
                    key={job.jobId || job.id}
                    className={`p-4 rounded-xl border transition ${
                      isRunning || isRecovering
                        ? 'bg-slate-950/80 border-indigo-500/40 shadow-md shadow-indigo-950/20'
                        : isPaused
                        ? 'bg-amber-950/15 border-amber-500/30'
                        : isComplete
                        ? 'bg-slate-950/50 border-slate-800'
                        : isFailed
                        ? 'bg-rose-950/15 border-rose-500/30'
                        : 'bg-slate-950/30 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-100">{job.name}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                          >
                            {displayStatus}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {job.type}
                          </span>
                        </div>

                        {/* Error Message Display */}
                        {job.error && (
                          <div className="mt-1 text-xs text-rose-400 font-mono bg-rose-950/30 border border-rose-900/40 rounded p-1.5">
                            Error: {job.error}
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isRunning && (
                          <button
                            onClick={() => handlePause(job.jobId || job.id)}
                            title="Pause Job"
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isPaused && (
                          <button
                            onClick={() => handleResume(job.jobId || job.id)}
                            title="Resume Job"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isRunning || isPaused || isRecovering) && (
                          <button
                            onClick={() => handleCancel(job.jobId || job.id)}
                            title="Cancel Job"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer text-xs px-2 flex items-center gap-1 font-semibold"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                        {(isComplete || isCancelled || isFailed) && (
                          <button
                            onClick={() => handleDeleteJob(job.jobId || job.id)}
                            title="Delete Job Log"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete
                              ? 'bg-indigo-500'
                              : isPaused
                              ? 'bg-amber-500'
                              : isRecovering
                              ? 'bg-cyan-500'
                              : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400'
                          }`}
                          style={{ width: `${Math.max(1, Math.min(100, progressPct))}%` }}
                        />
                      </div>
                    </div>

                    {/* Exact Telemetry Metrics Grid */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Processed / Total</span>
                        <span className="text-slate-200 font-bold">
                          {processed.toLocaleString()} / {total > 0 ? total.toLocaleString() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Percentage</span>
                        <span className="text-indigo-400 font-bold">{progressPct.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Generation Rate</span>
                        <span className="text-emerald-400 font-bold">{rate > 0 ? `${rate.toLocaleString()}/s` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Elapsed Time</span>
                        <span className="text-slate-300">{formatElapsed(elapsedMs)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Remaining Time</span>
                        <span className="text-amber-300">{formatRemaining(remainingSec)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total Background Jobs: <span className="font-mono font-semibold text-slate-200">{jobs.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCompleted}
              disabled={!jobs.some((j) => {
                const s = (j.status || '').toLowerCase();
                return s === 'completed' || s === 'cancelled' || s === 'failed';
              })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-40"
            >
              Clear Finished
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

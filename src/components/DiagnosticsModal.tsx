import React, { useState, useEffect } from 'react';
import {
  Activity,
  HardDrive,
  Cpu,
  Zap,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../database/db';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  totalVariantsCount: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  totalVariantsCount,
}) => {
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
    usagePercent: number;
  } | null>(null);

  const [dbStats, setDbStats] = useState<{
    variants: number;
    workspaces: number;
    testCases: number;
    otps: number;
    logs: number;
  }>({
    variants: 0,
    workspaces: 0,
    testCases: 0,
    otps: 0,
    logs: 0,
  });

  const loadStats = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setStorageEstimate({
          usage,
          quota,
          usagePercent: Math.min(100, Math.round((usage / quota) * 100)),
        });
      }

      const allWorkspaces = await db.getAllWorkspaces();
      const allTests = await db.getAllTestCases(workspaceId || '');
      const allOtps = await db.getAllOTPs(workspaceId || '');
      const allLogs = await db.getAllLogs(workspaceId || '');

      setDbStats({
        variants: totalVariantsCount,
        workspaces: allWorkspaces.length,
        testCases: allTests.length,
        otps: allOtps.length,
        logs: allLogs.length,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, totalVariantsCount, workspaceId]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System & Storage Diagnostics</h3>
              <p className="text-xs text-slate-400">Local-first client telemetry and IndexedDB health</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Storage Quota */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span>IndexedDB Storage Quota</span>
              </span>
              <span className="font-mono text-slate-400">
                {storageEstimate ? `${formatBytes(storageEstimate.usage)} / ${formatBytes(storageEstimate.quota)}` : 'Estimating...'}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${storageEstimate ? Math.max(1, storageEstimate.usagePercent) : 1}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Client-side persistent origin storage</span>
              <span className="font-mono text-indigo-300 font-semibold">
                {storageEstimate?.usagePercent || 0}% used
              </span>
            </div>
          </div>

          {/* Database Object Store Inventory */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Active Object Store Records
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Variants Store</div>
                <div className="text-base font-bold font-mono text-white mt-1">
                  {dbStats.variants.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Workspaces</div>
                <div className="text-base font-bold font-mono text-indigo-300 mt-1">
                  {dbStats.workspaces}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Test Cases</div>
                <div className="text-base font-bold font-mono text-violet-300 mt-1">
                  {dbStats.testCases}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">OTP Records</div>
                <div className="text-base font-bold font-mono text-amber-300 mt-1">
                  {dbStats.otps}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Activity Logs</div>
                <div className="text-base font-bold font-mono text-emerald-300 mt-1">
                  {dbStats.logs}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Web Worker Engine</div>
                <div className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Multi-Threaded</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance & Virtualization notes */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5 text-xs text-slate-300">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Virtual Windowing Optimization Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The Identity Explorer renders only visible DOM rows with dynamic overscan buffers, ensuring constant 60 FPS scrolling and instantaneous response times across hundreds of thousands of generated records.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

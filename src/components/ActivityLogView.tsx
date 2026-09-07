import React, { useState } from 'react';
import {
  History,
  Trash2,
  Filter,
  Clock,
  Zap,
  CheckCircle2,
  KeyRound,
  Download,
  Upload,
  Layers,
} from 'lucide-react';
import { ActivityLog, ActivityType } from '../types';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  onClearLogs: () => Promise<void>;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs =
    filterType === 'all'
      ? logs
      : logs.filter((l) => l.type === filterType);

  const getLogIcon = (type: ActivityType) => {
    switch (type) {
      case 'generate':
        return <Zap className="w-4 h-4 text-indigo-400" />;
      case 'test_run':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'otp_received':
        return <KeyRound className="w-4 h-4 text-amber-400" />;
      case 'export':
        return <Download className="w-4 h-4 text-blue-400" />;
      case 'import':
        return <Upload className="w-4 h-4 text-violet-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Activity Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete historical audit trail of all generation runs, test executions, and data imports.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'generate', label: 'Generation' },
          { id: 'test_run', label: 'Test Runs' },
          { id: 'otp_received', label: 'OTP Received' },
          { id: 'export', label: 'Exports' },
          { id: 'import', label: 'Imports' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === f.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No activity logs recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-800/30 transition flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{log.details}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-mono">
                      Type: {log.type}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Copy,
  Star,
  CheckCircle2,
  Bookmark,
  Archive,
  Trash2,
  Tag,
  Download,
  X,
  Check,
  ChevronDown,
  RefreshCw,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Label } from '../types';

interface BulkActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  totalWorkspaceCount: number;
  onClearSelection: () => void;
  onSelectAllFiltered: () => void;
  onBulkCopy: (format?: 'email' | 'identity' | 'json') => void;
  onBulkRegenerate?: () => void;
  onBulkStar: (star: boolean) => void;
  onBulkMarkStatus: (status: 'used' | 'unused' | 'reserved' | 'archived') => void;
  onBulkDelete: () => void;
  onBulkAssignLabel: (labelId: string) => void;
  onBulkExport: (format: 'txt' | 'csv' | 'json') => void;
  labels: Label[];
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalFilteredCount,
  totalWorkspaceCount,
  onClearSelection,
  onSelectAllFiltered,
  onBulkCopy,
  onBulkRegenerate,
  onBulkStar,
  onBulkMarkStatus,
  onBulkDelete,
  onBulkAssignLabel,
  onBulkExport,
  labels,
}) => {
  const [copyDropdown, setCopyDropdown] = useState(false);
  const [labelDropdown, setLabelDropdown] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (selectedCount === 0) return null;

  const handleCopyClick = (format: 'email' | 'identity' | 'json' = 'email') => {
    onBulkCopy(format);
    setCopiedNotification(true);
    setCopyDropdown(false);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[94%] bg-slate-900/95 border border-rose-500/40 rounded-2xl shadow-2xl backdrop-blur-lg px-4 py-3 text-xs text-white ring-1 ring-white/10 animate-in slide-in-from-bottom-4 duration-150">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Selection Information */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-bold text-xs">
            <span>{selectedCount.toLocaleString()}</span>
            <span className="font-sans font-normal text-[11px] text-rose-100">selected</span>
          </div>

          {selectedCount < totalFilteredCount && (
            <button
              onClick={onSelectAllFiltered}
              className="text-rose-400 hover:text-rose-300 underline font-semibold text-xs transition cursor-pointer"
            >
              Select all {totalFilteredCount.toLocaleString()} filtered
            </button>
          )}

          <button
            onClick={onClearSelection}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Clear Selection (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Copy Dropdown / Button */}
          <div className="relative">
            <div className="flex items-center rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold transition">
              <button
                onClick={() => handleCopyClick('email')}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:text-white cursor-pointer"
                title="Copy raw emails"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-rose-400" />
                    <span>Copy Emails</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setCopyDropdown(!copyDropdown)}
                className="px-1.5 py-1.5 border-l border-slate-700 hover:bg-slate-700 rounded-r-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {copyDropdown && (
              <div
                className="absolute bottom-full mb-2 left-0 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1 z-50"
                onMouseLeave={() => setCopyDropdown(false)}
              >
                <button
                  onClick={() => handleCopyClick('email')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between"
                >
                  <span>Raw Email Addresses</span>
                  <span className="text-[10px] text-slate-500 font-mono">user@...</span>
                </button>
                <button
                  onClick={() => handleCopyClick('identity')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between"
                >
                  <span>Formatted Identities</span>
                  <span className="text-[10px] text-slate-500 font-mono">Name &lt;...&gt;</span>
                </button>
                <button
                  onClick={() => handleCopyClick('json')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between"
                >
                  <span>Full JSON Array</span>
                  <span className="text-[10px] text-slate-500 font-mono">[{'{}'}]</span>
                </button>
              </div>
            )}
          </div>

          {/* Regenerate Selected Identities */}
          {onBulkRegenerate && (
            <button
              onClick={onBulkRegenerate}
              title="Regenerate synthetic personas for selected identities"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white font-semibold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span>Regenerate Personas</span>
            </button>
          )}

          {/* Star / Unstar */}
          <button
            onClick={() => onBulkStar(true)}
            title="Star Selected"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium transition cursor-pointer"
          >
            ★
          </button>
          <button
            onClick={() => onBulkStar(false)}
            title="Unstar Selected"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium transition cursor-pointer"
          >
            ☆
          </button>

          {/* Status Change Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setStatusDropdown(!statusDropdown);
                setLabelDropdown(false);
                setExportDropdown(false);
                setCopyDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {statusDropdown && (
              <div
                className="absolute bottom-full mb-2 left-0 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1 z-50"
                onMouseLeave={() => setStatusDropdown(false)}
              >
                <button
                  onClick={() => {
                    onBulkMarkStatus('used');
                    setStatusDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300 font-medium transition"
                >
                  Mark as Used
                </button>
                <button
                  onClick={() => {
                    onBulkMarkStatus('unused');
                    setStatusDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition"
                >
                  Mark as Unused
                </button>
                <button
                  onClick={() => {
                    onBulkMarkStatus('reserved');
                    setStatusDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 font-medium transition"
                >
                  Mark as Reserved
                </button>
                <button
                  onClick={() => {
                    onBulkMarkStatus('archived');
                    setStatusDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 font-medium transition"
                >
                  Archive Selected
                </button>
              </div>
            )}
          </div>

          {/* Label Assign Dropdown */}
          {labels.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setLabelDropdown(!labelDropdown);
                  setStatusDropdown(false);
                  setExportDropdown(false);
                  setCopyDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-rose-400" />
                <span>Label</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {labelDropdown && (
                <div
                  className="absolute bottom-full mb-2 left-0 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1 max-h-52 overflow-y-auto z-50"
                  onMouseLeave={() => setLabelDropdown(false)}
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                    Assign Label
                  </div>
                  {labels.map((lbl) => (
                    <button
                      key={lbl.id}
                      onClick={() => {
                        onBulkAssignLabel(lbl.id);
                        setLabelDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs flex items-center gap-2 transition"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: lbl.color || '#e11d48' }}
                      />
                      <span className="truncate">{lbl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setExportDropdown(!exportDropdown);
                setStatusDropdown(false);
                setLabelDropdown(false);
                setCopyDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {exportDropdown && (
              <div
                className="absolute bottom-full mb-2 right-0 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1 z-50"
                onMouseLeave={() => setExportDropdown(false)}
              >
                <button
                  onClick={() => {
                    onBulkExport('csv');
                    setExportDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    onBulkExport('txt');
                    setExportDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition"
                >
                  Export TXT (Emails)
                </button>
                <button
                  onClick={() => {
                    onBulkExport('json');
                    setExportDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>

          {/* Bulk Archive / Delete */}
          <button
            onClick={() => onBulkMarkStatus('archived')}
            title="Archive Selected"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onBulkDelete}
            title="Delete Selected"
            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};


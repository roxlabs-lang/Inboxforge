import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Save,
  X,
  Sliders,
  Tag,
  ShieldCheck,
  Download,
  Upload,
  Check,
  Info,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { CustomInstructions, Label, VariantStatus } from '../types';
import { db } from '../database/db';

interface CustomInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  labels: Label[];
  onInstructionsUpdated?: (instructions: CustomInstructions) => void;
}

export const CustomInstructionsModal: React.FC<CustomInstructionsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  labels,
  onInstructionsUpdated,
}) => {
  const [instructions, setInstructions] = useState<CustomInstructions>({
    workspaceId,
    namingConvention: 'qa.{username}+{tag}',
    generationPrefix: '',
    generationSuffix: '',
    autoApplyLabels: [],
    defaultVariantStatus: 'unused',
    exportFormatTemplate: 'standard',
    mockLatencyMs: 60,
    mockFailureRate: 0,
    simulatedOtpLength: 6,
    defaultPassword: 'TestPassword123!',
    customNotes: 'All generated identities in this project are strictly synthetic QA test records for local verification.',
    updatedAt: Date.now(),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    setIsLoading(true);
    db.getCustomInstructions(workspaceId)
      .then((data) => {
        if (data) {
          setInstructions(data);
        } else {
          setInstructions((prev) => ({
            ...prev,
            workspaceId,
            updatedAt: Date.now(),
          }));
        }
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updated: CustomInstructions = {
      ...instructions,
      workspaceId,
      updatedAt: Date.now(),
    };
    await db.saveCustomInstructions(updated);
    await db.addLog({
      id: `log_rules_${Date.now()}`,
      workspaceId,
      type: 'custom_rules_updated',
      details: 'Updated workspace custom instructions and QA rules',
      timestamp: Date.now(),
    });
    if (onInstructionsUpdated) onInstructionsUpdated(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(instructions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-rules-${workspaceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed !== 'object') throw new Error('Invalid JSON format');
        setInstructions({
          ...instructions,
          ...parsed,
          workspaceId,
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const toggleLabel = (labelId: string) => {
    setInstructions((prev) => {
      const exists = prev.autoApplyLabels.includes(labelId);
      return {
        ...prev,
        autoApplyLabels: exists
          ? prev.autoApplyLabels.filter((id) => id !== labelId)
          : [...prev.autoApplyLabels, labelId],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Custom Instructions & QA Rules</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  PERSISTENT
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Define generation conventions, automated labeling, test parameters, and formatting output.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {importError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Section 1: Generation & Naming Conventions */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Generation Rules & Naming Conventions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Naming Convention Pattern
                </label>
                <input
                  type="text"
                  value={instructions.namingConvention || ''}
                  onChange={(e) =>
                    setInstructions({ ...instructions, namingConvention: e.target.value })
                  }
                  placeholder="e.g. qa.{username}+{tag}"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Template tags: &#123;username&#125;, &#123;index&#125;, &#123;tag&#125;
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Variant Status on Creation
                </label>
                <select
                  value={instructions.defaultVariantStatus}
                  onChange={(e) =>
                    setInstructions({
                      ...instructions,
                      defaultVariantStatus: e.target.value as VariantStatus,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="unused">Unused (Available)</option>
                  <option value="reserved">Reserved (Staged for Test)</option>
                  <option value="used">Used (Active in Test)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Auto-applied Labels */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Auto-Apply Labels on Generation</span>
              </label>
              {labels.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No labels created in this workspace yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {labels.map((lbl) => {
                    const isSelected = instructions.autoApplyLabels.includes(lbl.id);
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => toggleLabel(lbl.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: lbl.color }}
                        />
                        <span>{lbl.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Output Formatting Templates */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Output Formatting & Export Template
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Export Format Style
                </label>
                <select
                  value={instructions.exportFormatTemplate}
                  onChange={(e) =>
                    setInstructions({
                      ...instructions,
                      exportFormatTemplate: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="standard">Standard Raw Email (1 per line)</option>
                  <option value="rfc_name_email">RFC Formatted ("QA User" &lt;email&gt;)</option>
                  <option value="json_array">JSON Array of Objects</option>
                  <option value="csv_extended">CSV Extended (Status, Labels, Counts)</option>
                  <option value="sql_insert">SQL INSERT INTO queries</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Header / Column Name
                </label>
                <input
                  type="text"
                  value={instructions.customExportHeader || ''}
                  onChange={(e) =>
                    setInstructions({ ...instructions, customExportHeader: e.target.value })
                  }
                  placeholder="e.g. test_recipient_email"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Test Automation & Mock Configuration */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Test Sandbox & Simulator Defaults</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Simulated Latency ({instructions.mockLatencyMs}ms)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={20}
                  value={instructions.mockLatencyMs}
                  onChange={(e) =>
                    setInstructions({ ...instructions, mockLatencyMs: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Simulated OTP Length
                </label>
                <select
                  value={instructions.simulatedOtpLength}
                  onChange={(e) =>
                    setInstructions({ ...instructions, simulatedOtpLength: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={4}>4 Digits</option>
                  <option value={6}>6 Digits (Standard)</option>
                  <option value={8}>8 Digits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Mock Password
                </label>
                <input
                  type="text"
                  value={instructions.defaultPassword || ''}
                  onChange={(e) =>
                    setInstructions({ ...instructions, defaultPassword: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Project QA Guidelines & Instructions */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              4. Project QA Instructions & Prompt Notes
            </label>
            <textarea
              rows={4}
              value={instructions.customNotes || ''}
              onChange={(e) => setInstructions({ ...instructions, customNotes: e.target.value })}
              placeholder="Add project-specific testing requirements, staging environment URLs, credential rules, or QA guidelines..."
              className="w-full p-3 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Rules</span>
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Rules</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Rules Saved!' : 'Save Instructions'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Label } from '../types';

interface LabelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  labels: Label[];
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export const LabelManagerModal: React.FC<LabelManagerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  labels,
  onCreateLabel,
  onDeleteLabel,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateLabel(name.trim(), color);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Manage Labels</h3>
              <p className="text-[11px] text-slate-400">Categorize and tag your email variants</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="p-5 space-y-3 bg-slate-950/50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New label name (e.g. Production QA, Billing)..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Color:</span>
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full flex items-center justify-center transition cursor-pointer"
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </form>

        {/* Existing Labels List */}
        <div className="p-5 max-h-64 overflow-y-auto space-y-2">
          <div className="text-[11px] uppercase font-bold text-slate-400 mb-2">
            Existing Labels ({labels.length})
          </div>
          {labels.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No labels created yet.</div>
          ) : (
            labels.map((lbl) => (
              <div
                key={lbl.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lbl.color || '#6366f1' }}
                  />
                  <span className="font-semibold text-white">{lbl.name}</span>
                </div>
                <button
                  onClick={() => onDeleteLabel(lbl.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

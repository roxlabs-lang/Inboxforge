import React, { useState } from 'react';
import {
  Zap,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  ArrowRight,
  ServerOff,
} from 'lucide-react';
import { validateGmailAddress } from '../utils/validation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCreateWorkspace: (name: string, baseEmail: string, username: string, domain: string) => Promise<void>;
  isFirstWorkspace?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkspace,
  isFirstWorkspace = false,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validation = validateGmailAddress(emailInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = validateGmailAddress(emailInput);
    if (!res.isValid || !res.baseEmail || !res.username || !res.domain) {
      setError(res.error || 'Invalid Gmail address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = workspaceName.trim() || `${res.username} Workspace`;
      await onCreateWorkspace(finalName, res.baseEmail, res.username, res.domain);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = () => {
    setEmailInput('alex.developer@gmail.com');
    setWorkspaceName('Developer Testing');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in duration-150">
        {/* Banner Header */}
        <div className="relative px-6 pt-8 pb-6 border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-900">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                INBOX<span className="text-indigo-400">FORGE</span>
              </h2>
              <p className="text-xs text-slate-400">
                Finite Mathematical Gmail Identity Workspace
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            Enter a Gmail address you control to establish your local-first identity testbed.
            All variations map mathematically to this central inbox.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Central Gmail Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Central Gmail Mailbox <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoFocus
                placeholder="yourname@gmail.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] pt-0.5">
              <span className="text-slate-400">
                Must be a valid @gmail.com or @googlemail.com address.
              </span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Use sample email
              </button>
            </div>
          </div>

          {/* Optional Workspace Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Workspace Name <span className="text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Main Gmail Testing, Signup QA"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Live Mathematical Preview */}
          {validation.isValid && validation.username && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
              <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                <span>Deterministic Calculation Preview</span>
                <span className="font-mono text-slate-400 text-[11px]">
                  2^({validation.username.length} - 1)
                </span>
              </div>
              <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-slate-500">Base: </span>
                  <span className="text-white font-semibold">{validation.baseEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500">Variants: </span>
                  <span className="text-emerald-400 font-bold">
                    {(1n << BigInt(Math.max(0, validation.username.length - 1))).toLocaleString()} combinations
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Security & Local-First Assurance Badge */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict Zero-Credentials Security Model</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>No passwords or tokens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ServerOff className="w-3 h-3 text-slate-500" />
                <span>100% Local IndexedDB</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!isFirstWorkspace && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !emailInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <span>CREATE WORKSPACE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

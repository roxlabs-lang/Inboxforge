import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Zap,
  Activity,
  Settings as SettingsIcon,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Database,
  Check,
  FileCode,
  LayoutTemplate,
  Copy,
  FolderPlus,
  Mail,
  RefreshCw,
  Cpu,
  Sun,
  Moon,
} from 'lucide-react';
import { Workspace, ConnectedGmailAccount, GeneratorProgress } from '../types';
import { db } from '../database/db';
import { getCachedAccessToken } from '../services/auth';
import { mailboxManager } from '../services/MailboxManager';
import { nativeBridge } from '../services/nativeBridge';

interface HeaderProps {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  onSelectWorkspace: (id: string) => void;
  onNewWorkspace: () => void;
  onDuplicateWorkspace: () => void;
  onOpenTemplates: () => void;
  onOpenCustomInstructions: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onOpenCorrectnessTests: () => void;
  onStartDemoMode: () => void;
  onOpenAccountSwitcher: () => void;
  onOpenJobsDashboard: () => void;
  theme?: 'dark' | 'light' | 'system';
  onToggleTheme?: () => void;
  progress?: GeneratorProgress;
  stats: {
    total: number;
    starred: number;
    used: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onNewWorkspace,
  onDuplicateWorkspace,
  onOpenTemplates,
  onOpenCustomInstructions,
  onOpenSettings,
  onOpenDiagnostics,
  onOpenCorrectnessTests,
  onStartDemoMode,
  onOpenAccountSwitcher,
  onOpenJobsDashboard,
  theme = 'dark',
  onToggleTheme,
  progress,
  stats,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [primaryAccount, setPrimaryAccount] = useState<ConnectedGmailAccount | null>(null);

  useEffect(() => {
    // Subscribe to mailbox changes in real-time
    const unsubscribe = mailboxManager.subscribe((_, active) => {
      setPrimaryAccount(active);
    });
    return () => unsubscribe();
  }, []);

  const isJobRunning = progress?.state === 'running' || progress?.state === 'starting';

  return (
    <header className="h-16 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur px-3 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Left: Brand & Workspace Switcher */}
      <div className="flex items-center gap-2 md:gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/20 ring-1 ring-white/10 flex-shrink-0">
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-white text-base md:text-lg flex items-center gap-1">
                INBOX<span className="text-rose-500">FORGE</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/50 rounded-md tracking-wider">
                VOX LOCAL-FIRST
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Dropdown */}
        {currentWorkspace && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-zinc-200 text-xs md:text-sm font-medium transition cursor-pointer shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="max-w-[100px] md:max-w-[170px] truncate font-bold text-zinc-100">
                {currentWorkspace.name}
              </span>
              <span className="hidden md:inline text-zinc-400 text-xs font-mono truncate">
                ({currentWorkspace.baseEmail})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl z-50 py-1.5 divide-y divide-zinc-800"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Workspaces ({workspaces.length})</span>
                </div>

                <div className="max-h-48 overflow-y-auto py-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-800 transition cursor-pointer ${
                        ws.id === currentWorkspace.id ? 'bg-rose-950/20 text-rose-300 font-bold' : 'text-zinc-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold">{ws.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono truncate">{ws.baseEmail}</div>
                      </div>
                      {ws.id === currentWorkspace.id && (
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Workspace Quick Actions */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onDuplicateWorkspace();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Clone Current Workspace</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenTemplates();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
                    <span>New from Template...</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onNewWorkspace();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Blank Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center/Right: Connected Gmail & Active Job Status */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Connected Gmail Account Pill */}
        <button
          onClick={onOpenAccountSwitcher}
          title="Manage connected Google/Gmail accounts"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs transition cursor-pointer"
        >
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${primaryAccount ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-[11px] font-semibold text-zinc-200 truncate max-w-[130px]">
              {primaryAccount ? primaryAccount.email : 'No Gmail Linked'}
            </div>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {primaryAccount ? 'Switch' : 'Connect'}
          </span>
        </button>

        {/* Persistent Background Job Status Pill */}
        <button
          onClick={onOpenJobsDashboard}
          title="Open persistent background jobs dashboard"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            isJobRunning
              ? 'bg-purple-950/40 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Cpu className={`w-3.5 h-3.5 ${isJobRunning ? 'text-purple-400 animate-spin' : 'text-zinc-400'}`} />
          <span className="hidden sm:inline">
            {isJobRunning ? (
              <span>Jobs ({progress?.ratePerSecond?.toLocaleString() || 0}/s)</span>
            ) : (
              <span>Jobs</span>
            )}
          </span>
        </button>

        {/* Quick Badges */}
        {currentWorkspace && (
          <div className="hidden xl:flex items-center gap-3 bg-zinc-950 border border-zinc-800/90 rounded-xl px-3 py-1 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Database className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-mono font-bold text-zinc-100">{stats.total.toLocaleString()}</span>
              <span className="text-zinc-500 text-[10px]">identities</span>
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            <div className="flex items-center gap-1 text-amber-400">
              <span>★</span>
              <span className="font-mono font-bold">{stats.starred.toLocaleString()}</span>
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-mono font-bold">{stats.used.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Custom Instructions */}
        <button
          onClick={onOpenCustomInstructions}
          title="Custom instructions & QA rules"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden 2xl:inline">Rules</span>
        </button>

        {/* Templates */}
        <button
          onClick={onOpenTemplates}
          title="Browse QA scenario templates"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden 2xl:inline">Templates</span>
        </button>

        {/* Demo Mode Button */}
        <button
          onClick={onStartDemoMode}
          title="Launch instant demo workspace"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Demo</span>
        </button>

        {/* Correctness Tests */}
        <button
          onClick={onOpenCorrectnessTests}
          title="Run generator correctness and math verification tests"
          className="p-2 md:px-2.5 md:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span className="hidden lg:inline">Verify</span>
        </button>

        {/* Diagnostics Button */}
        <button
          onClick={onOpenDiagnostics}
          title="Storage & Diagnostics"
          className="p-2 md:px-2.5 md:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="hidden 2xl:inline">Health</span>
        </button>

        {/* Global Theme Quick Toggle */}
        {onToggleTheme && (
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('selection');
              onToggleTheme();
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer flex items-center justify-center"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-zinc-300" />
        </button>
      </div>
    </header>
  );
};


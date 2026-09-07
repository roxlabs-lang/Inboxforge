import React from 'react';
import {
  Mail,
  Zap,
  CheckCircle2,
  Bookmark,
  Star,
  FolderKanban,
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Database,
  Inbox,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { Workspace, Project, TestCase, MockEmail, OTPRecord } from '../types';
import { defaultGmailGenerator } from '../generators/GmailDotVariantGenerator';

interface DashboardViewProps {
  workspace: Workspace;
  variantCounts: {
    total: number;
    unused: number;
    reserved: number;
    used: number;
    archived: number;
    starred: number;
  };
  projects: Project[];
  testCases: TestCase[];
  emails?: MockEmail[];
  otps?: OTPRecord[];
  onNavigateTab: (tab: any) => void;
  onOpenGenerator: () => void;
  onStartDemoMode: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  variantCounts,
  projects,
  testCases,
  emails = [],
  otps = [],
  onNavigateTab,
  onOpenGenerator,
  onStartDemoMode,
}) => {
  const passedTests = testCases.filter((tc) => tc.status === 'Passed').length;
  const failedTests = testCases.filter((tc) => tc.status === 'Failed').length;
  const totalFiniteSpace = defaultGmailGenerator.estimate(workspace.username, workspace.domain);

  const inboxMessages = emails.filter((e) => e.folder === 'inbox').length;
  const unreadMessages = emails.filter((e) => e.folder === 'inbox' && !e.isRead).length;
  const totalOtpMessages = otps.length + emails.filter((e) => !!e.extractedOtp).length;

  const usagePercent =
    variantCounts.total > 0
      ? Math.round((variantCounts.used / variantCounts.total) * 100)
      : 0;

  const reservedPercent =
    variantCounts.total > 0
      ? Math.round((variantCounts.reserved / variantCounts.total) * 100)
      : 0;

  const unusedPercent =
    variantCounts.total > 0
      ? Math.round((variantCounts.unused / variantCounts.total) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Central Mailbox & Finite Mathematical Space */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Workspace</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {workspace.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 pt-1">
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-bold">{workspace.baseEmail}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400">
                Username: <span className="text-indigo-300">{workspace.username}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400">
                Mathematical Space: <span className="text-emerald-400 font-bold">{totalFiniteSpace.toLocaleString()}</span> (2^{Math.max(0, workspace.username.length - 1)})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenGenerator}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>GENERATE VARIANTS</span>
            </button>
            <button
              onClick={() => onNavigateTab('identities')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              <span>Explore Table</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 12 Key Dashboard Metrics Cards (Derived from actual persisted data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Base Mailbox */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>CANONICAL</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xs font-bold text-white font-mono truncate" title={workspace.baseEmail}>
            {workspace.baseEmail}
          </div>
          <div className="text-[10px] text-slate-400">Base Mailbox</div>
        </div>

        {/* 2. Total Identities */}
        <div
          onClick={() => onNavigateTab('identities')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>IDENTITIES</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {variantCounts.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">
            Of {totalFiniteSpace.toLocaleString()} total
          </div>
        </div>

        {/* 3. Unused */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>UNUSED</span>
            <span className="w-2 h-2 rounded-full bg-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-300 font-mono">
            {variantCounts.unused.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{unusedPercent}% available</div>
        </div>

        {/* 4. Reserved */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>RESERVED</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {variantCounts.reserved.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Held for active tests</div>
        </div>

        {/* 5. Used */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>USED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {variantCounts.used.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{usagePercent}% utilized</div>
        </div>

        {/* 6. Starred */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>STARRED</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300 font-mono">
            {variantCounts.starred.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Priority bookmarked</div>
        </div>

        {/* 7. Projects */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>PROJECTS</span>
            <FolderKanban className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {projects.length}
          </div>
          <div className="text-[10px] text-slate-400">Active test suites</div>
        </div>

        {/* 8. Test Cases */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>TEST CASES</span>
            <FlaskConical className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl font-black text-violet-300 font-mono">
            {testCases.length}
          </div>
          <div className="text-[10px] text-slate-400">Workflow test specs</div>
        </div>

        {/* 9. Passed Tests */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>PASSED</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {passedTests}
          </div>
          <div className="text-[10px] text-slate-400">Verified working</div>
        </div>

        {/* 10. Failed Tests */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>FAILED</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono">
            {failedTests}
          </div>
          <div className="text-[10px] text-slate-400">Need investigation</div>
        </div>

        {/* 11. Inbox & Unread Messages */}
        <div
          onClick={() => onNavigateTab('inbox')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>TEST INBOX</span>
            <Inbox className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {inboxMessages}
            {unreadMessages > 0 && (
              <span className="text-xs text-indigo-400 ml-1 font-bold">({unreadMessages} unread)</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">Simulated messages</div>
        </div>

        {/* 12. OTP Codes Recorded */}
        <div
          onClick={() => onNavigateTab('otp_inbox')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>TEST OTPS</span>
            <KeyRound className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {totalOtpMessages}
          </div>
          <div className="text-[10px] text-slate-400">Captured passcodes</div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Identity Status Distribution</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {variantCounts.total.toLocaleString()} total
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
            {variantCounts.unused > 0 && (
              <div
                style={{ width: `${(variantCounts.unused / variantCounts.total) * 100}%` }}
                className="bg-slate-600 h-full rounded-l-full transition-all"
                title={`Unused: ${variantCounts.unused}`}
              />
            )}
            {variantCounts.reserved > 0 && (
              <div
                style={{ width: `${(variantCounts.reserved / variantCounts.total) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Reserved: ${variantCounts.reserved}`}
              />
            )}
            {variantCounts.used > 0 && (
              <div
                style={{ width: `${(variantCounts.used / variantCounts.total) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Used: ${variantCounts.used}`}
              />
            )}
            {variantCounts.archived > 0 && (
              <div
                style={{ width: `${(variantCounts.archived / variantCounts.total) * 100}%` }}
                className="bg-rose-500 h-full rounded-r-full transition-all"
                title={`Archived: ${variantCounts.archived}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>Unused</span>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {variantCounts.unused.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Reserved</span>
              </div>
              <div className="text-base font-bold font-mono text-amber-300 mt-1">
                {variantCounts.reserved.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Used</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-300 mt-1">
                {variantCounts.used.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Archived</span>
              </div>
              <div className="text-base font-bold font-mono text-rose-300 mt-1">
                {variantCounts.archived.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launchpad & Test Lab summary */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-400" />
              <span>Local Test Lab</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Test signup and login workflows locally with deterministic OTP generation, synthetic payloads, and mock authentication endpoints.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigateTab('test_lab')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition cursor-pointer"
            >
              <span>Launch Mock Auth Simulator</span>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
            <button
              onClick={() => onNavigateTab('inbox')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition cursor-pointer"
            >
              <span>Simulated Test Inbox</span>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
            <button
              onClick={() => onNavigateTab('projects')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition cursor-pointer"
            >
              <span>Manage Test Cases</span>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  Mail,
  FolderKanban,
  Inbox,
  FlaskConical,
  History,
  HardDrive,
  Tag,
  Zap,
  LayoutTemplate,
  FileCode,
} from 'lucide-react';

export type ActiveNavTab =
  | 'dashboard'
  | 'identities'
  | 'projects'
  | 'inbox'
  | 'test_lab'
  | 'activity'
  | 'storage';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onChangeTab: (tab: ActiveNavTab) => void;
  onOpenLabelManager: () => void;
  onOpenGeneratorModal: () => void;
  onOpenTemplates: () => void;
  onOpenCustomInstructions: () => void;
  identityCount: number;
  emailCount: number;
  testCaseCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  onOpenLabelManager,
  onOpenGeneratorModal,
  onOpenTemplates,
  onOpenCustomInstructions,
  identityCount,
  emailCount,
  testCaseCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'identities' as ActiveNavTab,
      label: 'Identity Explorer',
      icon: Mail,
      badge: identityCount > 0 ? identityCount.toLocaleString() : undefined,
    },
    {
      id: 'projects' as ActiveNavTab,
      label: 'Projects & Tests',
      icon: FolderKanban,
      badge: testCaseCount > 0 ? testCaseCount.toString() : undefined,
    },
    {
      id: 'inbox' as ActiveNavTab,
      label: 'Test Inbox & OTP',
      icon: Inbox,
      badge: emailCount > 0 ? emailCount.toString() : undefined,
      badgeColor: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
    },
    {
      id: 'test_lab' as ActiveNavTab,
      label: 'Local Test Lab',
      icon: FlaskConical,
    },
    {
      id: 'activity' as ActiveNavTab,
      label: 'Activity Log',
      icon: History,
    },
    {
      id: 'storage' as ActiveNavTab,
      label: 'Storage & Backup',
      icon: HardDrive,
    },
  ];

  return (
    <aside className="w-64 bg-zinc-950/90 border-r border-zinc-800/80 flex flex-col justify-between flex-shrink-0 select-none">
      {/* Primary Nav Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-rose-950/30 text-rose-200 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions at Bottom of Sidebar */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Workspace Actions
        </div>
        <button
          onClick={onOpenGeneratorModal}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Generate Variants</span>
        </button>

        <button
          onClick={onOpenTemplates}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs transition cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />
          <span>QA Templates</span>
        </button>

        <button
          onClick={onOpenCustomInstructions}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs transition cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-rose-400" />
          <span>Rules & Instructions</span>
        </button>

        <button
          onClick={onOpenLabelManager}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs transition cursor-pointer"
        >
          <Tag className="w-3.5 h-3.5 text-amber-400" />
          <span>Manage Labels</span>
        </button>
      </div>
    </aside>
  );
};

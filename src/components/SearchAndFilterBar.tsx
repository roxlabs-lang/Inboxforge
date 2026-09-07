import React from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  X,
  SlidersHorizontal,
  Plus,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Label, IdentityType } from '../types';

export type FilterStatus =
  | 'all'
  | 'unused'
  | 'reserved'
  | 'used'
  | 'starred'
  | 'archived'
  | 'recently_copied'
  | 'frequently_used';

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'email_asc'
  | 'email_desc'
  | 'name_asc'
  | 'name_desc'
  | 'type'
  | 'recently_copied'
  | 'most_copied'
  | 'most_used'
  | 'starred_first';

export type IdentityTypeFilter = 'all' | IdentityType;

interface SearchAndFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  selectedIdentityType?: IdentityTypeFilter;
  onIdentityTypeChange?: (type: IdentityTypeFilter) => void;
  selectedLabelId: string;
  onLabelChange: (labelId: string) => void;
  labels: Label[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalFilteredCount: number;
  onOpenGenerator?: () => void;
  onGenerateMore?: () => void;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  selectedIdentityType = 'all',
  onIdentityTypeChange,
  selectedLabelId,
  onLabelChange,
  labels,
  sortBy,
  onSortChange,
  totalFilteredCount,
  onOpenGenerator,
  onGenerateMore,
}) => {
  const filterPills: { id: FilterStatus; label: string; countBadge?: string }[] = [
    { id: 'all', label: 'All Identities' },
    { id: 'unused', label: 'Unused' },
    { id: 'reserved', label: 'Reserved' },
    { id: 'used', label: 'Used' },
    { id: 'starred', label: '⭐ Favorites' },
    { id: 'archived', label: '📦 Archive' },
    { id: 'recently_copied', label: 'Recently Copied' },
    { id: 'frequently_used', label: 'Frequently Used' },
  ];

  const identityTypePills: { id: IdentityTypeFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All Personas', icon: '🌐' },
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'creator', label: 'Creator', icon: '✨' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'startup', label: 'Startup', icon: '🚀' },
    { id: 'project', label: 'Project / Bot', icon: '🤖' },
  ];

  return (
    <div className="space-y-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur">
      {/* Top Row: Search Input + Label Filter + Sort Dropdown + Generator Triggers */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search email, persona name, role, organization, username, notes... (Ctrl+K)"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition font-medium"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Label Filter Dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={selectedLabelId}
              onChange={(e) => onLabelChange(e.target.value)}
              className="px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 transition cursor-pointer pr-8"
            >
              <option value="">All Labels</option>
              {labels.map((lbl) => (
                <option key={lbl.id} value={lbl.id}>
                  🏷️ {lbl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="px-3 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 transition cursor-pointer pr-8"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="name_asc">Sort: Persona Name (A-Z)</option>
              <option value="name_desc">Sort: Persona Name (Z-A)</option>
              <option value="email_asc">Sort: Email (A-Z)</option>
              <option value="email_desc">Sort: Email (Z-A)</option>
              <option value="type">Sort: Identity Type</option>
              <option value="recently_copied">Sort: Recently Copied</option>
              <option value="most_copied">Sort: Most Copied</option>
              <option value="most_used">Sort: Most Used</option>
              <option value="starred_first">Sort: Starred First</option>
            </select>
          </div>

          {/* Generator Controls */}
          {onGenerateMore && (
            <button
              onClick={onGenerateMore}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-rose-300 hover:text-white font-semibold text-xs transition cursor-pointer whitespace-nowrap shadow-sm"
              title="Generate more varied synthetic identities"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Generate More</span>
            </button>
          )}

          {onOpenGenerator && (
            <button
              onClick={onOpenGenerator}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs transition cursor-pointer whitespace-nowrap shadow-md shadow-rose-900/30"
              title="Open Full Generator"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>Generator</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Identity Type Filter Pills */}
      {onIdentityTypeChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none border-t border-slate-800/60 pt-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex-shrink-0">
            Persona:
          </span>
          {identityTypePills.map((pill) => {
            const isActive = selectedIdentityType === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onIdentityTypeChange(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-rose-600/90 text-white shadow-sm shadow-rose-600/30 ring-1 ring-rose-400/40'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Row: Status Filter Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none border-t border-slate-800/60 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex-shrink-0">
            Status:
          </span>
          {filterPills.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onFilterChange(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-500'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/60'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap pl-2 flex-shrink-0">
          <span className="font-semibold text-rose-400">{totalFilteredCount.toLocaleString()}</span>{' '}
          identities
        </div>
      </div>
    </div>
  );
};

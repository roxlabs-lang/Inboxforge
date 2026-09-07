import React, { useRef, useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Star,
  CheckCircle2,
  Bookmark,
  Archive,
  Trash2,
  Edit2,
  Tag,
  Mail,
  Zap,
  MoreVertical,
  RefreshCw,
  User,
  Sparkles,
  Building2,
  Rocket,
  Bot,
} from 'lucide-react';
import { Label, Variant, VariantStatus, IdentityType } from '../types';

interface VirtualizedTableProps {
  variants: Variant[];
  totalCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onCopyEmail: (email: string, id: string) => Promise<void>;
  onCopyIdentityFormatted?: (variant: Variant) => Promise<void>;
  onRegenerateIdentity?: (id: string) => Promise<void>;
  onToggleStar: (id: string, current: boolean) => Promise<void>;
  onUpdateStatus: (id: string, status: VariantStatus) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onDeleteVariant: (id: string) => Promise<void>;
  onOpenGenerator: () => void;
  labelsMap: Map<string, Label>;
  onAssignLabelModal?: (variant: Variant) => void;
}

const ROW_HEIGHT = 58; // px per row
const OVERSCAN = 10; // buffer rows

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  variants,
  totalCount,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onClearSelection,
  onCopyEmail,
  onCopyIdentityFormatted,
  onRegenerateIdentity,
  onToggleStar,
  onUpdateStatus,
  onUpdateNotes,
  onDeleteVariant,
  onOpenGenerator,
  labelsMap,
  onAssignLabelModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState<string>('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const containerHeight = 620;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = variants.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endIndex = Math.min(variants.length, startIndex + visibleCount);

  const visibleRows = useMemo(() => {
    return variants.slice(startIndex, endIndex).map((item, index) => ({
      item,
      virtualIndex: startIndex + index,
      top: (startIndex + index) * ROW_HEIGHT,
    }));
  }, [variants, startIndex, endIndex]);

  const allVisibleSelected =
    variants.length > 0 && variants.every((v) => selectedIds.has(v.id));

  const handleCopy = async (id: string, email: string) => {
    await onCopyEmail(email, id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyFormatted = async (item: Variant) => {
    if (onCopyIdentityFormatted) {
      await onCopyIdentityFormatted(item);
    } else {
      const formatted = item.identityName
        ? `${item.identityName} <${item.email}>`
        : item.email;
      await navigator.clipboard.writeText(formatted);
    }
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveNotes = async (id: string) => {
    await onUpdateNotes(id, editingNotesValue);
    setEditingNotesId(null);
  };

  const getPersonaBadge = (type?: IdentityType, subCategory?: string, category?: string) => {
    let baseBadge: React.ReactNode;
    switch (type) {
      case 'creator':
        baseBadge = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            <span>CREATOR</span>
          </span>
        );
        break;
      case 'company':
        baseBadge = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Building2 className="w-2.5 h-2.5" />
            <span>COMPANY</span>
          </span>
        );
        break;
      case 'startup':
        baseBadge = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Rocket className="w-2.5 h-2.5" />
            <span>STARTUP</span>
          </span>
        );
        break;
      case 'project':
        baseBadge = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Bot className="w-2.5 h-2.5" />
            <span>PROJECT</span>
          </span>
        );
        break;
      default:
        baseBadge = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <User className="w-2.5 h-2.5" />
            <span>PERSONAL</span>
          </span>
        );
        break;
    }

    const cleanSub = subCategory
      ? subCategory.replace('fictional_', '').replace('_', ' ').toUpperCase()
      : null;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {baseBadge}
        {cleanSub && cleanSub !== 'PERSON NAME' && cleanSub !== 'CREATOR' && (
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {cleanSub}
          </span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: VariantStatus) => {
    switch (status) {
      case 'used':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            USED
          </span>
        );
      case 'reserved':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            RESERVED
          </span>
        );
      case 'archived':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ARCHIVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-400 border border-slate-700">
            UNUSED
          </span>
        );
    }
  };

  if (variants.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Mail className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No identities found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {totalCount === 0
              ? 'No email identities generated for this workspace yet. Generate synthetic test identities now.'
              : 'No identities match your current search query or active filters.'}
          </p>
        </div>
        {totalCount === 0 && (
          <button
            onClick={onOpenGenerator}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>GENERATE IDENTITIES</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none items-center sticky top-0 z-20">
        <div className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => {
              if (e.target.checked) onSelectAllVisible();
              else onClearSelection();
            }}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-slate-400">★</span>
        </div>

        <div className="col-span-5 md:col-span-4">Synthetic Identity & Email</div>
        <div className="col-span-2 hidden md:block">Persona / Type</div>
        <div className="col-span-1 hidden lg:block">Status</div>
        <div className="col-span-1 hidden xl:block">Labels</div>
        <div className="col-span-1 hidden xl:block">Notes</div>
        <div className="col-span-1 hidden sm:block text-center">Uses</div>
        <div className="col-span-6 md:col-span-2 text-right">Actions</div>
      </div>

      {/* Virtualized Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: `${containerHeight}px`, overflowY: 'auto' }}
        className="relative"
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {visibleRows.map(({ item, top }) => {
            const isSelected = selectedIds.has(item.id);
            const isCopied = copiedId === item.id;
            const isEditingNotes = editingNotesId === item.id;
            const isActionOpen = actionMenuOpenId === item.id;
            const identityDisplayName = item.identityName || item.username;

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  height: `${ROW_HEIGHT}px`,
                  left: 0,
                  right: 0,
                }}
                className={`grid grid-cols-12 gap-2 px-4 items-center border-b border-slate-800/40 text-xs transition-colors ${
                  isSelected
                    ? 'bg-rose-950/30 hover:bg-rose-950/50'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Checkbox & Star */}
                <div className="col-span-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <button
                    onClick={() => onToggleStar(item.id, item.starred)}
                    className={`cursor-pointer transition ${
                      item.starred ? 'text-amber-400 font-bold' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {item.starred ? '★' : '☆'}
                  </button>
                </div>

                {/* Identity Name + Email Address */}
                <div
                  className="col-span-5 md:col-span-4 flex flex-col justify-center min-w-0 pr-2"
                  title={`Synthetic Test Identity\nID: ${item.id}\nCreated: ${new Date(item.createdAt).toLocaleString()}${item.seedUsed ? `\nSeed: ${item.seedUsed}` : ''}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-white truncate text-xs">
                      {identityDisplayName}
                    </span>
                    {item.suffix && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1 py-0.2 rounded">
                        {item.suffix}
                      </span>
                    )}
                    <span className="text-[9px] font-mono font-medium text-slate-500 bg-slate-800/80 px-1 py-0.2 rounded border border-slate-700/60">
                      TEST
                    </span>
                    {isCopied && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.2 rounded animate-pulse">
                        <Check className="w-2.5 h-2.5" />
                        <span>Copied</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate mt-0.5">
                    <span
                      className="font-mono text-rose-300/90 hover:text-rose-200 truncate cursor-pointer select-all"
                      onClick={() => handleCopy(item.id, item.email)}
                      title="Click to copy email"
                    >
                      {item.email}
                    </span>
                    {item.organization && (
                      <span className="text-slate-500 truncate hidden sm:inline">
                        • {item.roleTitle ? `${item.roleTitle} @ ` : ''}{item.organization}
                      </span>
                    )}
                  </div>
                </div>

                {/* Persona Type Pill */}
                <div className="col-span-2 hidden md:flex items-center">
                  {getPersonaBadge(item.identityType, item.subCategory, item.identityCategory)}
                </div>

                {/* Status Pill */}
                <div className="col-span-1 hidden lg:block">
                  {getStatusBadge(item.status)}
                </div>

                {/* Labels */}
                <div className="col-span-1 hidden xl:flex items-center gap-1 overflow-hidden">
                  {item.labelIds && item.labelIds.length > 0 ? (
                    item.labelIds.slice(0, 1).map((lblId) => {
                      const lbl = labelsMap.get(lblId);
                      return (
                        <span
                          key={lblId}
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full truncate flex items-center gap-1"
                          style={{
                            backgroundColor: `${lbl?.color || '#e11d48'}20`,
                            color: lbl?.color || '#fb7185',
                            border: `1px solid ${lbl?.color || '#e11d48'}40`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: lbl?.color || '#e11d48' }}
                          />
                          {lbl?.name || 'Label'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">-</span>
                  )}
                </div>

                {/* Notes (Inline editable) */}
                <div className="col-span-1 hidden xl:block truncate text-slate-400 text-xs">
                  {isEditingNotes ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingNotesValue}
                        onChange={(e) => setEditingNotesValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNotes(item.id);
                          if (e.key === 'Escape') setEditingNotesId(null);
                        }}
                        onBlur={() => handleSaveNotes(item.id)}
                        className="w-full bg-slate-950 border border-rose-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingNotesId(item.id);
                        setEditingNotesValue(item.notes || '');
                      }}
                      className="cursor-pointer hover:text-slate-200 truncate py-0.5"
                      title={item.notes || 'Click to add notes'}
                    >
                      {item.notes ? (
                        <span className="text-slate-300 truncate">{item.notes}</span>
                      ) : (
                        <span className="text-slate-600 italic">+ note</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Copies & Uses Counters */}
                <div className="col-span-1 hidden sm:flex items-center justify-center gap-2 font-mono text-[11px]">
                  <span className="text-slate-400" title={`Copied ${item.copyCount || 0} times`}>
                    📋 {item.copyCount || 0}
                  </span>
                  <span className="text-emerald-400" title={`Used ${item.usageCount || 0} times`}>
                    ⚡ {item.usageCount || 0}
                  </span>
                </div>

                {/* Actions Dropdown & Fast Buttons */}
                <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-1.5">
                  {/* Copy Formatted Identity */}
                  <button
                    onClick={() => handleCopyFormatted(item)}
                    title={`Copy formatted: ${identityDisplayName} <${item.email}>`}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Regenerate Persona Button */}
                  {onRegenerateIdentity && (
                    <button
                      onClick={() => onRegenerateIdentity(item.id)}
                      title="Regenerate synthetic persona name & role"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-rose-300 hover:text-white transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Mark Used / Unused Toggle */}
                  {item.status === 'used' ? (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'unused')}
                      title="Mark Unused"
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'used')}
                      title="Mark Used"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* More Menu Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpenId(isActionOpen ? null : item.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isActionOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 space-y-0.5 z-40"
                        onMouseLeave={() => setActionMenuOpenId(null)}
                      >
                        <button
                          onClick={() => {
                            handleCopy(item.id, item.email);
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                        >
                          Copy Raw Email
                        </button>
                        <button
                          onClick={() => {
                            handleCopyFormatted(item);
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                        >
                          Copy Name &lt;Email&gt;
                        </button>
                        {onRegenerateIdentity && (
                          <button
                            onClick={() => {
                              onRegenerateIdentity(item.id);
                              setActionMenuOpenId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            Regenerate Persona
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onUpdateStatus(item.id, item.status === 'reserved' ? 'unused' : 'reserved');
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg transition"
                        >
                          {item.status === 'reserved' ? 'Release Identity' : 'Reserve Identity'}
                        </button>
                        <button
                          onClick={() => {
                            onUpdateStatus(item.id, item.status === 'archived' ? 'unused' : 'archived');
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                        >
                          {item.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotesId(item.id);
                            setEditingNotesValue(item.notes || '');
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                        >
                          Edit Notes
                        </button>
                        <button
                          onClick={() => {
                            onDeleteVariant(item.id);
                            setActionMenuOpenId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          Delete Identity
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

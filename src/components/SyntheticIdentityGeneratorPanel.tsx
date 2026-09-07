import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Upload,
  Layers,
  Dice5,
  KeyRound,
  ShieldAlert,
  Sliders,
  Check,
  Building2,
  Rocket,
  User,
  Bot,
  Hash,
  ChevronDown,
} from 'lucide-react';
import {
  IdentityCategory,
  IdentitySubCategory,
  IdentityType,
  Variant,
} from '../types';

interface SyntheticIdentityGeneratorPanelProps {
  onGenerate: (count: number, category: 'ALL' | IdentityCategory, subCategory: 'all' | IdentitySubCategory, seed?: string) => Promise<void>;
  onRegenerateBatch: () => Promise<void>;
  onOpenCsvImport: () => void;
  onExportCsv: () => void;
  isGenerating: boolean;
  totalVariantsCount: number;
  selectedCount: number;
  workspaceBaseUsername: string;
}

export const SyntheticIdentityGeneratorPanel: React.FC<SyntheticIdentityGeneratorPanelProps> = ({
  onGenerate,
  onRegenerateBatch,
  onOpenCsvImport,
  onExportCsv,
  isGenerating,
  totalVariantsCount,
  selectedCount,
  workspaceBaseUsername,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | IdentityCategory>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<'all' | IdentitySubCategory>('all');
  const [quantity, setQuantity] = useState<number>(25);
  const [seedMode, setSeedMode] = useState<'random' | 'deterministic'>('random');
  const [seedValue, setSeedValue] = useState<string>('test_seed_qa_01');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleCategoryChange = (cat: 'ALL' | IdentityCategory) => {
    setSelectedCategory(cat);
    setSelectedSubCategory('all');
  };

  const handleQuickQuantity = (qty: number) => {
    setQuantity(qty);
  };

  const handleTriggerGenerate = () => {
    const seed = seedMode === 'deterministic' ? seedValue : undefined;
    onGenerate(quantity, selectedCategory, selectedSubCategory, seed);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur relative overflow-hidden ring-1 ring-white/5 space-y-3.5">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-10" />

      {/* Header with Test Data Callout & Quick Import/Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Synthetic Test Identity Engine
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <ShieldAlert className="w-2.5 h-2.5" />
                <span>Synthetic Test Data Only</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                10M+ Combinations • Anti-Repetition
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-diversity realistic identities across Persons, Companies, Projects, and Usernames.
            </p>
          </div>
        </div>

        {/* CSV and Batch Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onOpenCsvImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Import synthetic test identities from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV Import</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Export synthetic test identities to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* Main Generator Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Category & Subcategory Selectors */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Identity Category & Subcategory
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="ALL">🌐 All Categories</option>
              <option value="PERSON">👤 Person (Real / Nick / Creator / Pro)</option>
              <option value="COMPANY">🏢 Company (Startup / Studio / Tech / Agency)</option>
              <option value="PROJECT">🤖 Project (Product / App / Codename / Org)</option>
              <option value="USERNAME">🏷️ Structured Username</option>
            </select>

            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">Any Subcategory</option>
              {selectedCategory === 'PERSON' && (
                <>
                  <option value="person_name">First + Last Name</option>
                  <option value="nickname">Nickname ("Ace", "Pip")</option>
                  <option value="creator">Creator-Style Name</option>
                  <option value="professional">Professional (Dr. / CFA / MD)</option>
                </>
              )}
              {selectedCategory === 'COMPANY' && (
                <>
                  <option value="fictional_company">Fictional Company</option>
                  <option value="fictional_startup">Fictional Startup / SaaS</option>
                  <option value="fictional_studio">Fictional Studio</option>
                  <option value="fictional_tech_company">Tech / Silicon Company</option>
                  <option value="fictional_agency">Creative / Growth Agency</option>
                </>
              )}
              {selectedCategory === 'PROJECT' && (
                <>
                  <option value="fictional_product">Fictional Product (TitanDB, BeaconAuth)</option>
                  <option value="fictional_application">Application (FlowTask App)</option>
                  <option value="fictional_project">Codename Project (Apollo-9, Chimera)</option>
                  <option value="fictional_organization">Organization / Consortium</option>
                </>
              )}
              {selectedCategory === 'USERNAME' && (
                <option value="structured_username">Structured Naming Patterns</option>
              )}
              {selectedCategory === 'ALL' && (
                <>
                  <option value="person_name">Person: First + Last Name</option>
                  <option value="creator">Person: Creator-Style Name</option>
                  <option value="fictional_company">Company: Enterprise / Labs</option>
                  <option value="fictional_startup">Company: Startup / SaaS</option>
                  <option value="fictional_product">Project: Product / Tool</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quantity
          </label>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/70 rounded-xl p-1">
              {[10, 25, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickQuantity(q)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                    quantity === q
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={5000}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-center text-white text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
              title="Custom quantity"
            />
          </div>
        </div>

        {/* Seed Controls (Deterministic vs Random) */}
        <div className="md:col-span-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Seed Mode
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSeedMode('random')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  seedMode === 'random'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dice5 className="w-2.5 h-2.5" />
                <span>Random</span>
              </button>
              <button
                type="button"
                onClick={() => setSeedMode('deterministic')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  seedMode === 'deterministic'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-2.5 h-2.5" />
                <span>Deterministic</span>
              </button>
            </div>
          </div>

          {seedMode === 'deterministic' ? (
            <input
              type="text"
              value={seedValue}
              onChange={(e) => setSeedValue(e.target.value)}
              placeholder="e.g. test_seed_qa_01"
              className="w-full px-2.5 py-2 bg-slate-950/80 border border-indigo-500/50 rounded-xl text-indigo-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-600"
              title="Deterministic seed generates reproducible sequence"
            />
          ) : (
            <div className="px-2.5 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-1.5">
              <Dice5 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="truncate">High-entropy natural variation</span>
            </div>
          )}
        </div>

        {/* Action Trigger Buttons */}
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            onClick={handleTriggerGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-900/30 whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-white" />
            <span>Generate ({quantity})</span>
          </button>

          <button
            onClick={onRegenerateBatch}
            disabled={isGenerating || totalVariantsCount === 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white text-xs transition cursor-pointer flex-shrink-0 disabled:opacity-40"
            title={selectedCount > 0 ? `Regenerate personas for ${selectedCount} selected identities` : "Regenerate personas for all identities"}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  Plus,
  Copy,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FolderPlus,
  Tag,
  CheckCircle2,
  Layers,
  X,
  Info,
} from 'lucide-react';
import { ProjectTemplate, Workspace } from '../types';
import { db } from '../database/db';

interface TemplatesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: Workspace | null;
  onApplyTemplateToCurrentWorkspace: (template: ProjectTemplate) => Promise<void>;
  onCreateWorkspaceFromTemplate: (template: ProjectTemplate, workspaceName: string, baseEmail: string) => Promise<void>;
}

export const TemplatesManagerModal: React.FC<TemplatesManagerModalProps> = ({
  isOpen,
  onClose,
  currentWorkspace,
  onApplyTemplateToCurrentWorkspace,
  onCreateWorkspaceFromTemplate,
}) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSuccess, setIsActionSuccess] = useState<string | null>(null);

  // New Workspace from Template Dialog
  const [isNewWsDialogOpen, setIsNewWsDialogOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsEmail, setNewWsEmail] = useState('');

  // Custom Template Editor State
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProjectTemplate>>({});

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const all = await db.getAllTemplates();
      setTemplates(all);
      if (all.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(all[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'builtin') return t.isBuiltIn;
    if (selectedCategory === 'custom') return !t.isBuiltIn;
    return t.category === selectedCategory;
  });

  const handleApplyToCurrent = async () => {
    if (!selectedTemplate || !currentWorkspace) return;
    await onApplyTemplateToCurrentWorkspace(selectedTemplate);
    setIsActionSuccess(`Applied "${selectedTemplate.name}" to workspace "${currentWorkspace.name}"!`);
    setTimeout(() => setIsActionSuccess(null), 2500);
  };

  const handleOpenNewWsDialog = () => {
    if (!selectedTemplate) return;
    setNewWsName(`${selectedTemplate.name} Suite`);
    setNewWsEmail(currentWorkspace?.baseEmail || 'qa.tester@gmail.com');
    setIsNewWsDialogOpen(true);
  };

  const handleConfirmCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !newWsName.trim() || !newWsEmail.trim()) return;
    await onCreateWorkspaceFromTemplate(selectedTemplate, newWsName.trim(), newWsEmail.trim());
    setIsNewWsDialogOpen(false);
    onClose();
  };

  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    const duplicated: ProjectTemplate = {
      ...template,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${template.name} (Copy)`,
      isBuiltIn: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.saveTemplate(duplicated);
    await loadTemplates();
    setSelectedTemplateId(duplicated.id);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await db.deleteTemplate(templateId);
    await loadTemplates();
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(templates[0]?.id || null);
    }
  };

  const handleExportTemplate = (template: ProjectTemplate) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.name || !parsed.generationSettings) {
          throw new Error('Invalid template schema');
        }
        const imported: ProjectTemplate = {
          ...parsed,
          id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          isBuiltin: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.saveTemplate(imported);
        await loadTemplates();
        setSelectedTemplateId(imported.id);
      } catch (err: any) {
        alert(`Failed to import template: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>QA Scenario & Project Templates</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  REUSABLE BLUEPRINTS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Instantly provision pre-configured test suites, labels, test cases, and custom instructions for common QA scenarios.
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

        {/* Notification Banner */}
        {isActionSuccess && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{isActionSuccess}</span>
          </div>
        )}

        {/* Content Layout: Template Selector Sidebar + Template Detail/Inspector Pane */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Sidebar: Categories & Templates List (4 cols) */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 space-y-3 flex flex-col justify-between overflow-y-auto bg-slate-950/30">
            <div className="space-y-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'ecommerce', label: 'E-Commerce' },
                  { id: 'saas', label: 'SaaS' },
                  { id: 'security', label: 'Security/2FA' },
                  { id: 'stress', label: 'Stress' },
                  { id: 'custom', label: 'Custom' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Template Items */}
              <div className="space-y-2">
                {filteredTemplates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold truncate">{t.name}</span>
                        {t.isBuiltIn ? (
                          <span className="text-[9px] font-mono uppercase bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
                            Built-in
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                        <span>{t.testCases.length} Test Cases</span>
                        <span>•</span>
                        <span>{t.labels.length} Labels</span>
                        <span>•</span>
                        <span>{(t.mockRequests || []).length} Mock APIs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Import / Create Custom Buttons */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <label className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
              </label>
            </div>
          </div>

          {/* Right Pane: Selected Template Inspector & Actions (8 cols) */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            {selectedTemplate ? (
              <div className="space-y-6">
                {/* Template Title and Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{selectedTemplate.name}</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDuplicateTemplate(selectedTemplate)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        title="Duplicate as custom template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(selectedTemplate)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        title="Export Template JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {!selectedTemplate.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* Preconfigured Test Cases */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Included Test Cases ({selectedTemplate.testCases.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedTemplate.testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300"
                      >
                        <span className="font-mono text-indigo-400 text-[11px] mt-0.5">#{idx + 1}</span>
                        <div>
                          <div className="font-semibold text-white">{tc.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{tc.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Labels and Categories */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auto-Generated Labels ({selectedTemplate.labels.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: lbl.color }}
                        />
                        <span>{lbl.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mock API Endpoints */}
                {selectedTemplate.mockRequests && selectedTemplate.mockRequests.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Pre-configured Mock API Requests ({selectedTemplate.mockRequests.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedTemplate.mockRequests.map((api, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                api.method === 'POST'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {api.method}
                            </span>
                            <span className="text-slate-300 truncate max-w-xs">{api.name}</span>
                          </div>
                          <span className="text-slate-500 text-[11px]">{api.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a template to view details
              </div>
            )}

            {/* Bottom Actions: Apply to Active vs Create Brand New Workspace */}
            {selectedTemplate && (
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={handleApplyToCurrent}
                  disabled={!currentWorkspace}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Apply to Current Workspace</span>
                </button>

                <button
                  onClick={handleOpenNewWsDialog}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create New Workspace with Template</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW WORKSPACE WITH TEMPLATE PROMPT MODAL */}
      {isNewWsDialogOpen && selectedTemplate && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-400" />
              <span>Create Workspace from Blueprint</span>
            </h4>
            <p className="text-xs text-slate-400">
              This will create a new isolated workspace pre-populated with "{selectedTemplate.name}" configuration.
            </p>

            <form onSubmit={handleConfirmCreateWorkspace} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Base Gmail Address</label>
                <input
                  type="email"
                  value={newWsEmail}
                  onChange={(e) => setNewWsEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewWsDialogOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Create & Launch Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

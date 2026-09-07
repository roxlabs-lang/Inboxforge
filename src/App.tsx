import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './database/db';
import {
  Workspace,
  Variant,
  Label,
  Project,
  TestCase,
  OTPRecord,
  ActivityLog,
  UserSettings,
  GeneratorProgress,
  GenerationCheckpoint,
  VariantStatus,
  MockEmail,
  CustomInstructions,
  ProjectTemplate,
  ConnectedGmailAccount,
} from './types';
import { GenerationController, generationController } from './generators/GenerationController';
import { copyToClipboard } from './utils/clipboard';
import { Header } from './components/Header';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { VirtualizedTable } from './components/VirtualizedTable';
import {
  SearchAndFilterBar,
  FilterStatus,
  SortOption,
  IdentityTypeFilter,
} from './components/SearchAndFilterBar';
import { BulkActionBar } from './components/BulkActionBar';
import { GenerationControlPanel } from './components/GenerationControlPanel';
import { ProjectsAndTestsView } from './components/ProjectsAndTestsView';
import { MockEmailInboxView } from './components/MockEmailInboxView';
import { LocalTestLabView } from './components/LocalTestLabView';
import { ActivityLogView } from './components/ActivityLogView';
import { StorageAndBackupView } from './components/StorageAndBackupView';
import { OnboardingModal } from './components/OnboardingModal';
import { GeneratorModal } from './components/GeneratorModal';
import { LabelManagerModal } from './components/LabelManagerModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { GeneratorCorrectnessModal } from './components/GeneratorCorrectnessModal';
import { SettingsModal } from './components/SettingsModal';
import { CustomInstructionsModal } from './components/CustomInstructionsModal';
import { TemplatesManagerModal } from './components/TemplatesManagerModal';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { JobsDashboardModal } from './components/JobsDashboardModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyntheticIdentityGeneratorPanel } from './components/SyntheticIdentityGeneratorPanel';
import { CsvImportModal } from './components/CsvImportModal';
import { backgroundJobManager } from './services/BackgroundJobManager';
import { mailboxManager } from './services/MailboxManager';
import { useDebounce } from './utils/useDebounce';
import { defaultGmailGenerator } from './generators/GmailDotVariantGenerator';
import { DataExporter } from './importExport/exporter';
import {
  generateSyntheticIdentity,
  regenerateVariantIdentity,
  SyntheticTestIdentityEngine,
} from './generators/SyntheticIdentityGenerator';
import { IdentityCategory, IdentitySubCategory } from './types';
import { WifiOff } from 'lucide-react';
import { nativeBridge } from './services/nativeBridge';

export function App() {
  // Navigation & Workspace State with Persistence
  const [activeTab, setActiveTab] = useState<ActiveNavTab>(() => {
    return (localStorage.getItem('inboxforge_active_tab') as ActiveNavTab) || 'dashboard';
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  // Entities State
  const [variants, setVariants] = useState<Variant[]>([]);
  const [totalVariantCount, setTotalVariantCount] = useState<number>(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [otps, setOtps] = useState<OTPRecord[]>([]);
  const [mockEmails, setMockEmails] = useState<MockEmail[]>([]);
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Selection & Filtering State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [identityTypeFilter, setIdentityTypeFilter] = useState<IdentityTypeFilter>('all');
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Generator & Worker State
  const [progress, setProgress] = useState<GeneratorProgress>({
    state: 'idle',
    generatedCount: 0,
    persistedCount: 0,
    processedCount: 0,
    errorCount: 0,
    totalCombinations: 0,
    percentage: 0,
    remaining: 0,
    currentBatch: 0,
    totalBatches: 0,
    batchSize: 5000,
    elapsedMs: 0,
    ratePerSecond: 0,
    estimatedRemainingSeconds: 0,
    startTime: 0,
    isPaused: false,
    isCancelled: false,
  });
  const [activeCheckpoint, setActiveCheckpoint] = useState<GenerationCheckpoint | null>(null);

  // Modals
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isCorrectnessOpen, setIsCorrectnessOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isJobsDashboardOpen, setIsJobsDashboardOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isGeneratingSynthetic, setIsGeneratingSynthetic] = useState(false);
  const [activeAccount, setActiveAccount] = useState<ConnectedGmailAccount | null>(null);

  // Settings State
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    compactMode: false,
    defaultExportFormat: 'txt',
    generationBatchSize: 5000,
    checkpointFrequency: 10000,
    confirmOnDelete: true,
  });

  // Network & Mobile Bridge State
  const [isOnline, setIsOnline] = useState<boolean>(() => nativeBridge.isOnline());

  useEffect(() => {
    return nativeBridge.onNetworkChange((online) => {
      setIsOnline(online);
    });
  }, []);

  // Synchronize dynamic Theme to <html> tag and Native Status Bar
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    nativeBridge.setStatusBarTheme(isDark);
  }, [settings.theme]);

  // Handle Quick Theme Toggle from Header
  const handleToggleTheme = async () => {
    const nextTheme: 'dark' | 'light' = settings.theme === 'light' ? 'dark' : 'light';
    const updated: UserSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    try {
      await db.saveSettings({
        id: 'app_settings',
        theme: nextTheme,
        voxTheme: updated.voxTheme || 'vox_obsidian',
        compactMode: updated.compactMode,
        defaultPageSize: 100,
        autoSaveNotes: true,
        generationBatchSize: updated.generationBatchSize,
        checkpointFrequency: updated.checkpointFrequency,
        exportFormat: updated.defaultExportFormat,
        confirmDestructiveActions: true,
        autoReconnectGmail: true,
      });
    } catch (err) {
      console.warn('Failed to save toggled theme:', err);
    }
  };

  // Hardware Android Back Button LIFO Handling
  useEffect(() => {
    return nativeBridge.registerBackHandler(() => {
      if (isSettingsOpen) { setIsSettingsOpen(false); return true; }
      if (isOnboardingOpen) { setIsOnboardingOpen(false); return true; }
      if (isGeneratorOpen) { setIsGeneratorOpen(false); return true; }
      if (isLabelManagerOpen) { setIsLabelManagerOpen(false); return true; }
      if (isDiagnosticsOpen) { setIsDiagnosticsOpen(false); return true; }
      if (isCorrectnessOpen) { setIsCorrectnessOpen(false); return true; }
      if (isCustomInstructionsOpen) { setIsCustomInstructionsOpen(false); return true; }
      if (isTemplatesOpen) { setIsTemplatesOpen(false); return true; }
      if (isAccountSwitcherOpen) { setIsAccountSwitcherOpen(false); return true; }
      if (isJobsDashboardOpen) { setIsJobsDashboardOpen(false); return true; }
      if (isCsvImportOpen) { setIsCsvImportOpen(false); return true; }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      return false;
    });
  }, [
    isSettingsOpen, isOnboardingOpen, isGeneratorOpen, isLabelManagerOpen,
    isDiagnosticsOpen, isCorrectnessOpen, isCustomInstructionsOpen,
    isTemplatesOpen, isAccountSwitcherOpen, isJobsDashboardOpen, isCsvImportOpen,
    activeTab,
  ]);

  // Generator Controller Instance (use singleton so background tasks connect seamlessly)
  const controller = generationController;

  // Persist Active Tab
  useEffect(() => {
    try {
      localStorage.setItem('inboxforge_active_tab', activeTab);
    } catch (_) {}
  }, [activeTab]);

  // Subscribe to MailboxManager for active account
  useEffect(() => {
    mailboxManager.getActiveMailbox().then((act) => {
      if (act) setActiveAccount(act);
    });
    const unsub = mailboxManager.subscribe((_mailboxes, active) => {
      setActiveAccount(active);
    });
    return () => unsub();
  }, []);

  // Labels Lookup Map
  const labelsMap = useMemo(() => {
    const map = new Map<string, Label>();
    labels.forEach((l) => map.set(l.id, l));
    return map;
  }, [labels]);

  // Load Workspaces on Mount
  const loadAllWorkspaces = useCallback(async () => {
    try {
      const allWs = await db.getAllWorkspaces();
      setWorkspaces(allWs);
      if (allWs.length > 0) {
        const savedWsId = localStorage.getItem('inboxforge_active_workspace_id');
        const matched = savedWsId ? allWs.find((w) => w.id === savedWsId) : null;
        const targetWs = matched || allWs[0];
        setCurrentWorkspace(targetWs);
      } else {
        setIsOnboardingOpen(true);
      }
    } catch (e) {
      console.error('Error loading workspaces:', e);
    }
  }, []);

  useEffect(() => {
    loadAllWorkspaces();
  }, []);

  // Persist current workspace ID
  useEffect(() => {
    if (currentWorkspace) {
      try {
        localStorage.setItem('inboxforge_active_workspace_id', currentWorkspace.id);
      } catch (_) {}
    }
  }, [currentWorkspace]);

  // Load Workspace Data
  const loadWorkspaceData = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [allVars, allLbls, allProjs, allTests, allOtps, allLogs, cp, allEmails, rules] =
        await Promise.all([
          db.getVariantsByWorkspace(currentWorkspace.id),
          db.getAllLabels(currentWorkspace.id),
          db.getAllProjects(currentWorkspace.id),
          db.getAllTestCases(currentWorkspace.id),
          db.getAllOTPs(currentWorkspace.id),
          db.getAllLogs(currentWorkspace.id),
          db.getLatestCheckpoint(currentWorkspace.id),
          db.getAllMockEmails(currentWorkspace.id),
          db.getCustomInstructions(currentWorkspace.id),
        ]);

      setVariants(allVars);
      setTotalVariantCount(allVars.length);
      setLabels(allLbls);
      setProjects(allProjs);
      setTestCases(allTests);
      setOtps(allOtps);
      setLogs(allLogs);
      setActiveCheckpoint(cp);
      setMockEmails(allEmails);
      setCustomInstructions(rules);
    } catch (e) {
      console.error('Error loading workspace data:', e);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      loadWorkspaceData();
      setSelectedIds(new Set());
    }
  }, [currentWorkspace, loadWorkspaceData]);

  // Load persisted user settings on startup
  useEffect(() => {
    db.getSettings().then((s) => {
      if (s) {
        setSettings((prev) => ({
          ...prev,
          theme: s.theme || prev.theme,
          compactMode: s.compactMode !== undefined ? s.compactMode : prev.compactMode,
          defaultExportFormat: (s.exportFormat as any) || prev.defaultExportFormat,
          generationBatchSize: s.generationBatchSize || prev.generationBatchSize,
          checkpointFrequency: s.checkpointFrequency || prev.checkpointFrequency,
          voxTheme: s.voxTheme || prev.voxTheme,
        }));
      }
    }).catch((err) => {
      console.warn('Failed to load persisted settings:', err);
    });
  }, []);

  // Initialize central BackgroundJobManager exactly once on application boot
  useEffect(() => {
    const savedWsId = localStorage.getItem('inboxforge_active_workspace_id');
    backgroundJobManager.initialize(savedWsId || undefined).catch((err) => {
      console.warn('BackgroundJobManager initialization notice:', err);
    });
  }, []);

  // Maintain background inbox synchronization independent of navigation tabs
  useEffect(() => {
    if (currentWorkspace?.id) {
      backgroundJobManager.startBackgroundSync(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  // Subscribe to Generator Progress & Active Background Jobs
  useEffect(() => {
    const unsubProgress = controller.onProgress((p) => {
      setProgress(p);
    });

    const unsubComplete = controller.onComplete(async (total) => {
      await loadWorkspaceData();
      if (currentWorkspace) {
        const allLogs = await db.getAllLogs(currentWorkspace.id);
        setLogs(allLogs);
      }
    });

    const unsubJob = backgroundJobManager.subscribeActiveJob((job, p) => {
      if (p) {
        setProgress(p);
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubJob();
    };
  }, [controller, currentWorkspace, loadWorkspaceData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGeneratorOpen(true);
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter & Sort Variants (Supporting Synthetic Identity Personas)
  const filteredAndSortedVariants = useMemo(() => {
    let result = variants;

    // 1. Search Query (matches email, identity name, organization, role title, notes)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.email.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q) ||
          (v.identityName && v.identityName.toLowerCase().includes(q)) ||
          (v.syntheticUsername && v.syntheticUsername.toLowerCase().includes(q)) ||
          (v.identityCategory && v.identityCategory.toLowerCase().includes(q)) ||
          (v.subCategory && v.subCategory.toLowerCase().includes(q)) ||
          (v.organization && v.organization.toLowerCase().includes(q)) ||
          (v.roleTitle && v.roleTitle.toLowerCase().includes(q)) ||
          (v.notes && v.notes.toLowerCase().includes(q)) ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // 2. Status / Category Filter
    if (activeFilter === 'unused') {
      result = result.filter((v) => v.status === 'unused');
    } else if (activeFilter === 'reserved') {
      result = result.filter((v) => v.status === 'reserved');
    } else if (activeFilter === 'used') {
      result = result.filter((v) => v.status === 'used');
    } else if (activeFilter === 'starred') {
      result = result.filter((v) => v.starred);
    } else if (activeFilter === 'archived') {
      result = result.filter((v) => v.status === 'archived');
    } else if (activeFilter === 'recently_copied') {
      result = result.filter((v) => (v.copyCount || 0) > 0);
    } else if (activeFilter === 'frequently_used') {
      result = result.filter((v) => (v.usageCount || 0) > 0);
    }

    // 3. Identity Persona Type Filter
    if (identityTypeFilter !== 'all') {
      result = result.filter((v) => {
        if (identityTypeFilter === 'personal') {
          return !v.identityType || v.identityType === 'personal';
        }
        return v.identityType === identityTypeFilter;
      });
    }

    // 4. Label Filter
    if (selectedLabelId) {
      result = result.filter(
        (v) => v.labelIds && v.labelIds.includes(selectedLabelId)
      );
    }

    // 5. Sorting
    const sorted = [...result];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'name_asc':
        sorted.sort((a, b) => {
          const nameA = a.identityName || a.username;
          const nameB = b.identityName || b.username;
          return nameA.localeCompare(nameB);
        });
        break;
      case 'name_desc':
        sorted.sort((a, b) => {
          const nameA = a.identityName || a.username;
          const nameB = b.identityName || b.username;
          return nameB.localeCompare(nameA);
        });
        break;
      case 'type':
        sorted.sort((a, b) => (a.identityType || 'personal').localeCompare(b.identityType || 'personal'));
        break;
      case 'email_asc':
        sorted.sort((a, b) => a.email.localeCompare(b.email));
        break;
      case 'email_desc':
        sorted.sort((a, b) => b.email.localeCompare(a.email));
        break;
      case 'most_copied':
        sorted.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
        break;
      case 'recently_copied':
        sorted.sort((a, b) => (b.lastCopiedAt || 0) - (a.lastCopiedAt || 0));
        break;
      case 'most_used':
        sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'starred_first':
        sorted.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
        break;
      default:
        break;
    }

    return sorted;
  }, [variants, search, activeFilter, identityTypeFilter, selectedLabelId, sortBy]);

  // Statistics calculation
  const stats = useMemo(() => {
    let unused = 0;
    let reserved = 0;
    let used = 0;
    let archived = 0;
    let starred = 0;

    variants.forEach((v) => {
      if (v.status === 'unused') unused++;
      else if (v.status === 'reserved') reserved++;
      else if (v.status === 'used') used++;
      else if (v.status === 'archived') archived++;
      if (v.starred) starred++;
    });

    return {
      total: variants.length,
      unused,
      reserved,
      used,
      archived,
      starred,
    };
  }, [variants]);

  // --- Handlers ---

  const handleCreateWorkspace = async (
    name: string,
    baseEmail: string,
    username: string,
    domain: string
  ) => {
    const newWs: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      baseEmail,
      username,
      domain,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.createWorkspace(newWs);

    // Initialize default rules
    const defaultRules: CustomInstructions = {
      workspaceId: newWs.id,
      namingConvention: 'qa.{username}+{tag}',
      autoApplyLabels: [],
      defaultVariantStatus: 'unused',
      exportFormatTemplate: 'standard',
      mockLatencyMs: 60,
      mockFailureRate: 0,
      simulatedOtpLength: 6,
      defaultPassword: 'TestPassw0rd123!',
      customNotes: `Default QA rules for ${name}`,
      updatedAt: Date.now(),
    };
    await db.saveCustomInstructions(defaultRules);

    await db.addLog({
      id: `log_${Date.now()}`,
      workspaceId: newWs.id,
      type: 'general',
      details: `Workspace ${newWs.name} created for ${baseEmail}`,
      timestamp: Date.now(),
    });
    setWorkspaces((prev) => [newWs, ...prev]);
    setCurrentWorkspace(newWs);
    setIsOnboardingOpen(false);
  };

  const handleDuplicateWorkspace = async () => {
    if (!currentWorkspace) return;
    try {
      const cloned = await db.duplicateWorkspace(
        currentWorkspace.id,
        `${currentWorkspace.name} (Copy)`
      );
      setWorkspaces((prev) => [cloned, ...prev]);
      setCurrentWorkspace(cloned);
    } catch (err: any) {
      alert(`Failed to duplicate workspace: ${err.message}`);
    }
  };

  const handleApplyTemplateToCurrentWorkspace = async (template: ProjectTemplate) => {
    if (!currentWorkspace) return;

    // 1. Create Labels
    for (const l of template.labels) {
      const newLbl: Label = {
        id: `lbl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: currentWorkspace.id,
        name: l.name,
        color: l.color,
        description: l.description,
        createdAt: Date.now(),
      };
      await db.createLabel(newLbl);
    }

    // 2. Create Project
    const proj: Project = {
      id: `proj_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      name: `${template.name} Suite`,
      description: template.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.createProject(proj);

    // 3. Create Test Cases
    for (const tc of template.testCases) {
      const testCase: TestCase = {
        id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: currentWorkspace.id,
        projectId: proj.id,
        name: tc.name,
        description: tc.description,
        expectedResult: tc.expectedResult,
        status: 'Not Started',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.createTestCase(testCase);
    }

    // 4. Create Mock API Requests
    if (template.mockRequests) {
      for (const api of template.mockRequests) {
        await db.saveApiRequest({
          id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: currentWorkspace.id,
          name: api.name,
          method: api.method,
          url: api.url,
          headers: {},
          body: api.body,
          expectedStatus: api.expectedStatus || 200,
          createdAt: Date.now(),
        });
      }
    }

    // 5. Update Custom Instructions
    if (template.customInstructions) {
      const ci = template.customInstructions;
      await db.saveCustomInstructions({
        workspaceId: currentWorkspace.id,
        namingConvention: ci.namingConvention || 'qa.{username}+{tag}',
        autoApplyLabels: ci.autoApplyLabels || [],
        defaultVariantStatus: ci.defaultVariantStatus || 'unused',
        exportFormatTemplate: ci.exportFormatTemplate || 'standard',
        mockLatencyMs: ci.mockLatencyMs ?? 60,
        mockFailureRate: ci.mockFailureRate ?? 0,
        simulatedOtpLength: ci.simulatedOtpLength ?? 6,
        defaultPassword: ci.defaultPassword || 'TestPassw0rd123!',
        customNotes: ci.customNotes || '',
        updatedAt: Date.now(),
      });
    }

    // 6. Add Sample Simulated Email
    const sampleEmail: MockEmail = {
      id: `email_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      recipientEmail: currentWorkspace.baseEmail,
      senderName: `${template.name} System`,
      senderEmail: 'qa-system@test.local',
      subject: `[Template Applied] ${template.name} QA Suite Initialized`,
      preview: `Your workspace has been configured with the ${template.name} QA testing blueprint.`,
      bodyText: `Hello,\n\nThe ${template.name} test scenario has been applied to this workspace.\n\nIncluded Assets:\n- ${template.testCases.length} Test Cases\n- ${template.labels.length} Custom Labels\n- Pre-configured Mock API sandbox probes\n\nHappy Testing!`,
      isRead: false,
      isStarred: true,
      folder: 'inbox',
      tags: ['Template', 'QA-Init'],
      receivedAt: Date.now(),
    };
    await db.addMockEmail(sampleEmail);

    await db.addLog({
      id: `log_tmpl_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      type: 'template_applied',
      details: `Applied template blueprint "${template.name}" to workspace`,
      timestamp: Date.now(),
    });

    await loadWorkspaceData();
  };

  const handleCreateWorkspaceFromTemplate = async (
    template: ProjectTemplate,
    workspaceName: string,
    baseEmail: string
  ) => {
    const parts = baseEmail.split('@');
    const username = parts[0] || 'qa.tester';
    const domain = parts[1] || 'gmail.com';

    const newWs: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: workspaceName,
      baseEmail,
      username,
      domain,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: `Generated from template: ${template.name}`,
    };
    await db.createWorkspace(newWs);

    setWorkspaces((prev) => [newWs, ...prev]);
    setCurrentWorkspace(newWs);
    await handleApplyTemplateToCurrentWorkspace(template);
  };

  // Generation Controls backed by BackgroundJobManager
  const handleStartGeneration = async (startIndex?: bigint, batchSize?: number) => {
    if (!currentWorkspace) return;
    await backgroundJobManager.startVariantGenerationJob({
      workspaceId: currentWorkspace.id,
      username: currentWorkspace.username,
      domain: currentWorkspace.domain,
      baseEmail: currentWorkspace.baseEmail,
      startIndex,
      batchSize: batchSize || settings.generationBatchSize,
      checkpointFrequency: settings.checkpointFrequency,
    });
  };

  const handlePauseGeneration = async () => {
    const activeJob = backgroundJobManager.getActiveJob();
    if (activeJob) {
      await backgroundJobManager.pauseJob(activeJob.jobId);
    } else {
      controller.pause();
    }
  };

  const handleResumeGeneration = async () => {
    const activeJob = backgroundJobManager.getActiveJob();
    if (activeJob) {
      await backgroundJobManager.resumeJob(activeJob.jobId);
    } else {
      controller.resume();
    }
  };

  const handleCancelGeneration = async () => {
    const activeJob = backgroundJobManager.getActiveJob();
    if (activeJob) {
      await backgroundJobManager.cancelJob(activeJob.jobId);
    } else {
      controller.cancel();
    }
  };

  const handleResumeCheckpoint = async (cp: GenerationCheckpoint) => {
    if (!currentWorkspace) return;
    const rawIndex = cp.lastIndexProcessed ?? cp.lastIndex ?? cp.currentCombination ?? '0';
    const nextIndex = BigInt(rawIndex) + 1n;
    await backgroundJobManager.startVariantGenerationJob({
      workspaceId: currentWorkspace.id,
      username: currentWorkspace.username,
      domain: currentWorkspace.domain,
      baseEmail: currentWorkspace.baseEmail,
      startIndex: nextIndex,
      batchSize: settings.generationBatchSize,
      checkpointFrequency: settings.checkpointFrequency,
    });
  };

  // Quick Generate More Synthetic Identities
  const handleQuickGenerateMore = async (count: number = 25) => {
    if (!currentWorkspace) return;
    const currentCount = BigInt(variants.length);
    const totalCombinations = defaultGmailGenerator.estimate(
      currentWorkspace.username,
      currentWorkspace.domain
    );

    let newVariants: Variant[] = [];

    if (currentCount >= totalCombinations) {
      // If dot space exhausted, create rich synthetic persona variations with clean plus-tags
      for (let i = 0; i < count; i++) {
        const idx = variants.length + i;
        const identity = generateSyntheticIdentity(currentWorkspace.username, idx);
        const tag = identity.identityName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${currentWorkspace.username}+${tag}${idx}@${currentWorkspace.domain}`;
        newVariants.push({
          id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: currentWorkspace.id,
          email,
          baseEmail: currentWorkspace.baseEmail,
          username: currentWorkspace.username,
          combinationIndex: `${idx}`,
          dotCount: 0,
          status: 'unused',
          starred: false,
          identityName: identity.identityName,
          identityType: identity.identityType,
          organization: identity.organization,
          roleTitle: identity.roleTitle,
          avatarSeed: identity.avatarSeed,
          tags: identity.tags,
          suffix: identity.suffix,
          labelIds: [],
          copyCount: 0,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      const generateCount = BigInt(Math.min(count, Number(totalCombinations - currentCount)));
      const emails = defaultGmailGenerator.generateRange(
        currentWorkspace.username,
        currentWorkspace.domain,
        currentCount,
        generateCount
      );

      newVariants = emails.map((email, i) => {
        const combIndex = currentCount + BigInt(i);
        const identity = generateSyntheticIdentity(currentWorkspace.username, Number(combIndex));
        return {
          id: `var_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: currentWorkspace.id,
          email,
          baseEmail: currentWorkspace.baseEmail,
          username: currentWorkspace.username,
          combinationIndex: combIndex.toString(),
          dotCount: (email.split('@')[0].match(/\./g) || []).length,
          status: 'unused',
          starred: false,
          identityName: identity.identityName,
          identityType: identity.identityType,
          organization: identity.organization,
          roleTitle: identity.roleTitle,
          avatarSeed: identity.avatarSeed,
          tags: identity.tags,
          suffix: identity.suffix,
          labelIds: [],
          copyCount: 0,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });
    }

    await db.bulkInsertVariants(newVariants);
    setVariants((prev) => [...newVariants, ...prev]);
    setTotalVariantCount((prev) => prev + newVariants.length);

    await db.addLog({
      id: `log_gen_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      type: 'generation_completed',
      details: `Generated +${newVariants.length} randomized synthetic test identities`,
      timestamp: Date.now(),
    });
  };

  // High-Diversity Synthetic Test Data Generator Batch Handler
  const handleGenerateSyntheticTestBatch = async (
    count: number,
    category: 'ALL' | IdentityCategory,
    subCategory: 'all' | IdentitySubCategory,
    seed?: string
  ) => {
    if (!currentWorkspace) return;
    setIsGeneratingSynthetic(true);
    try {
      const generatedList = SyntheticTestIdentityEngine.generateBatch(count, {
        category,
        subCategory,
        seed,
        baseUsername: currentWorkspace.username,
        domain: currentWorkspace.domain,
      });

      const now = Date.now();
      const newVariants: Variant[] = generatedList.map((synth, i) => {
        const cleanTag = synth.identityName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = synth.email || `${currentWorkspace.username}+${cleanTag}${i}@${currentWorkspace.domain}`;
        return {
          id: `var_synth_${now}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: currentWorkspace.id,
          email,
          baseEmail: currentWorkspace.baseEmail,
          username: currentWorkspace.username,
          syntheticUsername: synth.username,
          combinationIndex: `${variants.length + i}`,
          dotCount: (email.split('@')[0].match(/\./g) || []).length,
          status: 'unused',
          starred: false,
          identityName: synth.identityName,
          identityType: synth.identityType,
          identityCategory: synth.identityCategory,
          subCategory: synth.subCategory,
          organization: synth.organization,
          roleTitle: synth.roleTitle,
          avatarSeed: synth.avatarSeed,
          tags: synth.tags,
          suffix: synth.suffix,
          seedUsed: synth.seedUsed,
          notes: synth.notes,
          isSyntheticTestIdentity: true,
          labelIds: [],
          copyCount: 0,
          usageCount: 0,
          createdAt: now - (count - i) * 10,
          updatedAt: now,
        };
      });

      await db.bulkInsertVariants(newVariants);
      setVariants((prev) => [...newVariants, ...prev]);
      setTotalVariantCount((prev) => prev + newVariants.length);

      await db.addLog({
        id: `log_synth_${now}`,
        workspaceId: currentWorkspace.id,
        type: 'generation_completed',
        details: `Generated +${newVariants.length} high-diversity synthetic test identities (${category}/${subCategory}${seed ? `, seed: ${seed}` : ''})`,
        timestamp: now,
      });
    } catch (err: any) {
      console.error('Failed to generate synthetic test identities:', err);
    } finally {
      setIsGeneratingSynthetic(false);
    }
  };

  const handleImportCsv = async (csvText: string) => {
    if (!currentWorkspace) return { count: 0, error: 'No active workspace selected' };
    const { variants: importedVariants, errors } = DataExporter.parseCSV(
      csvText,
      currentWorkspace.id,
      currentWorkspace.baseEmail,
      currentWorkspace.username
    );

    if (errors.length > 0 && importedVariants.length === 0) {
      return { count: 0, error: errors.join(' ') };
    }

    if (importedVariants.length > 0) {
      await db.bulkInsertVariants(importedVariants);
      setVariants((prev) => [...importedVariants, ...prev]);
      setTotalVariantCount((prev) => prev + importedVariants.length);

      await db.addLog({
        id: `log_csv_import_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        type: 'general',
        details: `Imported ${importedVariants.length} synthetic test identities from CSV`,
        timestamp: Date.now(),
      });
    }

    return { count: importedVariants.length };
  };

  const handleExportIdentitiesCSV = () => {
    if (!currentWorkspace) return;
    const labelsMap = new Map<string, Label>();
    labels.forEach((l) => labelsMap.set(l.id, l));
    const csvData = DataExporter.toCSV(filteredAndSortedVariants, labelsMap);
    const filename = `synthetic_test_identities_${currentWorkspace.username}_${Date.now()}.csv`;
    DataExporter.downloadFile(csvData, filename, 'text/csv;charset=utf-8');
  };

  // Launch Demo Mode
  const handleLaunchDemoMode = async () => {
    const demoEmail = 'alex.chen.qa@gmail.com';
    const demoWs: Workspace = {
      id: `ws_demo_${Date.now()}`,
      name: 'Alex Chen QA Demo Suite',
      baseEmail: demoEmail,
      username: 'alexchenqa',
      domain: 'gmail.com',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: 'Interactive demo workspace pre-loaded with synthetic identities & QA suites',
    };
    await db.createWorkspace(demoWs);

    // Seed 16 variants with rich synthetic identities
    const sampleEmails = defaultGmailGenerator.generateRange(
      demoWs.username,
      demoWs.domain,
      0n,
      16n
    );
    const demoVars: Variant[] = sampleEmails.map((email, i) => {
      const identity = generateSyntheticIdentity(demoWs.username, i);
      return {
        id: `var_demo_${i}`,
        workspaceId: demoWs.id,
        email,
        baseEmail: demoWs.baseEmail,
        username: demoWs.username,
        combinationIndex: i.toString(),
        dotCount: (email.split('@')[0].match(/\./g) || []).length,
        status: i === 0 ? 'used' : i % 3 === 0 ? 'reserved' : 'unused',
        starred: i === 0 || i === 4,
        identityName: identity.identityName,
        identityType: identity.identityType,
        organization: identity.organization,
        roleTitle: identity.roleTitle,
        avatarSeed: identity.avatarSeed,
        tags: identity.tags,
        suffix: identity.suffix,
        notes: i === 0 ? 'Primary canonical address' : i === 4 ? 'Staging QA account' : undefined,
        labelIds: [],
        copyCount: i === 0 ? 5 : 0,
        usageCount: i === 0 ? 2 : 0,
        createdAt: Date.now() - i * 60000,
        updatedAt: Date.now() - i * 60000,
      };
    });
    await db.bulkInsertVariants(demoVars);

    // Seed demo label
    const demoLabel: Label = {
      id: `lbl_demo_1`,
      workspaceId: demoWs.id,
      name: 'E-Commerce QA',
      color: '#e11d48',
      description: 'Checkout and cart verification',
      createdAt: Date.now(),
    };
    await db.createLabel(demoLabel);

    // Seed demo mock email
    const demoEmailRecord: MockEmail = {
      id: `email_demo_1`,
      workspaceId: demoWs.id,
      recipientEmail: demoVars[0].email,
      senderName: 'Acme Auth Service',
      senderEmail: 'security@acme.example.com',
      subject: 'Your 2FA verification passcode is 849201',
      preview: 'Hello, please use code 849201 to complete your test sign-in.',
      bodyText:
        'Hello,\n\nPlease use the following verification passcode to complete sign-in:\n\n   >>> 849201 <<<\n\nThis is synthetic test data for local QA.',
      extractedOtp: '849201',
      isRead: false,
      isStarred: true,
      folder: 'inbox',
      tags: ['2FA', 'Security', 'OTP'],
      receivedAt: Date.now(),
    };
    await db.addMockEmail(demoEmailRecord);

    await db.addLog({
      id: `log_demo_${Date.now()}`,
      workspaceId: demoWs.id,
      type: 'general',
      details: 'Demo workspace initialized with 16 synthetic identities and sample mock email',
      timestamp: Date.now(),
    });

    setWorkspaces((prev) => [demoWs, ...prev]);
    setCurrentWorkspace(demoWs);
    setActiveTab('identities');
  };

  // Selection Actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisible = new Set<string>(filteredAndSortedVariants.map((v) => v.id));
    setSelectedIds(allVisible);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Row Variant Actions
  const handleCopyEmail = async (email: string, id: string) => {
    await copyToClipboard(email);
    const match = variants.find((v) => v.id === id);
    if (match) {
      const updated: Variant = {
        ...match,
        copyCount: (match.copyCount || 0) + 1,
        lastCopiedAt: Date.now(),
      };
      await db.updateVariant(updated);
      setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)));
    }
  };

  const handleCopyIdentityFormatted = async (variant: Variant) => {
    const formatted = variant.identityName
      ? `${variant.identityName} <${variant.email}>`
      : variant.email;
    await copyToClipboard(formatted);
    const updated: Variant = {
      ...variant,
      copyCount: (variant.copyCount || 0) + 1,
      lastCopiedAt: Date.now(),
    };
    await db.updateVariant(updated);
    setVariants((prev) => prev.map((v) => (v.id === variant.id ? updated : v)));
  };

  const handleRegenerateSingleIdentity = async (id: string) => {
    const match = variants.find((v) => v.id === id);
    if (!match) return;
    const updated = regenerateVariantIdentity(match);
    await db.updateVariant(updated);
    setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)));
  };

  const handleBulkRegenerateIdentities = async () => {
    const updatedVariants: Variant[] = [];
    const idSet = new Set(selectedIds);
    const targets = idSet.size > 0
      ? variants.filter((v) => idSet.has(v.id))
      : filteredAndSortedVariants.slice(0, 50);

    targets.forEach((v) => {
      updatedVariants.push(regenerateVariantIdentity(v));
    });

    if (updatedVariants.length === 0) return;

    await db.bulkInsertVariants(updatedVariants);
    setVariants((prev) =>
      prev.map((v) => {
        const found = updatedVariants.find((u) => u.id === v.id);
        return found || v;
      })
    );

    if (currentWorkspace) {
      await db.addLog({
        id: `log_regen_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        type: 'general',
        details: `Regenerated personas for ${updatedVariants.length} synthetic test identities`,
        timestamp: Date.now(),
      });
    }
  };

  const handleToggleStar = async (id: string) => {
    const match = variants.find((v) => v.id === id);
    if (!match) return;
    const updated: Variant = { ...match, starred: !match.starred, updatedAt: Date.now() };
    await db.updateVariant(updated);
    setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)));
  };

  const handleUpdateStatus = async (id: string, status: VariantStatus) => {
    const match = variants.find((v) => v.id === id);
    if (!match) return;
    const updated: Variant = {
      ...match,
      status,
      usageCount: status === 'used' ? (match.usageCount || 0) + 1 : match.usageCount,
      updatedAt: Date.now(),
    };
    await db.updateVariant(updated);
    setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)));
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    const match = variants.find((v) => v.id === id);
    if (!match) return;
    const updated: Variant = { ...match, notes, updatedAt: Date.now() };
    await db.updateVariant(updated);
    setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)));
  };

  const handleDeleteVariant = async (id: string) => {
    await db.deleteVariant(id);
    setVariants((prev) => prev.filter((v) => v.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk Operations
  const handleBulkCopy = async (format: 'email' | 'identity' | 'json' = 'email') => {
    const selectedVariantsList = variants.filter((v) => selectedIds.has(v.id));
    if (format === 'identity') {
      const formatted = selectedVariantsList
        .map((v) => (v.identityName ? `${v.identityName} <${v.email}>` : v.email))
        .join('\n');
      await copyToClipboard(formatted);
    } else if (format === 'json') {
      await copyToClipboard(JSON.stringify(selectedVariantsList, null, 2));
    } else {
      const emailsToCopy = selectedVariantsList.map((v) => v.email);
      await copyToClipboard(emailsToCopy.join('\n'));
    }
  };

  const handleBulkStar = async (star: boolean) => {
    const ids = Array.from<string>(selectedIds);
    await db.bulkUpdateStatus(ids, { starred: star });
    setVariants((prev) =>
      prev.map((v) => (selectedIds.has(v.id) ? { ...v, starred: star } : v))
    );
  };

  const handleBulkMarkStatus = async (status: VariantStatus) => {
    const ids = Array.from<string>(selectedIds);
    await db.bulkUpdateStatus(ids, { status });
    setVariants((prev) =>
      prev.map((v) => (selectedIds.has(v.id) ? { ...v, status } : v))
    );
  };

  const handleBulkDelete = async () => {
    const ids = Array.from<string>(selectedIds);
    await db.bulkDeleteVariants(ids);
    setVariants((prev) => prev.filter((v) => !selectedIds.has(v.id)));
    setSelectedIds(new Set());
  };

  const handleBulkAssignLabel = async (labelId: string) => {
    const ids = Array.from<string>(selectedIds);
    await db.bulkUpdateStatus(ids, { addLabelId: labelId });
    setVariants((prev) =>
      prev.map((v) => {
        if (!selectedIds.has(v.id)) return v;
        const currentLbls = v.labelIds || [];
        if (!currentLbls.includes(labelId)) {
          return { ...v, labelIds: [...currentLbls, labelId] };
        }
        return v;
      })
    );
  };

  const handleBulkExport = async (format: 'txt' | 'csv' | 'json') => {
    if (!currentWorkspace) return;
    const selectedVariantsList = variants.filter((v) => selectedIds.has(v.id));
    if (format === 'txt') {
      DataExporter.downloadFile(
        DataExporter.toPlaintext(selectedVariantsList),
        `${currentWorkspace.username}_selected.txt`,
        'text/plain'
      );
    } else if (format === 'csv') {
      DataExporter.downloadFile(
        DataExporter.toCSV(selectedVariantsList),
        `${currentWorkspace.username}_selected.csv`,
        'text/csv'
      );
    } else {
      DataExporter.downloadFile(
        DataExporter.toJSON(selectedVariantsList),
        `${currentWorkspace.username}_selected.json`,
        'application/json'
      );
    }
  };

  // Label Actions
  const handleCreateLabel = async (name: string, color: string) => {
    if (!currentWorkspace) return;
    const newLbl: Label = {
      id: `lbl_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      name,
      color,
      createdAt: Date.now(),
    };
    await db.createLabel(newLbl);
    setLabels((prev) => [...prev, newLbl]);
  };

  const handleDeleteLabel = async (id: string) => {
    await db.deleteLabel(id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  // Project & Test Case Actions
  const handleCreateProject = async (name: string, description: string) => {
    if (!currentWorkspace) return;
    const p: Project = {
      id: `proj_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.createProject(p);
    setProjects((prev) => [p, ...prev]);
  };

  const handleDeleteProject = async (id: string) => {
    await db.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreateTestCase = async (tcData: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tc: TestCase = {
      ...tcData,
      id: `tc_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.createTestCase(tc);
    setTestCases((prev) => [tc, ...prev]);
  };

  const handleUpdateTestCase = async (tc: TestCase) => {
    await db.updateTestCase(tc);
    setTestCases((prev) => prev.map((t) => (t.id === tc.id ? tc : t)));
  };

  const handleDeleteTestCase = async (id: string) => {
    await db.deleteTestCase(id);
    setTestCases((prev) => prev.filter((t) => t.id !== id));
  };

  // Mock Email Actions
  const handleAddMockEmail = async (email: MockEmail) => {
    await db.addMockEmail(email);
    setMockEmails((prev) => [email, ...prev]);
    if (currentWorkspace) {
      await db.addLog({
        id: `log_email_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        type: 'email_received',
        details: `Simulated email received for ${email.recipientEmail}: "${email.subject}"`,
        timestamp: Date.now(),
      });
    }
  };

  const handleUpdateMockEmail = async (email: MockEmail) => {
    await db.updateMockEmail(email);
    setMockEmails((prev) => prev.map((e) => (e.id === email.id ? email : e)));
  };

  const handleDeleteMockEmail = async (id: string) => {
    await db.deleteMockEmail(id);
    setMockEmails((prev) => prev.filter((e) => e.id !== id));
  };

  const handleBulkDeleteMockEmails = async (ids: string[]) => {
    await db.bulkDeleteMockEmails(ids);
    setMockEmails((prev) => prev.filter((e) => !ids.includes(e.id)));
  };

  const handleClearAllMockEmails = async () => {
    if (!currentWorkspace) return;
    await db.clearMockEmails(currentWorkspace.id);
    setMockEmails([]);
  };

  // Activity Log Actions
  const handleClearLogs = async () => {
    if (!currentWorkspace) return;
    await db.clearLogs(currentWorkspace.id);
    setLogs([]);
  };

  // Storage & Delete Workspace
  const handleDeleteWorkspace = async (id: string) => {
    await db.deleteWorkspace(id);
    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);
    if (remaining.length > 0) {
      setCurrentWorkspace(remaining[0]);
    } else {
      setCurrentWorkspace(null);
      setIsOnboardingOpen(true);
    }
  };

  const handleClearWorkspaceVariants = async (id: string) => {
    await db.clearWorkspaceVariants(id);
    setVariants([]);
    setTotalVariantCount(0);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Application Bar */}
      <Header
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onSelectWorkspace={(id) => {
          const match = workspaces.find((w) => w.id === id);
          if (match) setCurrentWorkspace(match);
        }}
        onNewWorkspace={() => setIsOnboardingOpen(true)}
        onDuplicateWorkspace={handleDuplicateWorkspace}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenCustomInstructions={() => setIsCustomInstructionsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenCorrectnessTests={() => setIsCorrectnessOpen(true)}
        onStartDemoMode={handleLaunchDemoMode}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        onOpenJobsDashboard={() => setIsJobsDashboardOpen(true)}
        theme={settings.theme || 'dark'}
        onToggleTheme={handleToggleTheme}
        progress={progress}
        stats={stats}
      />

      {/* Offline Connectivity Status Bar */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Offline mode active. Local workspace identities, generators, and cached OTPs remain fully accessible.</span>
          </div>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setIsOnline(nativeBridge.isOnline());
            }}
            className="px-2.5 py-1 rounded-md bg-amber-500/30 hover:bg-amber-500/40 text-white font-semibold transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenLabelManager={() => setIsLabelManagerOpen(true)}
          onOpenGeneratorModal={() => setIsGeneratorOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenCustomInstructions={() => setIsCustomInstructionsOpen(true)}
          identityCount={variants.length}
          emailCount={mockEmails.length}
          testCaseCount={testCases.length}
        />

        {/* Dynamic Center View Container */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 space-y-6">
          {/* Active Generation Control Panel & Checkpoint Recovery */}
          <GenerationControlPanel
            progress={progress}
            checkpoint={activeCheckpoint}
            onPause={handlePauseGeneration}
            onResume={handleResumeGeneration}
            onCancel={handleCancelGeneration}
            onResumeCheckpoint={handleResumeCheckpoint}
            onOpenGeneratorDialog={() => setIsGeneratorOpen(true)}
          />

          {/* Current Tab View Rendering */}
          {currentWorkspace ? (
            <ErrorBoundary
              fallbackTitle="Workspace Tab View Error"
              onReturnToDashboard={() => setActiveTab('dashboard')}
            >
              {/* Dashboard Overview */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  workspace={currentWorkspace}
                  variantCounts={stats}
                  projects={projects}
                  testCases={testCases}
                  emails={mockEmails}
                  otps={otps}
                  onNavigateTab={setActiveTab}
                  onOpenGenerator={() => setIsGeneratorOpen(true)}
                  onStartDemoMode={handleLaunchDemoMode}
                />
              )}

              {/* Identity Explorer & Virtualized Table */}
              {activeTab === 'identities' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <SyntheticIdentityGeneratorPanel
                    onGenerate={handleGenerateSyntheticTestBatch}
                    onRegenerateBatch={handleBulkRegenerateIdentities}
                    onOpenCsvImport={() => setIsCsvImportOpen(true)}
                    onExportCsv={handleExportIdentitiesCSV}
                    isGenerating={isGeneratingSynthetic}
                    totalVariantsCount={variants.length}
                    selectedCount={selectedIds.size}
                    workspaceBaseUsername={currentWorkspace.username}
                  />

                  <SearchAndFilterBar
                    search={search}
                    onSearchChange={setSearch}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    selectedIdentityType={identityTypeFilter}
                    onIdentityTypeChange={setIdentityTypeFilter}
                    selectedLabelId={selectedLabelId}
                    onLabelChange={setSelectedLabelId}
                    labels={labels}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    totalFilteredCount={filteredAndSortedVariants.length}
                    onOpenGenerator={() => setIsGeneratorOpen(true)}
                    onGenerateMore={() => handleQuickGenerateMore(25)}
                  />

                  <VirtualizedTable
                    variants={filteredAndSortedVariants}
                    totalCount={totalVariantCount}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAllVisible={handleSelectAllVisible}
                    onClearSelection={handleClearSelection}
                    onCopyEmail={handleCopyEmail}
                    onCopyIdentityFormatted={handleCopyIdentityFormatted}
                    onRegenerateIdentity={handleRegenerateSingleIdentity}
                    onToggleStar={handleToggleStar}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateNotes={handleUpdateNotes}
                    onDeleteVariant={handleDeleteVariant}
                    onOpenGenerator={() => setIsGeneratorOpen(true)}
                    labelsMap={labelsMap}
                  />

                  {/* Bulk Action Toolbar */}
                  <BulkActionBar
                    selectedCount={selectedIds.size}
                    totalFilteredCount={filteredAndSortedVariants.length}
                    totalWorkspaceCount={totalVariantCount}
                    onClearSelection={handleClearSelection}
                    onSelectAllFiltered={handleSelectAllVisible}
                    onBulkCopy={handleBulkCopy}
                    onBulkRegenerate={handleBulkRegenerateIdentities}
                    onBulkStar={handleBulkStar}
                    onBulkMarkStatus={handleBulkMarkStatus}
                    onBulkDelete={handleBulkDelete}
                    onBulkAssignLabel={handleBulkAssignLabel}
                    onBulkExport={handleBulkExport}
                    labels={labels}
                  />
                </div>
              )}

              {/* Projects & Test Case Manager */}
              {activeTab === 'projects' && (
                <ProjectsAndTestsView
                  workspaceId={currentWorkspace.id}
                  projects={projects}
                  testCases={testCases}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                  onCreateTestCase={handleCreateTestCase}
                  onUpdateTestCase={handleUpdateTestCase}
                  onDeleteTestCase={handleDeleteTestCase}
                />
              )}

              {/* Real Gmail Inbox & OTP Verification (with Isolated Test Sandbox) */}
              {activeTab === 'inbox' && (
                <MockEmailInboxView
                  workspaceId={currentWorkspace.id}
                  baseEmail={currentWorkspace.baseEmail}
                  activeAccount={activeAccount}
                  emails={mockEmails}
                  variants={variants}
                  onAddEmail={handleAddMockEmail}
                  onUpdateEmail={handleUpdateMockEmail}
                  onDeleteEmail={handleDeleteMockEmail}
                  onBulkDeleteEmails={handleBulkDeleteMockEmails}
                  onClearAll={handleClearAllMockEmails}
                  onRefreshData={loadWorkspaceData}
                  onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
                />
              )}

              {/* Local Test Lab & Simulators */}
              {activeTab === 'test_lab' && (
                <LocalTestLabView
                  workspace={currentWorkspace}
                  variants={variants}
                  onRefreshData={loadWorkspaceData}
                />
              )}

              {/* Activity Audit Log */}
              {activeTab === 'activity' && (
                <ActivityLogView logs={logs} onClearLogs={handleClearLogs} />
              )}

              {/* Storage, Backups & Migration */}
              {activeTab === 'storage' && (
                <StorageAndBackupView
                  workspace={currentWorkspace}
                  variantCount={variants.length}
                  onRefreshData={loadWorkspaceData}
                  onDeleteWorkspace={handleDeleteWorkspace}
                  onClearWorkspaceVariants={handleClearWorkspaceVariants}
                />
              )}
            </ErrorBoundary>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <span className="text-2xl font-bold">⚡</span>
              </div>
              <h2 className="text-xl font-bold text-white">No Workspace Selected</h2>
              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCreateWorkspace={handleCreateWorkspace}
        isFirstWorkspace={workspaces.length === 0}
      />

      <GeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        workspace={currentWorkspace}
        progress={progress}
        onStartGeneration={handleStartGeneration}
        onPause={handlePauseGeneration}
        onResume={handleResumeGeneration}
        onCancel={handleCancelGeneration}
        onViewIdentities={() => {
          setIsGeneratorOpen(false);
          setActiveTab('identities');
        }}
        onReset={() => controller.reset()}
      />

      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        onAccountChanged={loadWorkspaceData}
      />

      <JobsDashboardModal
        isOpen={isJobsDashboardOpen}
        onClose={() => setIsJobsDashboardOpen(false)}
        workspaceId={currentWorkspace?.id}
      />

      <CustomInstructionsModal
        isOpen={isCustomInstructionsOpen}
        onClose={() => setIsCustomInstructionsOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
        labels={labels}
        onInstructionsUpdated={(rules) => setCustomInstructions(rules)}
      />

      <TemplatesManagerModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        currentWorkspace={currentWorkspace}
        onApplyTemplateToCurrentWorkspace={handleApplyTemplateToCurrentWorkspace}
        onCreateWorkspaceFromTemplate={handleCreateWorkspaceFromTemplate}
      />

      <LabelManagerModal
        isOpen={isLabelManagerOpen}
        onClose={() => setIsLabelManagerOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
        labels={labels}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        workspaceId={currentWorkspace?.id}
        totalVariantsCount={variants.length}
      />

      <GeneratorCorrectnessModal
        isOpen={isCorrectnessOpen}
        onClose={() => setIsCorrectnessOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={async (newS) => {
          setSettings(newS);
          try {
            await db.saveSettings({
              id: 'app_settings',
              theme: newS.theme,
              voxTheme: newS.voxTheme || 'vox_obsidian',
              compactMode: newS.compactMode,
              defaultPageSize: 100,
              autoSaveNotes: true,
              generationBatchSize: newS.generationBatchSize,
              checkpointFrequency: newS.checkpointFrequency,
              exportFormat: newS.defaultExportFormat,
              confirmDestructiveActions: true,
              autoReconnectGmail: true,
            });
          } catch (err) {
            console.error('Failed to persist settings to db:', err);
          }
        }}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportVariants={handleImportCsv}
      />
    </div>
  );
}

export default App;

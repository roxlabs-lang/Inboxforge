import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Zap,
  FlaskConical,
  Check,
  RotateCw,
} from 'lucide-react';
import { Project, TestCase, TestCaseStatus } from '../types';
import { TestAutomationRunner } from '../testing/testAutomation';

interface ProjectsAndTestsViewProps {
  workspaceId: string;
  projects: Project[];
  testCases: TestCase[];
  onCreateProject: (name: string, description: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateTestCase: (tc: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTestCase: (tc: TestCase) => Promise<void>;
  onDeleteTestCase: (id: string) => Promise<void>;
}

export const ProjectsAndTestsView: React.FC<ProjectsAndTestsViewProps> = ({
  workspaceId,
  projects,
  testCases,
  onCreateProject,
  onDeleteProject,
  onCreateTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem('inboxforge_selected_project_id') || 'all';
    } catch {
      return 'all';
    }
  });

  const handleSelectProjectId = (id: string) => {
    setSelectedProjectId(id);
    try {
      localStorage.setItem('inboxforge_selected_project_id', id);
    } catch (_) {}
  };
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  // New Test Case Form State
  const [testName, setTestName] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testIdentity, setTestIdentity] = useState('');
  const [testExpected, setTestExpected] = useState('Account verified and logged in successfully');
  const [testProjectId, setTestProjectId] = useState('');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  const filteredTestCases =
    selectedProjectId === 'all'
      ? testCases
      : testCases.filter((tc) => tc.projectId === selectedProjectId);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    await onCreateProject(projectName.trim(), projectDesc.trim());
    setProjectName('');
    setProjectDesc('');
    setShowNewProjectModal(false);
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) return;
    await onCreateTestCase({
      workspaceId,
      projectId: testProjectId || undefined,
      name: testName.trim(),
      description: testDesc.trim(),
      identityEmail: testIdentity.trim() || undefined,
      status: 'Not Started',
      expectedResult: testExpected.trim(),
    });
    setTestName('');
    setTestDesc('');
    setTestIdentity('');
    setShowNewTestModal(false);
  };

  const handleRunSingleTest = async (tc: TestCase) => {
    setRunningTestId(tc.id);
    try {
      await TestAutomationRunner.runTestCase(workspaceId, tc);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunAllTests = async () => {
    setIsRunningAll(true);
    try {
      for (const tc of filteredTestCases) {
        await TestAutomationRunner.runTestCase(workspaceId, tc);
      }
    } finally {
      setIsRunningAll(false);
    }
  };

  const getStatusBadge = (status: TestCaseStatus) => {
    switch (status) {
      case 'Passed':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>PASSED</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'Running':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>RUNNING</span>
          </span>
        );
      case 'Blocked':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>BLOCKED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" />
            <span>NOT STARTED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <span>Projects & Test Case Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize email identities into QA test suites and execute automated verification flows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          <button
            onClick={() => setShowNewTestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Test Case</span>
          </button>
        </div>
      </div>

      {/* Project Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => handleSelectProjectId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedProjectId === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          All Projects ({testCases.length})
        </button>

        {projects.map((p) => {
          const count = testCases.filter((tc) => tc.projectId === p.id).length;
          return (
            <div key={p.id} className="flex items-center">
              <button
                onClick={() => handleSelectProjectId(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
                  selectedProjectId === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{p.name}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/40">
                  {count}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Test Cases Table Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Test Cases ({filteredTestCases.length})
          </div>
          {filteredTestCases.length > 0 && (
            <button
              onClick={handleRunAllTests}
              disabled={isRunningAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningAll ? 'Running Tests...' : 'Run All Tests'}</span>
            </button>
          )}
        </div>

        {filteredTestCases.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <FlaskConical className="w-10 h-10 text-slate-600" />
            <h4 className="text-sm font-bold text-white">No test cases created</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Create test cases to test your email variants against signups, OTP verifications, and logins.
            </p>
            <button
              onClick={() => setShowNewTestModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              + Create First Test Case
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredTestCases.map((tc) => {
              const isRunning = runningTestId === tc.id;
              const project = projects.find((p) => p.id === tc.projectId);

              return (
                <div
                  key={tc.id}
                  className="p-4 hover:bg-slate-800/30 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-white truncate">{tc.name}</h4>
                      {getStatusBadge(isRunning ? 'Running' : tc.status)}
                      {project && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {project.name}
                        </span>
                      )}
                    </div>

                    {tc.description && (
                      <p className="text-xs text-slate-400">{tc.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                      {tc.identityEmail && (
                        <div>
                          Identity: <span className="text-indigo-300">{tc.identityEmail}</span>
                        </div>
                      )}
                      {tc.expectedResult && (
                        <div>
                          Expected: <span className="text-slate-300">{tc.expectedResult}</span>
                        </div>
                      )}
                      {tc.lastRunAt && (
                        <div>
                          Last Run: {new Date(tc.lastRunAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    {tc.actualResult && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-line">
                        {tc.actualResult}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      onClick={() => handleRunSingleTest(tc)}
                      disabled={isRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isRunning ? 'Running' : 'Run'}</span>
                    </button>

                    <button
                      onClick={() => onDeleteTestCase(tc.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Website Signup QA, Chatbot Auth"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Goals and scope for this test suite..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Test Case Modal */}
      {showNewTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Test Case</h3>
            <form onSubmit={handleCreateTestCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Test Case Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Verify Registration with Dot-Variant"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Assign to Project
                  </label>
                  <select
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Identity Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. test.user@gmail.com"
                    value={testIdentity}
                    onChange={(e) => setTestIdentity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Expected Result
                </label>
                <input
                  type="text"
                  value={testExpected}
                  onChange={(e) => setTestExpected(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Description / Steps
                </label>
                <textarea
                  rows={2}
                  placeholder="1. Signup 2. Receive OTP 3. Complete verification"
                  value={testDesc}
                  onChange={(e) => setTestDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTestModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Save Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

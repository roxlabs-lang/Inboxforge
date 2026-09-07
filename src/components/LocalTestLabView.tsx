import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  KeyRound,
  ShieldCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Zap,
  Globe,
  Lock,
  RotateCcw,
  Check,
  Sliders,
  AlertTriangle,
  FileCode,
  Save,
  Trash2,
  Sparkles,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { mockAuthService } from '../testing/mockAuthService';
import { ApiTester } from '../testing/apiTester';
import { TestAutomationRunner, AutomationFlowRunResult } from '../testing/testAutomation';
import { Workspace, Variant, SavedApiRequest, HttpMethod } from '../types';
import { db } from '../database/db';
import { copyToClipboard } from '../utils/clipboard';

interface LocalTestLabViewProps {
  workspace: Workspace;
  variants: Variant[];
  onRefreshData?: () => void;
}

interface BatchMatrixResult {
  email: string;
  signupStatus: 'passed' | 'failed' | 'skipped';
  otpStatus: 'passed' | 'failed' | 'skipped';
  loginStatus: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
}

export const LocalTestLabView: React.FC<LocalTestLabViewProps> = ({
  workspace,
  variants,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'flow' | 'batch_matrix' | 'auth_sim' | 'api_tester'>('flow');

  // 1. Flow Runner State
  const [flowEmail, setFlowEmail] = useState(variants[0]?.email || workspace.baseEmail);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [flowResult, setFlowResult] = useState<AutomationFlowRunResult | null>(null);

  // 2. Batch Matrix Runner State
  const [batchCount, setBatchCount] = useState<number>(5);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchMatrixResult[]>([]);

  // 3. Auth Simulator State
  const [simEmail, setSimEmail] = useState(variants[0]?.email || workspace.baseEmail);
  const [simPassword, setSimPassword] = useState('TestPassw0rd123!');
  const [simOtpInput, setSimOtpInput] = useState('');
  const [simStage, setSimStage] = useState<'signup' | 'otp' | 'login' | 'verified'>('signup');
  const [simLog, setSimLog] = useState<string[]>([]);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  // 4. API Sandbox State
  const [apiMethod, setApiMethod] = useState<HttpMethod>('POST');
  const [apiUrl, setApiUrl] = useState('mock://auth/signup');
  const [apiHeaders, setApiHeaders] = useState('{\n  "Content-Type": "application/json",\n  "X-Test-Suite": "InboxForge"\n}');
  const [apiBody, setApiBody] = useState(
    JSON.stringify(
      {
        email: variants[0]?.email || workspace.baseEmail,
        action: 'qa_signup_probe',
        environment: 'staging',
        timestamp: Date.now(),
      },
      null,
      2
    )
  );
  const [apiExpectedStatus, setApiExpectedStatus] = useState(200);
  const [apiExpectedBody, setApiExpectedBody] = useState('');
  const [apiSimLatency, setApiSimLatency] = useState(80);
  const [apiMockErrorCode, setApiMockErrorCode] = useState<number>(0);
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedApiRequest[]>([]);
  const [requestName, setRequestName] = useState('');

  useEffect(() => {
    loadSavedRequests();
  }, [workspace.id]);

  const loadSavedRequests = async () => {
    const list = await db.getAllSavedApiRequests(workspace.id);
    setSavedRequests(list);
  };

  // Flow Runner Handler
  const handleRunFlow = async () => {
    setIsRunningFlow(true);
    try {
      const res = await TestAutomationRunner.runFullAuthTestFlow(workspace.id, flowEmail);
      setFlowResult(res);
      if (onRefreshData) onRefreshData();
    } finally {
      setIsRunningFlow(false);
    }
  };

  // Batch Matrix Handler
  const handleRunBatchMatrix = async () => {
    const targetVariants = variants.slice(0, batchCount);
    if (targetVariants.length === 0) return;

    setIsBatchRunning(true);
    setBatchProgress(0);
    setBatchResults([]);

    const results: BatchMatrixResult[] = [];

    for (let i = 0; i < targetVariants.length; i++) {
      const target = targetVariants[i];
      const start = performance.now();

      try {
        const flow = await TestAutomationRunner.runFullAuthTestFlow(workspace.id, target.email);
        const durationMs = Math.round(performance.now() - start);

        results.push({
          email: target.email,
          signupStatus: flow.steps[0]?.success ? 'passed' : 'failed',
          otpStatus: flow.steps[1]?.success ? 'passed' : 'failed',
          loginStatus: flow.steps[3]?.success ? 'passed' : 'failed',
          durationMs,
          error: !flow.passed ? 'Step assertion failure' : undefined,
        });
      } catch (err: any) {
        results.push({
          email: target.email,
          signupStatus: 'failed',
          otpStatus: 'skipped',
          loginStatus: 'skipped',
          durationMs: Math.round(performance.now() - start),
          error: err.message,
        });
      }

      setBatchResults([...results]);
      setBatchProgress(Math.round(((i + 1) / targetVariants.length) * 100));
    }

    setIsBatchRunning(false);
    if (onRefreshData) onRefreshData();
  };

  // Auth Sim Handlers
  const handleSimSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await mockAuthService.signup(workspace.id, simEmail, simPassword);
    setSimLog((prev) => [`[${new Date().toLocaleTimeString()}] Signup: ${res.message}`, ...prev]);
    if (res.success && res.otp) {
      setGeneratedOtp(res.otp);
      setSimOtpInput(res.otp);
      setSimStage('otp');
    }
    if (onRefreshData) onRefreshData();
  };

  const handleSimVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await mockAuthService.verifyOtp(workspace.id, simEmail, simOtpInput);
    setSimLog((prev) => [`[${new Date().toLocaleTimeString()}] OTP Verify: ${res.message}`, ...prev]);
    if (res.success) {
      setSimStage('login');
    }
    if (onRefreshData) onRefreshData();
  };

  const handleSimLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await mockAuthService.login(simEmail, simPassword);
    setSimLog((prev) => [`[${new Date().toLocaleTimeString()}] Login: ${res.message}`, ...prev]);
    if (res.success) {
      setSimStage('verified');
    }
    if (onRefreshData) onRefreshData();
  };

  const handleSimReset = () => {
    setSimStage('signup');
    setSimOtpInput('');
    setGeneratedOtp(null);
  };

  // API Tester Handlers
  const handleExecuteApi = async () => {
    setIsExecutingApi(true);
    try {
      const res = await ApiTester.executeRequest({
        method: apiMethod,
        url: apiUrl,
        headers: apiHeaders,
        body: ['POST', 'PUT', 'PATCH'].includes(apiMethod) ? apiBody : undefined,
        expectedStatus: apiExpectedStatus,
        expectedBody: apiExpectedBody,
        simulatedLatencyMs: apiSimLatency,
        mockFailureCode: apiMockErrorCode > 0 ? apiMockErrorCode : undefined,
      });
      setApiResponse(res);
      await db.addLog({
        id: `log_api_${Date.now()}`,
        workspaceId: workspace.id,
        type: 'api_tested',
        details: `Executed ${apiMethod} ${apiUrl} -> Status ${res.status} (${res.durationMs}ms)`,
        timestamp: Date.now(),
      });
      if (onRefreshData) onRefreshData();
    } finally {
      setIsExecutingApi(false);
    }
  };

  const handleSaveApiRequest = async () => {
    if (!requestName.trim()) return;
    const req: SavedApiRequest = {
      id: `req_${Date.now()}`,
      workspaceId: workspace.id,
      name: requestName.trim(),
      method: apiMethod,
      url: apiUrl,
      headers: apiHeaders,
      body: apiBody,
      expectedStatus: apiExpectedStatus,
      createdAt: Date.now(),
    };
    await db.saveApiRequest(req);
    setRequestName('');
    await loadSavedRequests();
  };

  const handleLoadSavedRequest = (req: SavedApiRequest) => {
    setApiMethod(req.method);
    setApiUrl(req.url);
    if (typeof req.headers === 'string') {
      setApiHeaders(req.headers);
    } else {
      setApiHeaders(JSON.stringify(req.headers, null, 2));
    }
    setApiBody(req.body || '');
    setApiExpectedStatus(req.expectedStatus || 200);
  };

  const handleDeleteSavedRequest = async (id: string) => {
    await db.deleteApiRequest(id);
    await loadSavedRequests();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              <span>QA Testing Lab & Verification Suite</span>
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              SYNTHETIC ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute automated end-to-end authentication pipelines, run batch identity matrix tests, and probe mock endpoints with custom error injections.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'flow', label: 'E2E Flow Runner', icon: Zap },
            { id: 'batch_matrix', label: 'Batch Matrix', icon: Layers },
            { id: 'auth_sim', label: 'Auth Simulator', icon: Lock },
            { id: 'api_tester', label: 'API Sandbox', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: AUTOMATED FLOW RUNNER */}
      {activeSubTab === 'flow' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Configure Flow Run</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Variant Identity
              </label>
              <select
                value={flowEmail}
                onChange={(e) => setFlowEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.email}>
                    {v.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
              <div className="font-semibold text-slate-300">Automated Flow Steps:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Register account with target dot-variant</li>
                <li>Simulate OTP issuance & verification</li>
                <li>Verify password login assertion</li>
                <li>Assert token generation & update identity status</li>
              </ol>
            </div>

            <button
              onClick={handleRunFlow}
              disabled={isRunningFlow}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{isRunningFlow ? 'Executing Steps...' : 'Execute Full E2E Flow'}</span>
            </button>
          </div>

          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Execution Timeline & Step Telemetry</span>
              {flowResult && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    flowResult.passed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {flowResult.passed ? 'PASSED' : 'FAILED'} ({flowResult.totalDurationMs}ms)
                </span>
              )}
            </h3>

            {flowResult ? (
              <div className="space-y-3">
                {flowResult.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      {step.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-white">{step.step}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{step.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                      {step.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Click "Execute Full E2E Flow" to start the automated pipeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: BATCH IDENTITY MATRIX RUNNER */}
      {activeSubTab === 'batch_matrix' && (
        <div className="space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Batch Identity Matrix QA Runner</span>
              </h3>
              <p className="text-xs text-slate-400">
                Run automated test pipelines across multiple dot-variants to verify consistent delivery across the permutation space.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Sample Size:</span>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value={5}>5 Identities</option>
                  <option value={10}>10 Identities</option>
                  <option value={25}>25 Identities</option>
                  <option value={50}>50 Identities</option>
                </select>
              </div>

              <button
                onClick={handleRunBatchMatrix}
                disabled={isBatchRunning || variants.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isBatchRunning ? `Running (${batchProgress}%)...` : 'Run Batch Matrix'}</span>
              </button>
            </div>
          </div>

          {/* Progress bar if running */}
          {isBatchRunning && (
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
          )}

          {/* Matrix Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Identity Variant</th>
                  <th className="py-2.5 px-3">Signup Assertion</th>
                  <th className="py-2.5 px-3">OTP Generation</th>
                  <th className="py-2.5 px-3">Login Assertion</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {batchResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs font-sans">
                      Select batch sample size and click "Run Batch Matrix" to populate test results.
                    </td>
                  </tr>
                ) : (
                  batchResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-indigo-300">{r.email}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            r.signupStatus === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {r.signupStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            r.otpStatus === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {r.otpStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            r.loginStatus === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {r.loginStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">{r.durationMs}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: INTERACTIVE AUTH SIMULATOR */}
      {activeSubTab === 'auth_sim' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Interactive Auth Pipeline</span>
              </h3>
              <button
                onClick={handleSimReset}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className={simStage === 'signup' ? 'text-indigo-400 font-bold' : ''}>1. Signup</span>
              <span>&rarr;</span>
              <span className={simStage === 'otp' ? 'text-indigo-400 font-bold' : ''}>2. OTP Verify</span>
              <span>&rarr;</span>
              <span className={simStage === 'login' || simStage === 'verified' ? 'text-emerald-400 font-bold' : ''}>
                3. Complete
              </span>
            </div>

            {/* Stage 1: Signup Form */}
            {simStage === 'signup' && (
              <form onSubmit={handleSimSignup} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Target Identity Email</label>
                  <select
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.email}>
                        {v.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Test Password</label>
                  <input
                    type="password"
                    value={simPassword}
                    onChange={(e) => setSimPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  Dispatch Synthetic Signup & Issue OTP
                </button>
              </form>
            )}

            {/* Stage 2: OTP Form */}
            {simStage === 'otp' && (
              <form onSubmit={handleSimVerifyOtp} className="space-y-3">
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
                  <span>Generated Code: </span>
                  <span className="font-mono font-bold text-white text-sm">{generatedOtp}</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Enter 6-Digit Passcode</label>
                  <input
                    type="text"
                    value={simOtpInput}
                    onChange={(e) => setSimOtpInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono tracking-widest text-center text-base"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  Verify One-Time Passcode
                </button>
              </form>
            )}

            {/* Stage 3: Login Form */}
            {simStage === 'login' && (
              <form onSubmit={handleSimLogin} className="space-y-3">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                  Email verified! Now assert authenticating with login credentials.
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  Assert Login Session
                </button>
              </form>
            )}

            {/* Stage 4: Verified */}
            {simStage === 'verified' && (
              <div className="text-center py-6 space-y-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Full Authentication Verified!</h4>
                <p className="text-xs text-slate-400">
                  Identity <span className="font-mono text-indigo-300">{simEmail}</span> successfully completed the full signup, verification, and login cycle.
                </p>
                <button
                  onClick={handleSimReset}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:text-white"
                >
                  Test Another Identity
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Simulator Audit Log</h3>
            <div className="h-64 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1">
              {simLog.length === 0 ? (
                <div className="text-slate-600 italic">No events logged yet.</div>
              ) : (
                simLog.map((log, idx) => <div key={idx}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: API SANDBOX & PROBE */}
      {activeSubTab === 'api_tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Form & Headers */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>API Probe & Request Builder</span>
              </h3>

              {savedRequests.length > 0 && (
                <select
                  onChange={(e) => {
                    const req = savedRequests.find((r) => r.id === e.target.value);
                    if (req) handleLoadSavedRequest(req);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                >
                  <option value="">Load Preset...</option>
                  {savedRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Method + URL */}
            <div className="flex gap-2">
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value as HttpMethod)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-indigo-400"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="mock://auth/signup or https://..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Simulated Error Code Injection & Latency */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Simulate Failure Code</label>
                <select
                  value={apiMockErrorCode}
                  onChange={(e) => setApiMockErrorCode(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
                >
                  <option value={0}>200 / 201 (Normal OK)</option>
                  <option value={400}>400 Bad Request</option>
                  <option value={401}>401 Unauthorized</option>
                  <option value={403}>403 Forbidden</option>
                  <option value={404}>404 Not Found</option>
                  <option value={422}>422 Duplicate Entity</option>
                  <option value={429}>429 Rate Limit Exceeded</option>
                  <option value={500}>500 Internal Server Error</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Simulated Latency: {apiSimLatency}ms</label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={20}
                  value={apiSimLatency}
                  onChange={(e) => setApiSimLatency(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500 mt-2"
                />
              </div>
            </div>

            {/* Headers JSON */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Headers (JSON)</label>
              <textarea
                rows={2}
                value={apiHeaders}
                onChange={(e) => setApiHeaders(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            {/* Body */}
            {['POST', 'PUT', 'PATCH'].includes(apiMethod) && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Body Payload (JSON)</label>
                <textarea
                  rows={4}
                  value={apiBody}
                  onChange={(e) => setApiBody(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>
            )}

            {/* Expected Status / Assertions */}
            <div className="flex gap-3">
              <div className="w-1/3">
                <label className="block text-xs font-medium text-slate-300 mb-1">Expected Status</label>
                <input
                  type="number"
                  value={apiExpectedStatus}
                  onChange={(e) => setApiExpectedStatus(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div className="w-2/3">
                <label className="block text-xs font-medium text-slate-300 mb-1">Expected Body Substring</label>
                <input
                  type="text"
                  value={apiExpectedBody}
                  onChange={(e) => setApiExpectedBody(e.target.value)}
                  placeholder="Optional text to assert"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Preset Name"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white w-32"
                />
                <button
                  type="button"
                  onClick={handleSaveApiRequest}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                  title="Save request preset"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleExecuteApi}
                disabled={isExecutingApi}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isExecutingApi ? 'Executing...' : 'Execute Request'}</span>
              </button>
            </div>
          </div>

          {/* Response Inspector Pane */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">Response Inspector</h3>
                {apiResponse && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        apiResponse.status >= 200 && apiResponse.status < 300
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      Status: {apiResponse.status} {apiResponse.statusText}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {apiResponse.durationMs}ms
                    </span>
                  </div>
                )}
              </div>

              {apiResponse ? (
                <div className="space-y-3 mt-3">
                  {/* Assertion Badge */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                      apiResponse.matchesExpectation
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {apiResponse.matchesExpectation ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {apiResponse.matchesExpectation
                        ? 'Assertion Passed: Status & payload expectations matched.'
                        : 'Assertion Failed: Received status or body did not match expected criteria.'}
                    </span>
                  </div>

                  {/* Response Body */}
                  <div className="h-64 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-y-auto">
                    <pre>{apiResponse.body}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500 text-xs">
                  Execute an API request to view response headers, status codes, and JSON body.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

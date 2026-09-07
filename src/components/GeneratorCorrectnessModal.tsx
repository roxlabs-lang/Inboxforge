import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  X,
  Zap,
  Cpu,
  Check,
} from 'lucide-react';
import { defaultGmailGenerator } from '../generators/GmailDotVariantGenerator';

interface GeneratorCorrectnessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export const GeneratorCorrectnessModal: React.FC<GeneratorCorrectnessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);

  if (!isOpen) return null;

  const runAllTests = () => {
    setIsRunning(true);
    const testList: TestResult[] = [];

    // Test 1: abc@gmail.com -> exactly 4 combinations
    try {
      const vars1 = defaultGmailGenerator.generateAll('abc', 'gmail.com');
      const expected1 = ['abc@gmail.com', 'a.bc@gmail.com', 'ab.c@gmail.com', 'a.b.c@gmail.com'];
      const passed1 =
        vars1.length === 4 && expected1.every((e) => vars1.includes(e));

      testList.push({
        id: 't1',
        name: 'Requirement 48.1: "abc" 4-combination exact test',
        description: 'Verify abc yields abc, a.bc, ab.c, a.b.c without deviation',
        passed: passed1,
        expected: '4 exact combinations',
        actual: `${vars1.length} generated: [${vars1.join(', ')}]`,
      });
    } catch (e: any) {
      testList.push({
        id: 't1',
        name: 'Requirement 48.1: "abc" 4-combination exact test',
        description: 'Verify abc yields abc, a.bc, ab.c, a.b.c',
        passed: false,
        expected: '4 combinations',
        actual: e.message,
      });
    }

    // Test 2: abcd@gmail.com -> 8 combinations (2^3)
    try {
      const vars2 = defaultGmailGenerator.generateAll('abcd', 'gmail.com');
      const passed2 = vars2.length === 8;
      testList.push({
        id: 't2',
        name: 'Requirement 48.2: "abcd" 2^(4-1) = 8 combinations test',
        description: 'Verify 4 characters yield 2^3 = 8 distinct variants',
        passed: passed2,
        expected: '8 unique variants',
        actual: `${vars2.length} unique variants`,
      });
    } catch (e: any) {
      testList.push({
        id: 't2',
        name: 'Requirement 48.2: "abcd" combinations test',
        description: 'Verify 8 distinct variants',
        passed: false,
        expected: '8 variants',
        actual: e.message,
      });
    }

    // Test 3: Zero Duplicates across set
    try {
      const vars3 = defaultGmailGenerator.generateAll('testing', 'gmail.com');
      const set3 = new Set(vars3);
      const passed3 = vars3.length === set3.size && vars3.length === 64;
      testList.push({
        id: 't3',
        name: 'Requirement 48.3: Zero-Duplicate Set Invariance',
        description: 'Generate 64 variants for "testing" and assert all elements are strictly unique',
        passed: passed3,
        expected: '64 unique variants (0 duplicates)',
        actual: `${set3.size} unique out of ${vars3.length} generated`,
      });
    } catch (e: any) {
      testList.push({
        id: 't3',
        name: 'Requirement 48.3: Zero-Duplicate Invariance',
        description: 'Verify 0 duplicates',
        passed: false,
        expected: '0 duplicates',
        actual: e.message,
      });
    }

    // Test 4: Character Order Preservation (no letter transposition)
    try {
      const username = 'developer';
      const vars4 = defaultGmailGenerator.generateAll(username, 'gmail.com');
      const passed4 = vars4.every((email) => {
        const u = email.split('@')[0].replace(/\./g, '');
        return u === username;
      });
      testList.push({
        id: 't4',
        name: 'Requirement 48.4: Character Order & Letter Integrity',
        description: 'Ensure dot placement never transposes or alters underlying characters',
        passed: passed4,
        expected: 'All stripped emails equal "developer"',
        actual: passed4 ? '100% integrity verified' : 'Character altered',
      });
    } catch (e: any) {
      testList.push({
        id: 't4',
        name: 'Requirement 48.4: Character Order Integrity',
        description: 'Ensure no letters changed',
        passed: false,
        expected: 'Verified',
        actual: e.message,
      });
    }

    // Test 5: Original email intact
    try {
      const username = 'sample';
      const domain = 'gmail.com';
      const vars5 = defaultGmailGenerator.generateAll(username, domain);
      const passed5 = vars5.includes(`${username}@${domain}`);
      testList.push({
        id: 't5',
        name: 'Requirement 48.5: Canonical Base Email Inclusion',
        description: 'Verify canonical unaltered address is index 0 in combination space',
        passed: passed5,
        expected: 'sample@gmail.com included',
        actual: vars5[0] === 'sample@gmail.com' ? 'sample@gmail.com at index 0' : 'Missing',
      });
    } catch (e: any) {
      testList.push({
        id: 't5',
        name: 'Requirement 48.5: Base Email Inclusion',
        description: 'Verify base email present',
        passed: false,
        expected: 'Included',
        actual: e.message,
      });
    }

    // Test 6: BigInt Math Estimation
    try {
      const estimate = defaultGmailGenerator.estimate('alexander', 'gmail.com');
      const passed6 = estimate === 256n; // 2^(9-1) = 256
      testList.push({
        id: 't6',
        name: 'Requirement 48.6: 2^(N-1) BigInt Mathematical Space',
        description: 'Verify BigInt bitwise shift 1n << (length - 1) calculation',
        passed: passed6,
        expected: '256n for 9-char username',
        actual: `${estimate.toString()}n combinations calculated`,
      });
    } catch (e: any) {
      testList.push({
        id: 't6',
        name: 'Requirement 48.6: BigInt Math',
        description: 'Verify math formula',
        passed: false,
        expected: '256n',
        actual: e.message,
      });
    }

    // Test 7: "thegoatedcreator69@gmail.com" High-Scale Space Test (18 chars -> 17 gaps -> 131,072 variants)
    try {
      const targetUser = 'thegoatedcreator69';
      const targetDomain = 'gmail.com';
      const totalEstimated = defaultGmailGenerator.estimate(targetUser, targetDomain);
      const is131k = totalEstimated === 131072n;

      // Generate chunk 0..100 and test determinism & boundary
      const chunk1 = defaultGmailGenerator.generateRange(targetUser, targetDomain, 0n, 100n);
      const chunk2 = defaultGmailGenerator.generateRange(targetUser, targetDomain, 131000n, 72n);

      const chunk1Set = new Set(chunk1);
      const noDupesChunk1 = chunk1Set.size === 100;
      const basePresent = chunk1[0] === 'thegoatedcreator69@gmail.com';
      const fullyDottedPresent = chunk2[chunk2.length - 1] === 't.h.e.g.o.a.t.e.d.c.r.e.a.t.o.r.6.9@gmail.com';

      const passed7 = is131k && noDupesChunk1 && basePresent && fullyDottedPresent;

      testList.push({
        id: 't7',
        name: 'Requirement 48.7: "thegoatedcreator69" 131,072 Space & Boundary Verification',
        description: 'Verify 18-character username creates 131,072 combinations with exact canonical boundaries',
        passed: passed7,
        expected: '131,072 total combinations, base at index 0, fully-dotted at index 131,071',
        actual: `${totalEstimated.toString()} space, index 0: ${chunk1[0]}, index 131071: ${chunk2[chunk2.length - 1]}`,
      });
    } catch (e: any) {
      testList.push({
        id: 't7',
        name: 'Requirement 48.7: "thegoatedcreator69" Space Test',
        description: 'Verify 131,072 combination space',
        passed: false,
        expected: '131,072 variants',
        actual: e.message,
      });
    }

    setResults(testList);
    setIsRunning(false);
  };

  const allPassed = results && results.every((r) => r.passed);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generator Correctness Verification</h3>
              <p className="text-xs text-slate-400">
                Automated unit tests validating dot-placement combinations and zero-duplicate invariants
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Live Mathematical Test Suite</div>
              <div className="text-[11px] text-slate-400">
                Executes generator unit tests against Section 48 mathematical assertions.
              </div>
            </div>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              {isRunning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'Testing...' : 'RUN VERIFICATION TESTS'}</span>
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Test Execution Summary:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full ${
                    allPassed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {allPassed
                    ? `${results.length} / ${results.length} PASSED (100% CORRECT)`
                    : `${results.filter((r) => r.passed).length} / ${results.length} PASSED`}
                </span>
              </div>

              <div className="space-y-2">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border space-y-1 ${
                      r.passed
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span className="text-xs font-bold text-white">{r.name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 pl-6">{r.description}</div>

                    <div className="text-[11px] font-mono text-slate-300 pl-6 pt-1">
                      <div>Expected: {r.expected}</div>
                      <div>Actual: {r.actual}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

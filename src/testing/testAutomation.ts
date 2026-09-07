/**
 * Test Automation Engine
 * Runs multi-step test workflows (Generate -> Signup -> Retrieve OTP -> Verify -> Assert)
 */

import { mockAuthService } from './mockAuthService';
import { db } from '../database/db';
import { TestCase } from '../types';

export interface AutomationFlowStepResult {
  step: string;
  success: boolean;
  message: string;
  durationMs: number;
  data?: any;
}

export interface AutomationFlowRunResult {
  passed: boolean;
  totalDurationMs: number;
  steps: AutomationFlowStepResult[];
}

export class TestAutomationRunner {
  static async runFullAuthTestFlow(
    workspaceId: string,
    testIdentityEmail: string,
    serviceName: string = 'Test Portal'
  ): Promise<AutomationFlowRunResult> {
    const overallStart = performance.now();
    const steps: AutomationFlowStepResult[] = [];

    // Step 1: Initialize / Reserve Identity
    const s1Start = performance.now();
    try {
      steps.push({
        step: '1. Select Test Identity',
        success: true,
        message: `Using test identity: ${testIdentityEmail}`,
        durationMs: Math.round(performance.now() - s1Start),
        data: { email: testIdentityEmail },
      });
    } catch (e: any) {
      steps.push({
        step: '1. Select Test Identity',
        success: false,
        message: e.message,
        durationMs: Math.round(performance.now() - s1Start),
      });
      return { passed: false, totalDurationMs: Math.round(performance.now() - overallStart), steps };
    }

    // Step 2: Submit Signup Request
    const s2Start = performance.now();
    const signupRes = await mockAuthService.signup(workspaceId, testIdentityEmail, 'Passw0rd123!');
    steps.push({
      step: '2. Submit Signup Request',
      success: signupRes.success,
      message: signupRes.message,
      durationMs: Math.round(performance.now() - s2Start),
      data: signupRes,
    });

    if (!signupRes.success) {
      return { passed: false, totalDurationMs: Math.round(performance.now() - overallStart), steps };
    }

    // Step 3: Simulate OTP Delivery & Retrieval
    const s3Start = performance.now();
    const retrievedOtp = signupRes.otp;
    steps.push({
      step: '3. Intercept & Retrieve OTP',
      success: !!retrievedOtp,
      message: `Retrieved OTP: ${retrievedOtp}`,
      durationMs: Math.round(performance.now() - s3Start),
      data: { otp: retrievedOtp },
    });

    if (!retrievedOtp) {
      return { passed: false, totalDurationMs: Math.round(performance.now() - overallStart), steps };
    }

    // Step 4: Verify OTP
    const s4Start = performance.now();
    const verifyRes = await mockAuthService.verifyOtp(workspaceId, testIdentityEmail, retrievedOtp);
    steps.push({
      step: '4. Submit OTP Verification',
      success: verifyRes.success,
      message: verifyRes.message,
      durationMs: Math.round(performance.now() - s4Start),
      data: verifyRes,
    });

    if (!verifyRes.success) {
      return { passed: false, totalDurationMs: Math.round(performance.now() - overallStart), steps };
    }

    // Step 5: Test Login with Verified Credentials
    const s5Start = performance.now();
    const loginRes = await mockAuthService.login(testIdentityEmail, 'Passw0rd123!');
    steps.push({
      step: '5. Login with Verified Account',
      success: loginRes.success,
      message: loginRes.message,
      durationMs: Math.round(performance.now() - s5Start),
      data: loginRes,
    });

    const passed = loginRes.success;
    const totalDurationMs = Math.round(performance.now() - overallStart);

    // Record activity log
    await db.addLog({
      id: `log_test_${Date.now()}`,
      workspaceId,
      type: 'test_run',
      details: `Executed automated auth test flow for ${testIdentityEmail}: ${passed ? 'PASSED' : 'FAILED'} (${totalDurationMs}ms)`,
      timestamp: Date.now(),
    });

    return { passed, totalDurationMs, steps };
  }

  static async runTestCase(workspaceId: string, testCase: TestCase): Promise<TestCase> {
    const updated: TestCase = {
      ...testCase,
      status: 'Running',
      lastRunAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.updateTestCase(updated);

    const email = testCase.identityEmail || 'test.user@gmail.com';
    const result = await this.runFullAuthTestFlow(workspaceId, email, testCase.name);

    const finalStatus = result.passed ? 'Passed' : 'Failed';
    const actualResult = result.steps.map((s) => `${s.step}: ${s.success ? '✓' : '✗'} ${s.message}`).join('\n');

    const finalCase: TestCase = {
      ...updated,
      status: finalStatus,
      actualResult,
      updatedAt: Date.now(),
    };
    await db.updateTestCase(finalCase);
    return finalCase;
  }
}

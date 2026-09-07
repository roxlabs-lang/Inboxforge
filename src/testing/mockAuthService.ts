/**
 * Local Test Lab — Mock Authentication & OTP Service
 * Runs completely locally to test signup, login, OTP verification, password reset,
 * and account lockout scenarios deterministically.
 */

import { OTPRecord, MockEmail } from '../types';
import { db } from '../database/db';
import { normalizeCanonicalGmailAddress } from '../utils/canonical';

export interface MockUserAccount {
  email: string;
  passwordHash?: string;
  isVerified: boolean;
  failedLoginAttempts: number;
  isLocked: boolean;
  registeredAt: number;
  lastLoginAt?: number;
}

export interface MockOtpState {
  otp: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
}

export class MockAuthService {
  private accounts: Map<string, MockUserAccount> = new Map();
  private activeOtps: Map<string, MockOtpState> = new Map();

  /**
   * Deterministically generates a 6-digit numeric OTP for an email and optional salt
   */
  generateDeterministicOtp(email: string, salt: string = ''): string {
    let hash = 0;
    const str = `${email.toLowerCase()}:${salt}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const positive = Math.abs(hash);
    const sixDigit = (positive % 900000) + 100000;
    return sixDigit.toString();
  }

  /**
   * Simulate User Signup
   */
  async signup(
    workspaceId: string,
    email: string,
    password?: string
  ): Promise<{ success: boolean; message: string; otp?: string; account?: MockUserAccount }> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.accounts.has(cleanEmail)) {
      const existing = this.accounts.get(cleanEmail)!;
      if (existing.isVerified) {
        return { success: false, message: 'Account already exists and is verified.' };
      }
    }

    const account: MockUserAccount = {
      email: cleanEmail,
      passwordHash: password ? `mock_hash_${password}` : undefined,
      isVerified: false,
      failedLoginAttempts: 0,
      isLocked: false,
      registeredAt: Date.now(),
    };
    this.accounts.set(cleanEmail, account);

    // Generate OTP
    const otp = this.generateDeterministicOtp(cleanEmail, Date.now().toString().slice(0, 7));
    const now = Date.now();
    const expiryMs = 5 * 60 * 1000; // 5 mins

    this.activeOtps.set(cleanEmail, {
      otp,
      createdAt: now,
      expiresAt: now + expiryMs,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    });

    // Record into OTP Inbox database
    const otpRecord: OTPRecord = {
      id: `otp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      identityEmail: cleanEmail,
      service: 'Local Auth Simulator',
      otp,
      receivedAt: now,
      status: 'Received',
      notes: 'Automated signup OTP challenge',
      createdAt: now,
    };
    await db.createOTPRecord(otpRecord);

    // Also dispatch into Mock Email Inbox for test visibility
    const canonical = normalizeCanonicalGmailAddress(cleanEmail);
    const mockEmail: MockEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      recipientEmail: cleanEmail,
      canonicalAddress: canonical,
      senderName: 'Local Auth Simulator',
      senderEmail: 'security@local-simulator.example.com',
      subject: `Your test verification code is ${otp}`,
      preview: `Use verification code >>> ${otp} <<< to complete test signup.`,
      bodyText: `Hello,\n\nYour automated test verification passcode is:\n\n   >>> ${otp} <<<\n\nTarget Identity: ${cleanEmail}\nCanonical Mailbox: ${canonical}\n\nThis code expires in 5 minutes.`,
      extractedOtp: otp,
      isRead: false,
      isStarred: false,
      folder: 'inbox',
      tags: ['2FA', 'Simulator', 'Auth'],
      headers: {
        'Message-ID': `<sim-${Date.now()}@inboxforge.local>`,
        'X-Simulated-Delivery': 'Mock Auth Simulator',
        'X-Synthetic-Recipient': cleanEmail,
        'X-Canonical-Mailbox': canonical,
      },
      receivedAt: now,
      isLocalSimulated: true,
    };
    await db.addMockEmail(mockEmail);

    return {
      success: true,
      message: 'Signup initiated. Verification OTP sent to simulated inbox.',
      otp,
      account,
    };
  }

  /**
   * Verify Signup / Login OTP
   */
  async verifyOtp(
    workspaceId: string,
    email: string,
    enteredOtp: string
  ): Promise<{ success: boolean; message: string; account?: MockUserAccount }> {
    const cleanEmail = email.trim().toLowerCase();
    const otpState = this.activeOtps.get(cleanEmail);

    if (!otpState) {
      return { success: false, message: 'No active OTP found for this identity.' };
    }

    if (otpState.isUsed) {
      return { success: false, message: 'This OTP has already been used.' };
    }

    if (Date.now() > otpState.expiresAt) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    otpState.attempts++;

    if (otpState.attempts > otpState.maxAttempts) {
      return {
        success: false,
        message: 'Max verification attempts exceeded. OTP invalidated.',
      };
    }

    if (otpState.otp !== enteredOtp.trim()) {
      return {
        success: false,
        message: `Invalid OTP code. (${otpState.maxAttempts - otpState.attempts} attempts remaining)`,
      };
    }

    // Success
    otpState.isUsed = true;
    let account = this.accounts.get(cleanEmail);
    if (!account) {
      account = {
        email: cleanEmail,
        isVerified: true,
        failedLoginAttempts: 0,
        isLocked: false,
        registeredAt: Date.now(),
      };
      this.accounts.set(cleanEmail, account);
    } else {
      account.isVerified = true;
      account.failedLoginAttempts = 0;
      account.isLocked = false;
    }

    return {
      success: true,
      message: 'Identity successfully verified! Account is active.',
      account,
    };
  }

  /**
   * Simulate Login
   */
  async login(
    email: string,
    password?: string
  ): Promise<{ success: boolean; message: string; account?: MockUserAccount }> {
    const cleanEmail = email.trim().toLowerCase();
    const account = this.accounts.get(cleanEmail);

    if (!account) {
      return { success: false, message: 'Account not found. Please sign up first.' };
    }

    if (account.isLocked) {
      return { success: false, message: 'Account is locked due to too many failed attempts.' };
    }

    if (password && account.passwordHash && account.passwordHash !== `mock_hash_${password}`) {
      account.failedLoginAttempts++;
      if (account.failedLoginAttempts >= 5) {
        account.isLocked = true;
        return { success: false, message: 'Account locked! 5 consecutive failed attempts.' };
      }
      return {
        success: false,
        message: `Incorrect password. Failed attempts: ${account.failedLoginAttempts}/5.`,
      };
    }

    account.failedLoginAttempts = 0;
    account.lastLoginAt = Date.now();
    return {
      success: true,
      message: 'Login successful.',
      account,
    };
  }

  /**
   * Reset password request
   */
  async requestPasswordReset(
    workspaceId: string,
    email: string
  ): Promise<{ success: boolean; message: string; otp?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const otp = this.generateDeterministicOtp(cleanEmail, 'reset');
    const now = Date.now();

    this.activeOtps.set(cleanEmail, {
      otp,
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    });

    await db.createOTPRecord({
      id: `otp_reset_${Date.now()}`,
      workspaceId,
      identityEmail: cleanEmail,
      service: 'Password Reset',
      otp,
      receivedAt: now,
      status: 'Received',
      notes: 'Password Reset OTP Challenge',
      createdAt: now,
    });

    return {
      success: true,
      message: 'Password reset OTP generated.',
      otp,
    };
  }

  getAccount(email: string): MockUserAccount | undefined {
    return this.accounts.get(email.trim().toLowerCase());
  }

  getAllAccounts(): MockUserAccount[] {
    return Array.from(this.accounts.values());
  }

  resetAll() {
    this.accounts.clear();
    this.activeOtps.clear();
  }
}

export const mockAuthService = new MockAuthService();

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Filter,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Paperclip,
  ShieldCheck,
  Tag,
  AlertCircle,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Trash2,
  Star,
  Archive,
  Eye,
  FileText,
  Sparkles,
  FlaskConical,
  Lock,
  LogOut,
  Send,
  HelpCircle,
  UserCheck,
  Info,
  Zap,
  Volume2,
  VolumeX,
  Wrench,
  Link,
  LifeBuoy,
  Bug,
  RotateCcw,
  Plus,
  Users,
} from 'lucide-react';
import { MockEmail, MockEmailAttachment, Variant, ConnectedGmailAccount } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { normalizeCanonicalGmailAddress, analyzeEmailIdentity } from '../utils/canonical';
import { extractOtpFromMessage, ParsedOtpResult } from '../utils/otpParser';
import { runOtpTestSuite, TestSuiteSummary } from '../tests/otpPipeline.test';
import { GmailIngestionService, GmailConnectionStatus } from '../services/gmailIngestion';
import { mailboxManager } from '../services/MailboxManager';
import {
  signInWithGoogle,
  signOutGoogle,
  getCachedAccessToken,
  initAuthListener,
  reconnectGmailAccount,
} from '../services/auth';
import { User } from 'firebase/auth';

interface RealInboxAndOTPViewProps {
  workspaceId: string;
  baseEmail?: string;
  activeAccount?: ConnectedGmailAccount | null;
  emails: MockEmail[];
  variants: Variant[];
  onAddEmail: (email: MockEmail) => Promise<void>;
  onUpdateEmail: (email: MockEmail) => Promise<void>;
  onDeleteEmail: (id: string) => Promise<void>;
  onBulkDeleteEmails: (ids: string[]) => Promise<void>;
  onClearAll: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
  onOpenAccountSwitcher?: () => void;
}

// Sound chime generator using browser Web Audio API
function playOtpSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // AudioContext blocked or not supported
  }
}

export const RealInboxAndOTPView: React.FC<RealInboxAndOTPViewProps> = ({
  workspaceId,
  baseEmail = 'thegoatedcreator69@gmail.com',
  activeAccount,
  emails,
  variants,
  onAddEmail,
  onUpdateEmail,
  onDeleteEmail,
  onBulkDeleteEmails,
  onClearAll,
  onRefreshData,
  onOpenAccountSwitcher,
}) => {
  // Navigation Tabs: All Messages vs Real Gmail vs Test Sandbox
  const [activeSubTab, setActiveSubTab] = useState<'all_inbox' | 'real_inbox' | 'test_sandbox'>('all_inbox');

  // Multi-Mailbox Connection State
  const [allMailboxes, setAllMailboxes] = useState<ConnectedGmailAccount[]>([]);
  const [activeMailbox, setActiveMailbox] = useState<ConnectedGmailAccount | null>(activeAccount || null);
  const [isMailboxDropdownOpen, setIsMailboxDropdownOpen] = useState(false);

  // Auth & Connection State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [connectionStatus, setConnectionStatus] = useState<GmailConnectionStatus>(
    activeAccount?.status || 'DISCONNECTED'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(
    activeAccount?.lastSuccessfulSync || null
  );
  const [syncStats, setSyncStats] = useState<{ newCount: number; otps: number } | null>(null);

  // Live Auto-Polling Engine
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(8);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Top Toast Banner for newly received OTP
  const [latestOtpToast, setLatestOtpToast] = useState<{
    code: string;
    sender: string;
    subject: string;
    timestamp: number;
    magicLink?: string;
  } | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'otp' | 'attachments' | 'starred'>('all');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [bodyViewMode, setBodyViewMode] = useState<'preview' | 'raw' | 'headers' | 'debug'>('preview');

  // Interactive Diagnostic & Troubleshooting Modal
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [testExtractorInput, setTestExtractorInput] = useState('');
  const [testExtractorResult, setTestExtractorResult] = useState<ParsedOtpResult | null>(null);
  const [testSuiteSummary, setTestSuiteSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Test Sandbox Generator Modal
  const [isTestGeneratorOpen, setIsTestGeneratorOpen] = useState(false);
  const [sandboxPreset, setSandboxPreset] = useState<'otp' | 'welcome' | 'receipt' | 'reset' | 'custom'>('otp');
  const [sandboxRecipient, setSandboxRecipient] = useState(variants[0]?.email || baseEmail);
  const [sandboxSenderName, setSandboxSenderName] = useState('Acme Security Team');
  const [sandboxSenderEmail, setSandboxSenderEmail] = useState('security@acme.example.com');
  const [sandboxSubject, setSandboxSubject] = useState('Your 2FA verification passcode is 739281');
  const [sandboxBody, setSandboxBody] = useState(
    'Hello,\n\nPlease use the following verification code to complete your login:\n\n   >>> 739281 <<<\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this message.'
  );
  const [sandboxTags, setSandboxTags] = useState('2FA, Security, OTP');
  const [sandboxIncludeAttachment, setSandboxIncludeAttachment] = useState(false);

  // Initialize MailboxManager Subscription
  useEffect(() => {
    // Initial fetch from MailboxManager
    mailboxManager.getAllMailboxes().then((mbs) => setAllMailboxes(mbs));
    mailboxManager.getActiveMailbox().then((act) => {
      if (act) {
        setActiveMailbox(act);
        setConnectionStatus(act.status);
        if (act.lastSuccessfulSync) setLastSyncedTime(act.lastSuccessfulSync);
      }
    });

    const unsubscribe = mailboxManager.subscribe((mailboxes, active) => {
      setAllMailboxes(mailboxes);
      if (active) {
        setActiveMailbox(active);
        setConnectionStatus(active.status);
        if (active.lastSuccessfulSync) setLastSyncedTime(active.lastSuccessfulSync);
        if (active.lastError) setSyncError(active.lastError);
      } else if (mailboxes.length === 0) {
        setActiveMailbox(null);
        setConnectionStatus('DISCONNECTED');
      }
    });

    return () => unsubscribe();
  }, []);

  // Update when prop changes
  useEffect(() => {
    if (activeAccount) {
      setActiveMailbox(activeAccount);
      setConnectionStatus(activeAccount.status);
      if (activeAccount.lastSuccessfulSync || activeAccount.lastSyncedAt) {
        setLastSyncedTime(activeAccount.lastSuccessfulSync || activeAccount.lastSyncedAt || null);
      }
    }
  }, [activeAccount]);

  // Compute latest real email timestamp to prevent displaying 'Never' when messages exist
  const latestRealEmailTimestamp = useMemo(() => {
    if (!emails || emails.length === 0) return null;
    let maxTime = 0;
    for (const em of emails) {
      if (em.receivedAt && em.receivedAt > maxTime) {
        maxTime = em.receivedAt;
      }
    }
    return maxTime > 0 ? maxTime : null;
  }, [emails]);

  const effectiveLastSynced = useMemo(() => {
    return lastSyncedTime || activeMailbox?.lastSuccessfulSync || activeMailbox?.lastSyncedAt || latestRealEmailTimestamp;
  }, [lastSyncedTime, activeMailbox, latestRealEmailTimestamp]);

  // Initialize Firebase Auth listener for fallback
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (user, token) => {
        setAuthUser(user);
        if (token) {
          setAccessToken(token);
          if (!activeMailbox || activeMailbox.status === 'CONNECTED') {
            setConnectionStatus('CONNECTED');
          }
        }
      },
      () => {
        setAuthUser(null);
        setAccessToken(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeMailbox]);

  // Canonical root address of currently active mailbox
  const canonicalRootAddress = useMemo(() => {
    const target = activeMailbox?.email || baseEmail;
    return normalizeCanonicalGmailAddress(target) || 'thegoatedcreator69@gmail.com';
  }, [activeMailbox, baseEmail]);

  // Switch Active Mailbox (preserves all existing data)
  const handleSwitchMailbox = useCallback(
    async (accountId: string) => {
      setIsMailboxDropdownOpen(false);
      setSyncError(null);
      try {
        await mailboxManager.switchActiveMailbox(accountId);
        if (onRefreshData) await onRefreshData();
      } catch (err: any) {
        setSyncError(err?.message || 'Failed to switch mailbox');
      }
    },
    [onRefreshData]
  );

  // Sync Real Gmail Messages (incremental by default)
  const handleSyncRealGmail = useCallback(
    async (isDeepScan = false) => {
      const currentEmail = activeMailbox?.email || authUser?.email;
      if (!currentEmail && !accessToken) {
        setConnectionStatus('AUTHENTICATION REQUIRED');
        return;
      }

      setIsSyncing(true);
      setSyncError(null);
      setConnectionStatus('SYNCING');

      try {
        const result = await mailboxManager.syncMailbox({
          workspaceId,
          mailboxEmail: currentEmail,
          forceFullScan: isDeepScan,
        });

        if (result.success) {
          setConnectionStatus('CONNECTED');
          setLastSyncedTime(Date.now());
          setSyncStats({
            newCount: result.newMessagesAdded,
            otps: result.otpsDetected,
          });

          // Real-time UI notification for newly arrived OTP emails
          if (result.newEmails && result.newEmails.length > 0) {
            setSelectedEmailId(result.newEmails[0].id);

            const withOtp = result.newEmails.find((e) => e.extractedOtp);
            if (withOtp && withOtp.extractedOtp) {
              setLatestOtpToast({
                code: withOtp.extractedOtp,
                sender: withOtp.senderName,
                subject: withOtp.subject,
                timestamp: withOtp.receivedAt,
              });
              if (soundEnabled) playOtpSound();
            }
          }

          if (onRefreshData) {
            await onRefreshData();
          }
        } else {
          if (result.isAuthExpired) {
            setConnectionStatus('AUTHENTICATION REQUIRED');
            setSyncError('Google OAuth session expired. Please reconnect Gmail below.');
          } else {
            setConnectionStatus('ERROR');
            setSyncError(result.error || 'Failed to sync emails from Gmail. Existing inbox remains intact.');
          }
        }
      } catch (err: any) {
        setConnectionStatus('ERROR');
        setSyncError(err.message || 'Network error occurred while syncing. Existing inbox remains intact.');
      } finally {
        setIsSyncing(false);
        setNextSyncCountdown(8);
      }
    },
    [activeMailbox, authUser, accessToken, workspaceId, soundEnabled, onRefreshData]
  );

  const handleSyncRef = useRef(handleSyncRealGmail);
  useEffect(() => {
    handleSyncRef.current = handleSyncRealGmail;
  });

  // Live Auto-Polling Timer
  useEffect(() => {
    if (!autoSyncEnabled || connectionStatus !== 'CONNECTED') {
      return;
    }

    const interval = setInterval(() => {
      setNextSyncCountdown((prev) => {
        if (prev <= 1) {
          handleSyncRef.current(false);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled, connectionStatus]);

  // Connect Another Gmail Account (cleanly, without deleting existing data)
  const handleConnectAnotherMailbox = async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      const newAcct = await mailboxManager.connectNewMailbox();
      setActiveMailbox(newAcct);
      setConnectionStatus('CONNECTED');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled'
      ) {
        // Ignored
      } else if (err?.code === 'auth/popup-blocked') {
        setSyncError('Popup blocked by browser. Please allow popups or open in a new tab.');
      } else {
        setSyncError(err?.message || 'Failed to authorize Gmail account.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Reconnect Gmail Account (if token expired or failed)
  const handleReconnectMailbox = async () => {
    if (!activeMailbox?.email) {
      await handleConnectAnotherMailbox();
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      const reconnected = await mailboxManager.reconnectMailbox(activeMailbox.email);
      setActiveMailbox(reconnected);
      setConnectionStatus('CONNECTED');
      // Automatically run quick incremental sync after reconnecting
      await handleSyncRealGmail(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled'
      ) {
        // Ignored
      } else {
        setSyncError(err?.message || `Failed to reconnect ${activeMailbox.email}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Google Sign Out (active mailbox)
  const handleGoogleSignOut = async () => {
    try {
      if (activeMailbox) {
        await mailboxManager.disconnectMailbox(activeMailbox.id);
      } else {
        await signOutGoogle();
      }
      setConnectionStatus('DISCONNECTED');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      console.warn('Sign out notice:', err?.message || err);
    }
  };

  // Instant Test OTP Dispatcher (Generates an authentic OTP message instantly)
  const handleInstantTestOtp = async () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const targetEmail = selectedRecipient !== 'all' ? selectedRecipient : variants[0]?.email || baseEmail;
    const now = Date.now();

    const newOtpMsg: MockEmail = {
      id: `otp_test_${now}_${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      recipientEmail: targetEmail,
      canonicalAddress: normalizeCanonicalGmailAddress(targetEmail),
      senderName: 'Identity Security Team',
      senderEmail: 'auth-verify@security.example.com',
      subject: `Your single-use verification passcode is ${randomCode}`,
      preview: `Use passcode >>> ${randomCode} <<< to complete your verification challenge.`,
      bodyText: `Hello,\n\nYour single-use verification passcode is:\n\n   >>> ${randomCode} <<<\n\nTarget Identity: ${targetEmail}\nCanonical Mailbox: ${canonicalRootAddress}\n\nThis passcode expires in 10 minutes. If you did not request this, please disregard.`,
      extractedOtp: randomCode,
      isRead: false,
      isStarred: true,
      folder: 'inbox',
      tags: ['2FA', 'Instant Test', 'OTP'],
      headers: {
        'From': 'Identity Security Team <auth-verify@security.example.com>',
        'To': targetEmail,
        'Subject': `Your single-use verification passcode is ${randomCode}`,
        'Date': new Date(now).toUTCString(),
        'X-Authentication-Code': randomCode,
      },
      receivedAt: now,
      isLocalSimulated: true,
    };

    await onAddEmail(newOtpMsg);
    setSelectedEmailId(newOtpMsg.id);

    // Show top banner toast & audio
    setLatestOtpToast({
      code: randomCode,
      sender: 'Identity Security Team',
      subject: newOtpMsg.subject,
      timestamp: now,
    });

    if (soundEnabled) playOtpSound();
  };

  // Categorize emails with strict Mailbox Isolation
  const realEmails = useMemo(() => {
    return emails.filter((e) => {
      // Must only be genuine real messages
      if (e.isLocalSimulated === true) return false;

      // Filter strictly by the currently active mailbox
      if (activeMailbox?.email) {
        if (e.mailboxId) {
          return e.mailboxId.toLowerCase() === activeMailbox.email.toLowerCase();
        }
        // Fallback for legacy messages
        const activeNorm = normalizeCanonicalGmailAddress(activeMailbox.email);
        const recipNorm = normalizeCanonicalGmailAddress(e.recipientEmail);
        const canonNorm = e.canonicalAddress ? normalizeCanonicalGmailAddress(e.canonicalAddress) : '';
        return recipNorm === activeNorm || canonNorm === activeNorm;
      }

      return true;
    });
  }, [emails, activeMailbox]);

  const syntheticEmails = useMemo(() => {
    return emails.filter((e) => e.isLocalSimulated === true);
  }, [emails]);

  // Active pool based on tab: real_inbox strictly contains only active mailbox's real genuine emails
  const activeEmailPool = useMemo(() => {
    if (activeSubTab === 'real_inbox') return realEmails;
    if (activeSubTab === 'test_sandbox') return syntheticEmails;
    return [...realEmails, ...syntheticEmails]; // 'all_inbox'
  }, [activeSubTab, realEmails, syntheticEmails]);

  // Filter and search active emails
  const filteredEmails = useMemo(() => {
    return activeEmailPool.filter((em) => {
      // Recipient filter
      if (selectedRecipient !== 'all' && em.recipientEmail !== selectedRecipient) {
        return false;
      }

      // Feature filters
      if (filterType === 'unread' && em.isRead) return false;
      if (filterType === 'starred' && !em.isStarred) return false;
      if (filterType === 'otp' && !em.extractedOtp) return false;
      if (filterType === 'attachments' && (!em.attachments || em.attachments.length === 0)) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const inSender = em.senderName.toLowerCase().includes(q) || em.senderEmail.toLowerCase().includes(q);
        const inSubj = em.subject.toLowerCase().includes(q);
        const inBody = em.bodyText.toLowerCase().includes(q);
        const inRecipient = em.recipientEmail.toLowerCase().includes(q);
        const inOtp = em.extractedOtp ? em.extractedOtp.toLowerCase().includes(q) : false;
        return inSender || inSubj || inBody || inRecipient || inOtp;
      }

      return true;
    });
  }, [activeEmailPool, selectedRecipient, filterType, search]);

  // Auto-select first email if none selected or selection invalid
  useEffect(() => {
    if (filteredEmails.length > 0) {
      if (!selectedEmailId || !filteredEmails.some((e) => e.id === selectedEmailId)) {
        setSelectedEmailId(filteredEmails[0].id);
      }
    } else {
      setSelectedEmailId(null);
    }
  }, [filteredEmails, selectedEmailId]);

  // Selected email object
  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Auto-mark as read when opened
  useEffect(() => {
    if (selectedEmail && !selectedEmail.isRead) {
      onUpdateEmail({ ...selectedEmail, isRead: true });
    }
  }, [selectedEmail, onUpdateEmail]);

  // Extracted OTP from selected email
  const parsedOtpResult: ParsedOtpResult | null = useMemo(() => {
    if (!selectedEmail) return null;
    const directResult = extractOtpFromMessage(
      selectedEmail.subject,
      selectedEmail.bodyText,
      selectedEmail.bodyHtml
    );
    if (directResult) return directResult;
    if (selectedEmail.extractedOtp) {
      return {
        code: selectedEmail.extractedOtp,
        confidence: selectedEmail.parserConfidence || 'high',
        patternMatched: 'persisted_message_otp',
        reason: selectedEmail.parserReason || 'Interpreted from persistent message record',
        contextSnippet: selectedEmail.subject,
      };
    }
    return null;
  }, [selectedEmail]);

  const handleCopyCode = async (code: string) => {
    await copyToClipboard(code);
    setCopiedOtp(code);
    setTimeout(() => setCopiedOtp(null), 2000);
  };

  const handleCopyRecipient = async (address: string) => {
    await copyToClipboard(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleCopyLink = async (link: string) => {
    await copyToClipboard(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Test Extractor Live Parser
  const handleRunTestExtractor = (text: string) => {
    setTestExtractorInput(text);
    if (!text.trim()) {
      setTestExtractorResult(null);
      return;
    }
    const res = extractOtpFromMessage('Subject', text, '');
    setTestExtractorResult(res);
  };

  // Automated Test Suite Runner (Requirement 11)
  const handleRunTestSuite = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const summary = runOtpTestSuite();
      setTestSuiteSummary(summary);
      setIsRunningTests(false);
    }, 150);
  };

  // Test Sandbox Preset Form Logic
  const handleApplySandboxPreset = (preset: 'otp' | 'welcome' | 'receipt' | 'reset' | 'custom') => {
    setSandboxPreset(preset);
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

    switch (preset) {
      case 'otp':
        setSandboxSenderName('Acme Security Team');
        setSandboxSenderEmail('security@acme.example.com');
        setSandboxSubject(`Your 2FA verification passcode is ${randomCode}`);
        setSandboxBody(
          `Hello,\n\nPlease use the following verification code to complete your login:\n\n   >>> ${randomCode} <<<\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this message.\n\nTarget Identity: ${sandboxRecipient}\nCanonical Mailbox: ${canonicalRootAddress}`
        );
        setSandboxTags('2FA, Security, OTP');
        setSandboxIncludeAttachment(false);
        break;
      case 'welcome':
        setSandboxSenderName('Acme Cloud Services');
        setSandboxSenderEmail('welcome@cloud.example.com');
        setSandboxSubject('Welcome to Acme Cloud Platform');
        setSandboxBody(
          `Welcome aboard!\n\nYour test sandbox account is fully activated. You can now use your testing identity for QA verification.\n\nCheers,\nThe Acme Team`
        );
        setSandboxTags('Welcome, Onboarding');
        setSandboxIncludeAttachment(false);
        break;
      case 'receipt':
        setSandboxSenderName('Acme Billing');
        setSandboxSenderEmail('billing@acme.example.com');
        setSandboxSubject(`Order Confirmation #ORD-${Math.floor(10000 + Math.random() * 90000)}`);
        setSandboxBody(
          `Thank you for your order!\n\nTotal: $129.00\nPayment: Verified\n\nYour synthetic invoice is attached.`
        );
        setSandboxTags('Billing, Receipt');
        setSandboxIncludeAttachment(true);
        break;
      case 'reset':
        setSandboxSenderName('Identity Auth System');
        setSandboxSenderEmail('no-reply@auth.example.com');
        setSandboxSubject('Password Reset Request');
        setSandboxBody(
          `We received a request to reset your password.\n\nYour temporary authorization code is: ${randomCode}\nOr click the link: https://auth.example.com/reset?token=${randomCode}`
        );
        setSandboxTags('Auth, Reset');
        setSandboxIncludeAttachment(false);
        break;
      case 'custom':
        setSandboxSenderName('Simulated Webhook Sender');
        setSandboxSenderEmail('webhook@system.example.com');
        setSandboxSubject('Custom Test Notification');
        setSandboxBody('Custom test message body.');
        setSandboxTags('Custom, QA');
        setSandboxIncludeAttachment(false);
        break;
    }
  };

  const handleCreateSandboxMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxRecipient.trim() || !sandboxSubject.trim() || !sandboxBody.trim()) return;

    const parsedOtp = extractOtpFromMessage(sandboxSubject, sandboxBody);
    const now = Date.now();

    const newSyntheticMsg: MockEmail = {
      id: `sim_${now}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      recipientEmail: sandboxRecipient.trim(),
      canonicalAddress: normalizeCanonicalGmailAddress(sandboxRecipient.trim()),
      senderName: sandboxSenderName.trim() || 'Synthetic Test Sender',
      senderEmail: sandboxSenderEmail.trim() || 'test@example.com',
      subject: sandboxSubject.trim(),
      preview: sandboxBody.slice(0, 160).replace(/\n/g, ' '),
      bodyText: sandboxBody,
      extractedOtp: parsedOtp?.code,
      isRead: false,
      isStarred: false,
      folder: 'inbox',
      tags: sandboxTags.split(',').map((t) => t.trim()).filter(Boolean),
      attachments: sandboxIncludeAttachment
        ? [
            {
              id: `att_${now}`,
              name: 'Invoice_Receipt.pdf',
              size: 48200,
              type: 'application/pdf',
            },
          ]
        : undefined,
      headers: {
        'From': `${sandboxSenderName} <${sandboxSenderEmail}>`,
        'To': sandboxRecipient,
        'Subject': sandboxSubject,
        'Date': new Date(now).toUTCString(),
        'X-Simulator': 'InboxForge Offline Test Sandbox',
      },
      receivedAt: now,
      isLocalSimulated: true,
    };

    await onAddEmail(newSyntheticMsg);
    setIsTestGeneratorOpen(false);
    setSelectedEmailId(newSyntheticMsg.id);

    if (parsedOtp?.code) {
      setLatestOtpToast({
        code: parsedOtp.code,
        sender: newSyntheticMsg.senderName,
        subject: newSyntheticMsg.subject,
        timestamp: now,
        magicLink: parsedOtp.magicLink,
      });
      if (soundEnabled) playOtpSound();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Floating New OTP Notification Toast */}
      {latestOtpToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border-2 border-emerald-500/60 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <KeyRound className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  🎉 Verification OTP Arrived!
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(latestOtpToast.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs text-slate-200 mt-0.5 truncate max-w-md">
                From: <span className="font-semibold text-white">{latestOtpToast.sender}</span> — {latestOtpToast.subject}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-xl font-mono font-bold text-emerald-400 tracking-widest select-all">
              {latestOtpToast.code}
            </div>

            <button
              onClick={() => handleCopyCode(latestOtpToast.code)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              {copiedOtp === latestOtpToast.code ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy OTP</span>
                </>
              )}
            </button>

            <button
              onClick={() => setLatestOtpToast(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Inbox className="w-5 h-5 text-indigo-400" />
              <span>Inbox & Live OTP Center</span>
            </h1>

            {/* Sub Tabs: All vs Real Gmail vs Test Sandbox */}
            <div className="inline-flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
              <button
                onClick={() => setActiveSubTab('all_inbox')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'all_inbox'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>All Mail</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 rounded-full font-mono">
                  {emails.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('real_inbox')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'real_inbox'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Real Gmail</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-mono">
                  {realEmails.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('test_sandbox')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSubTab === 'test_sandbox'
                    ? 'bg-amber-600/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Sandbox</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 rounded-full font-mono">
                  {syntheticEmails.length}
                </span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Intercept and parse live OTP verification passcodes, 2FA codes, and magic links delivered to your Gmail dot & plus variants.
          </p>
        </div>

        {/* Action Controls & Fast Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto">
          {/* Quick Test OTP Dispatcher Button */}
          <button
            onClick={handleInstantTestOtp}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer min-h-[38px]"
            title="Instantly generate and receive a realistic verification code"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Receive Test OTP</span>
          </button>

          {/* Mailbox Switcher & Connect Actions */}
          <div className="relative">
            <button
              onClick={() => setIsMailboxDropdownOpen(!isMailboxDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-medium border border-slate-700 transition cursor-pointer min-h-[38px]"
              title="Switch or manage connected Gmail accounts"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[140px] truncate font-mono">
                {activeMailbox ? activeMailbox.email : 'No Mailbox'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMailboxDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMailboxDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Authorized Mailboxes</span>
                  <span className="font-mono text-indigo-400">{allMailboxes.length}</span>
                </div>

                {allMailboxes.map((mb) => {
                  const isActive = activeMailbox?.id === mb.id;
                  return (
                    <button
                      key={mb.id}
                      onClick={() => handleSwitchMailbox(mb.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono text-xs font-medium truncate">{mb.email}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              mb.status === 'CONNECTED'
                                ? 'bg-emerald-400'
                                : mb.status === 'AUTHENTICATION REQUIRED'
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span>{mb.status}</span>
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })}

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setIsMailboxDropdownOpen(false);
                    handleConnectAnotherMailbox();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-indigo-300 hover:bg-indigo-950/40 hover:text-indigo-200 flex items-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Another Gmail</span>
                </button>

                {onOpenAccountSwitcher && (
                  <button
                    onClick={() => {
                      setIsMailboxDropdownOpen(false);
                      onOpenAccountSwitcher();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Manage All Mailboxes</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sync now button */}
          <button
            onClick={() => handleSyncRealGmail(false)}
            disabled={isSyncing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer min-h-[38px]"
            title="Incremental sync using Gmail sync cursor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync now'}</span>
          </button>

          {/* Reconnect Gmail Button if needed */}
          {(connectionStatus === 'AUTHENTICATION REQUIRED' || connectionStatus === 'ERROR') && (
            <button
              onClick={handleReconnectMailbox}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer min-h-[38px]"
              title="Refresh Google OAuth credentials without data loss"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reconnect Gmail</span>
            </button>
          )}

          {/* Troubleshooter & Help Button */}
          <button
            onClick={() => setShowTroubleshooter(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer min-h-[38px]"
            title="Can't receive OTP? Diagnostic Assistant"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fix OTP Reception</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition cursor-pointer min-h-[38px] flex items-center justify-center"
            title={soundEnabled ? 'Mute OTP alerts' : 'Enable OTP audio chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Comprehensive Mailbox Connection State & Radar Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col gap-3.5 text-xs shadow-lg">
        {/* Top row: Active Mailbox details */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Connection Status Pill */}
            {connectionStatus === 'CONNECTED' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>CONNECTED</span>
              </div>
            ) : connectionStatus === 'SYNCING' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-xs">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>SYNCING INBOX...</span>
              </div>
            ) : connectionStatus === 'AUTHENTICATION REQUIRED' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>AUTHENTICATION REQUIRED</span>
              </div>
            ) : connectionStatus === 'ERROR' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>SYNC ERROR</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span>DISCONNECTED</span>
              </div>
            )}

            {/* Active Mailbox Address & ID */}
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">Active Mailbox:</span>
              <strong className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {activeMailbox?.email || authUser?.email || canonicalRootAddress}
              </strong>
              {activeMailbox?.mailboxId && (
                <span
                  className="text-[10px] text-slate-500 font-mono hidden md:inline cursor-pointer hover:text-slate-300"
                  onClick={() => copyToClipboard(activeMailbox.mailboxId)}
                  title="Click to copy mailbox ID"
                >
                  (ID: {activeMailbox.mailboxId.substring(0, 10)}...)
                </span>
              )}
            </div>

            {/* Authorization State Badge */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>
                Auth:{' '}
                <span
                  className={
                    activeMailbox?.authState === 'authorized' ||
                    activeMailbox?.authState === 'AUTHORIZED' ||
                    connectionStatus === 'CONNECTED'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }
                >
                  {activeMailbox?.authState || (connectionStatus === 'CONNECTED' ? 'AUTHORIZED' : 'UNAUTHORIZED')}
                </span>
              </span>
            </div>

            {/* Sync Cursor / History ID */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
              <Radio className="w-3 h-3 text-teal-400" />
              <span>
                Cursor:{' '}
                <span className="text-teal-300">
                  {activeMailbox?.syncCursor || activeMailbox?.lastHistoryId || (effectiveLastSynced ? 'Synced (Active)' : 'Initial Scan')}
                </span>
              </span>
            </div>
          </div>

          {/* Sync status & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-slate-400 text-[11px]">
              <span>Last synced: </span>
              <span className="text-slate-200 font-medium">
                {effectiveLastSynced ? new Date(effectiveLastSynced).toLocaleTimeString() : 'Never'}
              </span>
            </div>

            <button
              onClick={() => handleSyncRealGmail(true)}
              disabled={isSyncing || connectionStatus === 'DISCONNECTED'}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 underline cursor-pointer"
            >
              Deep Scan All Folders
            </button>
          </div>
        </div>

        {/* Sync or Auth Error notification with quick Retry & Reconnect */}
        {(syncError || activeMailbox?.lastError) && (
          <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-semibold">Last Error: </span>
                <span>{syncError || activeMailbox?.lastError}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleSyncRealGmail(false)}
                disabled={isSyncing}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={handleReconnectMailbox}
                disabled={isSyncing}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reconnect Gmail</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Inbox Workspace (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Filter & Message List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Filter Bar */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search OTPs, senders, subjects, or passcodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All Messages' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'otp', label: '🔑 OTP / 2FA' },
                  { id: 'attachments', label: 'Files' },
                  { id: 'starred', label: 'Starred' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer text-[11px] ${
                    filterType === f.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Recipient Target Dropdown Filter */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="whitespace-nowrap">Filter by Variant:</span>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="bg-slate-950 border border-slate-700/60 text-slate-200 rounded-lg px-2 py-0.5 text-[11px] flex-1 truncate focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Variants & Mailboxes ({activeEmailPool.length})</option>
                <option value={canonicalRootAddress}>Root: {canonicalRootAddress}</option>
                {variants.slice(0, 50).map((v) => (
                  <option key={v.id} value={v.email}>
                    {v.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages List Container */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  <Mail className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">No messages received yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {connectionStatus === 'CONNECTED'
                      ? 'Listening for incoming verification emails. Try triggering an OTP from your target service or test with a simulated code.'
                      : 'Connect your Gmail account or click "Receive Test OTP" to test verification code interception.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={handleInstantTestOtp}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Send Test OTP</span>
                  </button>

                  {connectionStatus !== 'CONNECTED' && (
                    <button
                      onClick={handleConnectAnotherMailbox}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Connect Gmail</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredEmails.map((msg) => {
                const isSelected = msg.id === selectedEmailId;
                const hasOtp = Boolean(msg.extractedOtp);
                const isSynthetic = msg.isLocalSimulated === true;

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedEmailId(msg.id)}
                    className={`p-3.5 transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-indigo-600/15 border-l-4 border-l-indigo-500'
                        : msg.isRead
                        ? 'hover:bg-slate-800/40 bg-slate-900/40'
                        : 'hover:bg-slate-800/70 bg-slate-800/30 font-semibold'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSynthetic ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                            TEST
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            REAL
                          </span>
                        )}
                        <span className="text-xs text-white truncate">{msg.senderName}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-200 truncate mt-1">{msg.subject}</div>

                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{msg.preview}</div>

                    {/* Footer tags & OTP snippet if present */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-800/40 text-[10px]">
                      <div className="text-slate-400 truncate max-w-[170px] font-mono">
                        To: {msg.recipientEmail}
                      </div>

                      {hasOtp && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                          <KeyRound className="w-3 h-3 text-emerald-400" />
                          <span>OTP: {msg.extractedOtp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Message Detail & Real OTP Extraction Panel (7 cols) */}
        <div className="lg:col-span-7">
          {selectedEmail ? (
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800/80">
              {/* Message Header Bar */}
              <div className="p-4 md:p-5 space-y-3 bg-slate-950/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedEmail.isLocalSimulated ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                          TEST / SYNTHETIC MESSAGE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                          GENUINE RECEIVED GMAIL
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedEmail.receivedAt).toLocaleString()}
                      </span>
                    </div>

                    <h2 className="text-base md:text-lg font-bold text-white leading-snug">
                      {selectedEmail.subject}
                    </h2>
                  </div>

                  {/* Actions (Star, Delete) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onUpdateEmail({ ...selectedEmail, isStarred: !selectedEmail.isStarred })
                      }
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        selectedEmail.isStarred
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white border-slate-700/60'
                      }`}
                      title={selectedEmail.isStarred ? 'Starred' : 'Star message'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={() => onDeleteEmail(selectedEmail.id)}
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700/60 transition cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sender & Recipient Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[11px]">From</div>
                    <div className="text-slate-200 font-medium truncate">
                      {selectedEmail.senderName}{' '}
                      <span className="text-slate-400 font-mono">({selectedEmail.senderEmail})</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[11px]">Target Identity & Delivery</div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-indigo-300 truncate font-medium">
                        {selectedEmail.recipientEmail}
                      </span>
                      <button
                        onClick={() => handleCopyRecipient(selectedEmail.recipientEmail)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="Copy target address"
                      >
                        {copiedAddress === selectedEmail.recipientEmail ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      ↳ Canonical Inbox: <span className="font-mono text-emerald-400">{selectedEmail.canonicalAddress || canonicalRootAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL OTP / VERIFICATION CODE EXTRACTION PANEL */}
              <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-y border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>OTP / Verification Code</span>
                  </div>

                  {parsedOtpResult && parsedOtpResult.code !== 'MAGIC_LINK' ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Confidence: {(parsedOtpResult.confidence || 'HIGH').toUpperCase()}
                    </span>
                  ) : null}
                </div>

                {parsedOtpResult && parsedOtpResult.code !== 'MAGIC_LINK' ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                    <div className="space-y-1">
                      <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>OTP / Verification Code</span>
                      </div>
                      <div className="text-sm text-slate-300 font-medium">
                        Detected code: <span className="text-2xl font-mono font-bold tracking-widest text-emerald-400 select-all ml-1.5">{parsedOtpResult.code}</span>
                      </div>
                      {parsedOtpResult.reason && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 italic">
                          {parsedOtpResult.reason}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyCode(parsedOtpResult.code)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedOtp === parsedOtpResult.code ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : parsedOtpResult?.magicLink ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                        <Link className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Magic Verification Link</span>
                      </div>
                      <div className="text-xs font-mono text-slate-300 truncate max-w-sm">
                        {parsedOtpResult.magicLink}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(parsedOtpResult.magicLink!)}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        {copiedLink === parsedOtpResult.magicLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-300">No verification code detected</span>
                    </div>

                    <button
                      onClick={() => setBodyViewMode('debug')}
                      className="text-xs text-indigo-400 hover:underline cursor-pointer flex-shrink-0"
                    >
                      Inspect in Debug Mode
                    </button>
                  </div>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="p-2.5 bg-slate-950/60 flex items-center justify-between gap-2 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBodyViewMode('preview')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                      bodyViewMode === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Formatted Message
                  </button>
                  <button
                    onClick={() => setBodyViewMode('raw')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                      bodyViewMode === 'raw'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Raw Text
                  </button>
                  <button
                    onClick={() => setBodyViewMode('headers')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                      bodyViewMode === 'headers'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Headers
                  </button>
                  <button
                    onClick={() => setBodyViewMode('debug')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs flex items-center gap-1.5 ${
                      bodyViewMode === 'debug'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>Debug Mode</span>
                  </button>
                </div>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{selectedEmail.attachments.length} file(s)</span>
                  </div>
                )}
              </div>

              {/* Message Content Body */}
              <div className="p-4 md:p-6 max-h-[480px] overflow-y-auto">
                {bodyViewMode === 'preview' ? (
                  <div className="space-y-4">
                    {selectedEmail.bodyHtml ? (
                      <div
                        className="text-xs text-slate-200 prose prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                      />
                    ) : (
                      <div className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed break-words">
                        {selectedEmail.bodyText}
                      </div>
                    )}

                    {/* Attachments Section */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="pt-4 border-t border-slate-800 space-y-2">
                        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Attachments ({selectedEmail.attachments.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedEmail.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="text-white font-medium truncate">{att.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {(att.size / 1024).toFixed(1)} KB • {att.type}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded font-semibold">
                                Stored
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : bodyViewMode === 'raw' ? (
                  <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap break-all select-all">
                    {selectedEmail.bodyText}
                  </pre>
                ) : bodyViewMode === 'headers' ? (
                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
                    {selectedEmail.headers ? (
                      Object.entries(selectedEmail.headers).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2 border-b border-slate-900 pb-1">
                          <span className="text-indigo-400 font-semibold min-w-[100px]">{k}:</span>
                          <span className="text-slate-300 break-all">{v}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">No RFC header metadata available</div>
                    )}
                  </div>
                ) : (
                  /* Requirement 9: Internal Message-Debug Panel */
                  <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-white text-sm">Message & Parser Diagnostics</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {selectedEmail.isLocalSimulated ? 'Local Simulated' : 'Genuine Gmail Message'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Message ID</div>
                        <div className="text-indigo-300 break-all select-all font-semibold">
                          {selectedEmail.gmailMessageId || selectedEmail.id}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Thread ID</div>
                        <div className="text-slate-200 break-all select-all">
                          {selectedEmail.gmailThreadId || 'N/A'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Sender</div>
                        <div className="text-slate-200 break-all truncate">
                          {selectedEmail.senderName} &lt;{selectedEmail.senderEmail}&gt;
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Recipient</div>
                        <div className="text-emerald-400 break-all truncate font-semibold">
                          {selectedEmail.recipientEmail}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 md:col-span-2">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Subject</div>
                        <div className="text-slate-100 font-sans">{selectedEmail.subject}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Received Timestamp</div>
                        <div className="text-slate-200">
                          {new Date(selectedEmail.receivedAt).toISOString()} ({selectedEmail.receivedAt})
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Detected Body Type</div>
                        <div className="text-indigo-400 font-semibold">
                          {selectedEmail.detectedBodyType || (selectedEmail.bodyHtml ? 'text/html' : 'text/plain')}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Extracted Text Length</div>
                        <div className="text-slate-200">
                          {selectedEmail.extractedTextLength ?? (selectedEmail.bodyText?.length || 0)} characters
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Parser Result</div>
                        <div className={selectedEmail.extractedOtp || (parsedOtpResult && parsedOtpResult.code !== 'MAGIC_LINK') ? 'text-emerald-400 font-bold text-base' : 'text-slate-400 font-bold'}>
                          {selectedEmail.extractedOtp || (parsedOtpResult && parsedOtpResult.code !== 'MAGIC_LINK' ? parsedOtpResult.code : 'None (No OTP detected)')}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Parser Confidence</div>
                        <div className="text-amber-300 font-bold uppercase">
                          {selectedEmail.parserConfidence || parsedOtpResult?.confidence || 'None'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 md:col-span-2">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Reason for Detected/Not-Detected OTP</div>
                        <div className="text-slate-300 font-sans">
                          {selectedEmail.parserReason || parsedOtpResult?.reason || 'No verification code pattern detected in subject or body'}
                        </div>
                      </div>
                    </div>

                    {/* MIME Structure Breakdown */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">MIME Structure Breakdown</div>
                      {selectedEmail.mimeStructure && selectedEmail.mimeStructure.length > 0 ? (
                        <div className="space-y-1.5 font-mono text-[11px]">
                          {selectedEmail.mimeStructure.map((node, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                              <div className="flex items-center justify-between text-indigo-300">
                                <span className="font-bold">Part #{node.partId || idx}: {node.mimeType}</span>
                                <span className="text-[10px] text-slate-400">
                                  {node.size ? `${(node.size / 1024).toFixed(1)} KB` : '0 KB'}
                                </span>
                              </div>
                              {node.encoding && (
                                <div className="text-[10px] text-slate-400">
                                  Encoding: <span className="text-slate-200">{node.encoding}</span>
                                </div>
                              )}
                              {node.filename && (
                                <div className="text-[10px] text-amber-300">
                                  Attachment: {node.filename}
                                </div>
                              )}
                              {node.subParts && node.subParts.length > 0 && (
                                <div className="pl-3 border-l border-slate-800 space-y-1 mt-1.5">
                                  {node.subParts.map((sub, sIdx) => (
                                    <div key={sIdx} className="text-[10px] text-slate-300 flex items-center justify-between">
                                      <span>↳ Subpart #{sub.partId || sIdx}: {sub.mimeType}</span>
                                      <span className="text-slate-500">
                                        {sub.size ? `${(sub.size / 1024).toFixed(1)} KB` : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-mono p-2.5 rounded-lg bg-slate-900">
                          Single-part standard payload: {selectedEmail.detectedBodyType || (selectedEmail.bodyHtml ? 'text/html' : 'text/plain')}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Privacy Guard: Sensitive message contents are isolated and never exposed unnecessarily in general views.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <Mail className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No message selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select an incoming message from the list to view the full content, inspect headers, and extract OTP codes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CAN'T RECEIVE OTP? DIAGNOSTIC & TROUBLESHOOTING MODAL */}
      {showTroubleshooter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-5 md:p-6 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">OTP Reception Troubleshooter & Diagnostic</h3>
                  <p className="text-slate-400 text-[11px]">
                    Step-by-step diagnostic to fix and verify OTP code interception.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTroubleshooter(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnostic Steps Grid */}
            <div className="space-y-3">
              {/* Step 1: Mailbox Connection */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Google OAuth Connection</span>
                    {connectionStatus === 'CONNECTED' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        CONNECTED ({authUser?.email || canonicalRootAddress})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        NOT CONNECTED
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    To receive real external emails from Discord, Netflix, AWS, Uber, Instagram, etc., sign in with your primary Gmail address.
                  </p>
                </div>

                {connectionStatus !== 'CONNECTED' ? (
                  <button
                    onClick={() => {
                      setShowTroubleshooter(false);
                      handleConnectAnotherMailbox();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    Connect Now
                  </button>
                ) : (
                  <button
                    onClick={() => handleSyncRealGmail(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    Force Sync Now
                  </button>
                )}
              </div>

              {/* Step 2: Dot Variant Deliverability */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>How Gmail Delivers Variant Emails</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Any variation like <span className="font-mono text-indigo-300">t.h.e.g.o.a.t.e.d.c.r.e.a.t.o.r.6.9@gmail.com</span> is delivered by Google directly to your main inbox (<span className="font-mono text-emerald-400">{canonicalRootAddress}</span>). If you used a variant on an external service, make sure the external service finished sending the code.
                </p>
              </div>

              {/* Step 3: Deep Scan Spam/Promotions */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Spam / Promotions Folder Filter</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Some verification emails land in Spam or Promotions. Click Deep Scan to ingest all folders.
                  </p>
                </div>

                <button
                  onClick={() => {
                    handleSyncRealGmail(true);
                  }}
                  disabled={connectionStatus !== 'CONNECTED'}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  Deep Scan Folders
                </button>
              </div>

              {/* Step 4: Interactive OTP Extractor Sandbox */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Interactive OTP Extractor Playground</span>
                </div>
                <p className="text-slate-400">
                  Paste any sample email text or verification snippet below to verify if the extractor catches the passcode:
                </p>

                <textarea
                  rows={3}
                  value={testExtractorInput}
                  onChange={(e) => handleRunTestExtractor(e.target.value)}
                  placeholder="Paste email body here (e.g. 'Your verification code is 849201' or 'G-849201 is your code')..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-sans text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {testExtractorResult && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-emerald-300 font-bold">EXTRACTED CODE:</div>
                      <div className="text-xl font-mono font-bold text-emerald-400 tracking-widest">
                        {testExtractorResult.code}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pattern: {testExtractorResult.patternMatched} • Confidence: {testExtractorResult.confidence}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyCode(testExtractorResult.code)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Copy Extracted OTP
                    </button>
                  </div>
                )}
              </div>

              {/* Step 5: Automated OTP Pipeline Verification Suite (Requirement 11) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">5</span>
                    <span>Automated OTP Pipeline Test Suite (11 Scenarios)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunTestSuite}
                    disabled={isRunningTests}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                    <span>{isRunningTests ? 'Running Suite...' : 'Run Test Suite'}</span>
                  </button>
                </div>

                <p className="text-slate-400">
                  Runs self-contained automated assertions against all 11 required email formats (Plain text, HTML, Multipart, Buttons, Surrounded HTML, Encoded entities, Punctuation, Line breaks, 4-8 digit lengths, Non-OTP emails, and Unrelated numbers).
                </p>

                {testSuiteSummary && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
                      <span className="text-white font-bold">Suite Status:</span>
                      <span className={testSuiteSummary.failed === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {testSuiteSummary.passed}/{testSuiteSummary.total} Tests Passed ({testSuiteSummary.failed === 0 ? '100% All Green' : `${testSuiteSummary.failed} Failed`})
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
                      {testSuiteSummary.results.map((r) => (
                        <div
                          key={r.id}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                            r.passed
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                              : 'bg-red-950/20 border-red-500/20 text-red-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold mr-1.5">{r.passed ? '✓' : '✗'} {r.name}</span>
                            <span className="text-[10px] text-slate-400 truncate block sm:inline">({r.description})</span>
                          </div>
                          <span className="font-bold flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-900">
                            {r.actual ? `Code: ${r.actual}` : '(No OTP)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleInstantTestOtp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Trigger Instant Test OTP</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTroubleshooter(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISOLATED TEST MESSAGE GENERATOR MODAL */}
      {isTestGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Test Message Generator</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      TEST / SYNTHETIC
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Creates offline synthetic emails strictly inside the Test Sandbox.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTestGeneratorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Quick Test Preset</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'otp', label: '2FA / OTP' },
                    { id: 'welcome', label: 'Welcome' },
                    { id: 'receipt', label: 'Receipt' },
                    { id: 'reset', label: 'Reset' },
                    { id: 'custom', label: 'Custom' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplySandboxPreset(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      sandboxPreset === p.id
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSandboxMessage} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Target Identity (Recipient)</label>
                <select
                  value={sandboxRecipient}
                  onChange={(e) => setSandboxRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={canonicalRootAddress}>Root Mailbox: {canonicalRootAddress}</option>
                  {variants.slice(0, 30).map((v) => (
                    <option key={v.id} value={v.email}>
                      {v.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Sender Name</label>
                  <input
                    type="text"
                    value={sandboxSenderName}
                    onChange={(e) => setSandboxSenderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Acme Security"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Sender Email</label>
                  <input
                    type="email"
                    value={sandboxSenderEmail}
                    onChange={(e) => setSandboxSenderEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="security@acme.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Email Subject</label>
                <input
                  type="text"
                  value={sandboxSubject}
                  onChange={(e) => setSandboxSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Subject line with passcode"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Message Body Content</label>
                <textarea
                  rows={4}
                  value={sandboxBody}
                  onChange={(e) => setSandboxBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-sans focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={sandboxIncludeAttachment}
                    onChange={(e) => setSandboxIncludeAttachment(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Attach mock PDF receipt</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTestGeneratorOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20 cursor-pointer"
                  >
                    Generate Test Message
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

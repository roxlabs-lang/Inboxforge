/**
 * MailboxManager Service
 * Provides centralized management of multi-mailbox Gmail OAuth connections:
 * - Active mailbox switching without deleting existing data
 * - Connection status and authorization state tracking
 * - Last successful sync timestamp & incremental sync cursor (historyId)
 * - Error recording & graceful Reconnect Gmail workflows
 * - Mailbox isolation and event subscriptions
 */

import { db } from '../database/db';
import { ConnectedGmailAccount, GmailAccountStatus } from '../types';
import {
  signInWithGoogle,
  reconnectGmailAccount,
  getCachedAccessToken,
  setCachedAccessToken,
  getStoredTokenForMailbox,
  setStoredTokenForMailbox,
  disconnectGmail as authDisconnect,
} from './auth';
import { GmailIngestionService, IngestionResult } from './gmailIngestion';

type MailboxChangeListener = (
  mailboxes: ConnectedGmailAccount[],
  activeMailbox: ConnectedGmailAccount | null
) => void;

class MailboxManagerService {
  private listeners: Set<MailboxChangeListener> = new Set();
  private syncInProgressMailboxes: Set<string> = new Set();

  /**
   * Subscribe to mailbox state changes
   */
  subscribe(listener: MailboxChangeListener): () => void {
    this.listeners.add(listener);
    // Initial emission
    this.emitChange();
    return () => this.listeners.delete(listener);
  }

  private async emitChange() {
    try {
      const mailboxes = await this.getAllMailboxes();
      const active = await this.getActiveMailbox();
      for (const listener of this.listeners) {
        listener(mailboxes, active);
      }
    } catch (_) {
      // ignore
    }
  }

  /**
   * Returns all connected mailboxes from persistent IndexedDB
   */
  async getAllMailboxes(): Promise<ConnectedGmailAccount[]> {
    const list = await db.getConnectedAccounts();
    return list.map((m) => {
      const isSyncing = this.syncInProgressMailboxes.has(m.email.toLowerCase());
      let status: GmailAccountStatus = m.status;
      if (isSyncing) {
        status = 'SYNCING';
      }

      const authState = m.status === 'AUTHENTICATION REQUIRED' ? 'expired' : 'authorized';

      return {
        ...m,
        status,
        connectionStatus: status,
        authState,
      };
    });
  }

  /**
   * Returns the currently active mailbox
   */
  async getActiveMailbox(): Promise<ConnectedGmailAccount | null> {
    const primary = await db.getPrimaryAccount();
    if (!primary) return null;

    const isSyncing = this.syncInProgressMailboxes.has(primary.email.toLowerCase());
    let status: GmailAccountStatus = primary.status;
    if (isSyncing) {
      status = 'SYNCING';
    }

    const authState = primary.status === 'AUTHENTICATION REQUIRED' ? 'expired' : 'authorized';

    return {
      ...primary,
      status,
      connectionStatus: status,
      authState,
    };
  }

  /**
   * Switch the active mailbox cleanly without deleting any existing data.
   */
  async switchActiveMailbox(mailboxId: string): Promise<ConnectedGmailAccount | null> {
    const accounts = await db.getConnectedAccounts();
    const needle = mailboxId.toLowerCase().trim();
    const target = accounts.find((a) => a.id.toLowerCase() === needle || a.email.toLowerCase() === needle);

    if (!target) {
      throw new Error(`Mailbox with ID "${mailboxId}" not found in connected mailboxes.`);
    }

    // Persist as primary active mailbox in DB and localStorage
    await db.setPrimaryAccount(target.id);

    // Switch cached access token to this mailbox's token if present in session
    const token = getStoredTokenForMailbox(target.email);
    setCachedAccessToken(token);

    this.emitChange();
    return this.getActiveMailbox();
  }

  /**
   * Connect a new Gmail mailbox via Google OAuth popup
   */
  async connectNewMailbox(): Promise<ConnectedGmailAccount> {
    const { account } = await signInWithGoogle(true);
    this.emitChange();
    return account;
  }

  /**
   * Reconnect an existing mailbox whose OAuth session has expired
   */
  async reconnectMailbox(email: string): Promise<ConnectedGmailAccount> {
    const { account } = await reconnectGmailAccount(email);
    this.emitChange();
    return account;
  }

  /**
   * Disconnect a mailbox cleanly (marks status DISCONNECTED, preserves emails and data)
   */
  async disconnectMailbox(mailboxId: string): Promise<void> {
    await authDisconnect(mailboxId);
    this.emitChange();
  }

  /**
   * Remove mailbox registration (does NOT delete any received emails or workspace configurations)
   */
  async removeMailbox(mailboxId: string): Promise<void> {
    await db.removeConnectedAccount(mailboxId);
    setStoredTokenForMailbox(mailboxId, null);
    this.emitChange();
  }

  /**
   * Perform incremental or full sync for a specific mailbox or the active mailbox.
   * Handles authentication state, errors, and progress updates cleanly.
   */
  async syncMailbox(params: {
    workspaceId: string;
    mailboxEmail?: string;
    forceFullScan?: boolean;
  }): Promise<IngestionResult> {
    const { workspaceId, forceFullScan } = params;

    let targetAcct: ConnectedGmailAccount | null = null;
    if (params.mailboxEmail) {
      targetAcct = await db.getAccountById(params.mailboxEmail);
    }
    if (!targetAcct) {
      targetAcct = await this.getActiveMailbox();
    }

    if (!targetAcct) {
      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        error: 'No active or connected Gmail mailbox found to synchronize.',
      };
    }

    const email = targetAcct.email.toLowerCase().trim();

    // Prevent duplicate synchronization workers accidentally running for the same mailbox
    if (this.syncInProgressMailboxes.has(email)) {
      return {
        success: true,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        newEmails: [],
      };
    }

    let token = getStoredTokenForMailbox(email) || getCachedAccessToken();

    if (!token) {
      // Mark authentication required only if no token is available at all
      await db.saveConnectedAccount({
        ...targetAcct,
        status: 'AUTHENTICATION REQUIRED',
        connectionStatus: 'AUTHENTICATION REQUIRED',
        authState: 'expired',
        lastError: 'Google authorization session required. Please click "Reconnect Gmail".',
      });
      this.emitChange();

      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        isAuthExpired: true,
        error: 'Google authorization expired or missing. Please reconnect Gmail.',
      };
    }

    // Mark syncing in memory
    this.syncInProgressMailboxes.add(email);
    this.emitChange();

    try {
      const result = await GmailIngestionService.fetchAndIngestMessages(token, workspaceId, email, {
        lastHistoryId: targetAcct.lastHistoryId || targetAcct.syncCursor || undefined,
        forceFullScan: Boolean(forceFullScan),
      });

      // Update connected account status cleanly in database
      const latestAcct = (await db.getAccountById(email)) || targetAcct;
      if (result.isAuthExpired) {
        await db.saveConnectedAccount({
          ...latestAcct,
          status: 'AUTHENTICATION REQUIRED',
          connectionStatus: 'AUTHENTICATION REQUIRED',
          authState: 'expired',
          lastError: result.error || 'Google authorization session expired',
        });
      } else if (result.success) {
        await db.saveConnectedAccount({
          ...latestAcct,
          status: 'CONNECTED',
          connectionStatus: 'CONNECTED',
          authState: 'authorized',
          lastSuccessfulSync: Date.now(),
          lastSyncedAt: Date.now(),
          lastError: null,
          errorMessage: undefined,
        });
      }

      return result;
    } catch (err: any) {
      const latestAcct = (await db.getAccountById(email)) || targetAcct;
      await db.saveConnectedAccount({
        ...latestAcct,
        status: 'CONNECTED',
        connectionStatus: 'CONNECTED',
        lastSyncedAt: Date.now(),
        lastError: err?.message || 'Synchronization encountered a temporary error',
      });
      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        error: err?.message || 'Sync error',
      };
    } finally {
      this.syncInProgressMailboxes.delete(email);
      this.emitChange();
    }
  }
}

export const mailboxManager = new MailboxManagerService();

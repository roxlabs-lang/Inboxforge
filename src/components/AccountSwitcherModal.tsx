import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Shield,
  UserCheck,
  Power,
  RotateCcw,
  Database,
  Clock,
  KeyRound,
  Check,
} from 'lucide-react';
import { ConnectedGmailAccount } from '../types';
import { mailboxManager } from '../services/MailboxManager';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountChanged?: () => void;
  workspaceId?: string;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  onAccountChanged,
  workspaceId = 'default_workspace',
}) => {
  const [accounts, setAccounts] = useState<ConnectedGmailAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<ConnectedGmailAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingEmail, setSyncingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const list = await mailboxManager.getAllMailboxes();
      const active = await mailboxManager.getActiveMailbox();
      setAccounts(list);
      setActiveAccount(active);
    } catch (e: any) {
      setError(e.message || 'Failed to load connected mailboxes');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setError(null);
      setInfoMessage(null);
    }
  }, [isOpen]);

  // Subscribe to changes in real-time
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = mailboxManager.subscribe((mailboxes, active) => {
      setAccounts(mailboxes);
      setActiveAccount(active);
    });
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectNewAccount = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const acct = await mailboxManager.connectNewMailbox();
      setInfoMessage(`Connected mailbox: ${acct.email}`);
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled'
      ) {
        // User closed or cancelled popup
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else {
        setError(err?.message || 'Google account authorization failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async (email: string) => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const acct = await mailboxManager.reconnectMailbox(email);
      setInfoMessage(`Successfully re-authorized ${acct.email}`);
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled'
      ) {
        // User cancelled
      } else {
        setError(err?.message || `Failed to re-authenticate ${email}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActive = async (account: ConnectedGmailAccount) => {
    setError(null);
    setInfoMessage(null);
    try {
      await mailboxManager.switchActiveMailbox(account.id);
      setInfoMessage(`Active mailbox switched to: ${account.email}`);
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (e: any) {
      setError(e.message || 'Failed to switch active mailbox');
    }
  };

  const handleSyncNow = async (account: ConnectedGmailAccount) => {
    setSyncingEmail(account.email);
    setError(null);
    setInfoMessage(null);
    try {
      const result = await mailboxManager.syncMailbox({
        workspaceId,
        mailboxEmail: account.email,
        forceFullScan: false,
      });

      if (result.success) {
        setInfoMessage(
          `Sync completed: ${result.newMessagesAdded} new message(s) ingested (${result.otpsDetected} OTPs detected)`
        );
      } else {
        if (result.isAuthExpired) {
          setError(`Authorization expired for ${account.email}. Click "Reconnect Gmail" below.`);
        } else {
          setError(result.error || 'Sync encountered an error.');
        }
      }
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (e: any) {
      setError(e.message || 'Sync failed.');
    } finally {
      setSyncingEmail(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await mailboxManager.disconnectMailbox(accountId);
      setInfoMessage('Mailbox disconnected. Local database emails are preserved.');
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (e: any) {
      setError(e.message || 'Failed to disconnect mailbox');
    }
  };

  const handleRemove = async (accountId: string) => {
    try {
      await mailboxManager.removeMailbox(accountId);
      setInfoMessage('Mailbox removed from connection list. Messages remain in history.');
      await loadAccounts();
      if (onAccountChanged) onAccountChanged();
    } catch (e: any) {
      setError(e.message || 'Failed to remove mailbox from list');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Gmail Connection Manager
              </h2>
              <p className="text-xs text-slate-400">
                Switch authorized mailboxes cleanly. Ingestion history & messages remain strictly isolated.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Notice: </span>
                {error}
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Active Mailbox Banner */}
          {activeAccount ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/30 via-slate-900 to-indigo-950/30 border border-rose-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  {activeAccount.photoUrl ? (
                    <img
                      src={activeAccount.photoUrl}
                      alt={activeAccount.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-rose-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-900/40 border border-rose-500/50 text-rose-300 font-bold flex items-center justify-center text-sm">
                      {activeAccount.email[0].toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      ACTIVE MAILBOX
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                      IN USE
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white truncate font-mono mt-0.5">
                    {activeAccount.email}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>ID: <code className="text-slate-300">{activeAccount.mailboxId || activeAccount.id}</code></span>
                    <span>·</span>
                    <span>
                      {activeAccount.lastSuccessfulSync || activeAccount.lastSyncedAt
                        ? `Last synced: ${new Date(activeAccount.lastSuccessfulSync || activeAccount.lastSyncedAt!).toLocaleTimeString()}`
                        : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSyncNow(activeAccount)}
                  disabled={syncingEmail === activeAccount.email || loading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncingEmail === activeAccount.email ? 'animate-spin' : ''}`}
                  />
                  <span>{syncingEmail === activeAccount.email ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>No active mailbox selected. Connect an account below to start receiving real emails.</span>
            </div>
          )}

          {/* Account list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
              <span>Connected Mailboxes ({accounts.length})</span>
              <span className="text-[11px] text-slate-500">Incremental sync enabled</span>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-300">No Gmail Accounts Connected</div>
                <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Connect your real Gmail address with read-only OAuth permission to ingest genuine messages and live OTPs.
                </div>
              </div>
            ) : (
              accounts.map((acct) => {
                const isActive = activeAccount?.id === acct.id || activeAccount?.email === acct.email;
                const isSyncingThis = syncingEmail === acct.email;
                const needsAuth = acct.status === 'AUTHENTICATION REQUIRED' || acct.authState === 'expired';

                return (
                  <div
                    key={acct.id}
                    className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                      isActive
                        ? 'bg-slate-950/80 border-rose-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Info & Main Details */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {acct.photoUrl ? (
                          <img
                            src={acct.photoUrl}
                            alt={acct.displayName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl border border-slate-700 object-cover flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                            {acct.email[0].toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-100 truncate">
                              {acct.displayName}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                ACTIVE
                              </span>
                            )}
                            {/* Connection Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                acct.status === 'CONNECTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : acct.status === 'AUTHENTICATION REQUIRED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : acct.status === 'SYNCING'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                  : acct.status === 'ERROR'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {acct.status}
                            </span>

                            {/* Authorization State Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                                acct.authState === 'authorized'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : acct.authState === 'expired'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              Auth: {acct.authState || 'unknown'}
                            </span>
                          </div>

                          <div className="text-xs font-mono text-slate-300 truncate mt-1">
                            {acct.email}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                            <span>Mailbox ID: <code className="text-slate-400">{acct.mailboxId || acct.id}</code></span>
                            <span>·</span>
                            <span>Cursor: <code className="text-slate-400">{acct.syncCursor || acct.lastHistoryId || 'initial'}</code></span>
                            <span>·</span>
                            <span>
                              {acct.lastSuccessfulSync || acct.lastSyncedAt
                                ? `Last sync: ${new Date(acct.lastSuccessfulSync || acct.lastSyncedAt!).toLocaleTimeString()}`
                                : 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => handleSelectActive(acct)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                            title="Set this mailbox as active without deleting existing data"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                            <span>Switch Active</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDisconnect(acct.id)}
                            title="Disconnect this mailbox session"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-700 transition cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleSyncNow(acct)}
                          disabled={isSyncingThis || loading}
                          title="Incremental sync now"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition cursor-pointer disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleRemove(acct.id)}
                          title="Remove from saved accounts (preserves historical emails)"
                          className="p-2 rounded-lg bg-slate-800/40 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Error / Reconnect Banner for this specific mailbox */}
                    {(needsAuth || acct.lastError) && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-2 text-xs text-amber-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="truncate">
                            {acct.lastError || 'Authorization session expired. Re-authentication required.'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleReconnect(acct.email)}
                          disabled={loading}
                          className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer flex-shrink-0 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reconnect Gmail</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Least Privilege (gmail.readonly) · Stable Message IDs Deduplication</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectNewAccount}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Authorizing...' : 'Connect Another Gmail'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

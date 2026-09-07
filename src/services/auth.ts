/**
 * Firebase Authentication & Google OAuth Service for InboxForge
 * Manages Google Sign-In with least-privilege gmail.readonly scope for real test mail ingestion,
 * multi-account management, and graceful account switching without data loss.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../database/db';
import { ConnectedGmailAccount } from '../types';
import { nativeBridge } from './nativeBridge';

// Initialize Firebase App (reuse existing if already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with Gmail Readonly scope
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Per-session access token cache (survives in-tab page refresh via sessionStorage without persistent long-term storage)
const SESSION_TOKEN_KEY = 'inboxforge_oauth_token';
const SESSION_TOKEN_EXPIRY = 'inboxforge_oauth_token_expiry';

export function getStoredTokenForMailbox(mailboxEmailOrId: string): string | null {
  try {
    const key = `inboxforge_oauth_token_${mailboxEmailOrId.toLowerCase().trim()}`;
    const expKey = `inboxforge_oauth_token_expiry_${mailboxEmailOrId.toLowerCase().trim()}`;
    
    // Check native secure storage first
    const nativeToken = nativeBridge.getSecureToken(key);
    const nativeExp = nativeBridge.getSecureToken(expKey);
    if (nativeToken && nativeExp && Date.now() < parseInt(nativeExp, 10)) {
      return nativeToken;
    }

    const token = sessionStorage.getItem(key) || localStorage.getItem(key);
    const expiry = sessionStorage.getItem(expKey) || localStorage.getItem(expKey);
    if (token && expiry) {
      const expTime = parseInt(expiry, 10);
      if (Date.now() < expTime) {
        return token;
      }
    }
  } catch {
    // storage unavailable
  }
  return null;
}

export function setStoredTokenForMailbox(mailboxEmailOrId: string, token: string | null) {
  try {
    const key = `inboxforge_oauth_token_${mailboxEmailOrId.toLowerCase().trim()}`;
    const expKey = `inboxforge_oauth_token_expiry_${mailboxEmailOrId.toLowerCase().trim()}`;
    if (token) {
      const expiry = (Date.now() + 50 * 60 * 1000).toString();
      nativeBridge.saveSecureToken(key, token);
      nativeBridge.saveSecureToken(expKey, expiry);
      sessionStorage.setItem(key, token);
      sessionStorage.setItem(expKey, expiry);
      localStorage.setItem(key, token);
      localStorage.setItem(expKey, expiry);
    } else {
      nativeBridge.removeSecureToken(key);
      nativeBridge.removeSecureToken(expKey);
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(expKey);
      localStorage.removeItem(key);
      localStorage.removeItem(expKey);
    }
  } catch {
    // ignore
  }
}

function getStoredSessionToken(): string | null {
  try {
    const nativeToken = nativeBridge.getSecureToken(SESSION_TOKEN_KEY);
    const nativeExp = nativeBridge.getSecureToken(SESSION_TOKEN_EXPIRY);
    if (nativeToken && nativeExp && Date.now() < parseInt(nativeExp, 10)) {
      return nativeToken;
    }

    const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(SESSION_TOKEN_EXPIRY) || localStorage.getItem(SESSION_TOKEN_EXPIRY);
    if (token && expiry) {
      const expTime = parseInt(expiry, 10);
      if (Date.now() < expTime) {
        return token;
      }
    }
  } catch {
    // storage unavailable
  }
  return null;
}

function setStoredSessionToken(token: string | null) {
  try {
    if (token) {
      const expiry = (Date.now() + 50 * 60 * 1000).toString();
      nativeBridge.saveSecureToken(SESSION_TOKEN_KEY, token);
      nativeBridge.saveSecureToken(SESSION_TOKEN_EXPIRY, expiry);
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_TOKEN_EXPIRY, expiry);
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_TOKEN_EXPIRY, expiry);
    } else {
      nativeBridge.removeSecureToken(SESSION_TOKEN_KEY);
      nativeBridge.removeSecureToken(SESSION_TOKEN_EXPIRY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXPIRY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_EXPIRY);
    }
  } catch {
    // ignore
  }
}

let cachedAccessToken: string | null = getStoredSessionToken();
let isSigningIn = false;

/**
 * Initializes the Auth state listener.
 */
export const initAuthListener = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && user.email) {
      const email = user.email.toLowerCase();
      let mailboxToken = getStoredTokenForMailbox(email) || cachedAccessToken;
      if (mailboxToken) {
        cachedAccessToken = mailboxToken;
        setStoredSessionToken(mailboxToken);
        setStoredTokenForMailbox(email, mailboxToken);
      }

      // Check if existing record exists to preserve sync history
      const existingAcct = await db.getAccountById(email);
      const isConnected = Boolean(mailboxToken) || (existingAcct?.status === 'CONNECTED');

      const account: ConnectedGmailAccount = {
        id: email,
        mailboxId: email,
        email,
        displayName: user.displayName || email.split('@')[0],
        photoUrl: user.photoURL || undefined,
        connectedAt: existingAcct?.connectedAt || Date.now(),
        lastSyncedAt: existingAcct?.lastSyncedAt || existingAcct?.lastSuccessfulSync,
        lastSuccessfulSync: existingAcct?.lastSuccessfulSync || existingAcct?.lastSyncedAt,
        lastHistoryId: existingAcct?.lastHistoryId,
        syncCursor: existingAcct?.syncCursor,
        status: isConnected ? 'CONNECTED' : (existingAcct?.status || 'CONNECTED'),
        connectionStatus: isConnected ? 'CONNECTED' : (existingAcct?.connectionStatus || 'CONNECTED'),
        authState: isConnected ? 'authorized' : 'authorized',
        lastError: null,
        isPrimary: true,
        isActive: true,
        totalMessagesSynced: existingAcct?.totalMessagesSynced || 0,
      };

      await db.saveConnectedAccount(account);
      await db.setPrimaryAccount(account.id);

      if (onAuthSuccess) onAuthSuccess(user, mailboxToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Triggers Google Sign-In with popup to acquire Gmail readonly access token.
 * Option to force account selector prompt so user can connect/switch to another Google account.
 * Supports loginHint to re-authenticate an explicit email address smoothly.
 */
export const signInWithGoogle = async (
  forceAccountSelect: boolean = true,
  loginHint?: string
): Promise<{ user: User; accessToken: string; account: ConnectedGmailAccount }> => {
  if (isSigningIn) {
    throw new Error('Sign-in flow is already in progress');
  }

  try {
    isSigningIn = true;
    const customParams: Record<string, string> = {};
    if (forceAccountSelect) {
      customParams.prompt = 'select_account';
    }
    if (loginHint) {
      customParams.login_hint = loginHint;
    }
    googleProvider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to acquire OAuth access token for Gmail');
    }

    cachedAccessToken = credential.accessToken;
    setStoredSessionToken(credential.accessToken);
    const user = result.user;
    const email = (user.email || '').toLowerCase();
    setStoredTokenForMailbox(email, credential.accessToken);

    const existingAcct = await db.getAccountById(email);

    const account: ConnectedGmailAccount = {
      id: email,
      mailboxId: email,
      email: email,
      displayName: user.displayName || email.split('@')[0],
      photoUrl: user.photoURL || undefined,
      connectedAt: existingAcct?.connectedAt || Date.now(),
      lastSyncedAt: existingAcct?.lastSyncedAt || Date.now(),
      lastSuccessfulSync: existingAcct?.lastSuccessfulSync || existingAcct?.lastSyncedAt,
      lastHistoryId: existingAcct?.lastHistoryId,
      syncCursor: existingAcct?.syncCursor,
      status: 'CONNECTED',
      connectionStatus: 'CONNECTED',
      authState: 'authorized',
      lastError: null,
      errorMessage: undefined,
      isPrimary: true,
      isActive: true,
      totalMessagesSynced: existingAcct?.totalMessagesSynced || 0,
    };

    // Save to connected accounts in IndexedDB & set as primary active mailbox
    await db.saveConnectedAccount(account);
    await db.setPrimaryAccount(account.id);

    return {
      user,
      accessToken: cachedAccessToken,
      account,
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/user-cancelled'
    ) {
      // User dismissed or cancelled the Google OAuth popup
      console.info('Google Sign-In prompt dismissed by user.');
    } else if (error?.code === 'auth/popup-blocked') {
      console.warn('Google Sign-In popup blocked by the browser.');
    } else {
      console.warn('Google Sign-In notice:', error?.message || error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Reconnect an existing Gmail mailbox using login_hint
 */
export const reconnectGmailAccount = async (
  email: string
): Promise<{ user: User; accessToken: string; account: ConnectedGmailAccount }> => {
  return signInWithGoogle(true, email);
};

/**
 * Switch or Connect a Different Gmail Account
 * Prompts Google account picker, obtains credentials for the new mailbox,
 * updates connected accounts in database, and sets as active.
 * Existing local database records are strictly preserved.
 */
export const switchGmailAccount = async (
  specificEmail?: string
): Promise<{
  user: User;
  accessToken: string;
  account: ConnectedGmailAccount;
}> => {
  return signInWithGoogle(true, specificEmail);
};

/**
 * Returns the currently cached in-memory access token.
 */
export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sets or clears the in-memory access token.
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  setStoredSessionToken(token);
};

/**
 * Disconnects the active Gmail connection without deleting historical application data.
 */
export const disconnectGmail = async (accountId?: string): Promise<void> => {
  try {
    if (accountId) {
      const needle = accountId.toLowerCase().trim();
      setStoredTokenForMailbox(needle, null);
      const accts = await db.getConnectedAccounts();
      const target = accts.find((a) => a.id === needle || a.email.toLowerCase() === needle);
      if (target) {
        await db.saveConnectedAccount({
          ...target,
          status: 'DISCONNECTED',
          connectionStatus: 'DISCONNECTED',
          authState: 'unauthorized',
          isPrimary: false,
          isActive: false,
          lastError: 'Mailbox disconnected by user',
        });
      }
    }

    const remaining = await db.getConnectedAccounts();
    const stillConnected = remaining.filter(
      (a) => (a.status === 'CONNECTED' || a.authState === 'authorized') && a.id !== accountId
    );

    if (stillConnected.length === 0) {
      await signOut(auth);
      cachedAccessToken = null;
      setStoredSessionToken(null);
    } else {
      // Switch active account to the next connected one
      const nextAcct = stillConnected[0];
      await db.setPrimaryAccount(nextAcct.id);
      const nextToken = getStoredTokenForMailbox(nextAcct.email);
      setCachedAccessToken(nextToken);
    }
  } catch (err) {
    console.error('Error disconnecting mailbox:', err);
  }
};

/**
 * Signs out from Firebase completely and wipes the in-memory access token.
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    setStoredSessionToken(null);
  }
};


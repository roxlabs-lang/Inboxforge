/**
 * Gmail Real Mailbox Ingestion Service
 * Connects securely to the user's authorized Gmail account via OAuth least-privilege gmail.readonly scope.
 *
 * Implements:
 * - Incremental sync using Gmail History API and latest historyId tracking
 * - Efficient deduplication (avoids re-downloading existing mailbox messages)
 * - Comprehensive MIME and HTML decoding using parseGmailMessagePayload
 * - Live OTP code extraction with confidence, reason, and context snippet
 * - Resilient error handling that preserves existing inbox state
 */

import { MockEmail } from '../types';
import { db } from '../database/db';
import { extractOtpFromMessage } from '../utils/otpParser';
import { normalizeCanonicalGmailAddress } from '../utils/canonical';
import { parseGmailMessagePayload } from './mimeDecoder';

export type GmailConnectionStatus =
  | 'CONNECTED'
  | 'SYNCING'
  | 'DISCONNECTED'
  | 'AUTHENTICATION REQUIRED'
  | 'ERROR';

export interface IngestionResult {
  success: boolean;
  messagesFetched: number;
  newMessagesAdded: number;
  otpsDetected: number;
  newEmails?: MockEmail[];
  error?: string;
  isAuthExpired?: boolean;
}

/**
 * Parses email address and display name from "Name <email@domain.com>" or "email@domain.com".
 */
function parseAddressHeader(headerValue: string): { name: string; email: string } {
  if (!headerValue) return { name: '', email: '' };
  const match = headerValue.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return {
      name: match[1].replace(/["']/g, '').trim(),
      email: match[2].trim().toLowerCase(),
    };
  }
  return {
    name: headerValue.split('@')[0].trim(),
    email: headerValue.trim().toLowerCase(),
  };
}

export class GmailIngestionService {
  /**
   * Retrieves the stored sync state (lastHistoryId) for an account.
   */
  private static getStoredHistoryId(mailboxEmail: string): string | null {
    try {
      const key = `inboxforge_history_${mailboxEmail.toLowerCase().trim()}`;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Persists the latest historyId for incremental sync.
   */
  private static storeHistoryId(mailboxEmail: string, historyId: string): void {
    if (!historyId) return;
    try {
      const key = `inboxforge_history_${mailboxEmail.toLowerCase().trim()}`;
      localStorage.setItem(key, historyId);
      sessionStorage.setItem(key, historyId);
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Fetches the current user profile from Gmail API to obtain the latest historyId.
   */
  static async fetchLatestHistoryId(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.historyId ? String(data.historyId) : null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Fetches real incoming messages from Gmail API incrementally.
   * Only fetches details for newly arrived messages.
   */
  static async fetchAndIngestMessages(
    accessToken: string,
    workspaceId: string,
    canonicalMailbox: string,
    options: { maxResults?: number; query?: string; forceFullScan?: boolean; lastHistoryId?: string } = {}
  ): Promise<IngestionResult> {
    if (!accessToken) {
      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        error: 'No OAuth access token provided',
      };
    }

    const mailbox = (canonicalMailbox || '').toLowerCase().trim();

    try {
      const existingEmails = await db.getAllMockEmails(workspaceId);
      const existingIds = new Set(existingEmails.map((e) => e.id));

      const storedHistoryId = options.forceFullScan
        ? null
        : (options.lastHistoryId || this.getStoredHistoryId(mailbox));
      let candidateMessageRefs: { id: string; threadId?: string }[] = [];
      let latestHistoryId: string | null = null;
      let usedIncrementalHistory = false;

      // ================= 1. ATTEMPT INCREMENTAL HISTORY SYNC =================
      if (storedHistoryId) {
        try {
          const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${storedHistoryId}&historyTypes=messageAdded`;
          const historyRes = await fetch(historyUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          });

          if (historyRes.status === 401) {
            return {
              success: false,
              messagesFetched: 0,
              newMessagesAdded: 0,
              otpsDetected: 0,
              isAuthExpired: true,
              error: 'OAuth session has expired. Please re-authenticate with Google.',
            };
          }

          if (historyRes.status === 401) {
            try {
              const targetAcct = (await db.getAccountById(mailbox)) || (await db.getPrimaryAccount());
              if (targetAcct) {
                await db.saveConnectedAccount({
                  ...targetAcct,
                  status: 'AUTHENTICATION REQUIRED',
                  connectionStatus: 'AUTHENTICATION REQUIRED',
                  authState: 'expired',
                  lastError: 'OAuth session has expired. Please reconnect Gmail.',
                });
              }
            } catch (_) {}
            return {
              success: false,
              messagesFetched: 0,
              newMessagesAdded: 0,
              otpsDetected: 0,
              isAuthExpired: true,
              error: 'OAuth session has expired. Please reconnect Gmail.',
            };
          }

          if (historyRes.ok) {
            const historyData = await historyRes.json();
            latestHistoryId = historyData.historyId ? String(historyData.historyId) : null;

            if (historyData.history && Array.isArray(historyData.history)) {
              for (const record of historyData.history) {
                if (record.messagesAdded && Array.isArray(record.messagesAdded)) {
                  for (const item of record.messagesAdded) {
                    if (item.message && item.message.id) {
                      candidateMessageRefs.push({
                        id: item.message.id,
                        threadId: item.message.threadId,
                      });
                    }
                  }
                }
              }
            }
            usedIncrementalHistory = true;
          } else if (historyRes.status === 404) {
            // History ID too old or expired — fallback to message list query
            usedIncrementalHistory = false;
          }
        } catch {
          usedIncrementalHistory = false;
        }
      }

      // ================= 2. FALLBACK TO RECENT MESSAGES LIST =================
      if (!usedIncrementalHistory) {
        const maxResults = options.maxResults || 25;
        const queryParam = options.query ? `&q=${encodeURIComponent(options.query)}` : '';
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${queryParam}&includeSpamTrash=true`;

        const listRes = await fetch(listUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (listRes.status === 401) {
          return {
            success: false,
            messagesFetched: 0,
            newMessagesAdded: 0,
            otpsDetected: 0,
            isAuthExpired: true,
            error: 'OAuth session has expired. Please re-authenticate with Google.',
          };
        }

        if (!listRes.ok) {
          const errText = await listRes.text();
          throw new Error(`Gmail API query failed (${listRes.status}): ${errText}`);
        }

        const listData = await listRes.json();
        candidateMessageRefs = listData.messages || [];

        // Fetch current profile historyId for future incremental syncs
        latestHistoryId = await this.fetchLatestHistoryId(accessToken);
      }

      // Deduplicate candidate references
      const seenRefIds = new Set<string>();
      const uniqueCandidateRefs = candidateMessageRefs.filter((ref) => {
        if (seenRefIds.has(ref.id)) return false;
        seenRefIds.add(ref.id);
        return true;
      });

      // Filter out messages that ALREADY exist in IndexedDB (INCREMENTAL: do not re-download!)
      const toDownloadRefs = uniqueCandidateRefs.filter(
        (ref) => !existingIds.has(`gmail_${ref.id}`)
      );

      // If no new messages, update mailbox sync state and return immediately
      if (toDownloadRefs.length === 0) {
        if (latestHistoryId) {
          this.storeHistoryId(mailbox, latestHistoryId);
        }
        try {
          const targetAcct = (await db.getAccountById(mailbox)) || (await db.getPrimaryAccount());
          if (targetAcct) {
            await db.saveConnectedAccount({
              ...targetAcct,
              status: 'CONNECTED',
              connectionStatus: 'CONNECTED',
              authState: 'authorized',
              lastSyncedAt: Date.now(),
              lastSuccessfulSync: Date.now(),
              lastHistoryId: latestHistoryId || targetAcct.lastHistoryId,
              syncCursor: latestHistoryId || targetAcct.syncCursor,
              lastError: null,
              errorMessage: undefined,
            });
          }
        } catch (_) {}

        return {
          success: true,
          messagesFetched: uniqueCandidateRefs.length,
          newMessagesAdded: 0,
          otpsDetected: 0,
          newEmails: [],
        };
      }

      // ================= 3. DOWNLOAD & PARSE NEW MESSAGES IN CONTROLLED BATCHES =================
      const newlyAddedEmails: MockEmail[] = [];
      let newOtpsCount = 0;
      const batchSize = 5;

      for (let i = 0; i < toDownloadRefs.length; i += batchSize) {
        const batch = toDownloadRefs.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (msgRef) => {
            const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`;
            const detailRes = await fetch(detailUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });

            if (!detailRes.ok) return null;

            const msgData = await detailRes.json();

            // Track latest historyId from message data if available
            if (msgData.historyId && !latestHistoryId) {
              latestHistoryId = String(msgData.historyId);
            }

            const headersList: { name: string; value: string }[] = msgData.payload?.headers || [];
            const headersMap: Record<string, string> = {};
            for (const h of headersList) {
              headersMap[h.name.toLowerCase()] = h.value;
            }

            const fromHeader = headersMap['from'] || 'Unknown Sender';
            const toHeader = headersMap['to'] || headersMap['delivered-to'] || canonicalMailbox;
            const subject = headersMap['subject'] || '(No Subject)';
            const dateHeader = headersMap['date'];
            const timestamp = dateHeader
              ? new Date(dateHeader).getTime() || Number(msgData.internalDate)
              : Number(msgData.internalDate) || Date.now();

            const parsedFrom = parseAddressHeader(fromHeader);
            const parsedTo = parseAddressHeader(toHeader);

            // Comprehensive MIME & HTML parsing
            const {
              bodyText,
              bodyHtml,
              attachments,
              detectedBodyType,
              mimeStructure,
            } = parseGmailMessagePayload(msgData.payload);

            const snippet =
              msgData.snippet ||
              bodyText.slice(0, 160).replace(/\s+/g, ' ') ||
              subject;

            // Extract OTP / Verification code
            const parsedOtp = extractOtpFromMessage(subject, bodyText, bodyHtml);
            const extractedOtp = parsedOtp?.code && parsedOtp.code !== 'MAGIC_LINK' ? parsedOtp.code : undefined;

            const recipientTarget = parsedTo.email || canonicalMailbox;
            const normalizedCanonical =
              normalizeCanonicalGmailAddress(recipientTarget) || canonicalMailbox;

            const isUnread = (msgData.labelIds || []).includes('UNREAD');
            const isStarred = (msgData.labelIds || []).includes('STARRED');

            const emailRecord: MockEmail = {
              id: `gmail_${msgRef.id}`,
              workspaceId,
              mailboxId: mailbox,
              recipientEmail: recipientTarget,
              canonicalAddress: normalizedCanonical,
              senderName: parsedFrom.name || parsedFrom.email || 'Test Service',
              senderEmail: parsedFrom.email || 'noreply@service.com',
              subject,
              preview: snippet,
              bodyText: bodyText || snippet,
              bodyHtml: bodyHtml || undefined,
              extractedOtp,
              isRead: !isUnread,
              isStarred,
              folder: 'inbox',
              tags: extractedOtp ? ['real_gmail', 'otp_detected'] : ['real_gmail'],
              attachments: attachments.length > 0 ? attachments : undefined,
              headers: {
                From: fromHeader,
                To: toHeader,
                Subject: subject,
                Date: dateHeader || new Date(timestamp).toUTCString(),
                'Delivered-To': headersMap['delivered-to'] || recipientTarget,
                'Message-ID': headersMap['message-id'] || msgRef.id,
              },
              receivedAt: timestamp,
              isLocalSimulated: false, // Genuine Gmail message
              // Debug Inspection metadata (Requirement 9)
              gmailMessageId: msgRef.id,
              gmailThreadId: msgData.threadId || msgRef.threadId,
              detectedBodyType,
              extractedTextLength: (bodyText || '').length,
              mimeStructure,
              parserReason:
                parsedOtp?.reason ||
                (extractedOtp
                  ? 'Verification code extracted successfully'
                  : 'No verification keywords or authentic passcodes detected in email content'),
              parserConfidence: parsedOtp?.confidence,
            };

            return { emailRecord, extractedOtp, parsedFrom, timestamp, subject, recipientTarget };
          })
        );

        for (const item of batchResults) {
          if (!item) continue;
          await db.addMockEmail(item.emailRecord);
          newlyAddedEmails.push(item.emailRecord);

          if (item.extractedOtp) {
            newOtpsCount++;
            await db.createOTPRecord({
              id: `otp_${item.emailRecord.id}_${Date.now()}`,
              workspaceId,
              identityEmail: item.recipientTarget,
              service: item.parsedFrom.name || item.parsedFrom.email || 'Test Service',
              otp: item.extractedOtp,
              receivedAt: item.timestamp,
              status: 'Received',
              notes: `Extracted from genuine Gmail message: "${item.subject}"`,
              createdAt: Date.now(),
            });
          }
        }
      }

      // Update sync state
      if (latestHistoryId) {
        this.storeHistoryId(mailbox, latestHistoryId);
      }

      if (newlyAddedEmails.length > 0) {
        await db.addLog({
          id: `log_sync_${Date.now()}`,
          workspaceId,
          type: 'email_received',
          details: `Synced ${newlyAddedEmails.length} new real email(s) from mailbox (${canonicalMailbox}). Detected ${newOtpsCount} OTP(s).`,
          timestamp: Date.now(),
        });
      }

      // Update connected account metadata
      try {
        const targetAcct = (await db.getAccountById(mailbox)) || (await db.getPrimaryAccount());
        if (targetAcct) {
          await db.saveConnectedAccount({
            ...targetAcct,
            lastSyncedAt: Date.now(),
            lastSuccessfulSync: Date.now(),
            lastHistoryId: latestHistoryId || targetAcct.lastHistoryId,
            syncCursor: latestHistoryId || targetAcct.syncCursor,
            totalMessagesSynced: (targetAcct.totalMessagesSynced || 0) + newlyAddedEmails.length,
            status: 'CONNECTED',
            connectionStatus: 'CONNECTED',
            authState: 'authorized',
            lastError: null,
            errorMessage: undefined,
          });
        }
      } catch {
        // ignore
      }

      return {
        success: true,
        messagesFetched: uniqueCandidateRefs.length,
        newMessagesAdded: newlyAddedEmails.length,
        otpsDetected: newOtpsCount,
        newEmails: newlyAddedEmails,
      };
    } catch (err: any) {
      console.warn('Gmail Ingestion notice:', err?.message || err);
      const isAuthErr =
        err?.message?.includes('401') ||
        err?.message?.includes('OAuth') ||
        err?.message?.includes('expired') ||
        err?.message?.includes('re-authenticate');

      try {
        const targetAcct = (await db.getAccountById(mailbox)) || (await db.getPrimaryAccount());
        if (targetAcct) {
          await db.saveConnectedAccount({
            ...targetAcct,
            status: isAuthErr ? 'AUTHENTICATION REQUIRED' : 'ERROR',
            connectionStatus: isAuthErr ? 'AUTHENTICATION REQUIRED' : 'ERROR',
            authState: isAuthErr ? 'expired' : targetAcct.authState,
            lastError: err?.message || 'Failed to ingest Gmail messages',
            errorMessage: err?.message || 'Failed to ingest Gmail messages',
          });
        }
      } catch (_) {}

      return {
        success: false,
        messagesFetched: 0,
        newMessagesAdded: 0,
        otpsDetected: 0,
        isAuthExpired: isAuthErr,
        error: err.message || 'Failed to ingest Gmail messages',
      };
    }
  }
}

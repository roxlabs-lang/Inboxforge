/**
 * InboxForge — IndexedDB Database Layer
 * Local-first persistent storage with indexing, batch transactions, and streaming.
 */

import {
  Workspace,
  Variant,
  Label,
  Project,
  TestCase,
  OTPRecord,
  ActivityLog,
  GenerationCheckpoint,
  AppSettings,
  VariantStatus,
  StorageStats,
  MockEmail,
  CustomInstructions,
  ProjectTemplate,
  SavedApiRequest,
  PersistentJob,
  ConnectedGmailAccount,
} from '../types';
import { BUILTIN_TEMPLATES } from './defaultTemplates';

const DB_NAME = 'InboxForgeDB';
const DB_VERSION = 3;

export class InboxForgeDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Workspaces
        if (!db.objectStoreNames.contains('workspaces')) {
          const wsStore = db.createObjectStore('workspaces', { keyPath: 'id' });
          wsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 2. Variants
        if (!db.objectStoreNames.contains('variants')) {
          const varStore = db.createObjectStore('variants', { keyPath: 'id' });
          varStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          varStore.createIndex('email', 'email', { unique: false });
          varStore.createIndex('status', 'status', { unique: false });
          varStore.createIndex('starred', 'starred', { unique: false });
          varStore.createIndex('createdAt', 'createdAt', { unique: false });
          varStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          varStore.createIndex('workspaceId_status', ['workspaceId', 'status'], { unique: false });
          varStore.createIndex('workspaceId_starred', ['workspaceId', 'starred'], { unique: false });
        }

        // 3. Labels
        if (!db.objectStoreNames.contains('labels')) {
          const labelStore = db.createObjectStore('labels', { keyPath: 'id' });
          labelStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        }

        // 4. Projects
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        }

        // 5. TestCases
        if (!db.objectStoreNames.contains('testCases')) {
          const tcStore = db.createObjectStore('testCases', { keyPath: 'id' });
          tcStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          tcStore.createIndex('projectId', 'projectId', { unique: false });
          tcStore.createIndex('status', 'status', { unique: false });
        }

        // 6. OTP Records
        if (!db.objectStoreNames.contains('otpRecords')) {
          const otpStore = db.createObjectStore('otpRecords', { keyPath: 'id' });
          otpStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          otpStore.createIndex('identityEmail', 'identityEmail', { unique: false });
          otpStore.createIndex('status', 'status', { unique: false });
        }

        // 7. Activity Logs
        if (!db.objectStoreNames.contains('activityLogs')) {
          const logStore = db.createObjectStore('activityLogs', { keyPath: 'id' });
          logStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 8. Generation Checkpoints
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'workspaceId' });
        }

        // 9. App Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // 10. Mock Emails (Simulated & Ingested Email Inbox)
        if (!db.objectStoreNames.contains('mockEmails')) {
          const emailStore = db.createObjectStore('mockEmails', { keyPath: 'id' });
          emailStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          emailStore.createIndex('recipientEmail', 'recipientEmail', { unique: false });
          emailStore.createIndex('folder', 'folder', { unique: false });
          emailStore.createIndex('isRead', 'isRead', { unique: false });
          emailStore.createIndex('isStarred', 'isStarred', { unique: false });
          emailStore.createIndex('receivedAt', 'receivedAt', { unique: false });
          emailStore.createIndex('workspaceId_folder', ['workspaceId', 'folder'], { unique: false });
        }

        // 11. Project Templates
        if (!db.objectStoreNames.contains('templates')) {
          const tmplStore = db.createObjectStore('templates', { keyPath: 'id' });
          tmplStore.createIndex('category', 'category', { unique: false });
          tmplStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 12. Custom Instructions & QA Rules
        if (!db.objectStoreNames.contains('customInstructions')) {
          db.createObjectStore('customInstructions', { keyPath: 'workspaceId' });
        }

        // 13. Saved API Requests
        if (!db.objectStoreNames.contains('savedApiRequests')) {
          const apiStore = db.createObjectStore('savedApiRequests', { keyPath: 'id' });
          apiStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        }

        // 14. Persistent Background Jobs
        if (!db.objectStoreNames.contains('jobs')) {
          const jobStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          jobStore.createIndex('status', 'status', { unique: false });
          jobStore.createIndex('type', 'type', { unique: false });
          jobStore.createIndex('startTime', 'startTime', { unique: false });
          jobStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // 15. Connected Gmail Accounts
        if (!db.objectStoreNames.contains('connectedAccounts')) {
          const acctStore = db.createObjectStore('connectedAccounts', { keyPath: 'id' });
          acctStore.createIndex('email', 'email', { unique: false });
          acctStore.createIndex('status', 'status', { unique: false });
          acctStore.createIndex('connectedAt', 'connectedAt', { unique: false });
          acctStore.createIndex('isPrimary', 'isPrimary', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // ================= WORKSPACES =================
  async getAllWorkspaces(): Promise<Workspace[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspaces', 'readonly');
      const store = tx.objectStore('workspaces');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspaces', 'readonly');
      const store = tx.objectStore('workspaces');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async createWorkspace(ws: Workspace): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspaces', 'readwrite');
      const store = tx.objectStore('workspaces');
      store.put(ws);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateWorkspace(ws: Workspace): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspaces', 'readwrite');
      const store = tx.objectStore('workspaces');
      store.put(ws);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['workspaces', 'variants', 'labels', 'projects', 'testCases', 'otpRecords', 'activityLogs', 'checkpoints'],
        'readwrite'
      );

      tx.objectStore('workspaces').delete(workspaceId);
      tx.objectStore('checkpoints').delete(workspaceId);

      const clearStoreForWorkspace = (storeName: string) => {
        const store = tx.objectStore(storeName);
        const index = store.index('workspaceId');
        const req = index.openKeyCursor(IDBKeyRange.only(workspaceId));
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursor>).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      };

      clearStoreForWorkspace('variants');
      clearStoreForWorkspace('labels');
      clearStoreForWorkspace('projects');
      clearStoreForWorkspace('testCases');
      clearStoreForWorkspace('otpRecords');
      clearStoreForWorkspace('activityLogs');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= VARIANTS =================
  async bulkInsertVariants(variants: Variant[]): Promise<number> {
    if (!variants.length) return 0;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      for (const v of variants) {
        store.put(v);
      }
      tx.oncomplete = () => resolve(variants.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  async addVariantsBatch(variants: Variant[]): Promise<number> {
    return this.bulkInsertVariants(variants);
  }

  async getVariantsByWorkspace(workspaceId: string): Promise<Variant[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const store = tx.objectStore('variants');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clearWorkspaceVariants(workspaceId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      const index = store.index('workspaceId');
      const req = index.openKeyCursor(IDBKeyRange.only(workspaceId));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getVariant(id: string): Promise<Variant | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const store = tx.objectStore('variants');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async updateVariant(variantOrId: Variant | string, updates?: Partial<Variant>): Promise<Variant | null> {
    if (typeof variantOrId === 'object') {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('variants', 'readwrite');
        const store = tx.objectStore('variants');
        store.put(variantOrId);
        tx.oncomplete = () => resolve(variantOrId);
        tx.onerror = () => reject(tx.error);
      });
    }

    const id = variantOrId;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      const req = store.get(id);
      req.onsuccess = () => {
        const item: Variant = req.result;
        if (!item) {
          resolve(null);
          return;
        }
        const updated: Variant = { ...item, ...(updates || {}), updatedAt: Date.now() };
        store.put(updated);
        tx.oncomplete = () => resolve(updated);
      };
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async bulkUpdateVariants(ids: string[], updates: Partial<Variant>): Promise<number> {
    if (!ids.length) return 0;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      let updatedCount = 0;
      const now = Date.now();

      for (const id of ids) {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            const updated: Variant = { ...req.result, ...updates, updatedAt: now };
            store.put(updated);
            updatedCount++;
          }
        };
      }

      tx.oncomplete = () => resolve(updatedCount);
      tx.onerror = () => reject(tx.error);
    });
  }

  async bulkUpdateStatus(
    ids: string[],
    options: {
      status?: VariantStatus;
      starred?: boolean;
      addLabelId?: string;
    }
  ): Promise<number> {
    if (!ids.length) return 0;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      let updatedCount = 0;
      const now = Date.now();

      for (const id of ids) {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            const current: Variant = req.result;
            const updated: Variant = { ...current, updatedAt: now };
            if (options.status !== undefined) updated.status = options.status;
            if (options.starred !== undefined) updated.starred = options.starred;
            if (options.addLabelId) {
              const currentLbls = current.labelIds || [];
              if (!currentLbls.includes(options.addLabelId)) {
                updated.labelIds = [...currentLbls, options.addLabelId];
              }
            }
            store.put(updated);
            updatedCount++;
          }
        };
      }

      tx.oncomplete = () => resolve(updatedCount);
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteVariant(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      tx.objectStore('variants').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async bulkDeleteVariants(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve(ids.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getVariantCounts(workspaceId: string): Promise<{
    total: number;
    unused: number;
    reserved: number;
    used: number;
    archived: number;
    starred: number;
  }> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const store = tx.objectStore('variants');
      const index = store.index('workspaceId');
      const req = index.openCursor(IDBKeyRange.only(workspaceId));

      let total = 0;
      let unused = 0;
      let reserved = 0;
      let used = 0;
      let archived = 0;
      let starred = 0;

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const v: Variant = cursor.value;
          total++;
          if (v.status === 'unused') unused++;
          else if (v.status === 'reserved') reserved++;
          else if (v.status === 'used') used++;
          else if (v.status === 'archived') archived++;

          if (v.starred) starred++;
          cursor.continue();
        } else {
          resolve({ total, unused, reserved, used, archived, starred });
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async queryVariants(options: {
    workspaceId: string;
    filter?: 'all' | 'unused' | 'reserved' | 'used' | 'starred' | 'archived' | 'recently_copied' | 'frequently_used';
    labelId?: string;
    search?: string;
    sortBy?: 'email_asc' | 'email_desc' | 'newest' | 'oldest' | 'recently_copied' | 'most_copied' | 'most_used' | 'starred_first';
    offset?: number;
    limit?: number;
  }): Promise<{ items: Variant[]; totalCount: number }> {
    const db = await this.openDB();
    const {
      workspaceId,
      filter = 'all',
      labelId,
      search = '',
      sortBy = 'newest',
      offset = 0,
      limit = 100,
    } = options;

    const searchTerm = search.trim().toLowerCase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const store = tx.objectStore('variants');
      const index = store.index('workspaceId');
      const req = index.openCursor(IDBKeyRange.only(workspaceId));

      const matched: Variant[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const v: Variant = cursor.value;

          let passFilter = true;
          if (filter === 'unused' && v.status !== 'unused') passFilter = false;
          else if (filter === 'reserved' && v.status !== 'reserved') passFilter = false;
          else if (filter === 'used' && v.status !== 'used') passFilter = false;
          else if (filter === 'archived' && v.status !== 'archived') passFilter = false;
          else if (filter === 'starred' && !v.starred) passFilter = false;
          else if (filter === 'recently_copied' && (!v.lastCopiedAt || v.lastCopiedAt <= 0)) passFilter = false;
          else if (filter === 'frequently_used' && v.usageCount <= 0) passFilter = false;
          else if (filter === 'all' && v.status === 'archived') {
            passFilter = false;
          }

          if (passFilter && labelId) {
            if (!v.labelIds || !v.labelIds.includes(labelId)) {
              passFilter = false;
            }
          }

          if (passFilter && searchTerm) {
            const inEmail = v.email.toLowerCase().includes(searchTerm);
            const inNotes = v.notes ? v.notes.toLowerCase().includes(searchTerm) : false;
            const inUsername = v.username.toLowerCase().includes(searchTerm);
            if (!inEmail && !inNotes && !inUsername) {
              passFilter = false;
            }
          }

          if (passFilter) {
            matched.push(v);
          }

          cursor.continue();
        } else {
          matched.sort((a, b) => {
            if (sortBy === 'email_asc') return a.email.localeCompare(b.email);
            if (sortBy === 'email_desc') return b.email.localeCompare(a.email);
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'recently_copied') return (b.lastCopiedAt || 0) - (a.lastCopiedAt || 0);
            if (sortBy === 'most_copied') return (b.copyCount || 0) - (a.copyCount || 0);
            if (sortBy === 'most_used') return (b.usageCount || 0) - (a.usageCount || 0);
            if (sortBy === 'starred_first') {
              if (a.starred && !b.starred) return -1;
              if (!a.starred && b.starred) return 1;
              return b.createdAt - a.createdAt;
            }
            return b.createdAt - a.createdAt;
          });

          const totalCount = matched.length;
          const items = limit ? matched.slice(offset, offset + limit) : matched;
          resolve({ items, totalCount });
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  async getAllVariantEmails(workspaceId: string, filter?: string, labelId?: string, search?: string): Promise<string[]> {
    const { items } = await this.queryVariants({
      workspaceId,
      filter: (filter as any) || 'all',
      labelId,
      search,
      limit: 1000000,
    });
    return items.map((v) => v.email);
  }

  // ================= LABELS =================
  async getLabels(workspaceId: string): Promise<Label[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('labels', 'readonly');
      const store = tx.objectStore('labels');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllLabels(workspaceId: string): Promise<Label[]> {
    return this.getLabels(workspaceId);
  }

  async createLabel(label: Label): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('labels', 'readwrite');
      tx.objectStore('labels').put(label);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateLabel(label: Label): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('labels', 'readwrite');
      tx.objectStore('labels').put(label);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteLabel(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['labels', 'variants'], 'readwrite');
      tx.objectStore('labels').delete(id);

      const varStore = tx.objectStore('variants');
      const cursorReq = varStore.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const v: Variant = cursor.value;
          if (v.labelIds && v.labelIds.includes(id)) {
            v.labelIds = v.labelIds.filter((l) => l !== id);
            v.updatedAt = Date.now();
            cursor.update(v);
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= PROJECTS =================
  async getProjects(workspaceId: string): Promise<Project[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllProjects(workspaceId: string): Promise<Project[]> {
    return this.getProjects(workspaceId);
  }

  async createProject(project: Project): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateProject(project: Project): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'testCases'], 'readwrite');
      tx.objectStore('projects').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= TEST CASES =================
  async getTestCases(workspaceId: string, projectId?: string): Promise<TestCase[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testCases', 'readonly');
      const store = tx.objectStore('testCases');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => {
        let results: TestCase[] = req.result || [];
        if (projectId) {
          results = results.filter((tc) => tc.projectId === projectId);
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllTestCases(workspaceId: string): Promise<TestCase[]> {
    return this.getTestCases(workspaceId);
  }

  async createTestCase(tc: TestCase): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testCases', 'readwrite');
      tx.objectStore('testCases').put(tc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateTestCase(tc: TestCase): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testCases', 'readwrite');
      tx.objectStore('testCases').put(tc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteTestCase(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('testCases', 'readwrite');
      tx.objectStore('testCases').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= OTP RECORDS =================
  async getOTPRecords(workspaceId: string): Promise<OTPRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('otpRecords', 'readonly');
      const store = tx.objectStore('otpRecords');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => {
        const res: OTPRecord[] = req.result || [];
        res.sort((a, b) => b.receivedAt - a.receivedAt);
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllOTPs(workspaceId: string): Promise<OTPRecord[]> {
    return this.getOTPRecords(workspaceId);
  }

  async createOTP(record: OTPRecord): Promise<void> {
    return this.createOTPRecord(record);
  }

  async createOTPRecord(record: OTPRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('otpRecords', 'readwrite');
      tx.objectStore('otpRecords').put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateOTP(record: OTPRecord): Promise<void> {
    return this.updateOTPRecord(record);
  }

  async updateOTPRecord(record: OTPRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('otpRecords', 'readwrite');
      tx.objectStore('otpRecords').put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteOTP(id: string): Promise<void> {
    return this.deleteOTPRecord(id);
  }

  async deleteOTPRecord(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('otpRecords', 'readwrite');
      tx.objectStore('otpRecords').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= ACTIVITY LOGS =================
  async getLogs(workspaceId: string, limit: number = 200): Promise<ActivityLog[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activityLogs', 'readonly');
      const store = tx.objectStore('activityLogs');
      const index = store.index('workspaceId');
      const req = index.getAll(IDBKeyRange.only(workspaceId));
      req.onsuccess = () => {
        const list: ActivityLog[] = req.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllLogs(workspaceId: string): Promise<ActivityLog[]> {
    return this.getLogs(workspaceId);
  }

  async addLog(log: ActivityLog): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activityLogs', 'readwrite');
      tx.objectStore('activityLogs').put(log);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearLogs(workspaceId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activityLogs', 'readwrite');
      const store = tx.objectStore('activityLogs');
      const index = store.index('workspaceId');
      const req = index.openKeyCursor(IDBKeyRange.only(workspaceId));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= CHECKPOINTS =================
  async getCheckpoint(workspaceId: string): Promise<GenerationCheckpoint | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readonly');
      const store = tx.objectStore('checkpoints');
      const req = store.get(workspaceId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getLatestCheckpoint(workspaceId: string): Promise<GenerationCheckpoint | null> {
    return this.getCheckpoint(workspaceId);
  }

  async saveCheckpoint(cp: GenerationCheckpoint): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readwrite');
      tx.objectStore('checkpoints').put(cp);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteCheckpoint(workspaceId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readwrite');
      tx.objectStore('checkpoints').delete(workspaceId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= PERSISTENT JOBS =================
  async saveJob(job: PersistentJob): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve();
      const tx = db.transaction('jobs', 'readwrite');
      const now = Date.now();
      const jobId = job.jobId || job.id;
      const canonicalJob: PersistentJob = {
        ...job,
        jobId,
        id: jobId,
        type: job.type || 'variant_generation',
        status: job.status || 'Pending',
        createdAt: job.createdAt || job.startTime || now,
        startedAt: job.startedAt || job.startTime || now,
        updatedAt: now,
        lastUpdated: now,
        completedAt: job.completedAt || job.completionTime,
        progress: job.progress !== undefined ? job.progress : (job.progressPercent || 0),
        total: job.total !== undefined ? job.total : (job.totalTarget || 0),
        processed: job.processed !== undefined ? job.processed : (job.persistedCount || 0),
        failed: job.failed !== undefined ? job.failed : 0,
        error: job.error,
        metadata: job.metadata || job.config || {},
        // Backwards compatibility aliases
        workspaceId: job.workspaceId || '',
        name: job.name || `Job ${jobId}`,
        totalTarget: job.totalTarget !== undefined ? job.totalTarget : (job.total || 0),
        generatedCount: job.generatedCount !== undefined ? job.generatedCount : (job.processed || 0),
        persistedCount: job.persistedCount !== undefined ? job.persistedCount : (job.processed || 0),
        remainingCount: job.remainingCount !== undefined ? job.remainingCount : Math.max(0, (job.total || 0) - (job.processed || 0)),
        progressPercent: job.progressPercent !== undefined ? job.progressPercent : (job.progress || 0),
        ratePerSecond: job.ratePerSecond || 0,
        elapsedMs: job.elapsedMs || 0,
        estimatedRemainingSeconds: job.estimatedRemainingSeconds || 0,
        startTime: job.startTime || job.startedAt || now,
        config: job.config || job.metadata || {},
      };
      tx.objectStore('jobs').put(canonicalJob);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getJob(id: string): Promise<PersistentJob | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve(null);
      const tx = db.transaction('jobs', 'readonly');
      const req = tx.objectStore('jobs').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getActiveJob(workspaceId?: string): Promise<PersistentJob | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve(null);
      const tx = db.transaction('jobs', 'readonly');
      const store = tx.objectStore('jobs');
      const req = store.getAll();
      req.onsuccess = () => {
        const jobs: PersistentJob[] = req.result || [];
        const active = jobs
          .filter((j) => {
            const matchesWs = !workspaceId || j.workspaceId === workspaceId;
            const s = (j.status || '').toLowerCase();
            return matchesWs && (s === 'running' || s === 'pending' || s === 'paused' || s === 'recovering');
          })
          .sort((a, b) => (b.updatedAt || b.lastUpdated || 0) - (a.updatedAt || a.lastUpdated || 0))[0];
        resolve(active || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllJobs(workspaceId?: string): Promise<PersistentJob[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve([]);
      const tx = db.transaction('jobs', 'readonly');
      const store = tx.objectStore('jobs');
      const req = store.getAll();
      req.onsuccess = () => {
        let jobs: PersistentJob[] = req.result || [];
        if (workspaceId) {
          jobs = jobs.filter((j) => j.workspaceId === workspaceId);
        }
        jobs.sort((a, b) => b.startTime - a.startTime);
        resolve(jobs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteJob(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve();
      const tx = db.transaction('jobs', 'readwrite');
      tx.objectStore('jobs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearCompletedJobs(workspaceId?: string): Promise<void> {
    const all = await this.getAllJobs(workspaceId);
    const completed = all.filter((j) => j.status === 'completed' || j.status === 'cancelled' || j.status === 'failed');
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('jobs')) return resolve();
      const tx = db.transaction('jobs', 'readwrite');
      const store = tx.objectStore('jobs');
      completed.forEach((j) => store.delete(j.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= CONNECTED GMAIL ACCOUNTS =================
  async getConnectedAccounts(): Promise<ConnectedGmailAccount[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('connectedAccounts')) return resolve([]);
      const tx = db.transaction('connectedAccounts', 'readonly');
      const req = tx.objectStore('connectedAccounts').getAll();
      req.onsuccess = () => {
        const rawList: any[] = req.result || [];
        const list: ConnectedGmailAccount[] = rawList.map((acct) => {
          const status = acct.status || acct.connectionStatus || 'CONNECTED';
          const authState = acct.authState || (status === 'CONNECTED' ? 'authorized' : 'expired');
          return {
            ...acct,
            id: acct.id || acct.email,
            mailboxId: acct.mailboxId || acct.id || acct.email,
            email: acct.email,
            status,
            connectionStatus: status,
            lastSuccessfulSync: acct.lastSuccessfulSync !== undefined ? acct.lastSuccessfulSync : (acct.lastSyncedAt || null),
            lastSyncedAt: acct.lastSyncedAt || (acct.lastSuccessfulSync ?? undefined),
            syncCursor: acct.syncCursor !== undefined ? acct.syncCursor : (acct.lastHistoryId || null),
            lastHistoryId: acct.lastHistoryId || (acct.syncCursor ?? undefined),
            authState,
            lastError: acct.lastError !== undefined ? acct.lastError : (acct.errorMessage || null),
            errorMessage: acct.errorMessage || (acct.lastError ?? undefined),
            isPrimary: Boolean(acct.isPrimary),
            isActive: Boolean(acct.isActive || acct.isPrimary),
          };
        });

        // Sort active/primary first, then by connectedAt desc
        list.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (b.connectedAt || 0) - (a.connectedAt || 0);
        });

        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAccountById(id: string): Promise<ConnectedGmailAccount | null> {
    const accounts = await this.getConnectedAccounts();
    const needle = id.toLowerCase().trim();
    return accounts.find((a) => a.id.toLowerCase() === needle || a.email.toLowerCase() === needle) || null;
  }

  async getPrimaryAccount(): Promise<ConnectedGmailAccount | null> {
    const accounts = await this.getConnectedAccounts();
    if (accounts.length === 0) return null;

    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem('inboxforge_active_mailbox_id');
    } catch (_) {}

    if (savedId) {
      const match = accounts.find(
        (a) => a.id === savedId || a.email.toLowerCase() === savedId.toLowerCase()
      );
      if (match) return match;
    }

    return accounts.find((a) => a.isPrimary || a.isActive) || accounts[0] || null;
  }

  async saveConnectedAccount(account: ConnectedGmailAccount): Promise<void> {
    const db = await this.openDB();
    const id = account.id || account.email;
    const status = account.status || account.connectionStatus || 'CONNECTED';
    const authState = account.authState || (status === 'CONNECTED' ? 'authorized' : 'expired');
    const normalized: ConnectedGmailAccount = {
      ...account,
      id,
      mailboxId: account.mailboxId || id,
      email: account.email,
      status,
      connectionStatus: status,
      lastSuccessfulSync: account.lastSuccessfulSync !== undefined ? account.lastSuccessfulSync : (account.lastSyncedAt || null),
      lastSyncedAt: account.lastSyncedAt || (account.lastSuccessfulSync ?? undefined),
      syncCursor: account.syncCursor !== undefined ? account.syncCursor : (account.lastHistoryId || null),
      lastHistoryId: account.lastHistoryId || (account.syncCursor ?? undefined),
      authState,
      lastError: account.lastError !== undefined ? account.lastError : (account.errorMessage || null),
      errorMessage: account.errorMessage || (account.lastError ?? undefined),
    };

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('connectedAccounts')) return resolve();
      const tx = db.transaction('connectedAccounts', 'readwrite');
      tx.objectStore('connectedAccounts').put(normalized);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeConnectedAccount(id: string): Promise<void> {
    const db = await this.openDB();
    try {
      const savedId = localStorage.getItem('inboxforge_active_mailbox_id');
      if (savedId === id) {
        localStorage.removeItem('inboxforge_active_mailbox_id');
      }
    } catch (_) {}

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('connectedAccounts')) return resolve();
      const tx = db.transaction('connectedAccounts', 'readwrite');
      tx.objectStore('connectedAccounts').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async setPrimaryAccount(id: string): Promise<void> {
    try {
      localStorage.setItem('inboxforge_active_mailbox_id', id);
    } catch (_) {}

    const accounts = await this.getConnectedAccounts();
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('connectedAccounts')) return resolve();
      const tx = db.transaction('connectedAccounts', 'readwrite');
      const store = tx.objectStore('connectedAccounts');
      accounts.forEach((acct) => {
        const isMatch = acct.id === id || acct.email.toLowerCase() === id.toLowerCase();
        store.put({
          ...acct,
          isPrimary: isMatch,
          isActive: isMatch,
        });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= SETTINGS =================
  async getSettings(): Promise<AppSettings> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('app_settings');
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          const defaults: AppSettings = {
            id: 'app_settings',
            theme: 'dark',
            voxTheme: 'vox_obsidian',
            compactMode: false,
            defaultPageSize: 100,
            autoSaveNotes: true,
            generationBatchSize: 5000,
            checkpointFrequency: 25000,
            exportFormat: 'csv',
            confirmDestructiveActions: true,
            autoReconnectGmail: true,
          };
          resolve(defaults);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ ...settings, id: 'app_settings' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ================= DIAGNOSTICS & STORAGE =================
  async getStorageStats(workspaceId?: string): Promise<StorageStats> {
    let estimatedBytes = 0;
    let quotaBytes = 0;

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        estimatedBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      } catch {
        // fallback
      }
    }

    const db = await this.openDB();
    const countStore = (storeName: string): Promise<number> => {
      return new Promise((res) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      });
    };

    const [variantCount, workspaceCount, projectCount, testCaseCount, otpCount, logCount] =
      await Promise.all([
        countStore('variants'),
        countStore('workspaces'),
        countStore('projects'),
        countStore('testCases'),
        countStore('otpRecords'),
        countStore('activityLogs'),
      ]);

    const usagePercent = quotaBytes > 0 ? (estimatedBytes / quotaBytes) * 100 : 0;

    return {
      estimatedBytes,
      quotaBytes,
      usagePercent,
      variantCount,
      workspaceCount,
      projectCount,
      testCaseCount,
      otpCount,
      logCount,
    };
  }

  // ================= MOCK EMAILS (SIMULATED INBOX) =================
  async getAllMockEmails(workspaceId: string): Promise<MockEmail[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('mockEmails')) {
        return resolve([]);
      }
      const tx = db.transaction('mockEmails', 'readonly');
      const store = tx.objectStore('mockEmails');
      const index = store.index('workspaceId');
      const req = index.getAll(workspaceId);
      req.onsuccess = () => {
        const emails: MockEmail[] = req.result || [];
        emails.sort((a, b) => b.receivedAt - a.receivedAt);
        resolve(emails);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async addMockEmail(email: MockEmail): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mockEmails', 'readwrite');
      const store = tx.objectStore('mockEmails');
      const req = store.put(email);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateMockEmail(email: MockEmail): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mockEmails', 'readwrite');
      const store = tx.objectStore('mockEmails');
      const req = store.put(email);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteMockEmail(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mockEmails', 'readwrite');
      const store = tx.objectStore('mockEmails');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async bulkDeleteMockEmails(ids: string[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mockEmails', 'readwrite');
      const store = tx.objectStore('mockEmails');
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearMockEmails(workspaceId: string): Promise<void> {
    const emails = await this.getAllMockEmails(workspaceId);
    await this.bulkDeleteMockEmails(emails.map((e) => e.id));
  }

  // ================= PROJECT & TESTING TEMPLATES =================
  async getAllTemplates(): Promise<ProjectTemplate[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('templates')) {
        return resolve(BUILTIN_TEMPLATES);
      }
      const tx = db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      const req = store.getAll();
      req.onsuccess = () => {
        let list: ProjectTemplate[] = req.result || [];
        // Seed default templates if completely empty
        if (list.length === 0) {
          BUILTIN_TEMPLATES.forEach((t) => store.put(t));
          list = [...BUILTIN_TEMPLATES];
        } else {
          // Ensure all built-in templates exist
          BUILTIN_TEMPLATES.forEach((bt) => {
            if (!list.some((existing) => existing.id === bt.id)) {
              store.put(bt);
              list.push(bt);
            }
          });
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getTemplateById(id: string): Promise<ProjectTemplate | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const store = tx.objectStore('templates');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveTemplate(template: ProjectTemplate): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      const req = store.put(template);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ================= CUSTOM INSTRUCTIONS & QA RULES =================
  async getCustomInstructions(workspaceId: string): Promise<CustomInstructions | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('customInstructions')) {
        return resolve(null);
      }
      const tx = db.transaction('customInstructions', 'readonly');
      const store = tx.objectStore('customInstructions');
      const req = store.get(workspaceId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveCustomInstructions(instructions: CustomInstructions): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customInstructions', 'readwrite');
      const store = tx.objectStore('customInstructions');
      const req = store.put(instructions);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ================= SAVED API REQUESTS =================
  async getAllSavedApiRequests(workspaceId: string): Promise<SavedApiRequest[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('savedApiRequests')) {
        return resolve([]);
      }
      const tx = db.transaction('savedApiRequests', 'readonly');
      const store = tx.objectStore('savedApiRequests');
      const index = store.index('workspaceId');
      const req = index.getAll(workspaceId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveApiRequest(apiRequest: SavedApiRequest): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('savedApiRequests', 'readwrite');
      const store = tx.objectStore('savedApiRequests');
      const req = store.put(apiRequest);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteApiRequest(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('savedApiRequests', 'readwrite');
      const store = tx.objectStore('savedApiRequests');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ================= WORKSPACE DUPLICATION =================
  async duplicateWorkspace(sourceWorkspaceId: string, newName: string, newBaseEmail?: string): Promise<Workspace> {
    const sourceWs = await this.getWorkspace(sourceWorkspaceId);
    if (!sourceWs) throw new Error('Source workspace not found');

    const email = newBaseEmail || sourceWs.baseEmail;
    const parts = email.split('@');
    const username = parts[0] || 'test';
    const domain = parts[1] || 'gmail.com';

    const newWs: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newName,
      baseEmail: email,
      username,
      domain,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: sourceWs.color,
      notes: sourceWs.notes ? `Cloned from ${sourceWs.name}: ${sourceWs.notes}` : `Cloned from ${sourceWs.name}`,
    };

    await this.createWorkspace(newWs);

    // Clone labels
    const labels = await this.getAllLabels(sourceWorkspaceId);
    const labelIdMap = new Map<string, string>();
    for (const l of labels) {
      const newLabelId = `lbl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      labelIdMap.set(l.id, newLabelId);
      await this.createLabel({
        ...l,
        id: newLabelId,
        workspaceId: newWs.id,
        createdAt: Date.now(),
      });
    }

    // Clone variants (up to first 5000 for instant duplication)
    const variants = await this.getVariantsByWorkspace(sourceWorkspaceId);
    if (variants.length > 0) {
      const clonedVariants: Variant[] = variants.map((v, idx) => ({
        ...v,
        id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: newWs.id,
        labelIds: v.labelIds.map((oldId) => labelIdMap.get(oldId) || oldId).filter(Boolean),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      await this.bulkInsertVariants(clonedVariants);
    }

    // Clone projects
    const projects = await this.getAllProjects(sourceWorkspaceId);
    const projectIdMap = new Map<string, string>();
    for (const p of projects) {
      const newProjId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      projectIdMap.set(p.id, newProjId);
      await this.createProject({
        ...p,
        id: newProjId,
        workspaceId: newWs.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Clone test cases
    const testCases = await this.getAllTestCases(sourceWorkspaceId);
    for (const tc of testCases) {
      await this.createTestCase({
        ...tc,
        id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: newWs.id,
        projectId: tc.projectId ? projectIdMap.get(tc.projectId) : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Clone mock emails
    const emails = await this.getAllMockEmails(sourceWorkspaceId);
    for (const em of emails) {
      await this.addMockEmail({
        ...em,
        id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: newWs.id,
        receivedAt: Date.now(),
      });
    }

    // Clone custom instructions
    const customInstr = await this.getCustomInstructions(sourceWorkspaceId);
    if (customInstr) {
      await this.saveCustomInstructions({
        ...customInstr,
        workspaceId: newWs.id,
        autoApplyLabels: customInstr.autoApplyLabels.map((id) => labelIdMap.get(id) || id),
        updatedAt: Date.now(),
      });
    }

    // Add log
    await this.addLog({
      id: `log_dup_${Date.now()}`,
      workspaceId: newWs.id,
      type: 'workspace_duplicate',
      details: `Cloned workspace from "${sourceWs.name}" (${variants.length} identities, ${projects.length} projects, ${testCases.length} test cases)`,
      timestamp: Date.now(),
    });

    return newWs;
  }

  // ================= BACKUP & RESTORE =================
  async exportCompleteBackup(workspaceId?: string): Promise<Record<string, any>> {
    const db = await this.openDB();
    const getAll = (storeName: string): Promise<any[]> => {
      return new Promise((res) => {
        if (!db.objectStoreNames.contains(storeName)) return res([]);
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
    };

    const [
      workspaces,
      variants,
      labels,
      projects,
      testCases,
      otpRecords,
      activityLogs,
      settings,
      mockEmails,
      templates,
      customInstructions,
      savedApiRequests,
    ] = await Promise.all([
      getAll('workspaces'),
      getAll('variants'),
      getAll('labels'),
      getAll('projects'),
      getAll('testCases'),
      getAll('otpRecords'),
      getAll('activityLogs'),
      getAll('settings'),
      getAll('mockEmails'),
      getAll('templates'),
      getAll('customInstructions'),
      getAll('savedApiRequests'),
    ]);

    const filtered = (items: any[]) =>
      workspaceId ? items.filter((i) => i.workspaceId === workspaceId) : items;

    return {
      version: 2,
      exportedAt: Date.now(),
      appName: 'InboxForge',
      data: {
        workspaces: workspaceId ? workspaces.filter((w) => w.id === workspaceId) : workspaces,
        variants: filtered(variants),
        labels: filtered(labels),
        projects: filtered(projects),
        testCases: filtered(testCases),
        otpRecords: filtered(otpRecords),
        activityLogs: filtered(activityLogs),
        settings,
        mockEmails: filtered(mockEmails),
        templates,
        customInstructions: filtered(customInstructions),
        savedApiRequests: filtered(savedApiRequests),
      },
    };
  }

  async importCompleteBackup(backupData: any): Promise<{ importedCount: number; errors: string[] }> {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup format: Missing data payload.');
    }

    const {
      workspaces,
      variants,
      labels,
      projects,
      testCases,
      otpRecords,
      activityLogs,
      settings,
      mockEmails,
      templates,
      customInstructions,
      savedApiRequests,
    } = backupData.data;

    const db = await this.openDB();
    let totalImported = 0;
    const errors: string[] = [];

    const putAll = (storeName: string, items: any[]) => {
      if (!items || !Array.isArray(items) || !items.length) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) return resolve();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of items) {
          store.put(item);
          totalImported++;
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    };

    await putAll('workspaces', workspaces || []);
    await putAll('labels', labels || []);
    await putAll('projects', projects || []);
    await putAll('testCases', testCases || []);
    await putAll('otpRecords', otpRecords || []);
    await putAll('activityLogs', activityLogs || []);
    await putAll('settings', settings || []);
    await putAll('variants', variants || []);
    await putAll('mockEmails', mockEmails || []);
    await putAll('templates', templates || []);
    await putAll('customInstructions', customInstructions || []);
    await putAll('savedApiRequests', savedApiRequests || []);

    return { importedCount: totalImported, errors };
  }
}

export const db = new InboxForgeDatabase();

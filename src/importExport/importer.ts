/**
 * Data Importer
 * Parses TXT, CSV, and JSON formats, performs validation, duplicate detection,
 * and reports a comprehensive import summary.
 */

import { db } from '../database/db';
import { ImportSummary, Variant } from '../types';

export interface ImportOptions {
  onDuplicate?: 'skip' | 'overwrite' | 'add';
}

export class DataImporter {
  static async importFile(
    file: File,
    workspaceId: string,
    baseEmail?: string,
    existingLabelsMap?: Map<string, string> // name -> id
  ): Promise<ImportSummary> {
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      return this.importJSON(workspaceId, text);
    } else if (fileName.endsWith('.csv')) {
      return this.importCSV(workspaceId, text, { existingLabelsMap });
    } else {
      // Default to TXT (one email per line)
      return this.importTXT(workspaceId, text);
    }
  }

  static async importTXT(
    workspaceId: string,
    text: string,
    options?: ImportOptions
  ): Promise<ImportSummary> {
    const ws = await db.getWorkspace(workspaceId);
    const baseEmail = ws?.baseEmail || 'workspace@gmail.com';
    const lines = text.split(/\r?\n/);
    const summary: ImportSummary = {
      recordsScanned: lines.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    const username = baseEmail.split('@')[0].replace(/\./g, '');
    const seenInBatch = new Set<string>();
    const variantsToInsert: Variant[] = [];
    const now = Date.now();

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) {
        summary.skipped++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(raw)) {
        summary.invalid++;
        if (summary.errors.length < 10) {
          summary.errors.push(`Line ${i + 1}: Invalid email address "${raw}"`);
        }
        continue;
      }

      if (seenInBatch.has(raw.toLowerCase())) {
        summary.duplicates++;
        continue;
      }
      seenInBatch.add(raw.toLowerCase());
      summary.valid++;

      const id = `${workspaceId}_imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      variantsToInsert.push({
        id,
        workspaceId,
        email: raw,
        baseEmail,
        username,
        status: 'unused',
        starred: false,
        labelIds: [],
        notes: 'Imported via TXT',
        createdAt: now,
        updatedAt: now,
        copyCount: 0,
        usageCount: 0,
      });

      if (variantsToInsert.length >= 5000) {
        await db.bulkInsertVariants([...variantsToInsert]);
        summary.imported += variantsToInsert.length;
        variantsToInsert.length = 0;
      }
    }

    if (variantsToInsert.length > 0) {
      await db.bulkInsertVariants(variantsToInsert);
      summary.imported += variantsToInsert.length;
    }

    await db.addLog({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      type: 'import',
      details: `Imported ${summary.imported} identities from TXT file (${summary.duplicates} duplicates skipped)`,
      timestamp: Date.now(),
    });

    return summary;
  }

  static async importCSV(
    workspaceId: string,
    text: string,
    options?: { existingLabelsMap?: Map<string, string>; onDuplicate?: string }
  ): Promise<ImportSummary> {
    const ws = await db.getWorkspace(workspaceId);
    const baseEmail = ws?.baseEmail || 'workspace@gmail.com';
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const summary: ImportSummary = {
      recordsScanned: Math.max(0, lines.length - 1),
      valid: 0,
      invalid: 0,
      duplicates: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    if (lines.length <= 1) {
      summary.errors.push('CSV file is empty or only contains header.');
      return summary;
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const emailColIndex = header.findIndex((h) => h === 'email');

    if (emailColIndex === -1) {
      summary.errors.push('CSV must contain an "Email" column header.');
      return summary;
    }

    const statusColIndex = header.findIndex((h) => h === 'status');
    const notesColIndex = header.findIndex((h) => h === 'notes');
    const starredColIndex = header.findIndex((h) => h === 'starred');

    const seenInBatch = new Set<string>();
    const variantsToInsert: Variant[] = [];
    const now = Date.now();
    const username = baseEmail.split('@')[0].replace(/\./g, '');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        summary.skipped++;
        continue;
      }

      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim().replace(/^"|"$/g, ''));
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^"|"$/g, ''));

      const rawEmail = cells[emailColIndex]?.trim() || '';
      if (!rawEmail || !rawEmail.includes('@')) {
        summary.invalid++;
        continue;
      }

      if (seenInBatch.has(rawEmail.toLowerCase())) {
        summary.duplicates++;
        continue;
      }
      seenInBatch.add(rawEmail.toLowerCase());
      summary.valid++;

      const status = (statusColIndex !== -1 && ['unused', 'reserved', 'used', 'archived'].includes(cells[statusColIndex]))
        ? (cells[statusColIndex] as any)
        : 'unused';
      const notes = notesColIndex !== -1 ? cells[notesColIndex] || '' : '';
      const starred = starredColIndex !== -1 ? (cells[starredColIndex]?.toLowerCase() === 'true' || cells[starredColIndex] === '1') : false;

      const id = `${workspaceId}_csv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      variantsToInsert.push({
        id,
        workspaceId,
        email: rawEmail,
        baseEmail,
        username,
        status,
        starred,
        labelIds: [],
        notes,
        createdAt: now,
        updatedAt: now,
        copyCount: 0,
        usageCount: 0,
      });

      if (variantsToInsert.length >= 5000) {
        await db.bulkInsertVariants([...variantsToInsert]);
        summary.imported += variantsToInsert.length;
        variantsToInsert.length = 0;
      }
    }

    if (variantsToInsert.length > 0) {
      await db.bulkInsertVariants(variantsToInsert);
      summary.imported += variantsToInsert.length;
    }

    await db.addLog({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      type: 'import',
      details: `Imported ${summary.imported} identities from CSV file (${summary.duplicates} duplicates skipped)`,
      timestamp: Date.now(),
    });

    return summary;
  }

  static async importJSON(
    workspaceId: string,
    text: string,
    options?: ImportOptions
  ): Promise<ImportSummary> {
    const ws = await db.getWorkspace(workspaceId);
    const baseEmail = ws?.baseEmail || 'workspace@gmail.com';
    const summary: ImportSummary = {
      recordsScanned: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const parsed = JSON.parse(text);
      let items: any[] = [];

      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed.data && Array.isArray(parsed.data.variants)) {
        items = parsed.data.variants;
      } else if (parsed.variants && Array.isArray(parsed.variants)) {
        items = parsed.variants;
      } else {
        summary.errors.push('Unrecognized JSON structure: Must be an array of variants or workspace backup format.');
        return summary;
      }

      summary.recordsScanned = items.length;
      const seen = new Set<string>();
      const batch: Variant[] = [];
      const now = Date.now();
      const username = baseEmail.split('@')[0].replace(/\./g, '');

      for (const item of items) {
        const email = (item.email || (typeof item === 'string' ? item : '')).trim();
        if (!email || !email.includes('@')) {
          summary.invalid++;
          continue;
        }

        if (seen.has(email.toLowerCase())) {
          summary.duplicates++;
          continue;
        }
        seen.add(email.toLowerCase());
        summary.valid++;

        batch.push({
          id: item.id || `${workspaceId}_json_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          workspaceId,
          email,
          baseEmail,
          username,
          status: item.status || 'unused',
          starred: !!item.starred,
          labelIds: Array.isArray(item.labelIds) ? item.labelIds : [],
          notes: item.notes || '',
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
          lastCopiedAt: item.lastCopiedAt,
          copyCount: item.copyCount || 0,
          lastUsedAt: item.lastUsedAt,
          usageCount: item.usageCount || 0,
        });

        if (batch.length >= 5000) {
          await db.bulkInsertVariants([...batch]);
          summary.imported += batch.length;
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await db.bulkInsertVariants(batch);
        summary.imported += batch.length;
      }

      await db.addLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        workspaceId,
        type: 'import',
        details: `Imported ${summary.imported} identities from JSON file (${summary.duplicates} duplicates skipped)`,
        timestamp: Date.now(),
      });

      return summary;
    } catch (err: any) {
      summary.errors.push(`JSON parse error: ${err.message}`);
      return summary;
    }
  }

  static async restoreFullWorkspaceJSON(backupData: any) {
    return db.importCompleteBackup(backupData);
  }
}

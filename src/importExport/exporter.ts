/**
 * Data Exporter
 * Generates chunked TXT, CSV, and JSON downloads for large datasets without blocking UI.
 */

import { Variant, Label } from '../types';
import { db } from '../database/db';

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json';
  filename?: string;
  labelsMap?: Map<string, Label>;
}

export class DataExporter {
  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  static toPlaintext(variants: Variant[]): string {
    return variants.map((v) => v.email).join('\n');
  }

  static toCSV(variants: Variant[], labelsMap?: Map<string, Label>): string {
    const headers = [
      'ID',
      'Identity Name',
      'Email',
      'Identity Type',
      'Category',
      'SubCategory',
      'Username',
      'Organization',
      'Role Title',
      'Suffix',
      'Status',
      'Starred',
      'Tags',
      'Labels',
      'Notes',
      'Copy Count',
      'Usage Count',
      'Created Timestamp',
      'Created ISO',
      'Is Synthetic Test Data',
    ];

    const rows = variants.map((v) => {
      const labelNames = (v.labelIds || [])
        .map((id) => labelsMap?.get(id)?.name || id)
        .join('; ');
      const tagsList = (v.tags || []).join('; ');

      return [
        `"${(v.id || '').replace(/"/g, '""')}"`,
        `"${(v.identityName || v.username || '').replace(/"/g, '""')}"`,
        `"${v.email.replace(/"/g, '""')}"`,
        `"${(v.identityType || 'personal').replace(/"/g, '""')}"`,
        `"${(v.identityCategory || 'PERSON').replace(/"/g, '""')}"`,
        `"${(v.subCategory || 'person_name').replace(/"/g, '""')}"`,
        `"${(v.syntheticUsername || v.username || '').replace(/"/g, '""')}"`,
        `"${(v.organization || '').replace(/"/g, '""')}"`,
        `"${(v.roleTitle || '').replace(/"/g, '""')}"`,
        `"${(v.suffix || '').replace(/"/g, '""')}"`,
        `"${v.status}"`,
        v.starred ? 'true' : 'false',
        `"${tagsList.replace(/"/g, '""')}"`,
        `"${labelNames.replace(/"/g, '""')}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`,
        v.copyCount || 0,
        v.usageCount || 0,
        v.createdAt,
        new Date(v.createdAt).toISOString(),
        'true',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Parse CSV content back into Variant synthetic identity items
   */
  static parseCSV(
    csvText: string,
    workspaceId: string,
    baseEmail: string,
    username: string
  ): { variants: Variant[]; errors: string[] } {
    const lines = csvText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { variants: [], errors: ['CSV file is empty or missing data rows.'] };
    }

    const headerLine = lines[0];
    const parseCSVRow = (rowStr: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (inQuotes && rowStr[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCSVRow(headerLine).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const emailIdx = headers.findIndex((h) => h.includes('email') && !h.includes('base'));
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const orgIdx = headers.findIndex((h) => h.includes('organization') || h.includes('company'));
    const roleIdx = headers.findIndex((h) => h.includes('role') || h.includes('title'));
    const notesIdx = headers.findIndex((h) => h.includes('note'));
    const starredIdx = headers.findIndex((h) => h.includes('star'));
    const statusIdx = headers.findIndex((h) => h.includes('status'));

    const variants: Variant[] = [];
    const errors: string[] = [];
    const now = Date.now();

    for (let r = 1; r < lines.length; r++) {
      const line = lines[r];
      const cols = parseCSVRow(line);
      if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

      let email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : '';
      const name = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : '';
      const identityType = (typeIdx >= 0 && cols[typeIdx] ? cols[typeIdx] : 'personal') as any;
      const organization = orgIdx >= 0 && cols[orgIdx] ? cols[orgIdx] : undefined;
      const roleTitle = roleIdx >= 0 && cols[roleIdx] ? cols[roleIdx] : undefined;
      const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : undefined;
      const starred = starredIdx >= 0 && (cols[starredIdx] === 'true' || cols[starredIdx] === '1');
      const status = (statusIdx >= 0 && cols[statusIdx] ? cols[statusIdx] : 'unused') as any;

      if (!email && name) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        email = `${username}+${cleanName}${r}@${baseEmail.split('@')[1] || 'gmail.com'}`;
      } else if (!email) {
        email = `${username}+test${r}@${baseEmail.split('@')[1] || 'gmail.com'}`;
      }

      const id = `var_imported_${now}_${r}_${Math.random().toString(36).substring(2, 6)}`;

      variants.push({
        id,
        workspaceId,
        email,
        baseEmail,
        username,
        status: status === 'used' || status === 'reserved' || status === 'archived' ? status : 'unused',
        starred,
        labelIds: [],
        notes: notes || `Imported synthetic test identity`,
        createdAt: now - (lines.length - r) * 1000,
        updatedAt: now,
        copyCount: 0,
        usageCount: 0,
        identityName: name || undefined,
        identityType,
        organization,
        roleTitle,
        avatarSeed: `${name || email}_${now}`,
        tags: ['IMPORTED', 'SYNTHETIC_TEST_DATA'],
        isSyntheticTestIdentity: true,
      });
    }

    return { variants, errors };
  }

  static toJSON(variants: Variant[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: variants.length,
        variants,
      },
      null,
      2
    );
  }

  static exportData(variants: Variant[], options: ExportOptions) {
    const { format, filename = `inboxforge_export_${Date.now()}`, labelsMap } = options;

    if (format === 'txt') {
      this.downloadFile(this.toPlaintext(variants), `${filename}.txt`, 'text/plain;charset=utf-8');
    } else if (format === 'csv') {
      this.downloadFile(this.toCSV(variants, labelsMap), `${filename}.csv`, 'text/csv;charset=utf-8');
    } else if (format === 'json') {
      this.downloadFile(this.toJSON(variants), `${filename}.json`, 'application/json;charset=utf-8');
    }
  }

  static async exportWorkspaceVariants(
    workspaceId: string,
    format: 'txt' | 'csv' | 'json',
    options?: { filename?: string }
  ) {
    const [variants, labels] = await Promise.all([
      db.getVariantsByWorkspace(workspaceId),
      db.getLabels(workspaceId),
    ]);

    const labelsMap = new Map<string, Label>();
    labels.forEach((l) => labelsMap.set(l.id, l));

    this.exportData(variants, {
      format,
      filename: options?.filename?.replace(/\.(txt|csv|json)$/, ''),
      labelsMap,
    });
  }

  static async exportFullWorkspaceJSON(workspaceId: string, workspaceName?: string) {
    const backup = await db.exportCompleteBackup(workspaceId);
    const filename = `inboxforge_backup_${(workspaceName || workspaceId).replace(/\s+/g, '_')}_${Date.now()}.json`;
    this.downloadFile(JSON.stringify(backup, null, 2), filename, 'application/json;charset=utf-8');
  }
}

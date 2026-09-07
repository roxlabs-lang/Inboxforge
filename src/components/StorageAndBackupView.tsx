import React, { useState, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { Workspace } from '../types';
import { DataExporter } from '../importExport/exporter';
import { DataImporter, ImportOptions } from '../importExport/importer';

interface StorageAndBackupViewProps {
  workspace: Workspace;
  variantCount: number;
  onRefreshData: () => Promise<void>;
  onDeleteWorkspace: (id: string) => Promise<void>;
  onClearWorkspaceVariants: (id: string) => Promise<void>;
}

export const StorageAndBackupView: React.FC<StorageAndBackupViewProps> = ({
  workspace,
  variantCount,
  onRefreshData,
  onDeleteWorkspace,
  onClearWorkspaceVariants,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Full Workspace JSON Backup
  const handleExportFullBackup = async () => {
    setIsExporting(true);
    try {
      await DataExporter.exportFullWorkspaceJSON(workspace.id, workspace.name);
    } finally {
      setIsExporting(false);
    }
  };

  // Plaintext TXT Export
  const handleExportTXT = async () => {
    setIsExporting(true);
    try {
      await DataExporter.exportWorkspaceVariants(workspace.id, 'txt', {
        filename: `${workspace.username}_variants.txt`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await DataExporter.exportWorkspaceVariants(workspace.id, 'csv', {
        filename: `${workspace.username}_variants.csv`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // JSON Variants Export
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await DataExporter.exportWorkspaceVariants(workspace.id, 'json', {
        filename: `${workspace.username}_variants.json`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import File Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading file and importing identities...');

    try {
      const text = await file.text();
      let res;
      if (file.name.endsWith('.csv')) {
        res = await DataImporter.importCSV(workspace.id, text, { onDuplicate: 'skip' });
      } else if (file.name.endsWith('.json')) {
        res = await DataImporter.importJSON(workspace.id, text, { onDuplicate: 'skip' });
      } else {
        res = await DataImporter.importTXT(workspace.id, text, { onDuplicate: 'skip' });
      }

      setImportStatus(
        `Successfully imported ${res.imported.toLocaleString()} identities. (${res.skippedDuplicates.toLocaleString()} duplicates skipped, ${res.invalidCount} invalid).`
      );
      await onRefreshData();
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Full Workspace JSON Restore
  const handleRestoreJSONBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Restoring workspace backup...');

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await DataImporter.restoreFullWorkspaceJSON(backupData);
      setImportStatus('Workspace restored successfully!');
      await onRefreshData();
    } catch (err: any) {
      setImportStatus(`Restore failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (jsonBackupInputRef.current) jsonBackupInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <span>Storage, Backups & Migration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export, import, and backup all email identities, test cases, and workspace metadata safely in client-side formats.
        </p>
      </div>

      {importStatus && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importStatus}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Backups & Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Workspace Backup */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Full Workspace Backup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export the entire workspace state (identities, labels, test cases, projects, OTPs, and logs) into a single portable JSON file.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={handleExportFullBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT COMPLETE JSON BACKUP</span>
            </button>

            <input
              type="file"
              ref={jsonBackupInputRef}
              onChange={handleRestoreJSONBackup}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => jsonBackupInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>RESTORE FROM JSON BACKUP</span>
            </button>
          </div>
        </div>

        {/* Identity Lists Export */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Export Identity Variants</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download the current workspace's {variantCount.toLocaleString()} identities in various standard file formats for external tools.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || variantCount === 0}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>CSV (Data)</span>
            </button>

            <button
              onClick={handleExportTXT}
              disabled={isExporting || variantCount === 0}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>TXT (Emails)</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={isExporting || variantCount === 0}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>JSON (Array)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import File Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import Identity Lists</span>
          </h3>
          <span className="text-xs text-slate-400">Supports .TXT, .CSV, .JSON</span>
        </div>

        <p className="text-xs text-slate-400">
          Upload existing lists of email variants. The parser will automatically normalize addresses and prevent duplicate insertions into IndexedDB.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".txt,.csv,.json"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2 transition cursor-pointer bg-slate-950/40"
        >
          <Upload className="w-8 h-8 text-indigo-400" />
          <div className="text-xs font-bold text-white">Click or drag file to import</div>
          <div className="text-[11px] text-slate-500">
            One email per line (TXT), or standard CSV/JSON with 'email' column
          </div>
        </button>
      </div>

      {/* Danger Zone: Clear Identities & Delete Workspace */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Clear Identities Only */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Clear All Identities</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Deletes all generated variants in this workspace ({variantCount.toLocaleString()}) while keeping projects and test cases intact.
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="mt-3 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
            >
              Clear Identities
            </button>
          </div>

          {/* Delete Entire Workspace */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-rose-400">Delete Entire Workspace</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Permanently removes this workspace and all associated variants, labels, tests, and logs.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-3 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
            >
              Delete Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Confirm Clear Identities</span>
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete all {variantCount.toLocaleString()} generated identities for{' '}
              <span className="font-mono font-bold text-white">{workspace.baseEmail}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-2 rounded-xl text-slate-400 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onClearWorkspaceVariants(workspace.id);
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
              >
                Yes, Clear Identities
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <span>Confirm Delete Workspace</span>
            </h3>
            <p className="text-xs text-slate-300">
              This will permanently delete workspace <span className="font-bold text-white">{workspace.name}</span> and all its data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-2 rounded-xl text-slate-400 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeleteWorkspace(workspace.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DataExporter } from '../importExport/exporter';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportVariants: (csvText: string) => Promise<{ count: number; error?: string }>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportVariants,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewRowCount, setPreviewRowCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setError(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const lines = content.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
      setPreviewRowCount(Math.max(0, lines.length - 1));
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDownloadSample = () => {
    const sampleCSV = [
      'ID,Identity Name,Email,Identity Type,Category,SubCategory,Username,Organization,Role Title,Suffix,Status,Starred,Tags,Labels,Notes,Created Timestamp,Created ISO,Is Synthetic Test Data',
      '"synth_sample_1","Arjun Mehta","alexchenqa+arjun.mehta1@gmail.com","personal","PERSON","person_name","arjun.mehta","Nova Pixel Labs","Senior Frontend Architect","#101","unused",true,"SYNTHETIC_TEST_DATA; PERSON; PERSONAL","","Synthetic test persona for onboarding tests",1725580800000,"2026-09-06T00:00:00.000Z",true',
      '"synth_sample_2","Maya Reynolds","alexchenqa+maya.reynolds2@gmail.com","personal","PERSON","person_name","maya.reynolds","HyperScale AI","Lead Product Designer","#202","unused",false,"SYNTHETIC_TEST_DATA; PERSON; PERSONAL","","Synthetic test persona for cart tests",1725580800000,"2026-09-06T00:00:00.000Z",true',
      '"synth_sample_3","OrbitForge HQ","alexchenqa+orbitforge3@gmail.com","company","COMPANY","fictional_company","orbitforge_hq","OrbitForge","Enterprise Admin","#303","unused",false,"SYNTHETIC_TEST_DATA; COMPANY","","Synthetic company identity",1725580800000,"2026-09-06T00:00:00.000Z",true',
      '"synth_sample_4","MayaTechVlog","alexchenqa+mayatech4@gmail.com","creator","PERSON","creator","mayatechvlog","MayaTechVlog Media","Tech Creator Pro","#404","reserved",true,"SYNTHETIC_TEST_DATA; CREATOR","","Synthetic creator identity",1725580800000,"2026-09-06T00:00:00.000Z",true',
    ].join('\r\n');

    DataExporter.downloadFile(sampleCSV, 'synthetic_test_identities_sample.csv', 'text/csv;charset=utf-8');
  };

  const handleConfirmImport = async () => {
    if (!fileContent) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await onImportVariants(fileContent);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessCount(result.count);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV identities.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFileName(null);
    setFileContent(null);
    setPreviewRowCount(0);
    setError(null);
    setSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Import Synthetic Test Identities</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  CSV
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bulk ingest test identities into this workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Successfully imported {successCount.toLocaleString()} synthetic identities!</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!fileContent ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-rose-500 bg-rose-500/5'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">
                  Drag and drop your synthetic CSV file here, or{' '}
                  <span className="text-rose-400 underline">browse</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Accepts standard comma-separated test identity files
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-semibold text-white truncate max-w-xs">
                    {selectedFileName}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Change file
                </button>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 font-mono">
                <span className="bg-slate-800 px-2 py-1 rounded text-[11px]">
                  📊 {previewRowCount.toLocaleString()} identities found
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to ingest
                </span>
              </div>
            </div>
          )}

          {/* Sample template & instructions */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="italic">
              Headers supported: ID, Identity Name, Email, Type, Category, Organization, Role, Starred
            </span>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!fileContent || isProcessing || previewRowCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-900/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Import {previewRowCount > 0 ? `${previewRowCount.toLocaleString()} Identities` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  AlertCircle,
  Inbox,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { OTPRecord, OTPStatus } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface OTPInboxViewProps {
  workspaceId: string;
  otpRecords: OTPRecord[];
  onCreateOTP: (record: Omit<OTPRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateOTPStatus: (id: string, status: OTPStatus) => Promise<void>;
  onDeleteOTP: (id: string) => Promise<void>;
}

export const OTPInboxView: React.FC<OTPInboxViewProps> = ({
  workspaceId,
  otpRecords,
  onCreateOTP,
  onUpdateOTPStatus,
  onDeleteOTP,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OTPStatus>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Record State
  const [identityEmail, setIdentityEmail] = useState('');
  const [service, setService] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [notes, setNotes] = useState('');

  const handleCopyOTP = async (id: string, code: string) => {
    await copyToClipboard(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityEmail.trim() || !otpCode.trim()) return;

    await onCreateOTP({
      workspaceId,
      identityEmail: identityEmail.trim(),
      service: service.trim() || 'General Testing',
      otp: otpCode.trim(),
      receivedAt: Date.now(),
      status: 'Received',
      notes: notes.trim() || undefined,
    });

    setIdentityEmail('');
    setService('');
    setOtpCode('');
    setNotes('');
    setShowAddModal(false);
  };

  const filteredRecords = otpRecords.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const inEmail = r.identityEmail.toLowerCase().includes(q);
      const inService = r.service.toLowerCase().includes(q);
      const inOtp = r.otp.toLowerCase().includes(q);
      const inNotes = r.notes ? r.notes.toLowerCase().includes(q) : false;
      return inEmail || inService || inOtp || inNotes;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            <span>OTP & Verification Inbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track verification codes and OTPs for your testing identities securely without automated scraping.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record OTP Message</span>
        </button>
      </div>

      {/* Security Reassurance Notice */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>
          <strong>Local-Only Testing:</strong> InboxForge never accesses your Google password or scrapes sessions. You can record OTP codes manually or via the Local Test Lab simulator.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search OTPs by email, service, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'Received', 'Used', 'Expired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st === 'all' ? 'All Codes' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-600" />
            <h4 className="text-sm font-bold text-white">No OTP codes recorded</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Use the "+ Record OTP Message" button above or trigger a test in the Local Test Lab to simulate OTP challenges.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredRecords.map((r) => {
              const isCopied = copiedId === r.id;

              return (
                <div
                  key={r.id}
                  className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white tracking-wide">
                        {r.identityEmail}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {r.service}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          r.status === 'Received'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'Used'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Received: {new Date(r.receivedAt).toLocaleTimeString()}</span>
                      {r.notes && <span className="text-slate-500">&bull; {r.notes}</span>}
                    </div>
                  </div>

                  {/* OTP Code Box & Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="px-3.5 py-1.5 bg-slate-950 border border-indigo-500/40 rounded-xl font-mono text-base font-black text-indigo-300 tracking-widest shadow-inner">
                      {r.otp}
                    </div>

                    <button
                      onClick={() => handleCopyOTP(r.id, r.otp)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy OTP</span>
                        </>
                      )}
                    </button>

                    {r.status === 'Received' && (
                      <button
                        onClick={() => onUpdateOTPStatus(r.id, 'Used')}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs transition cursor-pointer"
                        title="Mark as Used"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteOTP(r.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record OTP Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Record OTP Message</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Identity Email *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. user.testing@gmail.com"
                  value={identityEmail}
                  onChange={(e) => setIdentityEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Service / Website Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Auth0, Stripe, Supabase, Github"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  OTP Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 482913"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Signup challenge code"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

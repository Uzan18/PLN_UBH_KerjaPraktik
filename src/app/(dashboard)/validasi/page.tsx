'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

// Fetch helper
async function fetchValidationQueue() {
  const res = await fetch('/api/validation/queue');
  if (!res.ok) throw new Error('Gagal mengambil antrean validasi');
  const json = await res.json();
  return json.data;
}

export default function ValidasiPage() {
  const queryClient = useQueryClient();
  const [rejectSessionId, setRejectSessionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Queue query
  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['validation-queue'],
    queryFn: fetchValidationQueue,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/validation/${sessionId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyetujui data');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      const res = await fetch(`/api/validation/${sessionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menolak data');
      }
      return res.json();
    },
    onSuccess: () => {
      setRejectSessionId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
    },
  });

  function handleApprove(sessionId: string) {
    if (confirm('Apakah Anda yakin ingin memvalidasi dan menyetujui data pengujian ini?')) {
      approveMutation.mutate(sessionId);
    }
  }

  function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectSessionId || !rejectReason.trim()) return;
    rejectMutation.mutate({ sessionId: rejectSessionId, reason: rejectReason });
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1440px]">
      {/* Page Header */}
      <div className="flex items-center gap-2 text-xs text-outline mb-2">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-primary font-semibold">Validasi Data</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Validasi Data Pengujian</h2>
          <p className="text-on-surface-variant mt-1">
            Terdapat <span className="font-bold text-primary">{queue?.length || 0} data pengujian</span> yang membutuhkan validasi teknis.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-status-bad font-medium">
              Gagal memuat antrean validasi data.
            </div>
          ) : !queue || queue.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant font-medium">
              Tidak ada data pengujian yang menunggu validasi saat ini.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-border text-left">
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">Unit Pembangkit</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">Jenis Pengujian</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">Diinput oleh</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">Tanggal Submit</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {queue.map((item: any) => (
                  <tr key={item.sessionId} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary text-sm">{item.assetName}</span>
                        <span className="text-[11px] text-outline font-medium uppercase">{item.ubpName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">{item.testTypeName}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                          {item.createdByInitials}
                        </div>
                        <span className="text-sm font-medium">{item.createdByName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {new Date(item.submittedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleApprove(item.sessionId)}
                          className="p-1.5 text-status-good hover:bg-status-good/10 rounded-md transition-colors" 
                          title="Approve"
                        >
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                        </button>
                        <button 
                          onClick={() => setRejectSessionId(item.sessionId)}
                          className="p-1.5 text-status-bad hover:bg-status-bad/10 rounded-md transition-colors" 
                          title="Reject"
                        >
                          <span className="material-symbols-outlined text-xl">cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-on-surface mb-2">Tolak Data Pengujian</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Masukkan alasan penolakan. Alasan ini akan ditampilkan kepada petugas input data.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Alasan penolakan..."
                required
                className="w-full bg-white border border-surface-border rounded-lg p-3 text-sm focus:ring-primary focus:border-primary min-h-[100px]"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectSessionId(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-status-bad text-white rounded-lg text-sm font-semibold hover:brightness-110 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Mengirim...' : 'Tolak Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low/50 p-6 rounded-xl border border-dashed border-outline-variant flex gap-6 items-start">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary border border-surface-border shadow-sm shrink-0">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-2">Panduan Validasi Teknis</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
              Setiap data yang masuk telah melalui <span className="font-bold text-on-surface">Auto-Threshold Calculation</span>. Sebagai validator, Anda wajib melakukan cross-check terhadap kurva tren historis sebelum memberikan approval final.
            </p>
            <div className="flex gap-4">
              {[
                { color: '#3B82F6', label: 'Menunggu Validasi (QC)' },
                { color: '#22C55E', label: 'Tervalidasi (Approved)' },
                { color: '#EF4444', label: 'Ditolak (Rejected)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[11px] font-bold text-outline uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

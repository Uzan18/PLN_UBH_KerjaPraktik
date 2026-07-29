'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FilterSelect } from '@/components/dashboard/FilterSelect';
import { TestResultsGroupedView } from '@/components/dashboard/TestResultsGroupedView';

async function fetchTestSessions() {
  const res = await fetch('/api/test-sessions');
  if (!res.ok) throw new Error('Gagal mengambil data riwayat pengujian');
  const json = await res.json();
  return json.data || [];
}

async function fetchSessionDetail(sessionId: string) {
  const res = await fetch(`/api/test-sessions/${sessionId}/results`);
  if (!res.ok) throw new Error('Gagal mengambil data detail pengujian');
  const json = await res.json();
  return json.data || [];
}

const TEST_TYPE_ORDER = [
  'INSULATION RESISTANCE',
  'POLARITY INDEX',
  'TURN TO TURN RATIO',
  'WINDING RESISTANCE HV',
  'WINDING RESISTANCE LV',
  'SFRA HV OPEN',
  'SFRA HV SHORTED',
  'SFRA LV OPEN',
  'SFRA LV SHORTED',
  'EXC CURRENT',
  'TAN DELTA WINDING',
  'TAN DELTA BUSHING',
  'WATT LOSS BUSHING BUSHING',
  'GROUNDING RESISTANCE',
  'DIRANA MOISTURE',
  'DIRANA OIL CONDUCT',
  'ARRESTER GROUND',
  'ARRESTER IR',
  'ARRESTER WATT LOSS',
  'VISUAL INSPECTION',
  'OTI ',
  'WTI',
  'DGA',
  'OIL ANALYSIS',
  'RLA'
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Validasi',
  VALIDATED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export default function RiwayatPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isAssetInfoExpanded, setIsAssetInfoExpanded] = useState(false);

  const userRole = (session?.user as { role?: string })?.role || 'VIEWER';

  const selectedSessionAssetInfo = useMemo(() => {
    if (!selectedSession) return null;
    
    const ALIAS_MAP: Record<string, string> = {
      mfgyear: 'mfgYear',
      'year of manufacturing': 'mfgYear',
      'year of manufacture': 'mfgYear',
      'tahun buat': 'mfgYear',
      'tahun pembuatan': 'mfgYear',
      serialnumber: 'serialNumber',
      'serial number': 'serialNumber',
      'nomor seri': 'serialNumber',
      'no seri': 'serialNumber',
      manufacture: 'manufacture',
      pabrikan: 'manufacture',
    };

    const info: Record<string, string> = {
      manufacture: selectedSession.asset?.manufacture || '',
      serialNumber: selectedSession.asset?.serialNumber || '',
      mfgYear: selectedSession.asset?.mfgYear ? String(selectedSession.asset.mfgYear) : '',
    };

    // 1. Merge approved specifications stored in the session (for historical reports)
    if (selectedSession.additionalInfo) {
      try {
        const approved = JSON.parse(selectedSession.additionalInfo);
        Object.entries(approved).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            const canonicalKey = ALIAS_MAP[k.trim().toLowerCase()] || k.trim();
            info[canonicalKey] = String(v);
          }
        });
      } catch (err) {
        console.error('Failed to parse approved additional info:', err);
      }
    }

    // 2. Merge pending changes (for drafts/submissions)
    if (selectedSession.additionalInfoPending) {
      try {
        const pending = JSON.parse(selectedSession.additionalInfoPending);
        Object.entries(pending).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            const canonicalKey = ALIAS_MAP[k.trim().toLowerCase()] || k.trim();
            info[canonicalKey] = String(v);
          }
        });
      } catch (err) {
        console.error('Failed to parse pending additional info:', err);
      }
    }

    // Build fields list (3 default fields + any custom fields)
    const fieldsList: { key: string; label: string }[] = [
      { key: 'manufacture', label: 'Manufacture' },
      { key: 'serialNumber', label: 'Serial Number' },
      { key: 'mfgYear', label: 'Year of Manufacturing' },
    ];

    if (selectedSession.asset?.jenisAsset?.infoFields) {
      try {
        const parsed = JSON.parse(selectedSession.asset.jenisAsset.infoFields);
        parsed.forEach((item: any) => {
          const rawKey = typeof item === 'string' ? item : item?.key || '';
          const customLabel = typeof item === 'object' && item?.label ? item.label : rawKey;
          const normKey = ALIAS_MAP[rawKey.trim().toLowerCase()] || rawKey.trim();
          if (!fieldsList.some((f) => f.key.toLowerCase() === normKey.toLowerCase())) {
            fieldsList.push({ key: normKey, label: customLabel });
          }
        });
      } catch (e) {}
    }

    // Also include any extra keys present in info that are not yet in fieldsList
    Object.keys(info).forEach((k) => {
      const normKey = ALIAS_MAP[k.trim().toLowerCase()] || k.trim();
      if (info[normKey] && !fieldsList.some((f) => f.key.toLowerCase() === normKey.toLowerCase())) {
        fieldsList.push({ key: normKey, label: k });
      }
    });

    return { info, fieldsList };
  }, [selectedSession]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUbpId, setSelectedUbpId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUbpId, selectedYear, selectedStatus]);

  // Fetch list of sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['test-sessions-history'],
    queryFn: fetchTestSessions,
  });

  // Fetch all master UBPs for filter completeness
  const { data: ubps } = useQuery({
    queryKey: ['master-ubps-filter'],
    queryFn: async () => {
      const res = await fetch('/api/master/ubp-asset');
      if (!res.ok) throw new Error('Gagal mengambil data UBP');
      const json = await res.json();
      return json.data;
    }
  });

  // Extract unique filters from sessions list and master UBPs
  const { ubpList, statusList } = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Populate from master UBPs if loaded
    if (ubps) {
      ubps.forEach((u: any) => {
        map.set(u.id, u.name);
      });
    }

    // 2. Fallback/merge from active sessions list
    if (sessions) {
      sessions.forEach((s: any) => {
        if (s.asset?.ubp) {
          map.set(s.asset.ubp.id, s.asset.ubp.name);
        }
      });
    }

    return {
      ubpList: Array.from(map.entries()).map(([id, name]) => ({ id, name })),
      statusList: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED'],
    };
  }, [ubps, sessions]);

  // Compute available years based on sessions matching other active filters
  const yearList = useMemo(() => {
    const yearsSet = new Set<string>();
    if (sessions) {
      sessions.forEach((s: any) => {
        // Filter by searchQuery
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const unitName = (s.asset?.unitPembangkit?.name || '').toLowerCase();
          const assetName = (s.asset?.name || '').toLowerCase();
          const equipmentType = (s.asset?.jenisAsset?.name || '').toLowerCase();
          const ubpName = (s.asset?.unitPembangkit?.ubp?.name || '').toLowerCase();
          if (!unitName.includes(query) && !assetName.includes(query) && !equipmentType.includes(query) && !ubpName.includes(query)) {
            return;
          }
        }

        // Filter by selectedUbpId
        if (selectedUbpId && s.asset?.unitPembangkit?.ubp?.id !== selectedUbpId) {
          return;
        }

        // Filter by selectedStatus
        if (selectedStatus && s.status !== selectedStatus) {
          return;
        }

        if (s.testYear) {
          yearsSet.add(String(s.testYear));
        }
      });
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [sessions, searchQuery, selectedUbpId, selectedStatus]);

  // Sync selected year filter with available years from data
  useEffect(() => {
    if (selectedYear && !yearList.includes(selectedYear)) {
      setSelectedYear('');
    }
  }, [yearList, selectedYear]);

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((s: any) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const unitName = (s.asset?.unitPembangkit?.name || '').toLowerCase();
        const assetName = (s.asset?.name || '').toLowerCase();
        const equipmentType = (s.asset?.jenisAsset?.name || '').toLowerCase();
        const ubpName = (s.asset?.unitPembangkit?.ubp?.name || '').toLowerCase();
        if (!unitName.includes(query) && !assetName.includes(query) && !equipmentType.includes(query) && !ubpName.includes(query)) {
          return false;
        }
      }

      if (selectedUbpId && s.asset?.unitPembangkit?.ubp?.id !== selectedUbpId) {
        return false;
      }

      if (selectedYear && String(s.testYear) !== selectedYear) {
        return false;
      }

      if (selectedStatus && s.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [sessions, searchQuery, selectedUbpId, selectedYear, selectedStatus]);

  // Paginated Sessions
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage]);

  // Query detail for modal when selectedSession is set
  const { data: sessionDetails, isLoading: isDetailLoading } = useQuery({
    queryKey: ['session-detail', selectedSession?.id],
    queryFn: () => fetchSessionDetail(selectedSession.id),
    enabled: !!selectedSession,
  });

  const sortedDetails = useMemo(() => {
    if (!sessionDetails) return [];
    return [...sessionDetails].sort((a: any, b: any) => {
      const nameA = (a.parameter?.testType?.name || '').trim().toUpperCase();
      const nameB = (b.parameter?.testType?.name || '').trim().toUpperCase();
      const idxA = TEST_TYPE_ORDER.indexOf(nameA);
      const idxB = TEST_TYPE_ORDER.indexOf(nameB);
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      if (posA !== posB) {
        return posA - posB;
      }
      const orderA = a.parameter?.orderIndex ?? 0;
      const orderB = b.parameter?.orderIndex ?? 0;
      return orderA - orderB;
    });
  }, [sessionDetails]);



  return (
    <div className="space-y-6 animate-fade-in max-w-[1440px] pb-10">
      {/* Page Header */}
      <div className="flex items-center gap-2 text-xs text-outline mb-2">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-primary font-semibold">Riwayat Uji</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Riwayat Uji</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Daftar seluruh sesi pengujian yang telah diinput dan status validasinya.
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-sm">
        {/* Filter Bar */}
        {!isLoading && !error && sessions && (
          <div className="p-4 border-b border-surface-border bg-surface-container-low/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* Search Asset */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cari Asset</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-xs">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama unit, tipe..."
                  className="w-full bg-white border border-surface-border rounded-lg text-xs py-1.5 pl-8 pr-3 focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Filter UBP */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">UBP</label>
              <FilterSelect
                value={selectedUbpId}
                onChange={setSelectedUbpId}
                options={ubpList.map((ubp: any) => ({ value: ubp.id, label: ubp.name }))}
                placeholder="Semua UBP"
              />
            </div>

            {/* Filter Tahun */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tahun Uji</label>
              <FilterSelect
                value={selectedYear}
                onChange={setSelectedYear}
                options={yearList.map((year: string) => ({ value: year, label: year }))}
                placeholder="Semua Tahun"
              />
            </div>

            {/* Filter Status */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</label>
              <FilterSelect
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={statusList.map((status: string) => ({ value: status, label: STATUS_LABELS[status] || status }))}
                placeholder="Semua Status"
              />
            </div>

            {/* Clear Filters Button */}
            <div>
              {(searchQuery || selectedUbpId || selectedYear || selectedStatus) ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedUbpId('');
                    setSelectedYear('');
                    setSelectedStatus('');
                  }}
                  className="w-full bg-surface-container hover:bg-surface-container-high border border-surface-border text-primary rounded-lg text-xs py-1.5 font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                  Bersihkan Filter
                </button>
              ) : (
                <div className="h-[28px] hidden lg:block" />
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error font-medium">
              Terjadi kesalahan saat memuat data riwayat pengujian.
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-5xl text-outline/40 block">assignment_late</span>
              <p className="font-semibold text-base text-on-surface">Belum ada riwayat pengujian</p>
              <p>Mulai dengan mengisi hasil pengujian baru di halaman Input Data.</p>
              <Link
                href="/input"
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 shadow transition-all"
              >
                <span className="material-symbols-outlined text-sm">add</span> Input Data Baru
              </Link>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-5xl text-outline/40 block">filter_list_off</span>
              <p className="font-semibold text-base text-on-surface">Tidak ada data yang cocok</p>
              <p>Coba ubah filter pencarian atau pilihan dropdown Anda.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-border">
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[5%] text-center">No</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[25%]">Unit Pembangkit / Asset</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[20%] text-center">Jenis Asset</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[10%] text-center">Tahun Uji</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[15%] text-center">Tanggal Input</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[15%] text-center">Status</th>
                    <th className="px-6 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[10%] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40">
                  {paginatedSessions.map((session: any, idx: number) => (
                    <tr 
                      key={session.id} 
                      className="hover:bg-surface-container-low/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                    >
                      <td className="px-6 py-3 text-center text-on-surface-variant font-mono">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-6 py-3 font-semibold text-on-surface">
                        <div>
                          <div>{session.asset?.unitPembangkit?.name || ''} - {session.asset?.name || ''}</div>
                          <div className="text-[10px] font-mono text-outline font-normal uppercase mt-0.5">{session.asset?.unitPembangkit?.ubp?.name || ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-on-surface-variant text-center">{session.asset?.jenisAsset?.name || '—'}</td>
                      <td className="px-6 py-3 text-center font-mono font-bold text-primary">{session.testYear}</td>
                      <td className="px-6 py-3 text-on-surface-variant font-mono text-center">
                        {new Date(session.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={session.status} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-surface-border text-primary text-[10px] font-bold rounded transition-colors cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="border-t border-surface-border px-6 py-3 flex items-center justify-between bg-surface-container-low/30 text-xs">
                <span className="text-on-surface-variant">
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredSessions.length)} dari {filteredSessions.length} data
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      Sebelumnya
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            pageNum === currentPage
                              ? 'bg-primary text-white border border-primary'
                              : 'border border-surface-border bg-white text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-surface-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-surface-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-primary">Detail Sesi Pengujian</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">ID: {selectedSession.id}</p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-1 hover:bg-surface-container-high rounded-full transition-colors cursor-pointer text-outline hover:text-on-surface flex items-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 custom-scrollbar scroll-smooth overscroll-contain p-6 space-y-4">
              {/* Rejection Note Warning Card (Prominent Top Alert) */}
              {selectedSession.status === 'REJECTED' && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl space-y-1 animate-fade-in shadow-xs">
                  <p className="font-bold text-rose-900 text-sm">Data Pengujian Ditolak</p>
                  <p className="text-rose-700 font-medium text-xs">
                    <span className="font-bold">Alasan Penolakan:</span> {selectedSession.rejectReason || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
              )}

              {/* Draft Info Card (Prominent Top Alert) */}
              {selectedSession.status === 'DRAFT' && userRole === 'INPUT' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl space-y-1 animate-fade-in shadow-xs">
                  <p className="font-bold text-blue-900 text-sm">Draft Pengujian</p>
                  <p className="text-blue-700 font-medium text-xs">
                    Data pengujian ini masih berstatus draft dan belum dikirim untuk validasi.
                  </p>
                </div>
              )}

              {/* Unified Main Data Card */}
              <div className="bg-white border border-surface-border rounded-xl shadow-xs overflow-hidden divide-y divide-surface-border">
                {/* Asset & Session Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-container-low/40 p-4 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-outline">Unit Pembangkit</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedSession.asset?.unitPembangkit?.name || ''} - {selectedSession.asset?.name || ''}</p>
                    <p className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">{selectedSession.asset?.unitPembangkit?.ubp?.name || ''}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-outline">Jenis Asset</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedSession.asset?.jenisAsset?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-outline">Tahun Uji</p>
                    <p className="font-mono font-bold text-primary text-sm mt-0.5">{selectedSession.testYear}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-outline">Status Validasi</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedSession.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Informasi Tambahan Alat (Collapsible) */}
                {selectedSessionAssetInfo && (
                  <div>
                    <button
                      onClick={() => setIsAssetInfoExpanded(!isAssetInfoExpanded)}
                      className="w-full px-4 py-2.5 bg-surface-container-low/20 hover:bg-surface-container-low flex items-center justify-between text-xs font-bold text-on-surface transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">info</span>
                        <span>Informasi Tambahan Alat / Spesifikasi Trafo</span>
                        <span className="text-[10px] font-normal text-on-surface-variant">({selectedSessionAssetInfo.fieldsList.length} Parameter)</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-outline">
                        {isAssetInfoExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isAssetInfoExpanded && (
                      <div className="p-3 border-t border-surface-border bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low border-b border-surface-border font-mono text-[9px] uppercase font-bold text-on-surface-variant">
                              <th className="px-3 py-1.5 w-[45%] border-r border-surface-border">Parameter Alat</th>
                              <th className="px-3 py-1.5 w-[55%]">Nilai Informasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {selectedSessionAssetInfo.fieldsList.map((field) => (
                              <tr key={field.key} className="hover:bg-surface-container-low/10 transition-colors">
                                <td className="px-3 py-1.5 font-semibold text-on-surface border-r border-surface-border bg-surface-container-low/35 w-[45%]">
                                  {field.label}
                                </td>
                                <td className="px-3 py-1.5 w-[55%] font-semibold text-on-surface-variant">
                                  {selectedSessionAssetInfo.info[field.key] || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Grouped Parameter Results View */}
                <div>
                  <TestResultsGroupedView details={sessionDetails} isLoading={isDetailLoading} borderless={true} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-surface-border flex justify-end gap-3 items-center shrink-0">
              <Link
                href={`/unit/${selectedSession.assetId}?sessionId=${selectedSession.id}`}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer mr-auto"
              >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                Buka Detail & Tren Unit
              </Link>
              <button 
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-white border border-surface-border text-on-surface hover:bg-surface-container-low rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
              
              {userRole === 'INPUT' && (selectedSession.status === 'DRAFT' || selectedSession.status === 'REJECTED') && (
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    router.push(`/input?assetId=${selectedSession.assetId}&testYear=${selectedSession.testYear}`);
                  }}
                  className="px-5 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  {selectedSession.status === 'DRAFT' ? 'Lanjutkan Edit' : 'Edit & Kirim Ulang'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

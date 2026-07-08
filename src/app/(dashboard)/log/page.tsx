'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  beforeData: string | null;
  afterData: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  actions: string[];
  entities: string[];
}

// Human-readable labels for actions
const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CREATE: { label: 'Menambahkan', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: 'add_circle' },
  UPDATE: { label: 'Mengubah', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: 'edit' },
  DELETE: { label: 'Menghapus', color: 'text-red-700 bg-red-50 border-red-200', icon: 'delete' },
  UPLOAD: { label: 'Mengunggah', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: 'upload_file' },
  SUBMIT: { label: 'Mengirim', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: 'send' },
  APPROVE: { label: 'Menyetujui', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: 'check_circle' },
  REJECT: { label: 'Menolak', color: 'text-red-700 bg-red-50 border-red-200', icon: 'cancel' },
  IMPORT: { label: 'Mengimpor', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: 'file_upload' },
};

// Human-readable entity names
const ENTITY_LABELS: Record<string, string> = {
  Ubp: 'UBP',
  Asset: 'Aset Trafo',
  TestSession: 'Sesi Pengujian',
  TestResult: 'Hasil Pengujian',
  ReportFile: 'File Laporan',
  ReportDirectory: 'Folder Laporan',
  Criteria: 'Kriteria',
  User: 'Pengguna',
};

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  QC: 'bg-amber-100 text-amber-700 border-amber-200',
  INPUT: 'bg-blue-100 text-blue-700 border-blue-200',
  VIEWER: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function LogPage() {
  const { data: session, status } = useSession();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<Filters>({ actions: [], entities: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded row for detail view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
      });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setPagination(result.data.pagination);
        setFilters(result.data.filters);
      } else {
        setErrorMsg(result.error || 'Gagal memuat log aktivitas.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Koneksi internet bermasalah atau server error.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, actionFilter, entityFilter, searchQuery]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLogs();
    }
  }, [status, fetchLogs]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getActionMeta = (action: string) => {
    return ACTION_LABELS[action] || { label: action, color: 'text-gray-700 bg-gray-50 border-gray-200', icon: 'info' };
  };

  const getEntityLabel = (entity: string) => {
    return ENTITY_LABELS[entity] || entity;
  };

  const parseJsonSafe = (str: string | null): Record<string, unknown> | null => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // Build a human-readable description of the log entry
  const getLogDescription = (log: AuditLogEntry): string => {
    const actionMeta = getActionMeta(log.action);
    const entityLabel = getEntityLabel(log.entity);
    const afterData = parseJsonSafe(log.afterData);
    const beforeData = parseJsonSafe(log.beforeData);

    const dataName = afterData?.name || beforeData?.name || '';
    const nameStr = dataName ? ` "${dataName}"` : '';

    return `${actionMeta.label} ${entityLabel}${nameStr}`;
  };

  if (status === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-primary text-[40px]">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Memuat profil sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            history
          </span>
          Log Aktivitas
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Riwayat seluruh aktivitas yang terjadi pada sistem SIAT, termasuk pengujian, validasi, pengelolaan laporan, dan perubahan master data.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-surface-border shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] select-none">
            search
          </span>
          <input
            type="text"
            placeholder="Cari nama user, aksi, atau entitas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-surface-border bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
          />
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-md border border-surface-border bg-white text-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="">Semua Aksi</option>
          {filters.actions.map((a) => (
            <option key={a} value={a}>{getActionMeta(a).label} ({a})</option>
          ))}
        </select>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-md border border-surface-border bg-white text-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="">Semua Entitas</option>
          {filters.entities.map((e) => (
            <option key={e} value={e}>{getEntityLabel(e)}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={() => fetchLogs()}
          className="px-3 py-2 bg-surface-container-low hover:bg-surface-container border border-surface-border rounded-md text-sm font-medium text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Muat Ulang
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] select-none">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
              progress_activity
            </span>
            <p className="text-on-surface-variant text-sm font-medium">Memuat log...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center select-none">
            <span className="material-symbols-outlined text-on-surface-variant/20 text-[56px] mb-2">
              history_toggle_off
            </span>
            <p className="text-on-surface font-semibold text-lg">Tidak Ada Log</p>
            <p className="text-on-surface-variant text-sm mt-1 max-w-sm">
              Belum ada aktivitas yang tercatat di sistem atau tidak ada log yang cocok dengan filter saat ini.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-container-low text-on-surface-variant text-xs font-mono font-medium uppercase select-none">
                    <th className="py-3 px-4 w-[180px]">Waktu</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Aksi</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-center w-[60px]">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-sm">
                  {logs.map((log) => {
                    const actionMeta = getActionMeta(log.action);
                    const isExpanded = expandedId === log.id;
                    const beforeData = parseJsonSafe(log.beforeData);
                    const afterData = parseJsonSafe(log.afterData);

                    return (
                      <tr key={log.id} className="group">
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-on-surface font-medium text-xs">{formatDate(log.createdAt)}</span>
                            <span className="text-on-surface-variant font-mono text-[11px]">{formatTime(log.createdAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-on-surface font-semibold text-sm">{log.userName}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border w-fit ${ROLE_COLORS[log.userRole] || ROLE_COLORS.VIEWER}`}>
                              {log.userRole}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${actionMeta.color}`}>
                            <span className="material-symbols-outlined text-[14px]">{actionMeta.icon}</span>
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span className="text-on-surface text-sm">{getLogDescription(log)}</span>
                        </td>
                        <td className="py-3 px-4 align-top text-center">
                          {(beforeData || afterData) && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="p-1 hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary rounded-md transition-all cursor-pointer"
                              title="Lihat Detail"
                            >
                              <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Detail Rows */}
            {expandedId && (() => {
              const log = logs.find((l) => l.id === expandedId);
              if (!log) return null;
              const beforeData = parseJsonSafe(log.beforeData);
              const afterData = parseJsonSafe(log.afterData);

              return (
                <div className="border-t border-surface-border bg-surface-container-low p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[16px]">data_object</span>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Detail Data</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/50 ml-auto">ID: {log.entityId}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beforeData && (
                      <div className="bg-red-50/50 border border-red-200/50 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Data Sebelum</p>
                        <pre className="text-xs text-red-800 font-mono overflow-auto whitespace-pre-wrap max-h-40">
                          {JSON.stringify(beforeData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {afterData && (
                      <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Data Sesudah</p>
                        <pre className="text-xs text-emerald-800 font-mono overflow-auto whitespace-pre-wrap max-h-40">
                          {JSON.stringify(afterData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Pagination */}
            <div className="border-t border-surface-border px-4 py-3 flex items-center justify-between bg-surface-container-low text-sm">
              <span className="text-on-surface-variant text-xs">
                Menampilkan {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} log
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-medium text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  // Show pages around current
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
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
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-medium text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

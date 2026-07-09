'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel } from '@/types';

// Fetch helper
async function fetchAssetDetail(assetId: string, year?: string, sessionId?: string) {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (sessionId) params.append('sessionId', sessionId);
  const res = await fetch(`/api/assets/${assetId}/detail?${params.toString()}`);
  if (!res.ok) throw new Error('Gagal mengambil detail aset');
  const json = await res.json();
  return json.data;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = typeof params?.assetId === 'string' ? params.assetId : '';
  const selectedSessionId = searchParams?.get('sessionId') || '';
  const selectedYear = searchParams?.get('year') || '';

  // Accordion state for test type sections
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const toggleTestExpand = (testTypeId: string) => {
    setExpandedTests((prev) => ({
      ...prev,
      [testTypeId]: !prev[testTypeId],
    }));
  };

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset-detail', assetId, selectedSessionId, selectedYear],
    queryFn: () => fetchAssetDetail(assetId, selectedYear, selectedSessionId),
    enabled: !!assetId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-8 text-center bg-white border border-surface-border rounded-xl max-w-lg mx-auto mt-20">
        <span className="material-symbols-outlined text-status-bad text-5xl mb-4">error</span>
        <h3 className="text-xl font-bold text-on-surface mb-2">Aset Tidak Ditemukan</h3>
        <p className="text-on-surface-variant mb-6">Terjadi kesalahan atau aset yang Anda cari tidak terdaftar.</p>
        <Link href="/dashboard" className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold text-sm">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-[1440px] mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Asset Header (Bento Style) */}
      <div className="grid grid-cols-12 gap-4 mb-1 items-start">
        {/* Left: Asset Info Card */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {asset.equipmentType}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">ID: {asset.id}</span>
                {asset.selectedTestYear && (
                  <span className="text-xs font-semibold text-outline">
                    {(!selectedSessionId || asset.selectedSessionId === asset.latestSessionId)
                      ? `Tahun Terkini: ${asset.selectedTestYear}`
                      : `Tahun Uji: ${asset.selectedTestYear}`}
                  </span>
                )}
              </div>
              {/* Year Selector */}
              {asset.availableSessions && asset.availableSessions.length > 1 && (
                <select
                  value={asset.selectedSessionId || ''}
                  onChange={(e) => {
                    const sId = e.target.value;
                    const found = asset.availableSessions.find((s: any) => s.id === sId);
                    if (found) {
                      router.push(`/unit/${assetId}?sessionId=${found.id}`);
                    }
                  }}
                  className="bg-primary/5 border border-primary/20 rounded-full font-mono text-xs font-bold px-3 py-1 pr-7 cursor-pointer text-primary focus:ring-1 focus:ring-primary/30 focus:outline-none"
                >
                  {asset.availableSessions.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      Tahun {s.year}{s.id === asset.latestSessionId ? ' (Terbaru)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <h2 className="text-3xl font-bold text-on-surface mb-2 leading-tight tracking-tight">
              {asset.name}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-surface-border/50">
            {[
              { label: 'Manufacture', value: asset.manufacture || '—' },
              { label: 'Type', value: asset.type || '—' },
              { label: 'Serial Number', value: asset.serialNumber || '—' },
              { label: 'Tahun Buat', value: asset.mfgYear ? String(asset.mfgYear) : '—' },
              { label: 'Vector Group', value: asset.vectorGroup || '—' },
              { label: 'Cooling Method', value: asset.coolingMethod || '—' },
              { label: 'Rated Power', value: asset.ratedPower || '—' },
              { label: 'Frequency', value: asset.frequency || '—' },
              { label: 'HV Side', value: asset.hvSide || '—' },
              { label: 'HV Rated Current', value: asset.hvRatedCurrent || '—' },
              { label: 'LV Side', value: asset.lvSide || '—' },
              { label: 'LV Rated Current', value: asset.lvRatedCurrent || '—' },

            ].map((item) => (
              <div 
                key={item.label} 
                className="flex flex-col px-3 py-1.5 rounded-lg border text-xs bg-surface-container-low border-surface-border"
              >
                <span className="text-[9px] uppercase font-bold text-on-surface-variant/60 tracking-wider mb-0.5">{item.label}</span>
                <span className="font-semibold text-on-surface truncate" title={String(item.value)}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Trend Chart Card (Raised!) */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-on-surface">Tren Kondisi Unit Ini</h4>
          </div>
          <div className="h-64 flex flex-col justify-between relative">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <line x1="0" y1="40" x2="400" y2="40" stroke="#E2E8F0" strokeDasharray="4" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="#E2E8F0" strokeDasharray="4" />
              <line x1="0" y1="160" x2="400" y2="160" stroke="#E2E8F0" strokeDasharray="4" />
              <path d="M 0 50 L 80 45 L 160 60 L 240 85 L 320 110 L 400 135" fill="none" stroke="#0F3D91" strokeWidth="3" />
              <path d="M 0 70 L 80 75 L 160 80 L 240 100 L 320 120 L 400 115" fill="none" stroke="#EAB308" strokeWidth="2" strokeDasharray="4" />
              <circle cx="80" cy="45" r="4" fill="#0F3D91" />
              <circle cx="160" cy="60" r="4" fill="#0F3D91" />
              <circle cx="240" cy="85" r="4" fill="#0F3D91" />
              <circle cx="320" cy="110" r="4" fill="#0F3D91" />
              <circle cx="400" cy="135" r="5" fill="#EF4444" stroke="white" strokeWidth="2" />
            </svg>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant">
              <span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-primary" />
              <span className="text-[11px] text-on-surface-variant font-medium">Tren Kondisi</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 border-t border-dashed border-status-fair" />
              <span className="text-[11px] text-on-surface-variant font-medium">Batas Aman</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Main: Accordions */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Status Kondisi per Jenis Pengujian</h3>
          </div>

          {asset.testTypeStatuses.map((test: any) => {
            const hasParameters = test.parameters && test.parameters.length > 0;
            const isExpanded = !!expandedTests[test.testTypeId];

            return (
              <div
                key={test.testTypeId}
                className="bg-white rounded-lg overflow-hidden border border-surface-border"
              >
                {/* Clickable Header */}
                <button
                  onClick={() => toggleTestExpand(test.testTypeId)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-surface-container-low transition-colors text-left focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-on-surface text-base">{test.testTypeName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge judgement={test.judgement} size="sm" />
                    {hasParameters && (
                      <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}>
                        expand_more
                      </span>
                    )}
                  </div>
                </button>

                {/* Collapsible Parameter Table */}
                {hasParameters && isExpanded && (
                  <div className="p-4 bg-white border-t border-surface-border animate-fade-in">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-[13px] border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low">
                            <th className="p-3 font-bold text-on-surface-variant border-b border-surface-border">Parameter</th>
                            <th className="p-3 font-bold text-on-surface-variant border-b border-surface-border text-center">Value</th>
                            <th className="p-3 font-bold text-on-surface-variant border-b border-surface-border text-center">Satuan</th>
                            <th className="p-3 font-bold text-on-surface-variant border-b border-surface-border text-center">Kondisi (Judgement)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {test.parameters.map((param: any, idx: number) => (
                            <tr key={param.parameterId} className={idx % 2 === 1 ? 'bg-surface-background' : ''}>
                              <td className="p-3 border-b border-surface-border font-bold">{param.parameterName}</td>
                              <td className="p-3 border-b border-surface-border text-center font-mono">
                                {param.isNotApplicable ? 'N/A' : param.value !== null ? param.value : '—'}
                              </td>
                              <td className="p-3 border-b border-surface-border text-center text-on-surface-variant">
                                {param.unit || '—'}
                              </td>
                              <td className="p-3 border-b border-surface-border text-center">
                                {param.judgement ? (
                                  <StatusBadge judgement={param.judgement} size="sm" showIcon={false} />
                                ) : (
                                  <span className="text-on-surface-variant/40">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* Status Kerusakan per Mekanisme */}
          <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm">
            <h4 className="font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">healing</span>
              Status Kerusakan per Mekanisme
            </h4>
            <p className="text-[11px] text-on-surface-variant mb-4">
              Indikasi kerusakan dihitung berdasarkan hasil pengukuran terverifikasi terbaru.
            </p>
            <div className="space-y-2">
              {asset.damageMechanisms && asset.damageMechanisms.length > 0 ? (
                asset.damageMechanisms.map((dm: any) => {
                  const score = dm.score;
                  let statusLabel = 'GOOD';
                  let colorClasses = 'bg-green-50 text-green-700 border-green-200';

                  if (score === 4) {
                    statusLabel = 'FAIR';
                    colorClasses = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                  } else if (score === 2) {
                    statusLabel = 'POOR';
                    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
                  } else if (score === 1) {
                    statusLabel = 'BAD';
                    colorClasses = 'bg-red-50 text-red-700 border-red-200';
                  } else if (score === null) {
                    statusLabel = 'N/A';
                    colorClasses = 'bg-surface-container text-outline border-surface-border';
                  }

                  return (
                    <div key={dm.name} className="flex items-center justify-between py-2 border-b border-surface-border/50 text-xs">
                      <span className="font-medium text-on-surface">{dm.name}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[9px] uppercase tracking-wider ${colorClasses}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-on-surface-variant">
                  Tidak ada data indikasi kerusakan.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm space-y-3">
            <h4 className="font-bold text-on-surface mb-2">Tindakan Cepat</h4>
            <Link 
              href="/input"
              className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add</span> Input Data Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

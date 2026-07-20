'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || 'VIEWER';
  const isViewer = userRole === 'VIEWER';
  const isInputUser = userRole === 'INPUT';

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
      <div className="grid grid-cols-12 gap-4 items-stretch">
        {/* Left: Asset Info Card */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {asset.equipmentType}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">ID: {asset.id}</span>
                {asset.selectedTestYear && selectedSessionId && asset.selectedSessionId !== asset.latestSessionId && (
                  <span className="text-xs font-semibold text-outline">
                    Tahun Uji: {asset.selectedTestYear}
                    {asset.selectedSessionEvent && asset.selectedSessionEvent !== 'default' ? ` (${asset.selectedSessionEvent})` : ''}
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
                      Tahun {s.year}
                      {s.event && s.event !== 'default' ? ` (${s.event})` : ''}
                      {s.id === asset.latestSessionId ? ' (Terbaru)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <h2 className="text-3xl font-bold text-on-surface mb-2 leading-tight tracking-tight">
              {asset.unitName || ''} - {asset.name}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-surface-border/50">
            {[
              { label: 'Type', value: asset.type || '—' },
              { label: 'Serial Number', value: asset.serialNumber || '—' },
              { label: 'Tahun Buat', value: asset.mfgYear ? String(asset.mfgYear) : '—' },
              { label: 'Manufacture', value: asset.vectorGroup || '—' },
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h4 className="font-bold text-on-surface text-sm">Tren Hasil Pengujian Aset</h4>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded border border-surface-border">
              <div className="flex items-center gap-0.5">
                <div className="w-2 h-2 rounded-xs bg-status-good" />
                <span className="text-[8px] font-bold text-on-surface-variant uppercase">G</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-2 h-2 rounded-xs bg-status-fair" />
                <span className="text-[8px] font-bold text-on-surface-variant uppercase">F</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-2 h-2 rounded-xs bg-status-poor" />
                <span className="text-[8px] font-bold text-on-surface-variant uppercase">P</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-2 h-2 rounded-xs bg-status-bad" />
                <span className="text-[8px] font-bold text-on-surface-variant uppercase">B</span>
              </div>
            </div>
          </div>
          
          <div className="h-44 flex items-end justify-around relative pt-4 pb-6 px-1 border-b border-surface-border">
            {/* Background Grid Lines */}
            <div className="absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-surface-border/40" />
              <div className="w-full border-t border-surface-border/40" />
              <div className="w-full border-t border-surface-border/40" />
            </div>

            {/* Trend Columns Group */}
            {asset?.trend && asset.trend.length > 0 ? (
              (() => {
                const maxCount = Math.max(
                  ...asset.trend.map((item: any) => 
                    Math.max(item.GOOD || 0, item.FAIR || 0, item.POOR || 0, item.BAD || 0)
                  ), 
                  1
                );
                return asset.trend.map((t: any) => (
                  <div key={t.year} className="flex flex-col items-center gap-1 w-1/4 z-10">
                    {/* Columns container */}
                    <div className="flex items-end justify-center gap-1.5 h-28 w-full">
                      {/* Good Column */}
                      <div 
                        style={{ height: `${((t.GOOD || 0) / maxCount) * 100}%` }} 
                        className="w-2.5 bg-status-good rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          GOOD: {t.GOOD || 0}
                        </div>
                      </div>

                      {/* Fair Column */}
                      <div 
                        style={{ height: `${((t.FAIR || 0) / maxCount) * 100}%` }} 
                        className="w-2.5 bg-status-fair rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          FAIR: {t.FAIR || 0}
                        </div>
                      </div>

                      {/* Poor Column */}
                      <div 
                        style={{ height: `${((t.POOR || 0) / maxCount) * 100}%` }} 
                        className="w-2.5 bg-status-poor rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          POOR: {t.POOR || 0}
                        </div>
                      </div>

                      {/* Bad Column */}
                      <div 
                        style={{ height: `${((t.BAD || 0) / maxCount) * 100}%` }} 
                        className="w-2.5 bg-status-bad rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          BAD: {t.BAD || 0}
                        </div>
                      </div>
                    </div>
                    
                    {/* Year Label */}
                    <span className="font-mono text-[10px] font-bold text-on-surface">{t.year}</span>
                  </div>
                ));
              })()
            ) : (
              <div className="w-full text-center py-10 text-on-surface-variant font-medium text-xs">
                Tidak ada data tren pengujian.
              </div>
            )}
          </div>
          <div className="mt-2 text-[9px] text-center text-on-surface-variant/80 italic">
            *Jumlah jenis pengujian berdasarkan status kondisi per tahun
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="my-4 h-2" />

      {/* Bottom Content Grid */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left Column: Test Status Accordions */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Hasil Pengujian {asset.selectedTestYear ? `(Tahun ${asset.selectedTestYear})` : ''}
          </h3>

          {asset.testTypeStatuses.map((test: any) => {
            const hasParameters = test.parameters && test.parameters.length > 0;
            const isExpanded = !!expandedTests[test.testTypeId];

            return (
              <div
                key={test.testTypeId}
                className="bg-white rounded-lg overflow-hidden border border-surface-border shadow-sm"
              >
                {/* Clickable Header */}
                <button
                  onClick={() => toggleTestExpand(test.testTypeId)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-surface-container-low transition-colors text-left focus:outline-none cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface text-xs">{test.testTypeName}</span>
                    {test.standard && (
                      <span className="text-[10px] text-on-surface-variant font-mono mt-0.5 font-medium uppercase tracking-wider">
                        Std: {test.standard}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge judgement={test.judgement} size="sm" />
                    {hasParameters && (
                      <span className={`material-symbols-outlined text-sm text-on-surface-variant transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}>
                        expand_more
                      </span>
                    )}
                  </div>
                </button>

                {/* Collapsible Parameter Table */}
                {hasParameters && isExpanded && (
                  <div className="p-3 bg-white border-t border-surface-border animate-fade-in">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">
                            <th className="p-2 font-bold border-b border-surface-border">Parameter</th>
                            <th className="p-2 font-bold border-b border-surface-border text-center">Value</th>
                            <th className="p-2 font-bold border-b border-surface-border text-center">Satuan</th>
                            <th className="p-2 font-bold border-b border-surface-border text-center">Kondisi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {test.parameters.map((param: any, idx: number) => (
                            <tr key={param.parameterId} className={idx % 2 === 1 ? 'bg-surface-background' : ''}>
                              <td className="p-2 border-b border-surface-border font-bold text-on-surface">{param.parameterName}</td>
                              <td className="p-2 border-b border-surface-border text-center font-mono font-semibold text-primary">
                                {param.displayValue || (param.isNotApplicable ? 'N/A' : param.value !== null ? param.value : '—')}
                              </td>
                              <td className="p-2 border-b border-surface-border text-center text-on-surface-variant">
                                {param.unit || '—'}
                              </td>
                              <td className="p-2 border-b border-surface-border text-center">
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

        {/* Right Column: Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          {/* Kondisi Mekanisme Kerusakan */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Kondisi Mekanisme Kerusakan
          </h3>
          <div className="bg-white p-3.5 rounded-lg border border-surface-border shadow-sm !mt-2">
            <p className="text-[10px] text-on-surface-variant mb-3">
              Indikasi kerusakan berdasarkan hasil pengukuran terverifikasi terbaru.
            </p>
            <div className="space-y-1.5">
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
                    <div key={dm.name} className="flex items-center justify-between py-1.5 border-b border-surface-border/50 text-xs">
                      <span className="font-medium text-on-surface">{dm.name}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[8px] uppercase tracking-wider ${colorClasses}`}>
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
          {isInputUser && (
            <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm space-y-3">
              <h4 className="font-bold text-on-surface mb-2">Tindakan Cepat</h4>
              <Link 
                href={`/input?assetId=${assetId}&testYear=${asset.selectedTestYear || new Date().getFullYear()}`}
                className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span> Input Data Baru
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

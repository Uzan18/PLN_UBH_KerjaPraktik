'use client';

import { use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel } from '@/types';

// Fetch helper
async function fetchAssetDetail(assetId: string) {
  const res = await fetch(`/api/assets/${assetId}/detail`);
  if (!res.ok) throw new Error('Gagal mengambil detail aset');
  const json = await res.json();
  return json.data;
}

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = typeof params?.assetId === 'string' ? params.assetId : '';

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset-detail', assetId],
    queryFn: () => fetchAssetDetail(assetId),
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
      <div className="grid grid-cols-12 gap-4 mb-8">
        {/* Left: Asset Info */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                {asset.equipmentType}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">ID: {asset.id}</span>
            </div>
            <h2 className="text-3xl font-bold text-on-surface mb-6 leading-tight tracking-tight">
              {asset.name}
            </h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Serial Number', value: asset.serialNumber || '—' },
              { label: 'Vector Group', value: asset.vectorGroup || '—' },
              { label: 'Tahun Buat', value: asset.mfgYear ? String(asset.mfgYear) : '—' },
              { label: 'Tahun Uji Terakhir', value: asset.lastTestYear ? String(asset.lastTestYear) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col px-4 py-2 bg-surface-container-low rounded-lg border border-surface-border">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">{item.label}</span>
                <span className="font-semibold text-on-surface">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Health Score */}
        <div className="col-span-12 lg:col-span-4 bg-primary text-white p-6 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
          </div>
          <p className="text-white/80 font-medium mb-1">Kesehatan Asset Keseluruhan</p>
          <h3 className="text-[56px] font-bold leading-none mb-2">
            {asset.overallScore !== null ? asset.overallScore : '—'}
            {asset.overallScore !== null && <span className="text-2xl opacity-70">/100</span>}
          </h3>
          <div className="px-4 py-1.5 bg-status-fair text-on-secondary-container rounded-full font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            {asset.overallJudgement} CONDITION
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
            return (
              <div
                key={test.testTypeId}
                className="bg-white rounded-lg overflow-hidden border border-surface-border"
              >
                <div className="w-full flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: test.judgement === 'GOOD' ? '#22C55E15' : test.judgement === 'BAD' ? '#EF444415' : '#EAB30815',
                        color: test.judgement === 'GOOD' ? '#22C55E' : test.judgement === 'BAD' ? '#EF4444' : '#EAB308',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {test.judgement === 'BAD' ? 'error' : 'bolt'}
                      </span>
                    </div>
                    <span className="font-semibold text-on-surface">{test.testTypeName}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <StatusBadge judgement={test.judgement} size="sm" />
                  </div>
                </div>

                {hasParameters && (
                  <div className="p-4 bg-white border-t border-surface-border">
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
          {/* Trend Chart */}
          <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm">
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
                <span className="text-[11px] text-on-surface-variant">Overall Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 border-t border-dashed border-status-fair" />
                <span className="text-[11px] text-on-surface-variant">Asset Average</span>
              </div>
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

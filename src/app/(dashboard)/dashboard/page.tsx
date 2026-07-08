'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel, MatrixRow, ApiResponse } from '@/types';

const TEST_TYPE_ABBREVIATIONS: Record<string, string> = {
  'Insulation Resistance': 'IR',
  'Polarity Index': 'PI',
  'Turn to Turn Ratio': 'TTR',
  'Winding Resistance HV': 'WR-HV',
  'Winding Resistance LV': 'WR-LV',
  'Excitation Current': 'EC',
  'SFRA Open HV': 'SFRA-OHV',
  'SFRA Open LV': 'SFRA-OLV',
  'SFRA Shorted HV': 'SFRA-SHV',
  'SFRA Shorted LV': 'SFRA-SLV',
  'Tan Delta Winding': 'TD-W',
  'Tan Delta Bushing': 'TD-B',
  'Watt Loss Bushing': 'WL-B',
  'Grounding Resistance': 'GR',
  'Dirana Moisture': 'DM',
  'Oil Conductivity': 'OC',
  'Arrester Grounding': 'Arr-GR',
  'Arrester Insulation Resistance': 'Arr-IR',
  'Arrester Leakage Current': 'Arr-LC',
  'Arrester Watt Loss': 'Arr-WL',
};

function getAbbreviation(name: string): string {
  return TEST_TYPE_ABBREVIATIONS[name] || name;
}

// Fetch helpers
async function fetchSummary(year: string, ubpId: string, assetId: string) {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (ubpId) params.append('ubpId', ubpId);
  if (assetId) params.append('assetId', assetId);
  
  const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
  if (!res.ok) throw new Error('Gagal mengambil data ringkasan');
  const json = await res.json();
  return json.data;
}

async function fetchMatrix(year: string, ubpId: string, assetId: string) {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (ubpId) params.append('ubpId', ubpId);
  if (assetId) params.append('assetId', assetId);

  const res = await fetch(`/api/dashboard/matrix?${params.toString()}`);
  if (!res.ok) throw new Error('Gagal mengambil data matriks');
  const json = await res.json();
  return json.data;
}

async function fetchUbps() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP');
  const json = await res.json();
  return json.data;
}

export default function DashboardPage() {
  const router = useRouter();
  
  // State filters
  const [year, setYear] = useState('');
  const [ubpId, setUbpId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [matrixPage, setMatrixPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setMatrixPage(1);
  }, [year, ubpId, assetId]);

  // Queries
  const { data: ubps, isLoading: isUbpsLoading } = useQuery({
    queryKey: ['ubps'],
    queryFn: fetchUbps,
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['summary', year, ubpId, assetId],
    queryFn: () => fetchSummary(year, ubpId, assetId),
  });

  const { data: matrix, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['matrix', year, ubpId, assetId],
    queryFn: () => fetchMatrix(year, ubpId, assetId),
  });

  const isLoading = isSummaryLoading || isMatrixLoading || isUbpsLoading;

  // Find selected UBP to list its assets
  const selectedUbp = ubps?.find((u: any) => u.id === ubpId);

  // Pagination variables for the matrix table
  const PAGE_SIZE = 10;
  const totalRows = matrix?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const paginatedRows = matrix?.rows
    ? matrix.rows.slice((matrixPage - 1) * PAGE_SIZE, matrixPage * PAGE_SIZE)
    : [];

  // Handle row click -> drill down to asset page
  function handleRowClick(assetId: string) {
    router.push(`/unit/${assetId}`);
  }

  // Handle export
  function handleExport() {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (ubpId) params.append('ubpId', ubpId);
    if (assetId) params.append('assetId', assetId);
    window.open(`/api/export/excel?${params.toString()}`, '_blank');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-surface-container-low px-4 py-2 rounded-md border border-surface-border w-fit">
        {/* Tahun Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">Tahun:</span>
          {(() => {
            const currentYear = new Date().getFullYear();
            const defaultYears = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];
            const yearsList = Array.from(new Set([
              ...defaultYears,
              ...(summary?.availableYears || [])
            ])).sort((a, b) => b.localeCompare(a));

            return (
              <select 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 cursor-pointer text-on-surface"
              >
                <option value="">Semua Tahun (All)</option>
                {yearsList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            );
          })()}
        </div>

        <div className="h-4 w-px bg-surface-border" />

        {/* UBP Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">UBP:</span>
          <select 
            value={ubpId}
            onChange={(e) => {
              setUbpId(e.target.value);
              setAssetId(''); // Reset asset filter on UBP change
            }}
            className="bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 cursor-pointer text-on-surface"
          >
            <option value="">Semua UBP</option>
            {ubps?.map((ubp: { id: string; name: string }) => (
              <option key={ubp.id} value={ubp.id}>{ubp.name}</option>
            ))}
          </select>
        </div>

        {/* Asset Filter (Visible when UBP is selected) */}
        {ubpId && selectedUbp?.assets && selectedUbp.assets.length > 0 && (
          <>
            <div className="h-4 w-px bg-surface-border" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tracking-wider text-on-surface-variant">Aset:</span>
              <select 
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 cursor-pointer text-on-surface"
              >
                <option value="">Semua Aset</option>
                {selectedUbp.assets.map((asset: { id: string; name: string; equipmentType: string }) => (
                  <option key={asset.id} value={asset.id}>{asset.name} ({asset.equipmentType})</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KpiCard
          label="Total Aset"
          value={isLoading ? '...' : summary?.totalAssets ?? 0}
          icon="electrical_services"
          variant="primary"
        />
        <KpiCard
          label="Total Record"
          value={isLoading ? '...' : summary?.totalRecords ?? 0}
          icon="description"
          variant="default"
        />
        <KpiCard
          label="Kondisi Good"
          value={isLoading ? '...' : summary?.goodCount ?? 0}
          icon="check_circle"
          variant="good"
        />
        <KpiCard
          label="Kondisi Fair"
          value={isLoading ? '...' : summary?.fairCount ?? 0}
          icon="info"
          variant="fair"
        />
        <KpiCard
          label="Kondisi Poor"
          value={isLoading ? '...' : summary?.poorCount ?? 0}
          icon="warning"
          variant="poor"
        />
        <KpiCard
          label="Kondisi Bad"
          value={isLoading ? '...' : summary?.badCount ?? 0}
          icon="cancel"
          variant="bad"
        />
      </section>

      {/* Assessment Matrix Table */}
      <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-on-surface">
              Kondisi Trafo per Unit x Jenis Pengujian
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Ringkasan status pengujian transformer terbaru per unit pembangkit.
            </p>
          </div>
          <button 
            onClick={handleExport}
            className="bg-white border border-primary text-primary px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-surface-container-low transition-colors active:opacity-80"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !matrix?.rows || matrix.rows.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant font-medium">
              Tidak ada data pengukuran tervalidasi pada filter yang dipilih.
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase sticky left-0 bg-surface-container-low z-20 border-r border-b border-surface-border min-w-[200px] max-w-[200px] w-[200px]">
                    Unit Pembangkit
                  </th>
                  <th
                    style={{ left: '200px' }}
                    className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[100px] max-w-[100px] w-[100px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border"
                  >
                    Equipment
                  </th>
                  <th
                    style={{ left: '300px' }}
                    className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[80px] max-w-[80px] w-[80px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border"
                  >
                    Tahun Uji
                  </th>
                  {matrix?.testTypeHeaders.map((h: string) => (
                    <th
                      key={h}
                      title={h}
                      className="px-1 py-3 font-mono text-[10px] tracking-tight font-bold text-on-surface-variant uppercase text-center min-w-[52px] cursor-help hover:text-primary transition-colors border-r border-b border-surface-border"
                    >
                      {getAbbreviation(h)}
                    </th>
                  ))}
                  <th className="px-2 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase text-center w-[60px] border-b border-surface-border">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row: MatrixRow, idx: number) => (
                  <tr
                    key={row.assetId}
                    onClick={() => handleRowClick(row.assetId)}
                    className={`hover:bg-surface-container-low transition-colors group cursor-pointer ${
                      idx % 2 === 1 ? 'bg-surface-background' : ''
                    }`}
                  >
                    <td
                      className={`px-4 py-2 text-[12px] font-bold sticky left-0 z-10 border-r border-b border-surface-border min-w-[200px] max-w-[200px] w-[200px] ${
                        idx % 2 === 1
                          ? 'bg-surface-background group-hover:bg-surface-container-low'
                          : 'bg-white group-hover:bg-surface-container-low'
                      }`}
                    >
                      <div>
                        <div className="truncate max-w-[160px]">{row.assetName}</div>
                        <div className="text-[9px] font-mono text-on-surface-variant font-normal uppercase truncate max-w-[160px]">{row.ubpName}</div>
                      </div>
                    </td>
                    <td
                      style={{ left: '200px' }}
                      className={`px-4 py-2 text-center text-[12px] text-on-surface border-r border-b border-surface-border font-medium sticky z-10 min-w-[100px] max-w-[100px] w-[100px] truncate ${
                        idx % 2 === 1
                          ? 'bg-surface-background group-hover:bg-surface-container-low'
                          : 'bg-white group-hover:bg-surface-container-low'
                      }`}
                    >
                      {row.equipmentType || '—'}
                    </td>
                    <td
                      style={{ left: '300px' }}
                      className={`px-4 py-2 text-center text-[12px] text-on-surface-variant border-r border-b border-surface-border font-mono sticky z-10 min-w-[80px] max-w-[80px] w-[80px] ${
                        idx % 2 === 1
                          ? 'bg-surface-background group-hover:bg-surface-container-low'
                          : 'bg-white group-hover:bg-surface-container-low'
                      }`}
                    >
                      {row.testYear || '—'}
                    </td>
                    {matrix.testTypeHeaders.map((header: string) => {
                      const cell = row.cells.find((c) => c.testTypeName === header);
                      return (
                        <td key={header} className="px-1 py-2 text-center border-r border-b border-surface-border">
                          {cell ? (
                            <StatusBadge judgement={cell.judgement} size="sm" iconOnly />
                          ) : (
                            <span className="text-on-surface-variant/20 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center border-b border-surface-border">
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-sm">
                        chevron_right
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && matrix?.rows && (
          <div className="px-6 py-3 border-t border-surface-border flex justify-between items-center bg-surface-container-low">
            <span className="font-mono text-xs text-on-surface-variant">
              Showing {totalRows > 0 ? (matrixPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(totalRows, matrixPage * PAGE_SIZE)} of {totalRows} Units
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setMatrixPage((p) => Math.max(1, p - 1)); }}
                  disabled={matrixPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={(e) => { e.stopPropagation(); setMatrixPage(pNum); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      pNum === matrixPage
                        ? 'bg-primary text-white border border-primary'
                        : 'border border-surface-border bg-white text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  onClick={(e) => { e.stopPropagation(); setMatrixPage((p) => Math.min(totalPages, p + 1)); }}
                  disabled={matrixPage >= totalPages}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dynamic Damage Mechanism Summary Table (Full Width) */}
      <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-on-surface">
              Rekap Indikasi Kerusakan per Mekanisme (Damage Mechanism)
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Mekanisme kegagalan trafo yang terdeteksi berdasarkan kriteria penilaian terendah per jenis uji.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase border-b border-r border-surface-border w-[60px] text-center">
                  No
                </th>
                <th className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase border-b border-r border-surface-border min-w-[200px]">
                  Mekanisme Kerusakan
                </th>
                <th className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase border-b border-r border-surface-border text-center w-[150px]">
                  Jumlah Temuan
                </th>
                <th className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase border-b border-surface-border">
                  Unit dengan Temuan
                </th>
              </tr>
            </thead>
            <tbody>
              {summary?.damageMechanisms?.map((dm: any, idx: number) => (
                <tr 
                  key={dm.name} 
                  className={`hover:bg-surface-container-low transition-colors ${
                    idx % 2 === 1 ? 'bg-surface-background' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-3 text-center font-mono text-[12px] text-on-surface-variant border-b border-r border-surface-border">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-bold text-on-surface border-b border-r border-surface-border">
                    {dm.name}
                  </td>
                  <td className="px-4 py-3 text-center border-b border-r border-surface-border">
                    <span className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                      dm.count > 0 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {dm.count} Asset
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] border-b border-surface-border">
                    {dm.affectedAssets && dm.affectedAssets.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dm.affectedAssets.map((asset: { id: string; name: string }) => (
                          <button
                            key={asset.id}
                            onClick={() => router.push(`/unit/${asset.id}`)}
                            className="px-2 py-1 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-[11px] rounded-md transition-all active:scale-95 border border-primary/20 cursor-pointer"
                          >
                            {asset.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!summary?.damageMechanisms || summary.damageMechanisms.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-on-surface-variant font-medium">
                    Tidak ada data mekanisme kerusakan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart: Rekap by Damage Mechanism */}
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-xl font-semibold text-on-surface">
                Rekap by Damage Mechanism
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Proporsi indikasi kerusakan yang terdeteksi (Top 4).
              </p>
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>

          <div className="flex items-center justify-around gap-4 h-full">
            <div className="relative w-40 h-40 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80" cy="80" r="66"
                  fill="transparent" stroke="#e7eeff"
                  strokeWidth="20"
                />
                {(() => {
                  let accumulated = 0;
                  const topDms = summary?.damageMechanisms?.slice(0, 4) || [];
                  const totalCount = topDms.reduce((s: number, d: any) => s + d.count, 0);
                  const circumference = 2 * Math.PI * 66; // 414.69
                  
                  return topDms.map((dm: any, idx: number) => {
                    if (dm.count === 0 || totalCount === 0) return null;
                    const colors = ['#00286a', '#ffbb16', '#EF4444', '#22C55E'];
                    const color = colors[idx % colors.length];
                    const share = (dm.count / totalCount) * 100;
                    const strokeLen = (share / 100) * circumference;
                    const strokeOffset = circumference - strokeLen;
                    const rotation = (accumulated / 100) * 360 - 90;
                    accumulated += share;

                    return (
                      <circle
                        key={dm.name}
                        cx="80" cy="80" r="66"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="20"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        transform={`rotate(${rotation} 80 80)`}
                        className="transition-all duration-1000"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold leading-none">
                  {(summary?.damageMechanisms || []).reduce((s: number, d: any) => s + d.count, 0)}
                </span>
                <span className="font-mono text-[9px] text-on-surface-variant uppercase mt-1 tracking-wider">
                  TEMUAN
                </span>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 max-w-[280px] w-full">
              {(() => {
                const topDms = summary?.damageMechanisms?.slice(0, 4) || [];
                const colors = ['#00286a', '#ffbb16', '#EF4444', '#22C55E'];
                
                return topDms.map((dm: any, idx: number) => (
                  <LegendItem
                    key={dm.name}
                    color={colors[idx % colors.length]}
                    label={dm.name}
                    value={`${dm.count} (${dm.percentage}%)`}
                  />
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Line Chart: Tren Kondisi per Tahun */}
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <h4 className="text-xl font-semibold text-on-surface">
              Tren Kondisi per Tahun
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-status-good" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Good
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-status-bad" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Critical
                </span>
              </div>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-end justify-between px-4 pb-8">
            <div className="absolute inset-0 pt-6 pb-12 px-10 flex items-end">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,80 Q25,70 50,40 T100,20 L100,100 L0,100 Z"
                  fill="rgba(34, 197, 94, 0.1)"
                  stroke="none"
                />
                <path
                  d="M0,80 Q25,70 50,40 T100,20"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2"
                />
                <path
                  d="M0,90 Q25,85 50,70 T100,60 L100,100 L0,100 Z"
                  fill="rgba(239, 68, 68, 0.05)"
                  stroke="none"
                />
                <path
                  d="M0,90 Q25,85 50,70 T100,60"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                />
              </svg>
            </div>
            {/* X-Axis Labels */}
            <div className="flex w-full justify-between mt-auto absolute bottom-4 left-0 px-10 font-mono text-xs text-on-surface-variant">
              <span>2020</span>
              <span>2021</span>
              <span>2022</span>
              <span>2023</span>
              <span>2024</span>
            </div>
            {/* Grid Lines */}
            <div className="absolute left-10 inset-y-6 w-full flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-surface-border/50" />
              <div className="w-full border-t border-surface-border/50" />
              <div className="w-full border-t border-surface-border/50" />
              <div className="w-full border-t border-surface-border/50" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs py-1 border-b border-surface-border/30 last:border-0">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
        <span className="text-on-surface-variant font-medium leading-relaxed">{label}</span>
      </div>
      <span className="font-mono font-bold text-on-surface shrink-0 pt-0.5 whitespace-nowrap">{value}</span>
    </div>
  );
}

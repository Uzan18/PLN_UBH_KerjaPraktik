'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel, MatrixRow, ApiResponse } from '@/types';
import { FilterSelect } from '@/components/dashboard/FilterSelect';

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
async function fetchSummary(year: string, ubpId: string, unitId: string, equipmentType: string) {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (ubpId) params.append('ubpId', ubpId);
  if (unitId) params.append('unitId', unitId);
  if (equipmentType) params.append('equipmentType', equipmentType);
  
  const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
  if (!res.ok) throw new Error('Gagal mengambil data ringkasan');
  const json = await res.json();
  return json.data;
}

async function fetchMatrix(year: string, ubpId: string, unitId: string, equipmentType: string) {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (ubpId) params.append('ubpId', ubpId);
  if (unitId) params.append('unitId', unitId);
  if (equipmentType) params.append('equipmentType', equipmentType);

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
  const [ubpId, setUbpId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [year, setYear] = useState('');
  const [matrixPage, setMatrixPage] = useState(1);
  const [showAllDms, setShowAllDms] = useState(false);

  // Reset dependents when parent filters change
  useEffect(() => {
    setUnitId('');
  }, [ubpId]);

  // Reset page when filters change
  useEffect(() => {
    setMatrixPage(1);
  }, [year, ubpId, unitId, equipmentType]);

  // Queries
  const { data: ubps, isLoading: isUbpsLoading } = useQuery({
    queryKey: ['ubps'],
    queryFn: fetchUbps,
  });

  const { data: testTypes } = useQuery({
    queryKey: ['testTypes'],
    queryFn: async () => {
      const res = await fetch('/api/master/test-types');
      if (!res.ok) throw new Error('Gagal mengambil data jenis pengujian');
      const json = await res.json();
      return json.data;
    }
  });

  const { data: jenisAssetList } = useQuery({
    queryKey: ['jenis-asset'],
    queryFn: async () => {
      const res = await fetch('/api/master/jenis-asset');
      if (!res.ok) throw new Error('Gagal mengambil data Jenis Asset');
      const json = await res.json();
      return json.data;
    }
  });

  // Get all available equipment types (Jenis Asset) from master list
  const equipmentTypes = useMemo(() => {
    if (!jenisAssetList) return [];
    return jenisAssetList.map((ja: any) => ja.name.trim()).sort();
  }, [jenisAssetList]);

  // Sync selected equipment type when list loads (default to first available, no 'Semua Jenis' allowed)
  useEffect(() => {
    if (equipmentTypes.length > 0) {
      if (!equipmentType || !equipmentTypes.includes(equipmentType)) {
        setEquipmentType(equipmentTypes[0]);
      }
    }
  }, [equipmentTypes, equipmentType]);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['summary', year, ubpId, unitId, equipmentType],
    queryFn: () => fetchSummary(year, ubpId, unitId, equipmentType),
    enabled: !!equipmentType,
  });

  const { data: matrix, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['matrix', year, ubpId, unitId, equipmentType],
    queryFn: () => fetchMatrix(year, ubpId, unitId, equipmentType),
    enabled: !!equipmentType,
  });

  // Sync selected year filter with available years from data
  useEffect(() => {
    if (summary?.availableYears && year) {
      if (!summary.availableYears.includes(year)) {
        setYear('');
      }
    }
  }, [summary?.availableYears, year]);

  const isLoading = isSummaryLoading || isMatrixLoading || isUbpsLoading || !jenisAssetList;

  // Find selected UBP to list its units
  const selectedUbp = ubps?.find((u: any) => u.id === ubpId);
  const units = selectedUbp?.unitPembangkit || [];

  // Pagination variables for the matrix table
  const PAGE_SIZE = 10;
  const totalRows = matrix?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const paginatedRows = matrix?.rows
    ? matrix.rows.slice((matrixPage - 1) * PAGE_SIZE, matrixPage * PAGE_SIZE)
    : [];

  // Compact list of damage mechanisms
  const displayedDms = useMemo(() => {
    if (!summary?.damageMechanisms) return [];
    if (showAllDms) return summary.damageMechanisms;
    
    // Show only the ones with actual findings
    const withFindings = summary.damageMechanisms.filter((dm: any) => dm.count > 0);
    // If no active findings, show the first 3 to prevent empty table UI
    if (withFindings.length === 0) {
      return summary.damageMechanisms.slice(0, 3);
    }
    return withFindings;
  }, [summary?.damageMechanisms, showAllDms]);

  // Handle row click -> drill down to asset page with specific session
  function handleRowClick(assetId: string, sessionId?: string) {
    const url = sessionId ? `/unit/${assetId}?sessionId=${sessionId}` : `/unit/${assetId}`;
    router.push(url);
  }

  // Handle export
  function handleExport() {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (ubpId) params.append('ubpId', ubpId);
    if (unitId) params.append('unitId', unitId);
    if (equipmentType) params.append('equipmentType', equipmentType);
    window.open(`/api/export/excel?${params.toString()}`, '_blank');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-surface-container-low px-4 py-2 rounded-md border border-surface-border w-fit">
        {/* UBP Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">UBP:</span>
          <FilterSelect 
            value={ubpId}
            onChange={setUbpId}
            options={(ubps || []).map((ubp: { id: string; name: string }) => ({ value: ubp.id, label: ubp.name }))}
            placeholder="Semua UBP"
            variant="inline"
          />
        </div>

        <div className="h-4 w-px bg-surface-border" />

        {/* Unit Pembangkit Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">Unit Pembangkit:</span>
          <FilterSelect 
            value={unitId}
            onChange={setUnitId}
            options={units.map((unit: { id: string; name: string }) => ({ value: unit.id, label: unit.name }))}
            placeholder="Semua Unit Pembangkit"
            variant="inline"
            disabled={!ubpId}
          />
        </div>

        <div className="h-4 w-px bg-surface-border" />

        {/* Jenis Asset Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">Jenis Asset:</span>
          <FilterSelect 
            value={equipmentType}
            onChange={setEquipmentType}
            options={equipmentTypes.map((type: string) => ({ value: type, label: type }))}
            placeholder="Pilih Jenis Asset"
            showPlaceholderOption={false}
            variant="inline"
          />
        </div>

        <div className="h-4 w-px bg-surface-border" />

        {/* Tahun Filter */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider text-on-surface-variant">Tahun:</span>
          <FilterSelect 
            value={year}
            onChange={setYear}
            options={(summary?.availableYears || []).map((y: string) => ({ value: y, label: y }))}
            placeholder="Semua Tahun (All)"
            variant="inline"
          />
        </div>
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
              Kondisi Asset per Unit x Jenis Pengujian
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Ringkasan status pengujian asset terbaru per unit pembangkit.
            </p>
          </div>
          <button 
            onClick={handleExport}
            className="bg-white border border-primary text-primary px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-primary-container/10 transition-all active:scale-95 shadow-xs hover:shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export Excel
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
                    className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[150px] max-w-[150px] w-[150px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border"
                  >
                    Nama Asset
                  </th>
                  <th
                    style={{ left: '350px' }}
                    className="px-4 py-3 font-mono text-xs tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[80px] max-w-[80px] w-[80px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border"
                  >
                    Tahun Uji
                  </th>
                  {matrix?.testTypeHeaders.map((h: string) => (
                    <th
                      key={h}
                      title={h}
                      className="px-2 py-3 font-mono text-[10px] tracking-tight font-bold text-on-surface-variant uppercase text-center min-w-[100px] max-w-[150px] whitespace-normal break-words cursor-help hover:text-primary transition-colors border-r border-b border-surface-border"
                    >
                      {h}
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
                    key={row.sessionId || row.assetId}
                    onClick={() => handleRowClick(row.assetId, row.sessionId)}
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
                        <div className="truncate max-w-[160px]">{row.unitName}</div>
                        <div className="text-[9px] font-mono text-on-surface-variant font-normal uppercase truncate max-w-[160px]">{row.ubpName}</div>
                      </div>
                    </td>
                    <td
                      style={{ left: '200px' }}
                      className={`px-4 py-2 text-center text-[12px] text-on-surface border-r border-b border-surface-border font-medium sticky z-10 min-w-[150px] max-w-[150px] w-[150px] truncate ${
                        idx % 2 === 1
                          ? 'bg-surface-background group-hover:bg-surface-container-low'
                          : 'bg-white group-hover:bg-surface-container-low'
                      }`}
                    >
                      {row.assetName || '—'}
                    </td>
                    <td
                      style={{ left: '350px' }}
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
                        <td key={header} className="px-1 py-2 text-center border-r border-b border-surface-border min-w-[100px] max-w-[150px]">
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
              Showing {totalRows > 0 ? (matrixPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(totalRows, matrixPage * PAGE_SIZE)} of {totalRows} Records
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

      {/* Bottom Section: Damage Mechanism Table + Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Dynamic Damage Mechanism Summary Table (Left Column, 2/3 Width) */}
        <div className="lg:col-span-2">
          <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="px-5 py-3 border-b border-surface-border flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    Rekap Indikasi Kerusakan per Mekanisme (Damage Mechanism)
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Mekanisme kegagalan trafo yang terdeteksi berdasarkan kriteria penilaian terendah per jenis uji.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-3 py-2 font-mono text-[10px] tracking-wider font-semibold text-on-surface-variant uppercase border-b border-r border-surface-border w-[50px] text-center">
                        No
                      </th>
                      <th className="px-3 py-2 font-mono text-[10px] tracking-wider font-semibold text-on-surface-variant uppercase border-b border-r border-surface-border min-w-[180px]">
                        Mekanisme Kerusakan
                      </th>
                      <th className="px-3 py-2 font-mono text-[10px] tracking-wider font-semibold text-on-surface-variant uppercase border-b border-r border-surface-border text-center w-[120px]">
                        Temuan
                      </th>
                      <th className="px-3 py-2 font-mono text-[10px] tracking-wider font-semibold text-on-surface-variant uppercase border-b border-surface-border">
                        Unit dengan Temuan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDms.map((dm: any, idx: number) => (
                      <tr 
                        key={dm.name} 
                        className={`hover:bg-surface-container-low transition-colors ${
                          idx % 2 === 1 ? 'bg-surface-background' : 'bg-white'
                        }`}
                      >
                        <td className="px-3 py-1.5 text-center font-mono text-[11px] text-on-surface-variant border-b border-r border-surface-border">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] font-bold text-on-surface border-b border-r border-surface-border">
                          {dm.name}
                        </td>
                        <td className="px-3 py-1.5 text-center border-b border-r border-surface-border">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border inline-block ${
                            dm.count > 0 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {dm.count} Asset
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-[11px] border-b border-surface-border">
                          {dm.affectedAssets && dm.affectedAssets.length > 0 ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {dm.affectedAssets.slice(0, 5).map((asset: { id: string; name: string }) => (
                                <button
                                  key={asset.id}
                                  onClick={() => router.push(`/unit/${asset.id}`)}
                                  className="px-1.5 py-0.5 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-[10px] rounded transition-all active:scale-95 border border-primary/10 cursor-pointer"
                                >
                                  {asset.name}
                                </button>
                              ))}
                              {dm.affectedAssets.length > 5 && (
                                <span 
                                  className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant font-bold text-[9px] rounded border border-surface-border/80 cursor-help"
                                  title={dm.affectedAssets.slice(5).map((a: any) => a.name).join(', ')}
                                >
                                  +{dm.affectedAssets.length - 5} Unit Lainnya
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-on-surface-variant/40 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {displayedDms.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-on-surface-variant font-medium text-xs">
                          Tidak ada data mekanisme kerusakan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {summary?.damageMechanisms && summary.damageMechanisms.length > displayedDms.length && (
              <div className="px-4 py-2 border-t border-surface-border text-center bg-surface-container-low/50">
                <button
                  onClick={() => setShowAllDms(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  Lihat Semua Mekanisme ({summary.damageMechanisms.length})
                  <span className="material-symbols-outlined text-[13px] select-none">expand_more</span>
                </button>
              </div>
            )}
            {showAllDms && summary?.damageMechanisms && summary.damageMechanisms.length > 3 && (
              <div className="px-4 py-2 border-t border-surface-border text-center bg-surface-container-low/50">
                <button
                  onClick={() => setShowAllDms(false)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  Sembunyikan Mekanisme Tanpa Temuan
                  <span className="material-symbols-outlined text-[13px] select-none">expand_less</span>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Laporan Terbaru Diunggah Card (Right Column, 1/3 Width) */}
        <div className="lg:col-span-1">
          <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden h-full flex flex-col justify-between">
            <div className="flex flex-col h-full justify-between">
              <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-primary text-lg select-none">notifications</span>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    Laporan Baru Diunggah
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Berkas dokumen yang baru ditambahkan ke sistem.
                  </p>
                </div>
              </div>

              <div className="p-3 overflow-y-auto flex-1 custom-scrollbar min-h-[220px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : !summary?.recentReports || summary.recentReports.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant/60 text-[11px] font-medium flex flex-col items-center justify-center gap-1.5 h-full">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/30 select-none">folder_open</span>
                    Belum ada laporan yang diunggah.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.recentReports.map((report: any) => {
                      const isPdf = report.name.toLowerCase().endsWith('.pdf');
                      const isExcel = report.name.toLowerCase().endsWith('.xlsx') || report.name.toLowerCase().endsWith('.xls');
                      const fileIcon = isPdf ? 'picture_as_pdf' : isExcel ? 'table_view' : 'description';
                      const iconColor = isPdf ? 'text-red-500' : isExcel ? 'text-green-600' : 'text-blue-500';

                      // Format date (e.g. 14 Jul 2026)
                      const dateStr = report.createdAt 
                        ? new Date(report.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—';

                      // Format file size
                      const sizeStr = report.fileSize 
                        ? (report.fileSize / 1024).toFixed(1) + ' KB'
                        : '—';

                      return (
                        <div key={report.id} className="flex items-center gap-2.5 p-2 bg-surface-container-lowest hover:bg-surface-container-low border border-surface-border/50 rounded-lg transition-all group">
                          <span className={`material-symbols-outlined text-lg shrink-0 ${iconColor} select-none`}>
                            {fileIcon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className="block text-[11px] font-bold text-on-surface truncate flex-1 pr-1"
                                title={report.name}
                              >
                                {report.name}
                              </span>
                              <span className="text-[9px] font-mono text-outline shrink-0 mr-1">
                                {sizeStr}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={`/api/reports/files/${report.id}/download?inline=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-surface-container rounded text-on-surface-variant flex items-center justify-center transition-all"
                                  title="Lihat Berkas"
                                >
                                  <span className="material-symbols-outlined text-[12px] font-bold">visibility</span>
                                </a>
                                <a
                                  href={`/api/reports/files/${report.id}/download`}
                                  className="p-1 hover:bg-primary-container/20 rounded text-primary flex items-center justify-center transition-all"
                                  title="Unduh Berkas"
                                >
                                  <span className="material-symbols-outlined text-[12px] font-bold">download</span>
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-[9px] text-on-surface-variant/80 mt-0.5">
                              <span className="truncate max-w-[125px]">
                                Folder: {report.directoryName} • Oleh: {report.uploadedBy}
                              </span>
                              <span className="shrink-0 text-outline">{dateStr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

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

        {/* Chart: Perbandingan Kondisi 3 Tahun Terakhir */}
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-on-surface">
                Perbandingan Kondisi 3 Tahun Terakhir
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Jumlah status kondisi pengujian untuk jenis aset {equipmentType || 'terpilih'}.
              </p>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded border border-surface-border">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-status-good" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">GOOD</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-status-fair" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">FAIR</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-status-poor" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">POOR</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-status-bad" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">BAD</span>
              </div>
            </div>
          </div>

          <div className="relative h-64 w-full flex items-end justify-around px-2 pb-8 pt-6 border-b border-surface-border">
            {/* Background Grid Lines */}
            <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-surface-border/40" />
              <div className="w-full border-t border-surface-border/40" />
              <div className="w-full border-t border-surface-border/40" />
              <div className="w-full border-t border-surface-border/40" />
            </div>

            {/* Trend Columns Group */}
            {summary?.trend && summary.trend.length > 0 ? (
              (() => {
                const maxCount = Math.max(
                  ...summary.trend.map((item: any) => 
                    Math.max(item.GOOD || 0, item.FAIR || 0, item.POOR || 0, item.BAD || 0)
                  ), 
                  1
                );
                return summary.trend.map((t: any) => (
                  <div key={t.year} className="flex flex-col items-center gap-2 w-1/4 z-10">
                    {/* Columns flex container */}
                    <div className="flex items-end justify-center gap-3 h-44 w-full">
                      {/* Good Column */}
                      <div 
                        style={{ height: `${((t.GOOD || 0) / maxCount) * 100}%` }} 
                        className="w-4 bg-status-good rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          GOOD: {t.GOOD || 0}
                        </div>
                      </div>

                      {/* Fair Column */}
                      <div 
                        style={{ height: `${((t.FAIR || 0) / maxCount) * 100}%` }} 
                        className="w-4 bg-status-fair rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          FAIR: {t.FAIR || 0}
                        </div>
                      </div>

                      {/* Poor Column */}
                      <div 
                        style={{ height: `${((t.POOR || 0) / maxCount) * 100}%` }} 
                        className="w-4 bg-status-poor rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          POOR: {t.POOR || 0}
                        </div>
                      </div>

                      {/* Bad Column */}
                      <div 
                        style={{ height: `${((t.BAD || 0) / maxCount) * 100}%` }} 
                        className="w-4 bg-status-bad rounded-t-xs transition-all duration-500 hover:brightness-90 relative group/bar cursor-pointer"
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                          BAD: {t.BAD || 0}
                        </div>
                      </div>
                    </div>
                    
                    {/* Year Label */}
                    <span className="font-mono text-xs font-bold text-on-surface">{t.year}</span>
                  </div>
                ));
              })()
            ) : (
              <div className="w-full text-center py-20 text-on-surface-variant font-medium text-xs">
                Tidak ada data tren pengukuran tervalidasi untuk filter ini.
              </div>
            )}
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

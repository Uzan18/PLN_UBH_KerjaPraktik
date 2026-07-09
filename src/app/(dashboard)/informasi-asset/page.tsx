'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

async function fetchUbpAssets() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP & Aset');
  const json = await res.json();
  return json.data;
}

export default function InformasiAssetPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUbpId, setSelectedUbpId] = useState<string | null>(null);
  const [selectedUnitName, setSelectedUnitName] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const { data: ubps, isLoading, error } = useQuery({
    queryKey: ['ubp-assets-info-branched'],
    queryFn: fetchUbpAssets,
  });

  // Query detailed asset specs and latest validated test data when an asset is selected
  const { data: assetDetail, isLoading: isLoadingDetail, error: errorDetail } = useQuery({
    queryKey: ['asset-detail-info', selectedAssetId],
    queryFn: async () => {
      if (!selectedAssetId) return null;
      const res = await fetch(`/api/assets/${selectedAssetId}/detail`);
      if (!res.ok) throw new Error('Gagal mengambil detail spesifikasi & pengujian aset');
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedAssetId,
  });

  // Flat list for search
  const allAssets = useMemo(() => {
    if (!ubps) return [];
    const list: any[] = [];
    ubps.forEach((ubp: any) => {
      ubp.assets?.forEach((asset: any) => {
        list.push({ ...asset, ubpId: ubp.id, ubpName: ubp.name });
      });
    });
    return list;
  }, [ubps]);

  const activeUbp = useMemo(() => {
    if (!ubps || !selectedUbpId) return null;
    return ubps.find((u: any) => u.id === selectedUbpId) || null;
  }, [ubps, selectedUbpId]);

  const uniqueUnits = useMemo(() => {
    if (!activeUbp?.assets) return [];
    const map = new Map<string, any[]>();
    activeUbp.assets.forEach((asset: any) => {
      const name = asset.name;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(asset);
    });
    return Array.from(map.entries()).map(([name, assets]) => ({ name, assets, count: assets.length }));
  }, [activeUbp]);

  const equipmentChoices = useMemo(() => {
    if (!selectedUnitName || !activeUbp?.assets) return [];
    return activeUbp.assets.filter((a: any) => a.name === selectedUnitName);
  }, [activeUbp, selectedUnitName]);

  const activeAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    return allAssets.find((a: any) => a.id === selectedAssetId) || null;
  }, [allAssets, selectedAssetId]);

  // Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allAssets.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.serialNumber || '').toLowerCase().includes(q) ||
      (a.manufacture || '').toLowerCase().includes(q)
    );
  }, [allAssets, searchQuery]);

  // Navigation
  const handleSelectUbp = (id: string | null) => {
    setSelectedUbpId(id);
    setSelectedUnitName(null);
    setSelectedAssetId(null);
    setSearchQuery('');
  };
  const handleSelectUnit = (name: string | null) => {
    setSelectedUnitName(name);
    setSelectedAssetId(null);
    setSearchQuery('');
  };
  const handleSelectAsset = (id: string | null) => {
    setSelectedAssetId(id);
    setExpandedTests({});
    setSearchQuery('');
  };
  const handleSearchResultClick = (asset: any) => {
    setSelectedUbpId(asset.ubpId);
    setSelectedUnitName(asset.name);
    setSelectedAssetId(asset.id);
    setExpandedTests({});
    setSearchQuery('');
  };

  const toggleTestExpand = (testTypeId: string) => {
    setExpandedTests((prev) => ({
      ...prev,
      [testTypeId]: !prev[testTypeId],
    }));
  };

  const level = selectedAssetId ? 4 : selectedUnitName ? 3 : selectedUbpId ? 2 : 1;

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-outline flex-wrap">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <button onClick={() => handleSelectUbp(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 1 ? 'text-primary font-semibold' : ''}`}>
          Semua UBP
        </button>
        {level >= 2 && activeUbp && (
          <>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <button onClick={() => handleSelectUnit(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 2 ? 'text-primary font-semibold' : ''}`}>
              {activeUbp.name}
            </button>
          </>
        )}
        {level >= 3 && selectedUnitName && (
          <>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <button onClick={() => handleSelectAsset(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 3 ? 'text-primary font-semibold' : ''}`}>
              {selectedUnitName}
            </button>
          </>
        )}
        {level === 4 && activeAsset && (
          <>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-semibold">{activeAsset.equipmentType}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-on-surface">Informasi Spesifikasi Aset</h1>
          <p className="text-xs text-on-surface-variant">
            {level === 4 && activeAsset ? `Spesifikasi teknis & pengujian terakhir ${activeAsset.equipmentType} — ${activeAsset.name}.`
              : level === 3 ? `Pilih peralatan pada ${selectedUnitName}.`
              : level === 2 ? `Pilih unit pembangkit pada ${activeUbp?.name}.`
              : 'Pilih Unit Bisnis Pemeliharaan (UBP) untuk melihat aset transformator.'}
          </p>
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-xs">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama aset, SN, manufacture..."
            className="w-full bg-white border border-surface-border rounded-md text-xs py-1.5 pl-8 pr-3 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Loading & Error (Level 1-3) */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 bg-white border border-surface-border rounded-lg">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="p-6 text-center text-xs text-error font-medium bg-white border border-surface-border rounded-lg">
          Terjadi kesalahan saat memuat data.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* SEARCH MODE */}
          {searchQuery.trim() !== '' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                Hasil Pencarian ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant text-xs bg-white border border-surface-border rounded-lg">
                  <p className="font-semibold text-on-surface">Tidak ada aset yang cocok</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((asset) => (
                    <button key={asset.id} onClick={() => handleSearchResultClick(asset)}
                      className="p-4 bg-white hover:bg-primary-container/5 border border-surface-border hover:border-primary rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between h-28 group">
                      <div>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                          <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{asset.equipmentType}</span>
                          <span className="text-[9px] font-mono text-on-surface-variant/70 uppercase">{asset.ubpName}</span>
                        </div>
                        <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors truncate">{asset.name}</h4>
                      </div>
                      <div className="text-[10px] text-on-surface-variant/80 border-t border-surface-border/50 pt-1.5 space-y-0.5">
                        <p className="truncate"><span className="font-medium text-on-surface/85">SN:</span> {asset.serialNumber || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* ══════════ LEVEL 1: UBP ══════════ */}
              {level === 1 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                    Pilih Unit Bisnis Pemeliharaan (UBP)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {ubps?.map((ubp: any) => (
                      <button key={ubp.id} onClick={() => handleSelectUbp(ubp.id)}
                        className="p-4 bg-white hover:bg-primary-container/5 border border-surface-border hover:border-primary rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group h-16">
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors truncate">{ubp.name}</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{ubp.assets?.length || 0} Peralatan</p>
                        </div>
                        <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ LEVEL 2: Unit Pembangkit ══════════ */}
              {level === 2 && activeUbp && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                      Unit Pembangkit — {activeUbp.name}
                    </h3>
                    <button onClick={() => handleSelectUbp(null)} className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali ke UBP
                    </button>
                  </div>

                  {uniqueUnits.length === 0 ? (
                    <div className="p-12 text-center text-on-surface-variant text-xs bg-white border border-surface-border rounded-lg">
                      <p className="font-semibold text-on-surface">Belum ada unit terdaftar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {uniqueUnits.map(({ name, assets, count }) => (
                        <button key={name} onClick={() => handleSelectUnit(name)}
                          className="p-4 bg-white hover:bg-primary-container/5 border border-surface-border hover:border-primary rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group h-16">
                          <div className="min-w-0">
                            <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors truncate">{name}</h4>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">
                              {count} Peralatan
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ LEVEL 3: Pilihan Alat ══════════ */}
              {level === 3 && selectedUnitName && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                      Peralatan — {selectedUnitName}
                    </h3>
                    <button onClick={() => handleSelectUnit(null)} className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali ke Unit Pembangkit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {equipmentChoices.map((asset: any) => (
                      <button key={asset.id} onClick={() => handleSelectAsset(asset.id)}
                        className="p-4 bg-white hover:bg-primary-container/5 border border-surface-border hover:border-primary rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group">
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors">{asset.equipmentType}</h4>
                          <div className="text-[10px] text-on-surface-variant mt-1 space-y-0.5">
                            <p className="truncate">Manufacture: {asset.manufacture || '—'}</p>
                            <p className="truncate">SN: {asset.serialNumber || '—'}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ LEVEL 4: Detail Spesifikasi & Pengujian Terakhir ══════════ */}
              {level === 4 && activeAsset && (
                <div className="space-y-4">
                  {/* Action Buttons Header */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSelectAsset(null)}
                      className="bg-white border border-surface-border hover:bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-md font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali
                    </button>
                    <Link href={`/unit/${activeAsset.id}`}
                      className="bg-primary hover:brightness-110 text-white px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1 active:scale-95">
                      Lihat Selengkapnya (Riwayat & Tren)
                    </Link>
                  </div>

                  {isLoadingDetail ? (
                    <div className="flex items-center justify-center py-12 bg-white border border-surface-border rounded-lg">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : errorDetail ? (
                    <div className="p-6 text-center text-xs text-error font-medium bg-white border border-surface-border rounded-lg">
                      Terjadi kesalahan saat memuat detail spesifikasi dan pengujian aset.
                    </div>
                  ) : assetDetail ? (
                    <>
                      {/* Top Bento Grid (Matching Pic 2) */}
                      <div className="grid grid-cols-12 gap-4">
                        {/* Left Card: Asset Specs */}
                        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                                {assetDetail.equipmentType}
                              </span>
                              <span className="font-mono text-xs text-on-surface-variant">ID: {assetDetail.id}</span>
                              {assetDetail.selectedTestYear && (
                                <span className="text-xs font-semibold text-outline">
                                  Tahun Terkini: {assetDetail.selectedTestYear}
                                </span>
                              )}
                            </div>
                            <h2 className="text-3xl font-bold text-on-surface mb-2 leading-tight tracking-tight">
                              {assetDetail.name}
                            </h2>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-surface-border/50">
                            {[
                              { label: 'Manufacture', value: assetDetail.manufacture || '—' },
                              { label: 'Type', value: assetDetail.type || '—' },
                              { label: 'Serial Number', value: assetDetail.serialNumber || '—' },
                              { label: 'Tahun Buat', value: assetDetail.mfgYear ? String(assetDetail.mfgYear) : '—' },
                              { label: 'Vector Group', value: assetDetail.vectorGroup || '—' },
                              { label: 'Cooling Method', value: assetDetail.coolingMethod || '—' },
                              { label: 'Rated Power', value: assetDetail.ratedPower || '—' },
                              { label: 'Frequency', value: assetDetail.frequency || '—' },
                              { label: 'HV Side', value: assetDetail.hvSide || '—' },
                              { label: 'HV Rated Current', value: assetDetail.hvRatedCurrent || '—' },
                              { label: 'LV Side', value: assetDetail.lvSide || '—' },
                              { label: 'LV Rated Current', value: assetDetail.lvRatedCurrent || '—' },
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

                        {/* Right Card: Trend Chart (Mock SVG mirroring Pic 2) */}
                        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-on-surface text-sm">Tren Kondisi Unit Ini</h4>
                          </div>
                          <div className="h-44 flex flex-col justify-between relative">
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
                            <div className="flex justify-between mt-2 text-[9px] font-bold text-on-surface-variant">
                              <span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-1 bg-primary" />
                              <span className="text-on-surface-variant font-medium">Tren Kondisi</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-1 border-t border-dashed border-status-fair" />
                              <span className="text-on-surface-variant font-medium">Batas Aman</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Spacer */}
                      <div className="h-2" />

                      {/* Last Test Results Grid */}
                      <div className="grid grid-cols-12 gap-4">
                        {/* Accordion list of test types (Left) */}
                        <div className="col-span-12 lg:col-span-8 space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                            Hasil Pengujian Terakhir {assetDetail.selectedTestYear ? `(Tahun ${assetDetail.selectedTestYear})` : ''}
                          </h3>

                          {!assetDetail.testTypeStatuses || assetDetail.testTypeStatuses.length === 0 ? (
                            <div className="p-6 text-center text-on-surface-variant text-xs bg-white border border-surface-border rounded-lg">
                              Belum ada riwayat pengujian untuk aset ini.
                            </div>
                          ) : (
                            assetDetail.testTypeStatuses.map((test: any) => {
                              const hasParameters = test.parameters && test.parameters.length > 0;
                              const isExpanded = !!expandedTests[test.testTypeId];

                              return (
                                <div key={test.testTypeId} className="bg-white rounded-lg overflow-hidden border border-surface-border shadow-sm">
                                  <button onClick={() => toggleTestExpand(test.testTypeId)}
                                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-surface-container-low transition-colors text-left focus:outline-none cursor-pointer">
                                    <span className="font-semibold text-on-surface text-xs">{test.testTypeName}</span>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge judgement={test.judgement} size="sm" />
                                      {hasParameters && (
                                        <span className={`material-symbols-outlined text-sm text-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                          expand_more
                                        </span>
                                      )}
                                    </div>
                                  </button>

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
                                                  {param.isNotApplicable ? 'N/A' : param.value !== null ? param.value : '—'}
                                                </td>
                                                <td className="p-2 border-b border-surface-border text-center text-on-surface-variant">{param.unit || '—'}</td>
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
                            })
                          )}
                        </div>

                        {/* Damage Mechanism (Right) */}
                        <div className="col-span-12 lg:col-span-4 space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                            Kondisi Mekanisme Kerusakan
                          </h3>
                          <div className="bg-white p-3.5 rounded-lg border border-surface-border shadow-sm">
                            <p className="text-[10px] text-on-surface-variant mb-3">
                              Indikasi kerusakan berdasarkan hasil pengukuran terverifikasi terbaru.
                            </p>
                            <div className="space-y-1.5">
                              {assetDetail.damageMechanisms && assetDetail.damageMechanisms.length > 0 ? (
                                assetDetail.damageMechanisms.map((dm: any) => {
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
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

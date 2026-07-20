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

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportUbpId, setExportUbpId] = useState('ALL');
  const [exportUnitName, setExportUnitName] = useState('ALL');
  const [exportJenisId, setExportJenisId] = useState('ALL');
  const [exportTestYear, setExportTestYear] = useState('ALL');

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
      ubp.unitPembangkit?.forEach((unit: any) => {
        unit.assets?.forEach((asset: any) => {
          list.push({
            ...asset,
            ubpId: ubp.id,
            ubpName: ubp.name,
            unitId: unit.id,
            unitName: unit.name,
          });
        });
      });
    });
    return list;
  }, [ubps]);

  const activeUbp = useMemo(() => {
    if (!ubps || !selectedUbpId) return null;
    return ubps.find((u: any) => u.id === selectedUbpId) || null;
  }, [ubps, selectedUbpId]);

  const uniqueUnits = useMemo(() => {
    if (!activeUbp?.unitPembangkit) return [];
    return activeUbp.unitPembangkit.map((unit: any) => ({
      id: unit.id,
      name: unit.name,
      assets: unit.assets || [],
      count: unit.assets?.length || 0,
    }));
  }, [activeUbp]);

  const equipmentChoices = useMemo(() => {
    if (!selectedUnitName || !activeUbp?.unitPembangkit) return [];
    const unit = activeUbp.unitPembangkit.find((u: any) => u.name === selectedUnitName);
    return unit?.assets || [];
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
      a.unitName.toLowerCase().includes(q) ||
      (a.serialNumber || '').toLowerCase().includes(q) ||
      (a.vectorGroup || '').toLowerCase().includes(q)
    );
  }, [allAssets, searchQuery]);

  // Memo fields for dynamic export filters
  const exportSelectedUbp = useMemo(() => {
    if (!ubps || !exportUbpId || exportUbpId === 'ALL') return null;
    return ubps.find((u: any) => u.id === exportUbpId) || null;
  }, [ubps, exportUbpId]);

  const exportUniqueUnits = useMemo(() => {
    if (exportUbpId === 'ALL') {
      if (!ubps) return [];
      const names = new Set<string>();
      ubps.forEach((u: any) => {
        u.unitPembangkit?.forEach((unit: any) => {
          if (unit.name) names.add(unit.name.trim());
        });
      });
      return Array.from(names).sort();
    }
    if (!exportSelectedUbp?.unitPembangkit) return [];
    const names = new Set<string>();
    exportSelectedUbp.unitPembangkit.forEach((unit: any) => {
      if (unit.name) names.add(unit.name.trim());
    });
    return Array.from(names).sort();
  }, [ubps, exportUbpId, exportSelectedUbp]);

  const exportJenisAssetChoices = useMemo(() => {
    if (!ubps) return [];
    const map = new Map<string, { id: string, name: string }>();
    ubps.forEach((ubp: any) => {
      ubp.unitPembangkit?.forEach((unit: any) => {
        unit.assets?.forEach((asset: any) => {
          if (asset.jenisAsset) {
            map.set(asset.jenisAsset.id, {
              id: asset.jenisAsset.id,
              name: asset.jenisAsset.name
            });
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ubps]);

  const exportYearChoices = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 2; y >= 2010; y--) {
      years.push(String(y));
    }
    return years;
  }, []);

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
            <span className="text-primary font-semibold">{activeAsset.jenisAsset?.name || 'Trafo'} ({activeAsset.name})</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-on-surface">Hasil Pengujian</h1>
          <p className="text-xs text-on-surface-variant">
            {level === 4 && activeAsset ? `Spesifikasi teknis & pengujian terakhir ${activeAsset.jenisAsset?.name || 'Trafo'} (${activeAsset.name}) — ${activeAsset.unitName}.`
              : level === 3 ? `Pilih peralatan pada ${selectedUnitName}.`
              : level === 2 ? `Pilih unit pembangkit pada ${activeUbp?.name}.`
              : 'Pilih Unit Bisnis Pemeliharaan (UBP) untuk melihat aset transformator.'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-primary text-white hover:brightness-110 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-xs select-none font-bold">download</span>
            Ekspor Data
          </button>

          <div className="relative w-full md:w-64">
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
                          <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{asset.jenisAsset?.name || 'Trafo'}</span>
                          <span className="text-[9px] font-mono text-on-surface-variant/70 uppercase">{asset.ubpName}</span>
                        </div>
                        <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors truncate">{asset.unitName} - {asset.name}</h4>
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
                    {ubps?.map((ubp: any) => {
                      const totalUbpAssets = allAssets.filter((a) => a.ubpId === ubp.id).length;
                      return (
                        <button key={ubp.id} onClick={() => handleSelectUbp(ubp.id)}
                          className="p-4 bg-white hover:bg-primary-container/5 border border-surface-border hover:border-primary rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group h-16">
                          <div className="min-w-0">
                            <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors truncate">{ubp.name}</h4>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{totalUbpAssets} Peralatan</p>
                          </div>
                          <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">chevron_right</span>
                        </button>
                      );
                    })}
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
                      {uniqueUnits.map(({ id, name, count }: any) => (
                        <button key={id} onClick={() => handleSelectUnit(name)}
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
                          <h4 className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors">{asset.name}</h4>
                          <div className="text-[10px] text-on-surface-variant mt-1 space-y-0.5">
                            <p className="truncate">Jenis: {asset.jenisAsset?.name || '—'}</p>
                            <p className="truncate">Manufacture: {asset.vectorGroup || '—'}</p>
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
                                  {(!assetDetail.selectedSessionId || assetDetail.selectedSessionId === assetDetail.latestSessionId)
                                    ? `Tahun Terkini: ${assetDetail.selectedTestYear}${assetDetail.selectedSessionEvent && assetDetail.selectedSessionEvent !== 'default' ? ` (${assetDetail.selectedSessionEvent})` : ''}`
                                    : `Tahun Uji: ${assetDetail.selectedTestYear}${assetDetail.selectedSessionEvent && assetDetail.selectedSessionEvent !== 'default' ? ` (${assetDetail.selectedSessionEvent})` : ''}`}
                                </span>
                              )}
                            </div>
                            <h2 className="text-3xl font-bold text-on-surface mb-2 leading-tight tracking-tight">
                              {assetDetail.unitName || ''} - {assetDetail.name}
                            </h2>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-surface-border/50">
                            {(() => {
                              const activeFields = (() => {
                                if (!assetDetail.infoFields) return null;
                                try {
                                  return JSON.parse(assetDetail.infoFields) as any[];
                                } catch (e) {
                                  return null;
                                }
                              })();

                              const activeKeys = activeFields
                                ? activeFields.map((item: any) => typeof item === 'string' ? item : item?.key || '')
                                : null;

                              const customFieldsDict = (() => {
                                if (!assetDetail.customMetadata) return {};
                                try {
                                  return JSON.parse(assetDetail.customMetadata) as Record<string, string>;
                                } catch (e) {
                                  return {};
                                }
                              })();

                              const customKeys = activeKeys
                                ? activeKeys.filter((k: string) => k && !['type', 'serialNumber', 'mfgYear', 'manufacture', 'coolingMethod', 'ratedPower', 'frequency', 'hvSide', 'hvRatedCurrent', 'lvSide', 'lvRatedCurrent'].includes(k.toLowerCase()))
                                : Object.keys(customFieldsDict);

                              const customFields = customKeys.map((k: string) => {
                                const cleanLabel = k
                                  .split(' ')
                                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                return {
                                  key: k,
                                  label: cleanLabel,
                                  value: customFieldsDict[k] || '—'
                                };
                              });

                              return [
                                { key: 'type', label: 'Type', value: assetDetail.type || '—' },
                                { key: 'serialNumber', label: 'Serial Number', value: assetDetail.serialNumber || '—' },
                                { key: 'mfgYear', label: 'Tahun Buat', value: assetDetail.mfgYear ? String(assetDetail.mfgYear) : '—' },
                                { key: 'manufacture', label: 'Manufacture', value: assetDetail.vectorGroup || '—' },
                                { key: 'coolingMethod', label: 'Cooling Method', value: assetDetail.coolingMethod || '—' },
                                { key: 'ratedPower', label: 'Rated Power', value: assetDetail.ratedPower || '—' },
                                { key: 'frequency', label: 'Frequency', value: assetDetail.frequency || '—' },
                                { key: 'hvSide', label: 'HV Side', value: assetDetail.hvSide || '—' },
                                { key: 'hvRatedCurrent', label: 'HV Rated Current', value: assetDetail.hvRatedCurrent || '—' },
                                { key: 'lvSide', label: 'LV Side', value: assetDetail.lvSide || '—' },
                                { key: 'lvRatedCurrent', label: 'LV Rated Current', value: assetDetail.lvRatedCurrent || '—' },
                              ]
                                .filter((item) => !activeFields || activeFields.includes(item.key))
                                .concat(customFields)
                                .map((item) => (
                                  <div 
                                    key={item.label} 
                                    className="flex flex-col px-3 py-1.5 rounded-lg border text-xs bg-surface-container-low border-surface-border"
                                  >
                                    <span className="text-[9px] uppercase font-bold text-on-surface-variant/60 tracking-wider mb-0.5">{item.label}</span>
                                    <span className="font-semibold text-on-surface truncate" title={String(item.value)}>{item.value}</span>
                                  </div>
                                ));
                            })()}
                          </div>
                        </div>

                        {/* Right Card: Trend Chart */}
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
                            {assetDetail?.trend && assetDetail.trend.length > 0 ? (
                              (() => {
                                const maxCount = Math.max(
                                  ...assetDetail.trend.map((item: any) => 
                                    Math.max(item.GOOD || 0, item.FAIR || 0, item.POOR || 0, item.BAD || 0)
                                  ), 
                                  1
                                );
                                return assetDetail.trend.map((t: any) => (
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
                                                  {param.displayValue || (param.isNotApplicable ? 'N/A' : param.value !== null ? param.value : '—')}
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

      {/* Export Modal Overlay */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border max-w-md w-full flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-surface-border bg-surface-background flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary select-none font-bold">download</span>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Ekspor Data</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface rounded p-1 hover:bg-surface-container transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg select-none">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Unduh seluruh data pengujian yang telah divalidasi ke format berkas Excel yang kompatibel untuk di-import kembali.
              </p>

              {/* Filter UBP */}
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-1.5">
                  Filter UBP
                </label>
                <select
                  value={exportUbpId}
                  onChange={(e) => {
                    setExportUbpId(e.target.value);
                    setExportUnitName('ALL');
                    setExportJenisId('ALL');
                    setExportTestYear('ALL');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs font-semibold text-primary focus:border-primary focus:ring-0 cursor-pointer transition-all"
                >
                  <option value="ALL">SEMUA UBP (ALL)</option>
                  {isLoading ? (
                    <option disabled>Memuat data UBP...</option>
                  ) : (
                    ubps?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Filter Unit Pembangkit */}
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-1.5">
                  Filter Unit Pembangkit
                </label>
                <select
                  value={exportUnitName}
                  onChange={(e) => {
                    setExportUnitName(e.target.value);
                    setExportJenisId('ALL');
                    setExportTestYear('ALL');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs font-semibold text-primary focus:border-primary focus:ring-0 cursor-pointer transition-all"
                >
                  <option value="ALL">SEMUA UNIT (ALL)</option>
                  {exportUniqueUnits.map((name: string) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Jenis Alat */}
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-1.5">
                  Filter Jenis Alat
                </label>
                <select
                  value={exportJenisId}
                  onChange={(e) => setExportJenisId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs font-semibold text-primary focus:border-primary focus:ring-0 cursor-pointer transition-all"
                >
                  <option value="ALL">SEMUA JENIS ALAT (ALL)</option>
                  {exportJenisAssetChoices.map((ja: any) => (
                    <option key={ja.id} value={ja.id}>
                      {ja.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Tahun */}
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-1.5">
                  Filter Tahun
                </label>
                <select
                  value={exportTestYear}
                  onChange={(e) => setExportTestYear(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs font-semibold text-primary focus:border-primary focus:ring-0 cursor-pointer transition-all"
                >
                  <option value="ALL">SEMUA TAHUN (ALL)</option>
                  {exportYearChoices.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-surface-border bg-surface-background flex justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-surface-border hover:bg-surface-container rounded-lg font-bold text-xs text-on-surface-variant transition-colors cursor-pointer"
              >
                Batal
              </button>
              <a
                href={`/api/master/export?ubpId=${exportUbpId}&unitName=${exportUnitName}&jenisAssetId=${exportJenisId}&testYear=${exportTestYear}`}
                download
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm select-none font-bold">download</span>
                Mulai Ekspor
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

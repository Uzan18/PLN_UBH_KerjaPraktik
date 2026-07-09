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

  const eqTypeIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('ARRESTER') || t.includes('LA')) return 'flash_on';
    if (t.includes('UAT') || t.includes('AUXILIARY')) return 'electrical_services';
    if (t.includes('TRAFO') || t.includes('TRANSFORMER')) return 'power';
    return 'settings';
  };

  const level = selectedAssetId ? 4 : selectedUnitName ? 3 : selectedUbpId ? 2 : 1;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline flex-wrap">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <button onClick={() => handleSelectUbp(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 1 ? 'text-primary font-semibold' : ''}`}>
          Semua UBP
        </button>
        {level >= 2 && activeUbp && (
          <>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <button onClick={() => handleSelectUnit(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 2 ? 'text-primary font-semibold' : ''}`}>
              {activeUbp.name}
            </button>
          </>
        )}
        {level >= 3 && selectedUnitName && (
          <>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <button onClick={() => handleSelectAsset(null)} className={`hover:text-primary transition-colors cursor-pointer ${level === 3 ? 'text-primary font-semibold' : ''}`}>
              {selectedUnitName}
            </button>
          </>
        )}
        {level === 4 && activeAsset && (
          <>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-semibold">{activeAsset.equipmentType}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-on-surface">Informasi Spesifikasi Aset</h1>
          <p className="text-sm text-on-surface-variant">
            {level === 4 && activeAsset ? `Spesifikasi teknis & pengujian terakhir ${activeAsset.equipmentType} — ${activeAsset.name}.`
              : level === 3 ? `Pilih peralatan pada ${selectedUnitName}.`
              : level === 2 ? `Pilih unit pembangkit pada ${activeUbp?.name}.`
              : 'Pilih Unit Bisnis Pemeliharaan (UBP) untuk melihat aset transformator.'}
          </p>
        </div>
        <div className="relative w-full md:w-80 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama aset, SN, manufacture..."
            className="w-full bg-white border border-surface-border rounded-lg text-xs py-2 pl-9 pr-3 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Loading & Error (Level 1-3) */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 bg-white border border-surface-border rounded-xl">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="p-8 text-center text-error font-medium bg-white border border-surface-border rounded-xl">
          Terjadi kesalahan saat memuat data.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* SEARCH MODE */}
          {searchQuery.trim() !== '' ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                Hasil Pencarian ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="p-16 text-center text-on-surface-variant text-sm bg-white border border-surface-border rounded-xl">
                  <span className="material-symbols-outlined text-5xl text-outline/40 block">filter_list_off</span>
                  <p className="font-semibold text-base text-on-surface mt-2">Tidak ada aset yang cocok</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((asset) => (
                    <button key={asset.id} onClick={() => handleSearchResultClick(asset)}
                      className="p-5 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between h-36 group">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{asset.equipmentType}</span>
                          <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase">{asset.ubpName}</span>
                        </div>
                        <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate">{asset.name}</h4>
                      </div>
                      <div className="text-[11px] text-on-surface-variant/80 border-t border-surface-border/50 pt-2 space-y-0.5">
                        <p className="truncate"><span className="font-medium text-on-surface/80">SN:</span> {asset.serialNumber || '—'}</p>
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
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                    Pilih Unit Bisnis Pemeliharaan (UBP)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ubps?.map((ubp: any) => (
                      <button key={ubp.id} onClick={() => handleSelectUbp(ubp.id)}
                        className="p-6 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex items-center justify-between group h-24">
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="material-symbols-outlined text-4xl text-primary bg-primary/5 p-3 rounded-lg group-hover:bg-primary/15 transition-colors">domain</span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate">{ubp.name}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{ubp.assets?.length || 0} Peralatan</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ LEVEL 2: Unit Pembangkit ══════════ */}
              {level === 2 && activeUbp && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                      Unit Pembangkit — {activeUbp.name}
                    </h3>
                    <button onClick={() => handleSelectUbp(null)} className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali ke UBP
                    </button>
                  </div>

                  {uniqueUnits.length === 0 ? (
                    <div className="p-16 text-center text-on-surface-variant text-sm bg-white border border-surface-border rounded-xl">
                      <span className="material-symbols-outlined text-5xl text-outline/40 block">domain_disabled</span>
                      <p className="font-semibold text-base text-on-surface mt-2">Belum ada unit terdaftar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uniqueUnits.map(({ name, assets, count }) => (
                        <button key={name} onClick={() => handleSelectUnit(name)}
                          className="p-5 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex items-center justify-between group">
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="material-symbols-outlined text-2xl text-primary bg-primary/5 p-2.5 rounded-lg group-hover:bg-primary/15 transition-colors">factory</span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate">{name}</h4>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {count} Peralatan
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ LEVEL 3: Pilihan Alat ══════════ */}
              {level === 3 && selectedUnitName && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                      Peralatan — {selectedUnitName}
                    </h3>
                    <button onClick={() => handleSelectUnit(null)} className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali ke Unit Pembangkit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipmentChoices.map((asset: any) => (
                      <button key={asset.id} onClick={() => handleSelectAsset(asset.id)}
                        className="p-6 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex items-center justify-between group">
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="material-symbols-outlined text-3xl text-primary bg-primary/5 p-3 rounded-lg group-hover:bg-primary/15 transition-colors">
                            {eqTypeIcon(asset.equipmentType)}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">{asset.equipmentType}</h4>
                            <div className="text-xs text-on-surface-variant mt-1 space-y-0.5">
                              <p className="truncate">Manufacture: {asset.manufacture || '—'}</p>
                              <p className="truncate">SN: {asset.serialNumber || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ LEVEL 4: Detail Spesifikasi & Pengujian Terakhir ══════════ */}
              {level === 4 && activeAsset && (
                <div className="space-y-6">
                  {/* Action Buttons Header */}
                  <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-surface-border shadow-sm flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">{activeAsset.equipmentType}</span>
                      <h2 className="text-lg font-bold text-on-surface truncate max-w-[200px] md:max-w-md">{activeAsset.name}</h2>
                      {assetDetail?.overallJudgement && assetDetail.overallJudgement !== 'NA' && (
                        <StatusBadge judgement={assetDetail.overallJudgement} size="sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSelectAsset(null)}
                        className="bg-white border border-surface-border hover:bg-surface-container-low text-on-surface-variant px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer">
                        <span className="material-symbols-outlined text-xs">arrow_back</span>
                        Kembali
                      </button>
                      <Link href={`/unit/${activeAsset.id}`}
                        className="bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-xs">analytics</span>
                        Lihat Selengkapnya (Riwayat & Tren)
                      </Link>
                    </div>
                  </div>

                  {isLoadingDetail ? (
                    <div className="flex items-center justify-center py-20 bg-white border border-surface-border rounded-xl">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : errorDetail ? (
                    <div className="p-8 text-center text-error font-medium bg-white border border-surface-border rounded-xl">
                      Terjadi kesalahan saat memuat detail spesifikasi dan pengujian aset.
                    </div>
                  ) : assetDetail ? (
                    <>
                      {/* Specs section (Using values merged with latest validated session additionalInfo if available) */}
                      <div className="bg-white border border-surface-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-surface-border bg-surface-container-low/10">
                          <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">feed</span>
                            Spesifikasi Teknis {assetDetail.selectedTestYear ? `(Terupdate Tahun ${assetDetail.selectedTestYear})` : ''}
                          </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Manufacture', value: assetDetail.manufacture || '—', icon: 'warehouse' },
                            { label: 'Type', value: assetDetail.type || '—', icon: 'label' },
                            { label: 'Serial Number', value: assetDetail.serialNumber || '—', icon: 'tag' },
                            { label: 'Tahun Buat', value: assetDetail.mfgYear ? String(assetDetail.mfgYear) : '—', icon: 'calendar_month' },
                            { label: 'Vector Group', value: assetDetail.vectorGroup || '—', icon: 'share' },
                            { label: 'Cooling Method', value: assetDetail.coolingMethod || '—', icon: 'ac_unit' },
                            { label: 'Rated Power', value: assetDetail.ratedPower || '—', icon: 'electric_bolt' },
                            { label: 'Frequency', value: assetDetail.frequency || '—', icon: 'network_check' },
                            { label: 'HV Side', value: assetDetail.hvSide || '—', icon: 'bolt' },
                            { label: 'HV Rated Current', value: assetDetail.hvRatedCurrent || '—', icon: 'speed' },
                            { label: 'LV Side', value: assetDetail.lvSide || '—', icon: 'bolt' },
                            { label: 'LV Rated Current', value: assetDetail.lvRatedCurrent || '—', icon: 'speed' },
                          ].map((item) => (
                            <div key={item.label}
                              className="flex items-center gap-3.5 p-4 bg-surface-container-low/30 border border-surface-border/60 rounded-xl group hover:border-primary/20 transition-all hover:bg-white">
                              <span className="material-symbols-outlined text-primary text-xl bg-primary/5 p-2.5 rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">{item.icon}</span>
                              <div className="min-w-0">
                                <span className="block text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">{item.label}</span>
                                <span className="block font-semibold text-on-surface text-sm leading-tight mt-0.5 truncate" title={item.value}>{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Last Test Results Grid */}
                      <div className="grid grid-cols-12 gap-4">
                        {/* Accordion list of test types (Left) */}
                        <div className="col-span-12 lg:col-span-8 space-y-4">
                          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">biotech</span>
                            Hasil Pengujian Terakhir {assetDetail.selectedTestYear ? `(Tahun ${assetDetail.selectedTestYear})` : ''}
                          </h3>

                          {!assetDetail.testTypeStatuses || assetDetail.testTypeStatuses.length === 0 ? (
                            <div className="p-10 text-center text-on-surface-variant text-sm bg-white border border-surface-border rounded-xl">
                              Belum ada riwayat pengujian untuk aset ini.
                            </div>
                          ) : (
                            assetDetail.testTypeStatuses.map((test: any) => {
                              const hasParameters = test.parameters && test.parameters.length > 0;
                              const isExpanded = !!expandedTests[test.testTypeId];

                              return (
                                <div key={test.testTypeId} className="bg-white rounded-lg overflow-hidden border border-surface-border shadow-sm">
                                  <button onClick={() => toggleTestExpand(test.testTypeId)}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-surface-container-low transition-colors text-left focus:outline-none cursor-pointer">
                                    <span className="font-semibold text-on-surface text-sm">{test.testTypeName}</span>
                                    <div className="flex items-center gap-3">
                                      <StatusBadge judgement={test.judgement} size="sm" />
                                      {hasParameters && (
                                        <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                          expand_more
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {hasParameters && isExpanded && (
                                    <div className="p-4 bg-white border-t border-surface-border animate-fade-in">
                                      <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-surface-container-low text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">
                                              <th className="p-2.5 font-bold border-b border-surface-border">Parameter</th>
                                              <th className="p-2.5 font-bold border-b border-surface-border text-center">Value</th>
                                              <th className="p-2.5 font-bold border-b border-surface-border text-center">Satuan</th>
                                              <th className="p-2.5 font-bold border-b border-surface-border text-center">Kondisi (Judgement)</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {test.parameters.map((param: any, idx: number) => (
                                              <tr key={param.parameterId} className={idx % 2 === 1 ? 'bg-surface-background' : ''}>
                                                <td className="p-2.5 border-b border-surface-border font-bold text-on-surface">{param.parameterName}</td>
                                                <td className="p-2.5 border-b border-surface-border text-center font-mono font-semibold text-primary">
                                                  {param.isNotApplicable ? 'N/A' : param.value !== null ? param.value : '—'}
                                                </td>
                                                <td className="p-2.5 border-b border-surface-border text-center text-on-surface-variant">{param.unit || '—'}</td>
                                                <td className="p-2.5 border-b border-surface-border text-center">
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
                        <div className="col-span-12 lg:col-span-4 space-y-4">
                          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">healing</span>
                            Kondisi Mekanisme Kerusakan
                          </h3>
                          <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm">
                            <p className="text-[11px] text-on-surface-variant mb-4">
                              Indikasi kerusakan dihitung berdasarkan hasil pengukuran terverifikasi terbaru.
                            </p>
                            <div className="space-y-2">
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

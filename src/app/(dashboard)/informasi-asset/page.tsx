'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Fetch helper
async function fetchUbpAssets() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP & Aset');
  const json = await res.json();
  return json.data;
}

export default function InformasiAssetPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUbpId, setSelectedUbpId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Query
  const { data: ubps, isLoading, error } = useQuery({
    queryKey: ['ubp-assets-info-branched'],
    queryFn: fetchUbpAssets,
  });

  // Flat list of all assets for search & helper mapping
  const allAssets = useMemo(() => {
    if (!ubps) return [];
    const list: any[] = [];
    ubps.forEach((ubp: any) => {
      if (ubp.assets) {
        ubp.assets.forEach((asset: any) => {
          list.push({
            ...asset,
            ubpId: ubp.id,
            ubpName: ubp.name,
          });
        });
      }
    });
    return list;
  }, [ubps]);

  // Find active selections
  const activeUbp = useMemo(() => {
    if (!ubps || !selectedUbpId) return null;
    return ubps.find((u: any) => u.id === selectedUbpId) || null;
  }, [ubps, selectedUbpId]);

  const activeAsset = useMemo(() => {
    if (!allAssets || !selectedAssetId) return null;
    return allAssets.find((a: any) => a.id === selectedAssetId) || null;
  }, [allAssets, selectedAssetId]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allAssets.filter((asset) => {
      const assetName = asset.name.toLowerCase();
      const serialNumber = (asset.serialNumber || '').toLowerCase();
      const manufacture = (asset.manufacture || '').toLowerCase();
      const type = (asset.type || '').toLowerCase();
      return (
        assetName.includes(query) ||
        serialNumber.includes(query) ||
        manufacture.includes(query) ||
        type.includes(query)
      );
    });
  }, [allAssets, searchQuery]);

  // Navigation handlers
  const handleSelectUbp = (ubpId: string | null) => {
    setSelectedUbpId(ubpId);
    setSelectedAssetId(null);
    setSearchQuery('');
  };

  const handleSelectAsset = (assetId: string | null) => {
    setSelectedAssetId(assetId);
    setSearchQuery('');
  };

  const handleSearchResultClick = (asset: any) => {
    setSelectedUbpId(asset.ubpId);
    setSelectedAssetId(asset.id);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-outline mb-2 flex-wrap">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <button 
          onClick={() => handleSelectUbp(null)}
          className={`hover:text-primary transition-colors cursor-pointer ${!selectedUbpId ? 'text-primary font-semibold' : ''}`}
        >
          Semua UBP
        </button>
        {selectedUbpId && activeUbp && (
          <>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <button 
              onClick={() => handleSelectAsset(null)}
              className={`hover:text-primary transition-colors cursor-pointer ${!selectedAssetId ? 'text-primary font-semibold' : ''}`}
            >
              {activeUbp.name}
            </button>
          </>
        )}
        {selectedAssetId && activeAsset && (
          <>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-semibold">{activeAsset.name}</span>
          </>
        )}
      </div>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-on-surface">Informasi Spesifikasi Aset</h1>
          <p className="text-sm text-on-surface-variant">
            {selectedAssetId && activeAsset
              ? `Spesifikasi teknis detail untuk ${activeAsset.name}.`
              : selectedUbpId && activeUbp
              ? `Daftar unit transformator daya pada ${activeUbp.name}.`
              : 'Pilih Unit Bisnis Pemeliharaan (UBP) untuk melihat aset transformator.'}
          </p>
        </div>

        {/* Global Search Box */}
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

      {/* Loading & Errors */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 bg-white border border-surface-border rounded-xl">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="p-8 text-center text-error font-medium bg-white border border-surface-border rounded-xl">
          Terjadi kesalahan saat memuat data spesifikasi aset.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* SEARCH MODE DISPLAY */}
          {searchQuery.trim() !== '' ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                Hasil Pencarian ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="p-16 text-center text-on-surface-variant text-sm bg-white border border-surface-border rounded-xl">
                  <span className="material-symbols-outlined text-5xl text-outline/40 block">filter_list_off</span>
                  <p className="font-semibold text-base text-on-surface mt-2">Tidak ada aset yang cocok</p>
                  <p>Sesuaikan ejaan nama, nomor seri, atau pabrikan aset.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSearchResultClick(asset)}
                      className="p-5 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between h-40 group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">
                            {asset.equipmentType}
                          </span>
                          <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase">
                            {asset.ubpName}
                          </span>
                        </div>
                        <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate max-w-full">
                          {asset.name}
                        </h4>
                      </div>
                      <div className="text-[11px] text-on-surface-variant/80 border-t border-surface-border/50 pt-2.5 space-y-0.5">
                        <p className="truncate"><span className="font-medium text-on-surface/80">Manufacture:</span> {asset.manufacture || '—'}</p>
                        <p className="truncate"><span className="font-medium text-on-surface/80">SN:</span> {asset.serialNumber || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* HIERARCHICAL MODE DISPLAY */
            <div>
              {/* LEVEL 1: UBP Selection */}
              {selectedUbpId === null && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                    Pilih Unit Bisnis Pemeliharaan (UBP)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ubps?.map((ubp: any) => {
                      const count = ubp.assets?.length || 0;
                      return (
                        <button
                          key={ubp.id}
                          onClick={() => handleSelectUbp(ubp.id)}
                          className="p-6 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex items-center justify-between group h-24"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="material-symbols-outlined text-4xl text-primary bg-primary/5 p-3 rounded-lg group-hover:bg-primary/15 transition-colors">
                              domain
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate">
                                {ubp.name}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                                {count} Asset Transformator
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">
                            chevron_right
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEVEL 2: Asset Selection */}
              {selectedUbpId !== null && selectedAssetId === null && activeUbp && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-on-surface-variant font-mono uppercase tracking-wider">
                      Daftar Aset pada {activeUbp.name}
                    </h3>
                    <button 
                      onClick={() => handleSelectUbp(null)}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">arrow_back</span>
                      Kembali ke UBP
                    </button>
                  </div>

                  {!activeUbp.assets || activeUbp.assets.length === 0 ? (
                    <div className="p-16 text-center text-on-surface-variant text-sm bg-white border border-surface-border rounded-xl">
                      <span className="material-symbols-outlined text-5xl text-outline/40 block">domain_disabled</span>
                      <p className="font-semibold text-base text-on-surface mt-2">Belum ada aset terdaftar</p>
                      <p>Silakan hubungi administrator untuk mendaftarkan aset baru pada UBP ini.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeUbp.assets.map((asset: any) => (
                        <button
                          key={asset.id}
                          onClick={() => handleSelectAsset(asset.id)}
                          className="p-5 bg-white hover:bg-primary-container/10 border border-surface-border hover:border-primary rounded-xl text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between h-40 group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">
                                {asset.equipmentType}
                              </span>
                            </div>
                            <h4 className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors truncate max-w-full">
                              {asset.name}
                            </h4>
                          </div>
                          <div className="text-[11px] text-on-surface-variant/80 border-t border-surface-border/50 pt-2.5 space-y-0.5">
                            <p className="truncate"><span className="font-medium text-on-surface/80">Manufacture:</span> {asset.manufacture || '—'}</p>
                            <p className="truncate"><span className="font-medium text-on-surface/80">SN:</span> {asset.serialNumber || '—'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LEVEL 3: Specification Sheet */}
              {selectedAssetId !== null && activeAsset && (
                <div className="space-y-6">
                  {/* Action Buttons Header */}
                  <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-surface-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {activeAsset.equipmentType}
                      </span>
                      <h2 className="text-lg font-bold text-on-surface truncate max-w-[200px] md:max-w-md">
                        {activeAsset.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectAsset(null)}
                        className="bg-white border border-surface-border hover:bg-surface-container-low text-on-surface-variant px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">arrow_back</span>
                        Kembali ke Aset
                      </button>
                      <Link
                        href={`/unit/${activeAsset.id}`}
                        className="bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xs">analytics</span>
                        Lihat Riwayat & Tren Uji
                      </Link>
                    </div>
                  </div>

                  {/* Specification Cards Grid */}
                  <div className="bg-white border border-surface-border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-border bg-surface-container-low/10">
                      <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">feed</span>
                        Spesifikasi Teknis Transformator
                      </h3>
                    </div>

                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Manufacture', value: activeAsset.manufacture || '—', icon: 'warehouse' },
                        { label: 'Type', value: activeAsset.type || '—', icon: 'label' },
                        { label: 'Serial Number', value: activeAsset.serialNumber || '—', icon: 'tag' },
                        { label: 'Tahun Buat', value: activeAsset.mfgYear ? String(activeAsset.mfgYear) : '—', icon: 'calendar_month' },
                        { label: 'Vector Group', value: activeAsset.vectorGroup || '—', icon: 'share' },
                        { label: 'Cooling Method', value: activeAsset.coolingMethod || '—', icon: 'ac_unit' },
                        { label: 'Rated Power', value: activeAsset.ratedPower || '—', icon: 'electric_bolt' },
                        { label: 'Frequency', value: activeAsset.frequency || '—', icon: 'network_check' },
                        { label: 'HV Side', value: activeAsset.hvSide || '—', icon: 'bolt' },
                        { label: 'HV Rated Current', value: activeAsset.hvRatedCurrent || '—', icon: 'speed' },
                        { label: 'LV Side', value: activeAsset.lvSide || '—', icon: 'bolt' },
                        { label: 'LV Rated Current', value: activeAsset.lvRatedCurrent || '—', icon: 'speed' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3.5 p-4 bg-surface-container-low/30 border border-surface-border/60 rounded-xl group hover:border-primary/20 transition-all hover:bg-white"
                        >
                          <span className="material-symbols-outlined text-primary text-xl bg-primary/5 p-2.5 rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">
                              {item.label}
                            </span>
                            <span className="block font-semibold text-on-surface text-sm leading-tight mt-0.5 truncate" title={item.value}>
                              {item.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

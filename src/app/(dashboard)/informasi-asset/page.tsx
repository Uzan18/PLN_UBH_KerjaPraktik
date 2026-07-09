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
  const [selectedUbpId, setSelectedUbpId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Query
  const { data: ubps, isLoading, error } = useQuery({
    queryKey: ['ubp-assets-info'],
    queryFn: fetchUbpAssets,
  });

  // Flatten assets from all UBPs
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
    // Sort alphabetically by asset name
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [ubps]);

  // Filter assets based on search query and UBP selection
  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      if (selectedUbpId && asset.ubpId !== selectedUbpId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const assetName = asset.name.toLowerCase();
        const serialNumber = (asset.serialNumber || '').toLowerCase();
        const manufacture = (asset.manufacture || '').toLowerCase();
        const type = (asset.type || '').toLowerCase();
        if (
          !assetName.includes(query) &&
          !serialNumber.includes(query) &&
          !manufacture.includes(query) &&
          !type.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allAssets, searchQuery, selectedUbpId]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUbpId]);

  // Pagination
  const totalRows = filteredAssets.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const paginatedAssets = useMemo(() => {
    return filteredAssets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredAssets, currentPage]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-outline mb-2">
        <span>Menu Utama</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-primary font-semibold">Informasi Spesifikasi Aset</span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface">Informasi Spesifikasi Aset</h1>
        <p className="text-sm text-on-surface-variant">
          Daftar spesifikasi teknis terbaru dari seluruh transformator daya yang terdaftar.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 border-b border-surface-border bg-surface-container-low/10 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          {/* Search Asset */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cari Aset</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-xs">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama unit, SN, pabrikan..."
                className="w-full bg-white border border-surface-border rounded-lg text-xs py-1.5 pl-8 pr-3 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Filter UBP */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">UBP</label>
            <select
              value={selectedUbpId}
              onChange={(e) => setSelectedUbpId(e.target.value)}
              className="w-full bg-white border border-surface-border rounded-lg text-xs py-1.5 focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua UBP</option>
              {ubps?.map((ubp: any) => (
                <option key={ubp.id} value={ubp.id}>{ubp.name}</option>
              ))}
            </select>
          </div>

          {/* Clean Filters Button */}
          <div>
            {(searchQuery || selectedUbpId) ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedUbpId('');
                }}
                className="w-full bg-surface-container hover:bg-surface-container-high border border-surface-border text-primary rounded-lg text-xs py-1.5 font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                Bersihkan Filter
              </button>
            ) : (
              <div className="h-[28px] hidden md:block" />
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error font-medium">
              Terjadi kesalahan saat memuat data spesifikasi aset.
            </div>
          ) : allAssets.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-5xl text-outline/40 block">domain_disabled</span>
              <p className="font-semibold text-base text-on-surface">Belum ada aset terdaftar</p>
              <p>Tambahkan aset baru terlebih dahulu melalui menu Master UBP & Aset.</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-5xl text-outline/40 block">filter_list_off</span>
              <p className="font-semibold text-base text-on-surface">Tidak ada data yang cocok</p>
              <p>Coba ubah kata kunci pencarian atau filter UBP Anda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-border">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[4%] text-center border-r border-surface-border">No</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[18%] sticky left-0 bg-surface-container-low z-10 border-r border-surface-border">Unit Pembangkit / Asset</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[8%] text-center border-r border-surface-border">Peralatan</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[10%] border-r border-surface-border">Manufacture</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[12%] border-r border-surface-border">Type / SN</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[6%] text-center border-r border-surface-border">Tahun Buat</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[8%] text-center border-r border-surface-border">Vector Group</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[8%] text-center border-r border-surface-border">Cooling</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[8%] text-center border-r border-surface-border">Rated Power</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[10%] text-center border-r border-surface-border">HV (Side/Current)</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[10%] text-center border-r border-surface-border">LV (Side/Current)</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-on-surface-variant w-[6%] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.map((asset: any, idx: number) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-surface-container-low transition-colors group ${
                        idx % 2 === 1 ? 'bg-surface-background' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 text-center font-mono font-medium text-on-surface-variant border-r border-surface-border">
                        {globalIdx}
                      </td>
                      <td className="px-4 py-3 font-bold text-on-surface sticky left-0 bg-inherit border-r border-surface-border group-hover:bg-surface-container-low transition-colors">
                        <div className="truncate max-w-[180px]">{asset.name}</div>
                        <div className="text-[9px] font-mono font-normal uppercase text-on-surface-variant truncate max-w-[180px]">
                          {asset.ubpName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-surface-border">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {asset.equipmentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-surface-border font-medium">
                        {asset.manufacture || '—'}
                      </td>
                      <td className="px-4 py-3 border-r border-surface-border">
                        <div className="font-semibold text-on-surface truncate max-w-[120px]" title={asset.type || ''}>
                          T: {asset.type || '—'}
                        </div>
                        <div className="text-[10px] font-mono text-on-surface-variant truncate max-w-[120px]" title={asset.serialNumber || ''}>
                          SN: {asset.serialNumber || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono border-r border-surface-border">
                        {asset.mfgYear || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-on-surface border-r border-surface-border">
                        {asset.vectorGroup || '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-on-surface-variant border-r border-surface-border">
                        {asset.coolingMethod || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-on-surface border-r border-surface-border">
                        {asset.ratedPower || '—'}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-surface-border">
                        <div className="font-semibold text-on-surface">{asset.hvSide || '—'}</div>
                        <div className="text-[10px] font-mono text-on-surface-variant">{asset.hvRatedCurrent || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-surface-border">
                        <div className="font-semibold text-on-surface">{asset.lvSide || '—'}</div>
                        <div className="text-[10px] font-mono text-on-surface-variant">{asset.lvRatedCurrent || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/unit/${asset.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-[11px] font-bold rounded hover:brightness-110 shadow-sm transition-all"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && totalRows > 0 && (
          <div className="px-6 py-3 border-t border-surface-border flex justify-between items-center bg-surface-container-low">
            <span className="font-mono text-xs text-on-surface-variant">
              Showing {totalRows > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(totalRows, currentPage * PAGE_SIZE)} of {totalRows} Assets
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      pNum === currentPage
                        ? 'bg-primary text-white border border-primary'
                        : 'border border-surface-border bg-white text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-md border border-surface-border bg-white text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

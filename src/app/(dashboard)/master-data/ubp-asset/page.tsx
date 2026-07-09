'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// Fetch helper
async function fetchUbpAssets() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP & Aset');
  const json = await res.json();
  return json.data;
}

export default function UbpAssetManagementPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // State controls
  const [expandedUbpId, setExpandedUbpId] = useState<string | null>(null);
  
  // Modals / forms state
  const [isAddUbpOpen, setIsAddUbpOpen] = useState(false);
  const [ubpName, setUbpName] = useState('');
  
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [targetUbpId, setTargetUbpId] = useState('');
  const [unitOption, setUnitOption] = useState(''); // existing unit name, or 'new-unit'
  const [newUnitName, setNewUnitName] = useState(''); // text input for new unit name
  const [equipmentType, setEquipmentType] = useState('Main Trafo');
  const [customEquipmentType, setCustomEquipmentType] = useState('');
  const [mfgYear, setMfgYear] = useState('');
  const [vectorGroup, setVectorGroup] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: ubps, isLoading, error } = useQuery({
    queryKey: ['ubp-assets-manage'],
    queryFn: fetchUbpAssets,
  });

  // Mutations
  const addUbpMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/master/ubp-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menambahkan UBP');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubps'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      setIsAddUbpOpen(false);
      setUbpName('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const deleteUbpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/ubp-asset?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus UBP');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubps'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
    },
  });

  const addAssetMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/master/ubp-asset/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menambahkan Asset');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubps'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      setIsAddAssetOpen(false);
      setUnitOption('');
      setNewUnitName('');
      setEquipmentType('Main Trafo');
      setCustomEquipmentType('');
      setMfgYear('');
      setVectorGroup('');
      setSerialNumber('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/ubp-asset/assets?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus Asset');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubps'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
    },
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white border border-surface-border rounded-xl max-w-lg mx-auto mt-20">
        <span className="material-symbols-outlined text-status-bad text-5xl mb-4">gpp_maybe</span>
        <h3 className="text-xl font-bold text-on-surface mb-2">Akses Ditolak</h3>
        <p className="text-on-surface-variant">Halaman ini hanya dapat diakses oleh administrator sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-primary mb-1">Kelola UBP & Aset Trafo</h2>
          <p className="text-sm text-on-surface-variant">Kelola daftar Unit Bisnis Pembangkit (UBP) beserta aset transformatornya.</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddUbpOpen(true);
          }}
          className="bg-primary text-white hover:brightness-110 px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Tambah UBP
        </button>
      </div>

      {/* Main List */}
      <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-status-bad">Gagal memuat data UBP & Aset.</div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-container-low font-mono text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-3.5 border-b border-surface-border w-[50px]"></th>
                <th className="px-6 py-3.5 border-b border-surface-border">Nama UBP</th>
                <th className="px-6 py-3.5 border-b border-surface-border text-center w-[150px]">Jumlah Aset</th>
                <th className="px-6 py-3.5 border-b border-surface-border text-right w-[280px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ubps?.map((ubp: any, idx: number) => {
                const isExpanded = expandedUbpId === ubp.id;
                return (
                  <tr key={ubp.id}>
                    <td colSpan={4} className="p-0">
                      <table className="w-full text-left border-collapse">
                        <tbody>
                          <tr 
                            className={`hover:bg-surface-container-low/50 transition-colors ${
                              idx % 2 === 1 ? 'bg-surface-background' : 'bg-white'
                            }`}
                          >
                            <td className="px-6 py-4 border-b border-surface-border text-center w-[50px]">
                              <button
                                onClick={() => setExpandedUbpId(isExpanded ? null : ubp.id)}
                                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-lg font-bold">
                                  {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                </span>
                              </button>
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border font-bold text-on-surface text-sm">
                              {ubp.name}
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border text-center font-mono text-sm font-semibold w-[150px]">
                              {ubp.assets?.length ?? 0}
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border text-right space-x-2 w-[280px]">
                              <button
                                onClick={() => {
                                  setErrorMsg('');
                                  setTargetUbpId(ubp.id);
                                  
                                  const assetsInUbp = ubp.assets || [];
                                  const uniqueUnits = Array.from(new Set(assetsInUbp.map((a: any) => a.name))) as string[];
                                  if (uniqueUnits.length > 0) {
                                    setUnitOption(uniqueUnits[0]);
                                  } else {
                                    setUnitOption('new-unit');
                                  }
                                  setNewUnitName('');
                                  setIsAddAssetOpen(true);
                                }}
                                className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                              >
                                Tambah Aset
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus UBP "${ubp.name}"? Ini akan menghapus semua aset dan data pengujian di dalamnya.`)) {
                                    deleteUbpMutation.mutate(ubp.id);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Assets Sub-table */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="bg-surface-container-low/40 p-6 border-b border-surface-border">
                                <div className="border border-surface-border rounded-lg overflow-hidden bg-white shadow-inner">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-surface-container-low font-mono text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-surface-border">
                                        <th className="px-4 py-2">Nama Aset / Trafo</th>
                                        <th className="px-4 py-2 w-[180px] text-center">Jenis Peralatan</th>
                                        <th className="px-4 py-2 w-[120px] text-center">Tahun Pembuatan</th>
                                        <th className="px-4 py-2 w-[120px] text-center">Vector Group</th>
                                        <th className="px-4 py-2 w-[150px]">Nomor Seri</th>
                                        <th className="px-4 py-2 w-[100px] text-right">Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-border text-xs text-on-surface">
                                      {ubp.assets && ubp.assets.length > 0 ? (
                                        ubp.assets.map((asset: any) => (
                                          <tr key={asset.id} className="hover:bg-surface-container-low/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-on-surface">{asset.name}</td>
                                            <td className="px-4 py-3 text-on-surface-variant text-center">{asset.equipmentType}</td>
                                            <td className="px-4 py-3 text-center font-mono">{asset.mfgYear ?? '—'}</td>
                                            <td className="px-4 py-3 text-center font-mono">{asset.vectorGroup ?? '—'}</td>
                                            <td className="px-4 py-3 font-mono">{asset.serialNumber ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                              <button
                                                onClick={() => {
                                                  if (confirm(`Apakah Anda yakin ingin menghapus aset "${asset.name}"? Semua data pengujian terkait akan ikut dihapus.`)) {
                                                    deleteAssetMutation.mutate(asset.id);
                                                  }
                                                }}
                                                className="text-red-600 hover:text-red-800 transition-colors font-bold cursor-pointer"
                                              >
                                                Hapus
                                              </button>
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={6} className="text-center py-6 text-on-surface-variant">Belum ada aset terdaftar untuk UBP ini.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
              {(!ubps || ubps.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-on-surface-variant font-medium">Belum ada UBP terdaftar. Silakan tambahkan UBP baru.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Add UBP Modal */}
      {isAddUbpOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-surface-border">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">domain</span>
              Tambah UBP Baru
            </h3>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama UBP</label>
                <input
                  type="text"
                  placeholder="Contoh: UBP SEMARANG"
                  value={ubpName}
                  onChange={(e) => setUbpName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddUbpOpen(false)}
                className="px-5 py-2 border border-surface-border rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => addUbpMutation.mutate(ubpName)}
                disabled={addUbpMutation.isPending}
                className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addUbpMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetOpen && (() => {
        const targetUbp = ubps?.find((u: any) => u.id === targetUbpId);
        const existingUnits = targetUbp?.assets
          ? Array.from(new Set(targetUbp.assets.map((a: any) => a.name))) as string[]
          : [];

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-surface-border">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">electrical_services</span>
                Tambah Alat Baru ke {targetUbp?.name}
              </h3>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Unit Pembangkit — conditional display */}
                  {existingUnits.length <= 1 && unitOption !== 'new-unit' ? (
                    /* Single unit or no units: show read-only label + option to add new */
                    <div className="space-y-2 col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Unit Pembangkit</label>
                      {existingUnits.length === 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 text-on-surface font-medium">
                            {existingUnits[0]}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setUnitOption('new-unit'); setNewUnitName(''); }}
                            className="px-3 py-2.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                          >
                            + Unit Baru
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setUnitOption('new-unit'); setNewUnitName(''); }}
                          className="w-full bg-surface-container-low border border-dashed border-primary/30 rounded-lg text-sm py-2.5 px-3 text-primary font-medium hover:bg-primary/5 transition-all cursor-pointer text-left"
                        >
                          + Buat Unit Pembangkit Baru
                        </button>
                      )}
                    </div>
                  ) : existingUnits.length > 1 && unitOption !== 'new-unit' ? (
                    /* Multiple distinct units: show dropdown */
                    <div className="space-y-2 col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Unit Pembangkit</label>
                      <select
                        value={unitOption}
                        onChange={(e) => {
                          setUnitOption(e.target.value);
                          if (e.target.value !== 'new-unit') {
                            setNewUnitName('');
                          }
                        }}
                        className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                      >
                        {existingUnits.map((uName) => (
                          <option key={uName} value={uName}>{uName}</option>
                        ))}
                        <option value="new-unit">+ Tambah Unit Baru...</option>
                      </select>
                    </div>
                  ) : null}

                  {/* New Unit Name Text Input */}
                  {unitOption === 'new-unit' && (
                    <div className="space-y-2 col-span-2 animate-fade-in">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Unit Pembangkit Baru</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Contoh: PLTU ASAM ASAM 5"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value)}
                          className="flex-1 bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                        />
                        {existingUnits.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setUnitOption(existingUnits[0])}
                            className="px-3 py-2.5 bg-surface-container-low border border-surface-border text-xs font-bold text-on-surface-variant rounded-lg hover:bg-surface-container transition-all cursor-pointer whitespace-nowrap"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 col-span-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Jenis Alat / Peralatan</label>
                    <select
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                    >
                      <option value="Main Trafo">Main Trafo</option>
                      <option value="UAT">UAT</option>
                      <option value="SST">SST</option>
                      <option value="Trafo Bantu">Trafo Bantu</option>
                      <option value="Custom">Lain-lain (Kustom)</option>
                    </select>
                  </div>

                  {equipmentType === 'Custom' && (
                    <div className="space-y-2 col-span-2 animate-fade-in">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Jenis Alat Kustom</label>
                      <input
                        type="text"
                        placeholder="Contoh: Trafo Start"
                        value={customEquipmentType}
                        onChange={(e) => setCustomEquipmentType(e.target.value)}
                        className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-2 col-span-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tahun Pembuatan</label>
                    <input
                      type="number"
                      placeholder="Contoh: 2015"
                      value={mfgYear}
                      onChange={(e) => setMfgYear(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Vector Group</label>
                    <input
                      type="text"
                      placeholder="Contoh: YNd11"
                      value={vectorGroup}
                      onChange={(e) => setVectorGroup(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nomor Seri</label>
                    <input
                      type="text"
                      placeholder="Contoh: 12345678"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsAddAssetOpen(false)}
                  className="px-5 py-2 border border-surface-border rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const finalUnit = unitOption === 'new-unit' ? newUnitName : unitOption;
                    if (!finalUnit || finalUnit.trim() === '') {
                      setErrorMsg('Unit Pembangkit wajib dipilih atau diisi');
                      return;
                    }
                    const finalType = equipmentType === 'Custom' ? customEquipmentType : equipmentType;
                    if (!finalType || finalType.trim() === '') {
                      setErrorMsg('Jenis Peralatan wajib diisi');
                      return;
                    }
                    addAssetMutation.mutate({
                      ubpId: targetUbpId,
                      equipmentType: finalType.trim(),
                      name: finalUnit.trim(),
                      mfgYear: mfgYear ? parseInt(mfgYear) : undefined,
                      vectorGroup: vectorGroup || undefined,
                      serialNumber: serialNumber || undefined,
                    });
                  }}
                  disabled={addAssetMutation.isPending}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {addAssetMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

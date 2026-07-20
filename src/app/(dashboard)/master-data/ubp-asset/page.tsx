'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});

  // Modals / forms state
  const [isAddUbpOpen, setIsAddUbpOpen] = useState(false);
  const [ubpName, setUbpName] = useState('');
  const [editingUbp, setEditingUbp] = useState<any | null>(null);

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [targetUbpId, setTargetUbpId] = useState('');
  const [unitName, setUnitName] = useState('');
  const [editingUnit, setEditingUnit] = useState<any | null>(null);

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [selectedJenisId, setSelectedJenisId] = useState('');
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
    const [newJenisName, setNewJenisName] = useState('');
    const [mfgYear, setMfgYear] = useState('');
    const [vectorGroup, setVectorGroup] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [assetTypeField, setAssetTypeField] = useState('');
    const [manufacture, setManufacture] = useState('');
    const [coolingMethod, setCoolingMethod] = useState('');
    const [ratedPower, setRatedPower] = useState('');
    const [frequency, setFrequency] = useState('');
    const [hvSide, setHvSide] = useState('');
    const [hvRatedCurrent, setHvRatedCurrent] = useState('');
    const [lvSide, setLvSide] = useState('');
    const [lvRatedCurrent, setLvRatedCurrent] = useState('');
    const [customValues, setCustomValues] = useState<Record<string, string>>({});

    const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: ubps, isLoading, error } = useQuery({
    queryKey: ['ubp-assets-manage'],
    queryFn: fetchUbpAssets,
  });

  const { data: jenisAssetList, isLoading: isJenisLoading } = useQuery({
    queryKey: ['jenis-asset'],
    queryFn: async () => {
      const res = await fetch('/api/master/jenis-asset');
      if (!res.ok) throw new Error('Gagal mengambil data Jenis Asset');
      const json = await res.json();
      return json.data;
    }
  });

  // Filter jenisAssetList
  const filteredSubTypes = useMemo(() => {
    return jenisAssetList || [];
  }, [jenisAssetList]);

  const activeInfoFields = useMemo(() => {
    if (!selectedJenisId || selectedJenisId === 'new-jenis') return null;
    const ja = jenisAssetList?.find((j: any) => j.id === selectedJenisId);
    if (!ja || !ja.infoFields) return null;
    try {
      return JSON.parse(ja.infoFields) as any[];
    } catch (e) {
      return null;
    }
  }, [selectedJenisId, jenisAssetList]);

  const isFieldActive = (key: string) => {
    if (!activeInfoFields) return true;
    return activeInfoFields.some((item) => {
      const itemKey = typeof item === 'string' ? item : item.key;
      return itemKey.toLowerCase() === key.toLowerCase();
    });
  };

  // Automatically select the first JenisAsset in the list
  useEffect(() => {
    if (filteredSubTypes.length > 0) {
      const exists = filteredSubTypes.some((j: any) => j.id === selectedJenisId);
      if (!exists && selectedJenisId !== 'new-jenis') {
        setSelectedJenisId(filteredSubTypes[0].id);
      }
    } else {
      setSelectedJenisId('new-jenis');
    }
  }, [filteredSubTypes, selectedJenisId]);

  // Toggle expanded state for Unit Pembangkit
  const toggleUnit = (unitId: string) => {
    setExpandedUnitIds((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Mutations
  const editUbpMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch('/api/master/ubp-asset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal mengubah nama UBP');
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
      setEditingUbp(null);
      setUbpName('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const editUnitMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch('/api/master/ubp-asset/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal mengubah nama Unit Pembangkit');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      setIsAddUnitOpen(false);
      setEditingUnit(null);
      setUnitName('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const editAssetMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/master/ubp-asset/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal mengubah Asset');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      setIsAddAssetOpen(false);
      setEditingAsset(null);
      setAssetName('');
      setNewJenisName('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

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

  const addUnitMutation = useMutation({
    mutationFn: async ({ ubpId, name }: { ubpId: string; name: string }) => {
      const res = await fetch('/api/master/ubp-asset/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ubpId, name }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menambahkan Unit Pembangkit');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      setIsAddUnitOpen(false);
      setUnitName('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/ubp-asset/units?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus Unit Pembangkit');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
    },
  });

  const addJenisMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      const res = await fetch('/api/master/jenis-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menambahkan Jenis Asset');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-asset'] });
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
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      setIsAddAssetOpen(false);
      setTargetUnitId('');
      setAssetName('');
      setNewJenisName('');
      setMfgYear('');
      setVectorGroup('');
      setSerialNumber('');
      setAssetTypeField('');
      setManufacture('');
      setCoolingMethod('');
      setRatedPower('');
      setFrequency('');
      setHvSide('');
      setHvRatedCurrent('');
      setLvSide('');
      setLvRatedCurrent('');
      setCustomValues({});
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
          <h2 className="text-2xl font-semibold text-primary mb-1">Kelola UBP & Asset</h2>
          <p className="text-sm text-on-surface-variant">Kelola UBP, Unit Pembangkit, dan Aset secara terperinci.</p>
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
          <table className="w-full text-left border-separate border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-surface-container-low font-mono text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-3.5 border-b border-surface-border w-[60px]"></th>
                <th className="px-6 py-3.5 border-b border-surface-border">Nama UBP</th>
                <th className="px-6 py-3.5 border-b border-surface-border text-center w-[220px]">Jumlah Unit Pembangkit</th>
                <th className="px-6 py-3.5 border-b border-surface-border text-center w-[350px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ubps?.map((ubp: any, idx: number) => {
                const isExpanded = expandedUbpId === ubp.id;
                const unitCount = ubp.unitPembangkit?.length ?? 0;
                return (
                  <tr key={ubp.id}>
                    <td colSpan={4} className="p-0">
                      <table className="w-full text-left border-collapse table-fixed">
                        <tbody>
                          <tr 
                            className={`hover:bg-surface-container-low/50 transition-colors ${
                              idx % 2 === 1 ? 'bg-surface-background' : 'bg-white'
                            }`}
                          >
                            <td className="px-6 py-4 border-b border-surface-border text-center w-[60px]">
                              <button
                                onClick={() => setExpandedUbpId(isExpanded ? null : ubp.id)}
                                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-lg font-bold">
                                  {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                </span>
                              </button>
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border font-bold text-on-surface text-sm truncate">
                              {ubp.name}
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border text-center font-mono text-sm font-semibold w-[220px]">
                              {unitCount}
                            </td>
                            <td className="px-6 py-4 border-b border-surface-border text-center space-x-2 w-[350px]">
                              <button
                                onClick={() => {
                                  setErrorMsg('');
                                  setTargetUbpId(ubp.id);
                                  setUnitName('');
                                  setIsAddUnitOpen(true);
                                }}
                                className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                              >
                                Tambah Unit
                              </button>
                              <button
                                onClick={() => {
                                  setErrorMsg('');
                                  setEditingUbp(ubp);
                                  setUbpName(ubp.name);
                                  setIsAddUbpOpen(true);
                                }}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                              >
                                Edit UBP
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus UBP "${ubp.name}"? Ini akan menghapus semua unit, aset, dan data pengujian di dalamnya.`)) {
                                    deleteUbpMutation.mutate(ubp.id);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                              >
                                Hapus UBP
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Unit Pembangkit List */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="bg-surface-container-low/40 py-2.5 px-6 border-b border-surface-border">
                                <div className="space-y-2">
                                  {ubp.unitPembangkit && ubp.unitPembangkit.length > 0 ? (
                                    <div className="space-y-1">
                                      {ubp.unitPembangkit.map((unit: any) => {
                                        const isUnitExpanded = !!expandedUnitIds[unit.id];
                                        const assetCount = unit.assets?.length ?? 0;
                                        return (
                                          <div key={unit.id} className="border-b border-surface-border/60 last:border-0 bg-transparent">
                                            {/* Unit Header Row */}
                                            <div className="flex justify-between items-center py-2 px-3 hover:bg-surface-container-low/30 transition-colors rounded-lg">
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => toggleUnit(unit.id)}
                                                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer flex items-center justify-center p-0.5"
                                                >
                                                  <span className="material-symbols-outlined text-base font-bold select-none">
                                                    {isUnitExpanded ? 'expand_more' : 'chevron_right'}
                                                  </span>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-xs text-on-surface">{unit.name}</span>
                                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-container font-mono text-on-surface-variant/80">
                                                    {assetCount} Aset
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex gap-1.5">
                                                <button
                                                  onClick={() => {
                                                    setErrorMsg('');
                                                    setTargetUnitId(unit.id);
                                                    setAssetName('');
                                                    setMfgYear('');
                                                    setVectorGroup('');
                                                    setSerialNumber('');
                                                    if (jenisAssetList && jenisAssetList.length > 0) {
                                                      setSelectedJenisId(jenisAssetList[0].id);
                                                    }
                                                    setIsAddAssetOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                                >
                                                  + Tambah Aset
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setErrorMsg('');
                                                    setEditingUnit(unit);
                                                    setUnitName(unit.name);
                                                    setIsAddUnitOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-bold rounded active:scale-95 transition-all cursor-pointer"
                                                >
                                                  Edit Unit
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (confirm(`Apakah Anda yakin ingin menghapus unit "${unit.name}"? Ini akan menghapus semua aset di dalamnya.`)) {
                                                      deleteUnitMutation.mutate(unit.id);
                                                    }
                                                  }}
                                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-bold rounded active:scale-95 transition-all cursor-pointer"
                                                >
                                                  Hapus Unit
                                                </button>
                                              </div>
                                            </div>

                                            {/* Nested Assets Table */}
                                            {isUnitExpanded && (
                                              <div className="pl-6 pr-2 pb-3 pt-1">
                                                <table className="w-full text-left border-collapse bg-white border border-surface-border rounded-lg overflow-hidden shadow-sm">
                                                  <thead>
                                                    <tr className="bg-surface-container-low font-mono text-[9px] text-on-surface-variant uppercase tracking-wider border-b border-surface-border">
                                                      <th className="px-3 py-1.5">Nama Aset</th>
                                                      <th className="px-3 py-1.5 text-center">Jenis Aset</th>
                                                      <th className="px-3 py-1.5 text-center">Tahun Pembuatan</th>
                                                      <th className="px-3 py-1.5 text-center">Manufacture</th>
                                                      <th className="px-3 py-1.5 text-center">Nomor Seri</th>
                                                      <th className="px-3 py-1.5 text-center">Aksi</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-surface-border text-[11px] text-on-surface">
                                                    {unit.assets && unit.assets.length > 0 ? (
                                                      unit.assets.map((asset: any) => (
                                                        <tr key={asset.id} className="hover:bg-surface-container-low/30 transition-colors">
                                                          <td className="px-3 py-2 font-semibold text-on-surface">{asset.name}</td>
                                                          <td className="px-3 py-2 text-on-surface-variant text-center font-medium">
                                                            {asset.jenisAsset?.name || '—'}
                                                          </td>
                                                          <td className="px-3 py-2 text-center font-mono">{asset.mfgYear ?? '—'}</td>
                                                          <td className="px-3 py-2 text-center font-mono">{asset.vectorGroup ?? '—'}</td>
                                                          <td className="px-3 py-2 text-center font-mono">{asset.serialNumber ?? '—'}</td>
                                                          <td className="px-3 py-2 text-center space-x-2">
                                                            <button
                                                              onClick={() => {
                                                                setErrorMsg('');
                                                                setEditingAsset(asset);
                                                                setAssetName(asset.name);
                                                                setSelectedJenisId(asset.jenisAssetId || '');
                                                                setIsAddAssetOpen(true);
                                                              }}
                                                              className="text-amber-600 hover:text-amber-800 transition-colors font-bold cursor-pointer"
                                                            >
                                                              Edit
                                                            </button>
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
                                                        <td colSpan={6} className="text-center py-4 text-on-surface-variant text-xs">Belum ada aset terdaftar untuk Unit Pembangkit ini.</td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center bg-white border border-surface-border border-dashed rounded-lg text-on-surface-variant">
                                      Belum ada Unit Pembangkit terdaftar untuk UBP ini. Silakan tambahkan Unit Pembangkit terlebih dahulu.
                                    </div>
                                  )}
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
              {editingUbp ? 'Edit Nama UBP' : 'Tambah UBP Baru'}
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
                onClick={() => {
                  setIsAddUbpOpen(false);
                  setEditingUbp(null);
                  setUbpName('');
                }}
                className="px-5 py-2 border border-surface-border rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (editingUbp) {
                    editUbpMutation.mutate({ id: editingUbp.id, name: ubpName });
                  } else {
                    addUbpMutation.mutate(ubpName);
                  }
                }}
                disabled={addUbpMutation.isPending || editUbpMutation.isPending}
                className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addUbpMutation.isPending || editUbpMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Pembangkit Modal */}
      {isAddUnitOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-surface-border">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">factory</span>
              {editingUnit ? 'Edit Unit Pembangkit' : 'Tambah Unit Pembangkit'}
            </h3>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Unit Pembangkit</label>
                <input
                  type="text"
                  placeholder="Contoh: PLTU SEMARANG UNIT 1"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddUnitOpen(false);
                  setEditingUnit(null);
                  setUnitName('');
                }}
                className="px-5 py-2 border border-surface-border rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (editingUnit) {
                    editUnitMutation.mutate({ id: editingUnit.id, name: unitName });
                  } else {
                    addUnitMutation.mutate({ ubpId: targetUbpId, name: unitName });
                  }
                }}
                disabled={addUnitMutation.isPending || editUnitMutation.isPending}
                className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addUnitMutation.isPending || editUnitMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-surface-border">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">electrical_services</span>
              {editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}
            </h3>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Jenis Aset</label>
                  <select
                    value={selectedJenisId}
                    onChange={(e) => setSelectedJenisId(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                  >
                    {isJenisLoading ? (
                      <option>Loading...</option>
                    ) : (
                      filteredSubTypes.map((jenis: any) => (
                        <option key={jenis.id} value={jenis.id}>{jenis.name}</option>
                      ))
                    )}
                    {!editingAsset && <option value="new-jenis">+ Tambah Jenis Baru...</option>}
                  </select>
                </div>

                {selectedJenisId === 'new-jenis' && !editingAsset && (
                  <div className="space-y-2 col-span-2 animate-fade-in">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Jenis Aset Baru</label>
                    <input
                      type="text"
                      placeholder="Contoh: Boiler, Turbin Gas, Main Generator"
                      value={newJenisName}
                      onChange={(e) => setNewJenisName(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-2 col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Aset (Peralatan)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Main Trafo, Generator, SST A"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddAssetOpen(false);
                  setEditingAsset(null);
                  setAssetName('');
                  setSelectedJenisId(jenisAssetList?.[0]?.id || '');
                }}
                className="px-5 py-2 border border-surface-border rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!assetName || assetName.trim() === '') {
                    setErrorMsg('Nama Aset wajib diisi');
                    return;
                  }

                  let finalJenisId = selectedJenisId;
                  if (selectedJenisId === 'new-jenis' && !editingAsset) {
                    if (!newJenisName || newJenisName.trim() === '') {
                      setErrorMsg('Nama Jenis Aset Baru wajib diisi');
                      return;
                    }
                    try {
                      const res = await addJenisMutation.mutateAsync({ name: newJenisName, category: 'Trafo' });
                      finalJenisId = res.data.id;
                    } catch (e: any) {
                      setErrorMsg(e.message || 'Gagal menambahkan Jenis Asset baru');
                      return;
                    }
                  }

                  if (!finalJenisId) {
                    setErrorMsg('Jenis Aset wajib dipilih');
                    return;
                  }

                  if (editingAsset) {
                    editAssetMutation.mutate({
                      id: editingAsset.id,
                      name: assetName.trim(),
                      jenisAssetId: finalJenisId,
                    });
                  } else {
                    addAssetMutation.mutate({
                      unitPembangkitId: targetUnitId,
                      name: assetName.trim(),
                      jenisAssetId: finalJenisId,
                    });
                  }
                }}
                disabled={addAssetMutation.isPending || addJenisMutation.isPending || editAssetMutation.isPending}
                className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addAssetMutation.isPending || addJenisMutation.isPending || editAssetMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

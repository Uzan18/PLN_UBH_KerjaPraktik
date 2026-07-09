'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch helper functions
async function fetchUbpAssets() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP & Aset');
  const json = await res.json();
  return json.data;
}

async function fetchTestTypes() {
  const res = await fetch('/api/master/test-types');
  if (!res.ok) throw new Error('Gagal mengambil data jenis pengujian');
  const json = await res.json();
  return json.data;
}

interface TestType {
  id: string;
  name: string;
  orderIndex: number;
}

interface Asset {
  id: string;
  name: string;
  equipmentType: string;
  serialNumber: string | null;
  testTypes?: TestType[];
}

interface Ubp {
  id: string;
  name: string;
  assets?: Asset[];
}

export default function ManagePengujianPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<string[]>([]);
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [expandedUbps, setExpandedUbps] = useState<Record<string, boolean>>({});

  // Fetch data
  const { data: ubps, isLoading: isUbpsLoading } = useQuery<Ubp[]>({
    queryKey: ['ubp-assets'],
    queryFn: fetchUbpAssets,
  });

  const { data: testTypes, isLoading: isTestTypesLoading } = useQuery<TestType[]>({
    queryKey: ['test-types'],
    queryFn: fetchTestTypes,
  });

  // Automatically expand first UBP when loaded
  useEffect(() => {
    if (ubps && ubps.length > 0 && Object.keys(expandedUbps).length === 0) {
      setExpandedUbps({ [ubps[0].id]: true });
    }
  }, [ubps, expandedUbps]);

  // Set selected test types when an asset is clicked
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    const configuredIds = asset.testTypes?.map((t) => t.id) || [];
    setSelectedTestTypeIds(configuredIds);
  };

  // Toggle UBP collapse/expand
  const toggleUbp = (ubpId: string) => {
    setExpandedUbps((prev) => ({
      ...prev,
      [ubpId]: !prev[ubpId],
    }));
  };

  // Toggle test type selection
  const handleToggleTestType = (id: string) => {
    setSelectedTestTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (!testTypes) return;
    if (selectedTestTypeIds.length === testTypes.length) {
      setSelectedTestTypeIds([]);
    } else {
      setSelectedTestTypeIds(testTypes.map((t) => t.id));
    }
  };

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async ({ assetId, testTypeIds }: { assetId: string; testTypeIds: string[] }) => {
      const res = await fetch('/api/master/ubp-asset/assets/test-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, testTypeIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan konfigurasi');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      alert('Konfigurasi pengujian aset berhasil disimpan!');
      // Refetch UBP-Asset data to refresh the asset's testTypes in state
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });

      // Update local selected asset state with new testTypes
      if (selectedAsset && testTypes) {
        const updatedTestTypes = testTypes.filter((t) => variables.testTypeIds.includes(t.id));
        setSelectedAsset({
          ...selectedAsset,
          testTypes: updatedTestTypes,
        });
      }
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan.');
    },
  });

  const handleSave = () => {
    if (!selectedAsset) return;
    saveMutation.mutate({
      assetId: selectedAsset.id,
      testTypeIds: selectedTestTypeIds,
    });
  };

  // Filter test types based on search
  const filteredTestTypes = testTypes?.filter((t) =>
    t.name.toLowerCase().includes(searchTestQuery.toLowerCase())
  );

  const isLoading = isUbpsLoading || isTestTypesLoading;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1440px] mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-primary mb-1">Kelola Jenis Pengujian Aset</h2>
          <p className="text-sm text-on-surface-variant">Konfigurasikan jenis pengujian apa saja yang berlaku untuk masing-masing trafo.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left: UBP & Asset List (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm">
            <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">domain</span>
              Daftar Unit Bisnis & Aset
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : !ubps || ubps.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant font-medium text-sm">
                Tidak ada data UBP & Aset.
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                {ubps.map((ubp) => {
                  const isExpanded = !!expandedUbps[ubp.id];
                  const assetCount = ubp.assets?.length || 0;

                  return (
                    <div key={ubp.id} className="border border-surface-border rounded-lg overflow-hidden">
                      {/* UBP Header */}
                      <button
                        onClick={() => toggleUbp(ubp.id)}
                        className="w-full flex items-center justify-between p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors focus:outline-none text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-xl">
                            {isExpanded ? 'expand_more' : 'chevron_right'}
                          </span>
                          <span className="font-semibold text-sm text-on-surface truncate">{ubp.name}</span>
                        </div>
                        <span className="bg-primary/10 text-primary font-mono text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {assetCount} Aset
                        </span>
                      </button>

                      {/* Assets List */}
                      {isExpanded && (
                        <div className="bg-white border-t border-surface-border divide-y divide-surface-border/50">
                          {assetCount === 0 ? (
                            <div className="p-3 text-xs text-on-surface-variant/70 italic text-center">
                              Belum ada aset terdaftar
                            </div>
                          ) : (
                            ubp.assets?.map((asset) => {
                              const isSelected = selectedAsset?.id === asset.id;
                              const testCount = asset.testTypes?.length || 0;

                              return (
                                <button
                                  key={asset.id}
                                  onClick={() => handleSelectAsset(asset)}
                                  className={`w-full text-left p-3 flex flex-col gap-1 transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary-container text-on-primary-container font-medium'
                                      : 'hover:bg-surface-container-low text-on-surface'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="text-xs font-bold truncate max-w-[170px]">{asset.name}</span>
                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                      testCount > 0 
                                        ? 'bg-status-good/15 text-status-good-text' 
                                        : 'bg-outline/10 text-on-surface-variant'
                                    }`}>
                                      {testCount} Jenis
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] opacity-80 w-full font-mono">
                                    <span>{asset.equipmentType}</span>
                                    {asset.serialNumber && <span className="truncate max-w-[100px]">SN: {asset.serialNumber}</span>}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Configuration Form (col-span-12 lg:col-span-8) */}
        <div className="col-span-12 lg:col-span-8">
          {selectedAsset ? (
            <div className="bg-white rounded-xl border border-surface-border p-6 shadow-sm space-y-6 animate-fade-in">
              {/* Selected Asset Header Info */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-surface-border flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                      {selectedAsset.equipmentType}
                    </span>
                    {selectedAsset.serialNumber && (
                      <span className="text-xs font-mono text-on-surface-variant">
                        No. Seri: {selectedAsset.serialNumber}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-on-surface">{selectedAsset.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Total Terpilih</p>
                  <p className="text-xl font-bold text-primary font-mono">{selectedTestTypeIds.length} / {testTypes?.length || 0}</p>
                </div>
              </div>

              {/* Selection list */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border">
                  <h3 className="text-base font-bold text-on-surface">Pilih Jenis Pengujian yang Berlaku</h3>
                  <div className="flex items-center gap-3">
                    {/* Select All */}
                    <button
                      onClick={handleSelectAll}
                      className="text-xs font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                    >
                      {testTypes && selectedTestTypeIds.length === testTypes.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                    {/* Search */}
                    <div className="relative w-48">
                      <input
                        type="text"
                        placeholder="Cari pengujian..."
                        value={searchTestQuery}
                        onChange={(e) => setSearchTestQuery(e.target.value)}
                        className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 pl-8 pr-3 focus:ring-primary focus:border-primary"
                      />
                      <span className="material-symbols-outlined text-outline absolute left-2 top-1/2 -translate-y-1/2 text-sm">
                        search
                      </span>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : !filteredTestTypes || filteredTestTypes.length === 0 ? (
                  <div className="text-center py-20 text-on-surface-variant font-medium text-sm">
                    {searchTestQuery ? 'Tidak ada jenis pengujian yang cocok.' : 'Tidak ada jenis pengujian tersedia.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {filteredTestTypes.map((test) => {
                      const isChecked = selectedTestTypeIds.includes(test.id);

                      return (
                        <div
                          key={test.id}
                          onClick={() => handleToggleTestType(test.id)}
                          className={`p-3 rounded-lg border-2 flex items-center justify-between cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-primary bg-primary-container/10 text-primary-text'
                              : 'border-surface-border bg-white text-on-surface hover:bg-surface-container-low'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-4.5 w-4.5 text-primary border-surface-border rounded focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs font-semibold font-mono truncate">{test.name}</span>
                          </div>
                          <span className="bg-surface-container text-on-surface-variant font-mono text-[9px] px-1.5 py-0.5 rounded border border-surface-border/50">
                            Idx: {test.orderIndex}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  onClick={() => handleSelectAsset(selectedAsset)}
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 border border-surface-border hover:bg-surface-container-low rounded-lg font-bold text-xs text-on-surface-variant transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Reset Pilihan
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-6 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  {!saveMutation.isPending && (
                    <span className="material-symbols-outlined text-sm">save</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-border p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[50vh]">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">fact_check</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Pilih Aset Terlebih Dahulu</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                Silakan pilih salah satu transformator / unit pembangkit di daftar sebelah kiri untuk mengonfigurasi jenis pengujian yang berlaku.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

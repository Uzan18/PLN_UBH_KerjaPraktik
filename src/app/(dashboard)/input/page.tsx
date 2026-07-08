'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel } from '@/types';

// Fetch helpers
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

export default function InputPage() {
  // Filters/selections state
  const [testYear, setTestYear] = useState(String(new Date().getFullYear()));
  const [selectedUbpId, setSelectedUbpId] = useState('');
  const [selectedUnitName, setSelectedUnitName] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedTestTypeId, setSelectedTestTypeId] = useState('');

  // Values input state: parameterId -> string value
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // Calculated status state: parameterId -> { score, judgement }
  const [calculatedStatuses, setCalculatedStatuses] = useState<Record<string, { score: number | null, judgement: JudgementLabel }>>({});

  // Active Session ID (if created/found)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Queries
  const { data: ubps, isLoading: isUbpsLoading } = useQuery({
    queryKey: ['ubp-assets'],
    queryFn: fetchUbpAssets,
  });

  const { data: testTypes, isLoading: isTestTypesLoading } = useQuery({
    queryKey: ['test-types'],
    queryFn: fetchTestTypes,
  });

  // Load existing session and results when selectedAssetId or testYear changes
  useEffect(() => {
    if (!selectedAssetId || !testYear) {
      setActiveSessionId(null);
      setInputValues({});
      setCalculatedStatuses({});
      return;
    }

    async function loadExistingSession() {
      try {
        const res = await fetch(`/api/test-sessions?assetId=${selectedAssetId}&testYear=${testYear}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const session = json.data;
          setActiveSessionId(session.id);
          
          // Map testResults to inputValues and calculatedStatuses
          const vals: Record<string, string> = {};
          const stats: Record<string, { score: number | null, judgement: JudgementLabel }> = {};
          
          session.testResults?.forEach((r: any) => {
            vals[r.parameterId] = r.isNotApplicable ? '' : String(r.value !== null ? r.value : '');
            if (r.score !== null && r.score !== undefined) {
              stats[r.parameterId] = {
                score: r.score,
                judgement: r.judgement,
              };
            }
          });
          
          setInputValues(vals);
          setCalculatedStatuses(stats);
        } else {
          setActiveSessionId(null);
          setInputValues({});
          setCalculatedStatuses({});
        }
      } catch (e) {
        console.error('Error loading existing session:', e);
      }
    }

    loadExistingSession();
  }, [selectedAssetId, testYear]);

  // Set default selected test type when testTypes load
  useEffect(() => {
    if (testTypes && testTypes.length > 0 && !selectedTestTypeId) {
      setSelectedTestTypeId(testTypes[0].id);
    }
  }, [testTypes, selectedTestTypeId]);

  // Find selected UBP & Asset
  const selectedUbp = ubps?.find((u: any) => u.id === selectedUbpId);
  const selectedAsset = selectedUbp?.assets?.find((a: any) => a.id === selectedAssetId);

  // Sync selectedUnitName with selectedAsset when it changes
  useEffect(() => {
    if (selectedAsset) {
      setSelectedUnitName(selectedAsset.name);
    }
  }, [selectedAsset]);

  // Get active test type parameters
  const activeTestType = testTypes?.find((tt: any) => tt.id === selectedTestTypeId);

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: selectedAssetId, testYear }),
      });
      if (!res.ok) throw new Error('Gagal membuat sesi pengujian');
      const json = await res.json();
      return json.data;
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async ({ sessionId, results }: { sessionId: string; results: any[] }) => {
      const res = await fetch(`/api/test-sessions/${sessionId}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan hasil pengukuran');
      const json = await res.json();
      return json.data;
    },
  });

  const submitSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/test-sessions/${sessionId}/submit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengirim untuk validasi');
      }
      return res.json();
    },
    onSuccess: () => {
      alert('Data pengujian berhasil disubmit untuk validasi!');
      // Reset form
      setInputValues({});
      setCalculatedStatuses({});
      setActiveSessionId(null);
    },
  });

  // Calculate scores locally or on value change
  function handleValueChange(parameterId: string, val: string, criteria: any) {
    setInputValues((prev) => ({ ...prev, [parameterId]: val }));

    if (val === null || val === undefined || val.trim() === '') {
      setCalculatedStatuses((prev) => {
        const copy = { ...prev };
        delete copy[parameterId];
        return copy;
      });
      return;
    }

    // Embed client-side preview of scoring if criteria is present
    const parsedVal = parseFloat(val);
    if (isNaN(parsedVal)) {
      setCalculatedStatuses((prev) => {
        const copy = { ...prev };
        delete copy[parameterId];
        return copy;
      });
      return;
    }

    const c = criteria?.[0]; // Active criteria
    
    if (c) {
      // Helper to parse threshold bound
      const parseBound = (boundStr: string | null) => {
        if (!boundStr || boundStr.toUpperCase() === 'NA') return null;
        const trimmed = boundStr.trim();
        const geMatch = trimmed.match(/^>=?\s*([\d.-]+)$/);
        if (geMatch) return { min: parseFloat(geMatch[1]), max: null };
        const leMatch = trimmed.match(/^<=?\s*([\d.-]+)$/);
        if (leMatch) return { min: null, max: parseFloat(leMatch[1]) };
        const rangeMatch = trimmed.match(/^([\d.-]+)\s*-\s*([\d.-]+)$/);
        if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
        const numMatch = trimmed.match(/^([\d.-]+)$/);
        if (numMatch) return { min: parseFloat(numMatch[1]), max: parseFloat(numMatch[1]) };
        return null;
      };

      const good = parseBound(c.goodValue);
      const fair = parseBound(c.fairValue);
      const poor = parseBound(c.poorValue);
      const bad = parseBound(c.badValue);

      let score: number | null = 1;
      let judgement: JudgementLabel = 'BAD';

      if (good && ((good.min === null || parsedVal >= good.min) && (good.max === null || parsedVal <= good.max))) {
        score = 5; judgement = 'GOOD';
      } else if (fair && ((fair.min === null || parsedVal >= fair.min) && (fair.max === null || parsedVal <= fair.max))) {
        score = 4; judgement = 'FAIR';
      } else if (poor && ((poor.min === null || parsedVal >= poor.min) && (poor.max === null || parsedVal <= poor.max))) {
        score = 2; judgement = 'POOR';
      } else if (bad && ((bad.min === null || parsedVal >= bad.min) && (bad.max === null || parsedVal <= bad.max))) {
        score = 1; judgement = 'BAD';
      }

      setCalculatedStatuses((prev) => ({
        ...prev,
        [parameterId]: { score, judgement },
      }));
    }
  }

  async function handleSaveDraft() {
    if (!selectedAssetId) {
      alert('Silakan pilih Unit Pembangkit/Asset terlebih dahulu.');
      return;
    }

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const session = await createSessionMutation.mutateAsync();
        sessionId = session.id;
        setActiveSessionId(sessionId);
      }

      const results = Object.entries(inputValues).map(([parameterId, val]) => ({
        parameterId,
        value: val ? parseFloat(val) : null,
        isNotApplicable: !val,
      }));

      await saveResultsMutation.mutateAsync({ sessionId: sessionId!, results });
      alert('Draft berhasil disimpan!');
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan saat menyimpan draft.');
    }
  }

  async function handleSubmit() {
    if (!selectedAssetId) {
      alert('Silakan pilih Unit Pembangkit/Asset terlebih dahulu.');
      return;
    }

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const session = await createSessionMutation.mutateAsync();
        sessionId = session.id;
        setActiveSessionId(sessionId);
      }

      const results = Object.entries(inputValues).map(([parameterId, val]) => ({
        parameterId,
        value: val ? parseFloat(val) : null,
        isNotApplicable: !val,
      }));

      await saveResultsMutation.mutateAsync({ sessionId: sessionId!, results });
      await submitSessionMutation.mutateAsync(sessionId!);
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan saat mengirim data.');
    }
  }

  // Damage Mechanisms definitions
  const mechanisms = [
    'Deformation',
    'Dielectric Problem',
    'OTI/WTI Problem',
    'Leakage',
    'LA Problem',
    'Core defect',
    'Bushing-Electrical defect',
    'Oil Problem',
    'Grounding Problem',
    'Bushing-Mechanical defect',
    'Winding & Connection',
    'Thermal Problem',
    'Breating system',
  ];

  function getMechanismPreview(mechanism: string) {
    let minScore: number | null = null;

    testTypes?.forEach((tt: any) => {
      tt.parameters?.forEach((param: any) => {
        const calc = calculatedStatuses[param.id];
        if (!calc || calc.score === null || calc.score === undefined) return;

        const ttName = tt.name.toUpperCase();
        const pName = param.name.toUpperCase();

        let match = false;
        switch (mechanism) {
          case 'Bushing-Electrical defect':
            match = ttName.includes('TAN DELTA BUSHING') || ttName.includes('WATT LOSS BUSHING');
            break;
          case 'Bushing-Mechanical defect':
            match = ttName.includes('VISUAL INSPECTION') && (pName.includes('BUSHING DEFECT') || pName.includes('CONTAMINANT'));
            break;
          case 'Deformation':
            match = ttName.includes('SFRA') || ttName.includes('DEFORMATION');
            break;
          case 'Winding & Connection':
            match = ttName.includes('TURN TO TURN RATIO') || ttName.includes('WINDING RESISTANCE');
            break;
          case 'Core defect':
            match = ttName.includes('EXC CURRENT') || pName.includes('EXC');
            break;
          case 'Dielectric Problem':
            match = ttName.includes('INSULATION RESISTANCE') || ttName.includes('TAN DELTA WINDING') || ttName.includes('DIRANA MOISTURE');
            break;
          case 'Oil Problem':
            match = (ttName.includes('OIL ANALYSIS') && (pName.includes('STATUS') || pName.includes('BDV'))) || ttName.includes('DIRANA OIL CONDUCT') || ttName.includes('OIL CONDUCTIVITY');
            break;
          case 'Leakage':
            match = ttName.includes('VISUAL INSPECTION') && (pName.includes('LEAKAGE') || pName.includes('BOCOR'));
            break;
          case 'Thermal Problem':
            match = (ttName.includes('DGA') && (pName.includes('STATUS') || pName.includes('DAMAGE MECHANISME') || pName.includes('DAMAGE'))) || (ttName.includes('OIL ANALYSIS') && pName.includes('STATUS'));
            break;
          case 'OTI/WTI Problem':
            match = ttName.includes('OTI') || ttName.includes('WTI');
            break;
          case 'Grounding Problem':
            match = ttName.includes('GROUNDING RESISTANCE') || pName.includes('GROUNDING');
            break;
          case 'Breating system':
            match = ttName.includes('VISUAL INSPECTION') && (pName.includes('SILICA GEL') || pName.includes('SILICA GEL PUDAR'));
            break;
          case 'LA Problem':
            match = ttName.includes('ARRESTER');
            break;
        }

        if (match) {
          if (minScore === null || calc.score < minScore) {
            minScore = calc.score;
          }
        }
      });
    });

    return minScore;
  }

  return (
    <div className="pb-32 animate-fade-in">
      {/* Form Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-1">Input Hasil Pengujian Trafo</h2>
        <p className="text-sm text-on-surface-variant">Masukkan data hasil inspeksi dan pemeliharaan rutin trafo.</p>
      </div>

      {/* Selection Section */}
      <section className="bg-white border border-surface-border rounded-xl p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <label className="block font-mono text-xs tracking-wider text-on-surface-variant">Tahun Pengujian</label>
            {(() => {
              const currentYear = new Date().getFullYear();
              const startYear = 1950;
              const endYear = currentYear + 5;
              const years = [];
              for (let y = endYear; y >= startYear; y--) {
                years.push(String(y));
              }

              return (
                <select 
                  value={testYear}
                  onChange={(e) => setTestYear(e.target.value)}
                  className="w-full bg-surface-container-low border-surface-border rounded-lg text-sm py-2.5 focus:ring-primary"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              );
            })()}
          </div>
          <div className="space-y-2">
            <label className="block font-mono text-xs tracking-wider text-on-surface-variant">UBP</label>
            <select 
              value={selectedUbpId}
              onChange={(e) => {
                setSelectedUbpId(e.target.value);
                setSelectedUnitName('');
                setSelectedAssetId('');
              }}
              className="w-full bg-surface-container-low border-surface-border rounded-lg text-sm py-2.5 focus:ring-primary"
            >
              <option value="">Pilih UBP</option>
              {ubps?.map((ubp: any) => (
                <option key={ubp.id} value={ubp.id}>{ubp.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block font-mono text-xs tracking-wider text-on-surface-variant">Unit Pembangkit/Asset</label>
            <select 
              value={selectedUnitName}
              onChange={(e) => {
                const uName = e.target.value;
                setSelectedUnitName(uName);
                if (!uName) {
                  setSelectedAssetId('');
                } else {
                  const assetsInUbp = selectedUbp?.assets || [];
                  const assetsForUnit = assetsInUbp.filter((a: any) => a.name === uName);
                  if (assetsForUnit.length === 1) {
                     setSelectedAssetId(assetsForUnit[0].id);
                  } else {
                     setSelectedAssetId('');
                  }
                }
              }}
              disabled={!selectedUbpId}
              className="w-full bg-surface-container-low border-surface-border rounded-lg text-sm py-2.5 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Pilih Unit</option>
              {(() => {
                const assetsInUbp = selectedUbp?.assets || [];
                const uniqueUnitNames = Array.from(new Set(assetsInUbp.map((a: any) => a.name))) as string[];
                return uniqueUnitNames.map((uName) => (
                  <option key={uName} value={uName}>{uName}</option>
                ));
              })()}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block font-mono text-xs tracking-wider text-on-surface-variant">Equipment</label>
            {(() => {
              const assetsInUbp = selectedUbp?.assets || [];
              const assetsForUnit = selectedUnitName ? assetsInUbp.filter((a: any) => a.name === selectedUnitName) : [];
              
              if (assetsForUnit.length > 1) {
                return (
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full bg-surface-container-low border-surface-border rounded-lg text-sm py-2.5 focus:ring-primary"
                  >
                    <option value="">Pilih Equipment</option>
                    {assetsForUnit.map((asset: any) => (
                      <option key={asset.id} value={asset.id}>{asset.equipmentType}</option>
                    ))}
                  </select>
                );
              } else {
                return (
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset ? selectedAsset.equipmentType : (assetsForUnit.length === 1 ? assetsForUnit[0].equipmentType : '—')}
                    className="w-full bg-surface-container-low border-surface-border rounded-lg text-sm py-2.5 px-3 focus:outline-none"
                  />
                );
              }
            })()}
          </div>
        </div>

        {selectedAsset && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-surface-border animate-fade-in">
            {[
              { label: 'Mfg Year', value: selectedAsset.mfgYear || '—' },
              { label: 'Vector', value: selectedAsset.vectorGroup || '—' },
              { label: 'Serial', value: selectedAsset.serialNumber || '—' },
            ].map((item) => (
              <div key={item.label} className="px-4 py-2 bg-surface-container-low border border-surface-border rounded-full flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-outline">{item.label}:</span>
                <span className="text-sm font-semibold text-on-surface-variant">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grid Layout for Form & Damage Mechanism Live Preview */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Form (col-span-12 lg:col-span-8) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Test Type Selection */}
          <section className="mb-2">
            <h3 className="text-xl font-semibold text-primary mb-4">Pilih Jenis Pengujian</h3>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              {testTypes?.map((test: any) => {
                const isActive = selectedTestTypeId === test.id;
                return (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTestTypeId(test.id)}
                    className={`px-6 py-2.5 rounded-full font-mono text-xs tracking-wider flex items-center gap-2 shadow-sm whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-white border border-surface-border text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {isActive && (
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                    {test.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Form Inputs */}
          <section className="space-y-4">
            {activeTestType && (
              <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-surface-border">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary">bolt</span>
                    <h4 className="text-xl font-semibold text-primary">{activeTestType.name}</h4>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {activeTestType.parameters?.map((param: any, idx: number) => {
                    const calculated = calculatedStatuses[param.id];
                    return (
                      <div key={param.id} className={`grid grid-cols-12 items-center gap-4 ${idx < activeTestType.parameters.length - 1 ? 'border-b border-surface-border/50 pb-4' : ''}`}>
                        <label className="col-span-3 text-base text-on-surface-variant font-medium">{param.name}</label>
                        <div className="col-span-6 relative">
                          <input
                            className="w-full bg-white border border-surface-border rounded-lg py-3 px-4 text-base focus:ring-primary focus:border-primary"
                            type="number"
                            step="any"
                            value={inputValues[param.id] || ''}
                            onChange={(e) => handleValueChange(param.id, e.target.value, param.criteria)}
                            placeholder="Masukkan nilai"
                          />
                          {param.unit && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-outline">
                              <span className="text-xs font-bold uppercase">{param.unit}</span>
                            </div>
                          )}
                        </div>
                        <div className="col-span-3 flex justify-end">
                          {calculated ? (
                            <StatusBadge judgement={calculated.judgement} size="lg" />
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-outline rounded-full border border-surface-border text-[13px] font-bold">
                              <span className="material-symbols-outlined text-lg">radio_button_unchecked</span>
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar: Damage Mechanism Live Preview (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-surface-border rounded-xl p-6 shadow-sm sticky top-24">
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">healing</span>
            Live Preview Status Kerusakan
          </h3>
          <p className="text-xs text-on-surface-variant mb-6">
            Status indikasi kerusakan per mekanisme dihitung real-time berdasarkan input pengukuran Anda.
          </p>

          <div className="space-y-3">
            {mechanisms.map((m) => {
              const score = getMechanismPreview(m);
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
                statusLabel = 'PENDING';
                colorClasses = 'bg-surface-container text-outline border-surface-border';
              }

              return (
                <div key={m} className="flex items-center justify-between py-2.5 border-b border-surface-border/50 text-xs">
                  <span className="font-semibold text-on-surface">{m}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] uppercase tracking-wider ${colorClasses}`}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-white border-t border-surface-border px-6 py-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-status-good" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <span className="text-sm">Sistem secara otomatis menghitung skor berdasarkan ambang batas standar PLN.</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSaveDraft}
            disabled={saveResultsMutation.isPending || createSessionMutation.isPending}
            className="px-8 py-2.5 bg-white border border-primary text-primary hover:bg-surface-container-low rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
          >
            Simpan sebagai Draft
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitSessionMutation.isPending || saveResultsMutation.isPending || createSessionMutation.isPending}
            className="px-8 py-2.5 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            Submit untuk Validasi
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { JudgementLabel } from '@/types';
import { calculateScore, mapQualitativeValueToNumber } from '@/lib/scoring/calculateScore';
import { determineJudgement } from '@/lib/scoring/determineJudgement';
import { FilterSelect } from '@/components/dashboard/FilterSelect';
import { useToast } from '@/context/ToastContext';

function getQualitativeChoices(criteria: any): string[] | null {
  const criteriaList = Array.isArray(criteria) ? criteria : [criteria];
  const c = criteriaList[0];
  if (!c) return null;
  
  const rawValues = [c.goodValue, c.fairValue, c.poorValue, c.badValue]
    .filter(Boolean)
    .map((v) => String(v).trim());
    
  if (rawValues.length === 0) return null;

  // Helper to check if a value is a numeric expression
  const isNumericExpression = (valStr: string) => {
    const v = valStr.trim();
    if (v.toUpperCase() === 'NA') return false;
    if (!isNaN(parseFloat(v)) && isFinite(Number(v))) return true;
    if (/^[><=]/.test(v)) return true;
    if (/^[\d.-]+\s*-\s*[\d.-]+$/.test(v)) return true;
    return false;
  };

  // If ALL values are numeric expressions, then it is a purely numeric threshold. We return null.
  const allNumeric = rawValues.every((v) => isNumericExpression(v));
  if (allNumeric) return null;

  // Otherwise, return exactly the non-empty threshold strings as dropdown choices!
  return rawValues;
}

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

const TEST_TYPE_ORDER = [
  'INSULATION RESISTANCE',
  'POLARITY INDEX',
  'TURN TO TURN RATIO',
  'WINDING RESISTANCE HV',
  'WINDING RESISTANCE LV',
  'SFRA HV OPEN',
  'SFRA HV SHORTED',
  'SFRA LV OPEN',
  'SFRA LV SHORTED',
  'EXC CURRENT',
  'TAN DELTA WINDING',
  'TAN DELTA BUSHING',
  'WATT LOSS BUSHING BUSHING',
  'GROUNDING RESISTANCE',
  'DIRANA MOISTURE',
  'DIRANA OIL CONDUCT',
  'ARRESTER GROUND',
  'ARRESTER IR',
  'ARRESTER WATT LOSS',
  'VISUAL INSPECTION',
  'OTI ',
  'WTI',
  'DGA',
  'OIL ANALYSIS',
  'RLA'
];

function InputForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const paramAssetId = searchParams.get('assetId');
  const paramTestYear = searchParams.get('testYear');
  const paramTestEvent = searchParams.get('testEvent');

  // Filters/selections state
  const [testYear, setTestYear] = useState(String(new Date().getFullYear()));
  const [testEvent, setTestEvent] = useState('default');
  const [existingEvents, setExistingEvents] = useState<string[]>([]);
  const [isCustomEvent, setIsCustomEvent] = useState(false);
  const [customEventName, setCustomEventName] = useState('');
  
  const [selectedUbpId, setSelectedUbpId] = useState('');
  const [selectedUnitName, setSelectedUnitName] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedJenisId, setSelectedJenisId] = useState('');
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<string[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  const sessionDisplayName = `tahun ${testYear}${testEvent && testEvent !== 'default' ? ` (${testEvent})` : ''}`;

  // Values input state: parameterId -> string value
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // Calculated status state: parameterId -> { score, judgement }
  const [calculatedStatuses, setCalculatedStatuses] = useState<Record<string, { score: number | null, judgement: JudgementLabel }>>({});

  // Active Session ID (if created/found)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Additional asset info input state
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({
    manufacture: '',
    type: '',
    serialNumber: '',
    mfgYear: '',
    vectorGroup: '',
    coolingMethod: '',
    ratedPower: '',
    frequency: '',
    hvSide: '',
    hvRatedCurrent: '',
    lvSide: '',
    lvRatedCurrent: '',
  });

  // Queries
  const { data: ubps, isLoading: isUbpsLoading } = useQuery({
    queryKey: ['ubp-assets'],
    queryFn: fetchUbpAssets,
  });

  const { data: testTypes, isLoading: isTestTypesLoading } = useQuery({
    queryKey: ['test-types'],
    queryFn: fetchTestTypes,
  });

  // Find selected UBP & Asset
  const selectedUbp = ubps?.find((u: any) => u.id === selectedUbpId);
  const selectedAsset = useMemo(() => {
    if (!selectedUbp || !selectedUbp.unitPembangkit || !selectedAssetId) return null;
    for (const unit of selectedUbp.unitPembangkit) {
      const asset = unit.assets?.find((a: any) => a.id === selectedAssetId);
      if (asset) return asset;
    }
    return null;
  }, [selectedUbp, selectedAssetId]);

  const activeFieldsList = useMemo(() => {
    const fields = [
      { key: 'manufacture', label: 'Manufacture', placeholder: 'Contoh: LUNENGCHENMING' },
      { key: 'type', label: 'Type', placeholder: 'Contoh: SFPZ10-370000/150 TH' },
      { key: 'serialNumber', label: 'Serial Number', placeholder: 'Contoh: 200911126' },
      { key: 'mfgYear', label: 'Year of Manufacturing', placeholder: 'Contoh: 2010', type: 'number' },
      { key: 'vectorGroup', label: 'Vector Grup', placeholder: 'Contoh: YNd1' },
      { key: 'coolingMethod', label: 'Cooling Method', placeholder: 'Contoh: OFAF' },
      { key: 'ratedPower', label: 'Rated Power', placeholder: 'Contoh: 370 MVA' },
      { key: 'frequency', label: 'Frequency', placeholder: 'Contoh: 50 Hz' },
      { key: 'hvSide', label: 'HV Side', placeholder: 'Contoh: 150 kV' },
      { key: 'hvRatedCurrent', label: 'HV Rated Current', placeholder: 'Contoh: 1424 A' },
      { key: 'lvSide', label: 'LV Side', placeholder: 'Contoh: 20 kV' },
      { key: 'lvRatedCurrent', label: 'LV Rated Current', placeholder: 'Contoh: 10680 A' },
    ];

    if (!selectedAsset?.jenisAsset?.infoFields) {
      return fields;
    }

    try {
      const parsedFields = JSON.parse(selectedAsset.jenisAsset.infoFields) as any[];
      return parsedFields.map((item) => {
        let key = '';
        let placeholder = 'Masukkan nilai...';
        
        if (typeof item === 'string') {
          key = item;
        } else if (item && typeof item === 'object') {
          key = item.key || '';
          if (item.placeholder) {
            placeholder = `Contoh: ${item.placeholder}`;
          }
        }

        const standard = fields.find((f) => f.key.toLowerCase() === key.toLowerCase());
        if (standard) {
          if (placeholder !== 'Masukkan nilai...') {
            return { ...standard, placeholder };
          }
          return standard;
        }

        // Custom parameter added by admin
        const cleanLabel = key
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return {
          key: key,
          label: cleanLabel,
          placeholder: placeholder,
          type: 'text',
        };
      });
    } catch (e) {
      return fields;
    }
  }, [selectedAsset]);

  const customKeysInInfo = useMemo(() => {
    const standardKeys = [
      'manufacture', 'type', 'serialNumber', 'mfgYear', 'vectorGroup',
      'coolingMethod', 'ratedPower', 'frequency', 'hvSide',
      'hvRatedCurrent', 'lvSide', 'lvRatedCurrent'
    ];
    return Object.keys(additionalInfo).filter((k) => !standardKeys.includes(k));
  }, [additionalInfo]);

  // Sync URL search params & sessionStorage with states on mount/load
  useEffect(() => {
    if (paramAssetId && paramTestYear) {
      setTestYear(paramTestYear);
      if (paramTestEvent) {
        setTestEvent(paramTestEvent);
      } else {
        setTestEvent('default');
      }
      if (ubps) {
        let foundUbpId = '';
        let foundUnitName = '';
        let foundJenisId = '';
        for (const u of ubps) {
          if (u.unitPembangkit) {
            for (const unit of u.unitPembangkit) {
              const asset = unit.assets?.find((a: any) => a.id === paramAssetId);
              if (asset) {
                foundUbpId = u.id;
                foundUnitName = unit.name;
                foundJenisId = asset.jenisAsset?.id || '';
                break;
              }
            }
          }
          if (foundUbpId) break;
        }
        if (foundUbpId) {
          setSelectedUbpId(foundUbpId);
          setSelectedUnitName(foundUnitName);
          setSelectedJenisId(foundJenisId);
          setSelectedAssetId(paramAssetId);
        }
      }
    } else if (ubps) {
      // Restore from sessionStorage if no URL search params exist
      try {
        const saved = sessionStorage.getItem('siat_input_form_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.testYear) setTestYear(parsed.testYear);
          if (parsed.testEvent) setTestEvent(parsed.testEvent);
          if (parsed.selectedUbpId) setSelectedUbpId(parsed.selectedUbpId);
          if (parsed.selectedUnitName) setSelectedUnitName(parsed.selectedUnitName);
          if (parsed.selectedJenisId) setSelectedJenisId(parsed.selectedJenisId);
          if (parsed.selectedAssetId) setSelectedAssetId(parsed.selectedAssetId);
        }
      } catch (e) {}
    }
  }, [paramAssetId, paramTestYear, paramTestEvent, ubps]);

  // Save selections to sessionStorage and update URL query params on user selection
  useEffect(() => {
    if (selectedAssetId && testYear) {
      try {
        const stateToSave = {
          selectedUbpId,
          selectedUnitName,
          selectedJenisId,
          selectedAssetId,
          testYear,
          testEvent,
        };
        sessionStorage.setItem('siat_input_form_state', JSON.stringify(stateToSave));

        const params = new URLSearchParams();
        params.set('assetId', selectedAssetId);
        params.set('testYear', testYear);
        if (testEvent && testEvent !== 'default') {
          params.set('testEvent', testEvent);
        }
        router.replace(`/input?${params.toString()}`, { scroll: false });
      } catch (e) {}
    }
  }, [selectedUbpId, selectedUnitName, selectedJenisId, selectedAssetId, testYear, testEvent, router]);

  // Fetch existing events for the selected asset and year
  useEffect(() => {
    if (!selectedAssetId || !testYear) {
      setExistingEvents([]);
      return;
    }
    async function loadEvents() {
      try {
        const res = await fetch(`/api/test-sessions?assetId=${selectedAssetId}&testYear=${testYear}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const events = json.data
            .map((s: any) => s.testEvent || 'default')
            .filter((val: string, idx: number, self: string[]) => self.indexOf(val) === idx);
          setExistingEvents(events);
        }
      } catch (e) {
        console.error('Error loading events:', e);
      }
    }
    loadEvents();
  }, [selectedAssetId, testYear, activeSessionId]);

  // Load existing session and results when selectedAssetId or testYear changes
  useEffect(() => {
    if (!selectedAssetId || !testYear) {
      setActiveSessionId(null);
      setSessionStatus(null);
      setInputValues({});
      setCalculatedStatuses({});
      setAdditionalInfo({
        manufacture: '',
        type: '',
        serialNumber: '',
        mfgYear: '',
        vectorGroup: '',
        coolingMethod: '',
        ratedPower: '',
        frequency: '',
        hvSide: '',
        hvRatedCurrent: '',
        lvSide: '',
        lvRatedCurrent: '',
      });
      return;
    }

    async function loadExistingSession() {
      try {
        const res = await fetch(`/api/test-sessions?assetId=${selectedAssetId}&testYear=${testYear}&testEvent=${encodeURIComponent(testEvent)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const session = json.data;
          setActiveSessionId(session.id);
          setSessionStatus(session.status);
          
          // Map testResults to inputValues and calculatedStatuses
          const vals: Record<string, string> = {};
          const stats: Record<string, { score: number | null, judgement: JudgementLabel }> = {};
          const activeTypeIds = new Set<string>();
          
          session.testResults?.forEach((r: any) => {
            if (r.parameter?.testType?.id) {
              activeTypeIds.add(r.parameter.testType.id);
            }
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
          setSelectedTestTypeIds(Array.from(activeTypeIds));

          // Populate additionalInfo from pending or asset
          let info = {
            manufacture: session.asset?.manufacture || '',
            type: session.asset?.type || '',
            serialNumber: session.asset?.serialNumber || '',
            mfgYear: session.asset?.mfgYear ? String(session.asset.mfgYear) : '',
            vectorGroup: session.asset?.vectorGroup || '',
            coolingMethod: session.asset?.coolingMethod || '',
            ratedPower: session.asset?.ratedPower || '',
            frequency: session.asset?.frequency || '',
            hvSide: session.asset?.hvSide || '',
            hvRatedCurrent: session.asset?.hvRatedCurrent || '',
            lvSide: session.asset?.lvSide || '',
            lvRatedCurrent: session.asset?.lvRatedCurrent || '',
          };

          // 1. Merge approved specifications stored in the session
          if (session.additionalInfo) {
            try {
              const approved = JSON.parse(session.additionalInfo);
              info = { ...info, ...approved };
            } catch (err) {
              console.error('Failed to parse approved additional info:', err);
            }
          }

          // 2. Merge pending changes
          if (session.additionalInfoPending) {
            try {
              const pending = JSON.parse(session.additionalInfoPending);
              info = { ...info, ...pending };
            } catch (err) {
              console.error('Failed to parse pending additional info:', err);
            }
          }
          setAdditionalInfo(info);
        } else {
          setActiveSessionId(null);
          setSessionStatus(null);
          setInputValues({});
          setCalculatedStatuses({});
          setSelectedTestTypeIds([]);
          setSelectedJenisId('');

          // No session: load from asset directly
          if (selectedAsset) {
            setAdditionalInfo({
              manufacture: selectedAsset.manufacture || '',
              type: selectedAsset.type || '',
              serialNumber: selectedAsset.serialNumber || '',
              mfgYear: selectedAsset.mfgYear ? String(selectedAsset.mfgYear) : '',
              vectorGroup: selectedAsset.vectorGroup || '',
              coolingMethod: selectedAsset.coolingMethod || '',
              ratedPower: selectedAsset.ratedPower || '',
              frequency: selectedAsset.frequency || '',
              hvSide: selectedAsset.hvSide || '',
              hvRatedCurrent: selectedAsset.hvRatedCurrent || '',
              lvSide: selectedAsset.lvSide || '',
              lvRatedCurrent: selectedAsset.lvRatedCurrent || '',
            });
          }
        }
      } catch (e) {
        console.error('Error loading existing session:', e);
      }
    }

    loadExistingSession();
  }, [selectedAssetId, testYear, testEvent]);

  // Load initial asset info when selectedAsset changes (if no session active)
  useEffect(() => {
    if (selectedAsset && !activeSessionId) {
      setAdditionalInfo({
        manufacture: selectedAsset.manufacture || '',
        type: selectedAsset.type || '',
        serialNumber: selectedAsset.serialNumber || '',
        mfgYear: selectedAsset.mfgYear ? String(selectedAsset.mfgYear) : '',
        vectorGroup: selectedAsset.vectorGroup || '',
        coolingMethod: selectedAsset.coolingMethod || '',
        ratedPower: selectedAsset.ratedPower || '',
        frequency: selectedAsset.frequency || '',
        hvSide: selectedAsset.hvSide || '',
        hvRatedCurrent: selectedAsset.hvRatedCurrent || '',
        lvSide: selectedAsset.lvSide || '',
        lvRatedCurrent: selectedAsset.lvRatedCurrent || '',
      });
    }
  }, [selectedAssetId, activeSessionId]);



  // Filter and sort test types based on selected asset configuration (if configured)
  const availableTestTypes = useMemo(() => {
    if (!testTypes) return [];
    let filtered: any[] = [];
    if (selectedAsset) {
      if (selectedAsset.testTypes && selectedAsset.testTypes.length > 0) {
        filtered = testTypes.filter((tt: any) =>
          selectedAsset.testTypes.some((ct: any) => ct.id === tt.id)
        );
      } else {
        filtered = [];
      }
    }
    // Sort according to TEST_TYPE_ORDER
    return [...filtered].sort((a: any, b: any) => {
      const nameA = (a.name || '').trim().toUpperCase();
      const nameB = (b.name || '').trim().toUpperCase();
      const idxA = TEST_TYPE_ORDER.indexOf(nameA);
      const idxB = TEST_TYPE_ORDER.indexOf(nameB);
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      return posA - posB;
    });
  }, [testTypes, selectedAsset]);

  // Set default selected test type when availableTestTypes changes
  useEffect(() => {
    // DO NOT select all by default. Start with none selected (empty array)
    if (!activeSessionId) {
      setSelectedTestTypeIds([]);
    }
  }, [availableTestTypes, activeSessionId]);

  // Sync selectedUnitName with selectedAsset when it changes (e.g., when loaded from URL params)
  useEffect(() => {
    if (selectedAsset && selectedUbp) {
      const unit = selectedUbp.unitPembangkit?.find((u: any) =>
        u.assets?.some((a: any) => a.id === selectedAsset.id)
      );
      if (unit && unit.name !== selectedUnitName) {
        setSelectedUnitName(unit.name);
      }
    }
  }, [selectedAsset, selectedUbp, selectedUnitName]);

  // Memoized lists for the new hierarchical selection
  const availableJenisAssets = useMemo(() => {
    if (!selectedUbp || !selectedUnitName) return [];
    const unitObj = selectedUbp.unitPembangkit?.find((u: any) => u.name === selectedUnitName);
    const assets = unitObj?.assets || [];
    const map = new Map<string, { id: string; name: string }>();
    assets.forEach((asset: any) => {
      if (asset.jenisAsset) {
        map.set(asset.jenisAsset.id, { id: asset.jenisAsset.id, name: asset.jenisAsset.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedUbp, selectedUnitName]);

  const availableAssetsInUnit = useMemo(() => {
    if (!selectedUbp || !selectedUnitName || !selectedJenisId) return [];
    const unitObj = selectedUbp.unitPembangkit?.find((u: any) => u.name === selectedUnitName);
    const assets = unitObj?.assets || [];
    return assets.filter((asset: any) => asset.jenisAsset?.id === selectedJenisId);
  }, [selectedUbp, selectedUnitName, selectedJenisId]);

  // Consolidated synchronization loop-free effect (handles both upward and downward auto-select)
  useEffect(() => {
    if (selectedAssetId) {
      // 1. Upward synchronization (from Asset ID to parent fields)
      if (!ubps) return;
      let foundUbpId = '';
      let foundUnitName = '';
      let foundJenisId = '';
      for (const u of ubps) {
        if (u.unitPembangkit) {
          for (const unit of u.unitPembangkit) {
            const asset = unit.assets?.find((a: any) => a.id === selectedAssetId);
            if (asset) {
              foundUbpId = u.id;
              foundUnitName = unit.name;
              foundJenisId = asset.jenisAsset?.id || '';
              break;
            }
          }
        }
        if (foundUbpId) break;
      }
      if (foundUbpId) {
        if (selectedUbpId !== foundUbpId) setSelectedUbpId(foundUbpId);
        if (selectedUnitName !== foundUnitName) setSelectedUnitName(foundUnitName);
        if (selectedJenisId !== foundJenisId) setSelectedJenisId(foundJenisId);
      }
    } else {
      // 2. Downward auto-select (if no asset is selected yet)
      if (selectedUbpId && selectedUnitName) {
        if (availableJenisAssets.length === 1) {
          const singleJenisId = availableJenisAssets[0].id;
          if (selectedJenisId !== singleJenisId) {
            setSelectedJenisId(singleJenisId);
          }
        } else if (availableJenisAssets.length > 1) {
          if (selectedJenisId && !availableJenisAssets.some((ja: any) => ja.id === selectedJenisId)) {
            setSelectedJenisId('');
          }
        } else {
          if (selectedJenisId !== '') setSelectedJenisId('');
        }

        if (selectedJenisId && availableAssetsInUnit.length === 1) {
          const singleAssetId = availableAssetsInUnit[0].id;
          if (selectedAssetId !== singleAssetId) {
            setSelectedAssetId(singleAssetId);
          }
        } else if (availableAssetsInUnit.length > 1) {
          if (selectedAssetId && !availableAssetsInUnit.some((a: any) => a.id === selectedAssetId)) {
            setSelectedAssetId('');
          }
        } else {
          if (selectedAssetId !== '') setSelectedAssetId('');
        }
      }
    }
  }, [
    ubps,
    selectedAssetId,
    selectedUbpId,
    selectedUnitName,
    selectedJenisId,
    availableJenisAssets,
    availableAssetsInUnit
  ]);

  const mapValueToNumericValue = (parameterId: string, val: string): number | null => {
    if (!val) return null;
    let numericValue = parseFloat(val);
    
    const qualMapped = mapQualitativeValueToNumber(val);
    if (qualMapped !== null) {
      return qualMapped;
    }
    
    // Find the parameter's criteria to check for custom qualitative mappings
    const activeTestTypesList = availableTestTypes.filter((tt: any) => selectedTestTypeIds.includes(tt.id));
    let matchedParam: any = null;
    for (const tt of activeTestTypesList) {
      const found = tt.parameters?.find((p: any) => p.id === parameterId);
      if (found) {
        matchedParam = found;
        break;
      }
    }

    if (matchedParam && matchedParam.criteria?.[0]) {
      const c = matchedParam.criteria[0];
      const cleanVal = val.trim().toUpperCase();
      if (c.goodValue && cleanVal === c.goodValue.trim().toUpperCase()) {
        return 0;
      }
      if (c.fairValue && cleanVal === c.fairValue.trim().toUpperCase()) {
        return 1;
      }
      if (c.poorValue && cleanVal === c.poorValue.trim().toUpperCase()) {
        return 2;
      }
      if (c.badValue && cleanVal === c.badValue.trim().toUpperCase()) {
        return 3;
      }
    }
    
    return isNaN(numericValue) ? null : numericValue;
  };

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          testYear,
          testEvent: testEvent === 'default' ? null : testEvent,
          additionalInfo
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Gagal membuat sesi pengujian');
      }
      const json = await res.json();
      return json.data;
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async ({ sessionId, results }: { sessionId: string; results: any[] }) => {
      const res = await fetch(`/api/test-sessions/${sessionId}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, additionalInfo }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Gagal menyimpan hasil pengukuran');
      }
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

    const c = criteria?.[0]; // Active criteria

    // Embed client-side preview of scoring if criteria is present
    let parsedVal = parseFloat(val);
    const qualMapped = mapQualitativeValueToNumber(val);
    if (qualMapped !== null) {
      parsedVal = qualMapped;
    } else if (c) {
      const cleanVal = val.trim().toUpperCase();
      if (c.goodValue && cleanVal === c.goodValue.trim().toUpperCase()) {
        parsedVal = 0;
      } else if (c.fairValue && cleanVal === c.fairValue.trim().toUpperCase()) {
        parsedVal = 1;
      } else if (c.poorValue && cleanVal === c.poorValue.trim().toUpperCase()) {
        parsedVal = 2;
      } else if (c.badValue && cleanVal === c.badValue.trim().toUpperCase()) {
        parsedVal = 3;
      }
    }

    if (isNaN(parsedVal)) {
      setCalculatedStatuses((prev) => {
        const copy = { ...prev };
        delete copy[parameterId];
        return copy;
      });
      return;
    }
    
    if (c) {
      const score = calculateScore(
        parsedVal,
        false,
        c.goodValue,
        c.fairValue,
        c.poorValue,
        c.badValue
      );
      const judgement = determineJudgement(score);

      setCalculatedStatuses((prev) => ({
        ...prev,
        [parameterId]: { score, judgement },
      }));
    }
  }

  async function handleSaveDraft() {
    if (!selectedAssetId) {
      toast.warning('Silakan pilih Unit Pembangkit/Asset terlebih dahulu.');
      return;
    }
    if (sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED') {
      toast.warning('Data tidak dapat disimpan karena status pengujian saat ini adalah ' + sessionStatus);
      return;
    }

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const session = await createSessionMutation.mutateAsync();
        sessionId = session.id;
        setActiveSessionId(sessionId);
        setSessionStatus(session.status);
      }

      const results = Object.entries(inputValues).map(([parameterId, val]) => {
        const numericValue = mapValueToNumericValue(parameterId, val);
        return {
          parameterId,
          value: numericValue,
          isNotApplicable: !val,
        };
      });

      await saveResultsMutation.mutateAsync({ sessionId: sessionId!, results });
      if (sessionStatus === 'REJECTED') {
        setSessionStatus('DRAFT');
      }
      toast.success('Draft berhasil disimpan!');
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan saat menyimpan draft.');
    }
  }

  async function handleSubmit() {
    if (!selectedAssetId) {
      toast.warning('Silakan pilih Unit Pembangkit/Asset terlebih dahulu.');
      return;
    }
    if (sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED') {
      toast.warning('Data tidak dapat disubmit karena status pengujian saat ini adalah ' + sessionStatus);
      return;
    }

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const session = await createSessionMutation.mutateAsync();
        sessionId = session.id;
        setActiveSessionId(sessionId);
        setSessionStatus(session.status);
      }

      const results = Object.entries(inputValues).map(([parameterId, val]) => {
        const numericValue = mapValueToNumericValue(parameterId, val);
        return {
          parameterId,
          value: numericValue,
          isNotApplicable: !val,
        };
      });

      await saveResultsMutation.mutateAsync({ sessionId: sessionId!, results });
      await submitSessionMutation.mutateAsync(sessionId!);
      setSessionStatus('SUBMITTED');
      toast.success('Data pengujian berhasil dikirim untuk validasi!');
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan saat mengirim data.');
    }
  }


  return (
    <div className="pb-32 animate-fade-in">
      {/* Form Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-1">
          Input Hasil Pengujian {selectedAsset ? selectedAsset.name : 'Alat'}
        </h2>
        <p className="text-sm text-on-surface-variant">Masukkan data hasil inspeksi dan pemeliharaan rutin alat.</p>
      </div>

      {/* Selection Section */}
      <section className="bg-white border border-surface-border rounded-xl p-4 mb-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* 1. UBP */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">UBP</label>
            <FilterSelect 
              value={selectedUbpId}
              onChange={(val) => {
                setSelectedUbpId(val);
                setSelectedUnitName('');
                setSelectedJenisId('');
                setSelectedAssetId('');
                setTestEvent('default');
                setIsCustomEvent(false);
              }}
              options={(ubps || []).map((ubp: any) => ({ value: ubp.id, label: ubp.name }))}
              placeholder="Pilih UBP"
              buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
            />
          </div>

          {/* 2. Unit Pembangkit */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Unit Pembangkit</label>
            <FilterSelect 
              value={selectedUnitName}
              onChange={(val) => {
                setSelectedUnitName(val);
                setSelectedJenisId('');
                setSelectedAssetId('');
                setTestEvent('default');
                setIsCustomEvent(false);
              }}
              options={(() => {
                const unitsInUbp = selectedUbp?.unitPembangkit || [];
                return unitsInUbp.map((unit: any) => ({ value: unit.name, label: unit.name }));
              })()}
              placeholder="Pilih Unit"
              disabled={!selectedUbpId}
              buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
            />
          </div>

          {/* 3. Jenis Asset */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Jenis Asset</label>
            {availableJenisAssets.length === 0 ? (
              <input
                type="text"
                readOnly
                value="—"
                className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:outline-none opacity-50 h-[30px]"
              />
            ) : availableJenisAssets.length === 1 ? (
              <input
                type="text"
                readOnly
                value={availableJenisAssets[0].name}
                className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:outline-none font-semibold text-primary h-[30px]"
              />
            ) : (
              <FilterSelect 
                value={selectedJenisId}
                onChange={(val) => {
                  setSelectedJenisId(val);
                  setSelectedAssetId('');
                  setTestEvent('default');
                  setIsCustomEvent(false);
                }}
                options={availableJenisAssets.map((ja: any) => ({ value: ja.id, label: ja.name }))}
                placeholder="Pilih Jenis Aset"
                buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
              />
            )}
          </div>

          {/* 4. Nama Asset */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Equipment / Asset</label>
            {availableAssetsInUnit.length === 0 ? (
              <input
                type="text"
                readOnly
                value="—"
                className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:outline-none opacity-50 h-[30px]"
              />
            ) : availableAssetsInUnit.length === 1 ? (
              <input
                type="text"
                readOnly
                value={availableAssetsInUnit[0].name}
                className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:outline-none font-semibold text-primary h-[30px]"
              />
            ) : (
              <FilterSelect 
                value={selectedAssetId}
                onChange={(val) => {
                  setSelectedAssetId(val);
                  setTestEvent('default');
                  setIsCustomEvent(false);
                }}
                options={availableAssetsInUnit.map((asset: any) => ({ value: asset.id, label: asset.name }))}
                placeholder="Pilih Nama Aset"
                buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
              />
            )}
          </div>

          {/* 5. Event Pengujian */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Event Pengujian</label>
            {isCustomEvent ? (
              <div key="event-input-mode" className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  required
                  value={customEventName}
                  onChange={(e) => setCustomEventName(e.target.value)}
                  placeholder="Nama Event Baru..."
                  className="flex-1 min-w-0 bg-surface-container-low border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:ring-primary font-semibold text-primary animate-fade-in h-[30px]"
                />
                <button
                  key="btn-cancel-custom"
                  type="button"
                  onClick={() => {
                    setIsCustomEvent(false);
                    setTestEvent('default');
                  }}
                  className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-surface-border rounded-lg h-[30px] w-[30px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  title="Batal"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <button
                  key="btn-apply-custom"
                  type="button"
                  onClick={() => {
                    const trimmed = customEventName.trim();
                    if (trimmed) {
                      setTestEvent(trimmed);
                      setIsCustomEvent(false);
                      if (!existingEvents.includes(trimmed)) {
                        setExistingEvents(prev => [...prev, trimmed]);
                      }
                    }
                  }}
                  disabled={!customEventName.trim()}
                  className="text-primary hover:text-primary-dark hover:bg-surface-container border border-surface-border rounded-lg h-[30px] w-[30px] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-colors"
                  title="Terapkan"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </button>
              </div>
            ) : (
              <div key="event-select-mode" className="flex items-center gap-1.5 w-full">
                <FilterSelect 
                  value={testEvent === 'default' ? '' : testEvent}
                  onChange={(val) => setTestEvent(val || 'default')}
                  options={existingEvents
                    .filter((e) => e !== 'default' && e !== '')
                    .map((evt) => ({ value: evt, label: evt }))}
                  placeholder="Rutin (Default)"
                  disabled={!selectedAssetId}
                  className="flex-1 min-w-0"
                  buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
                />
                <button
                  key="btn-add-custom"
                  type="button"
                  onClick={() => {
                    setIsCustomEvent(true);
                    setCustomEventName('');
                  }}
                  disabled={!selectedAssetId}
                  className="text-primary hover:text-primary/80 font-bold select-none cursor-pointer flex items-center shrink-0 p-1 bg-surface-container-low hover:bg-surface-container border border-surface-border rounded-lg h-[30px] w-[30px] justify-center transition-colors disabled:opacity-50"
                  title="Tambah Event Baru"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Tahun Pengujian */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tahun Pengujian</label>
            {(() => {
              const currentYear = new Date().getFullYear();
              const startYear = 1950;
              const endYear = currentYear;
              const years = [];
              for (let y = endYear; y >= startYear; y--) {
                years.push(String(y));
              }

              return (
                <FilterSelect 
                  value={testYear}
                  onChange={setTestYear}
                  options={years.map((y) => ({ value: y, label: y }))}
                  placeholder="Pilih Tahun"
                  disabled={!selectedAssetId}
                  buttonClassName="bg-surface-container-low border border-surface-border font-semibold text-primary h-[30px] min-h-[30px] py-1"
                />
              );
            })()}
          </div>
        </div>

        {selectedAsset && (
          <div className="pt-4 border-t border-surface-border/50 animate-fade-in space-y-3">
            <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Informasi Tambahan Alat</h4>
            <div className="border border-surface-border rounded-lg overflow-hidden bg-white max-w-2xl shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-border font-mono text-[9px] uppercase font-bold text-on-surface-variant">
                    <th className="px-4 py-2 w-[50%] border-r border-surface-border">Parameter Alat</th>
                    <th className="px-4 py-2 w-[50%]">Nilai Informasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {activeFieldsList.map((field) => {
                    const isReadOnly = sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED';
                    return (
                      <tr key={field.key} className="hover:bg-surface-container-low/10 transition-colors">
                        <td className="px-4 py-2 font-semibold text-on-surface border-r border-surface-border bg-surface-container-low/35 w-[50%]">
                          {field.label}
                        </td>
                        <td className="px-4 py-2 w-[50%]">
                          {isReadOnly ? (
                            <span className="font-semibold text-on-surface-variant text-xs">
                              {additionalInfo[field.key] || '—'}
                            </span>
                          ) : (
                            <input
                              type={field.type || 'text'}
                              value={additionalInfo[field.key] || ''}
                              onChange={(e) => setAdditionalInfo(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-outline/40 font-semibold text-primary"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-6">
          {/* Test Type Selection */}
          <section className="mb-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-primary">Pilih Jenis Pengujian</h3>
              {availableTestTypes.length > 0 && (
                <div className="flex gap-3 text-xs font-semibold">
                  <button
                    onClick={() => setSelectedTestTypeIds(availableTestTypes.map((t: any) => t.id))}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-outline/40">|</span>
                  <button
                    onClick={() => setSelectedTestTypeIds([])}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Batal Pilih Semua
                  </button>
                </div>
              )}
            </div>
            {!selectedAssetId ? (
              <div className="w-full bg-surface-container-low/50 border border-surface-border border-dashed rounded-xl p-8 text-center animate-fade-in my-2">
                <span className="material-symbols-outlined text-[36px] text-primary/60 mb-2 block select-none">
                  info
                </span>
                <h4 className="text-sm font-bold text-on-surface mb-1">Peralatan Belum Dipilih</h4>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  Silakan pilih UBP, Unit Pembangkit, Jenis Asset, dan Nama Asset pada kolom di atas terlebih dahulu untuk memuat jenis pengujian yang tersedia.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                {availableTestTypes.map((test: any) => {
                  const isActive = selectedTestTypeIds.includes(test.id);
                  return (
                    <button
                      key={test.id}
                      onClick={() => {
                        setSelectedTestTypeIds((prev) =>
                          prev.includes(test.id) ? prev.filter((id) => id !== test.id) : [...prev, test.id]
                        );
                      }}
                      className={`px-4 py-2 rounded-full font-mono text-[11px] font-bold tracking-tight flex items-center gap-2 shadow-sm whitespace-nowrap transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-surface-border text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${
                        isActive
                          ? 'bg-white border-white text-primary'
                          : 'border-outline-variant bg-transparent text-transparent'
                      }`}>
                        <span className="material-symbols-outlined text-[10px] font-extrabold" style={{ fontVariationSettings: "'wght' 800" }}>
                          check
                        </span>
                      </div>
                      <span>{test.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
 
          {/* Form Inputs */}
          <section className="space-y-6">
            {selectedTestTypeIds.length > 0 ? (
              <div className={selectedTestTypeIds.length > 1 ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "space-y-6"}>
                {availableTestTypes
                  .filter((tt: any) => selectedTestTypeIds.includes(tt.id))
                  .map((activeTestType: any) => {
                    return (
                      <div key={activeTestType.id} className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-sm h-fit">
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-surface-container-low flex items-center justify-between border-b border-surface-border">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-primary">{activeTestType.name}</h4>
                          </div>
                        </div>
                        {/* Compact Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-surface-container-low/30 border-b border-surface-border/50">
                                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-bold text-on-surface-variant w-[35%]">Nama Parameter</th>
                                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-bold text-on-surface-variant w-[45%]">Nilai Pengukuran</th>
                                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-bold text-on-surface-variant text-center w-[20%]">Status Kondisi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border/40">
                              {activeTestType.parameters?.map((param: any) => {
                                const calculated = calculatedStatuses[param.id];
                                return (
                                  <tr key={param.id} className="hover:bg-surface-container-low/20 transition-colors">
                                    {/* Parameter Name */}
                                    <td className="px-4 py-1.5 font-semibold text-on-surface">
                                      {param.name}
                                    </td>
                                    {/* Input Value */}
                                    <td className="px-4 py-1.5">
                                      <div className="relative max-w-md">
                                        {(() => {
                                          const choices = getQualitativeChoices(param.criteria);
                                          if (choices) {
                                            return (
                                              <select
                                                className="w-full bg-white border border-surface-border rounded py-1 px-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-surface-container-low disabled:text-outline/80 font-mono"
                                                value={inputValues[param.id] || ''}
                                                onChange={(e) => handleValueChange(param.id, e.target.value, param.criteria)}
                                                disabled={sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED'}
                                              >
                                                <option value="">-- Pilih --</option>
                                                {choices.map((choice) => (
                                                  <option key={choice} value={choice}>{choice}</option>
                                                ))}
                                              </select>
                                            );
                                          }
 
                                          return (
                                            <>
                                              <input
                                                className="w-full bg-white border border-surface-border rounded py-1 pl-2.5 pr-12 text-xs focus:ring-1 focus:ring-primary focus:border-primary font-mono disabled:bg-surface-container-low disabled:text-outline/80"
                                                type="number"
                                                step="any"
                                                value={inputValues[param.id] || ''}
                                                onChange={(e) => handleValueChange(param.id, e.target.value, param.criteria)}
                                                disabled={sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED'}
                                                placeholder="—"
                                              />
                                              {param.unit && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-outline select-none pointer-events-none">
                                                  <span className="text-[9px] font-bold">{param.unit}</span>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    {/* Status Badge */}
                                    <td className="px-4 py-1.5 text-center">
                                      {calculated ? (
                                        <StatusBadge judgement={calculated.judgement} size="sm" showIcon={false} />
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container/60 text-outline/80 rounded border border-surface-border/50 text-[9px] font-bold">
                                          PENDING
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : selectedAsset && availableTestTypes.length === 0 ? (
              <div className="w-full bg-surface-container-low/50 border border-surface-border border-dashed rounded-xl p-8 text-center animate-fade-in my-2">
                <span className="material-symbols-outlined text-[36px] text-primary/60 mb-2 block select-none">
                  info
                </span>
                <h4 className="text-sm font-bold text-on-surface mb-1">Konfigurasi Pengujian Belum Tersedia</h4>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  Peralatan <strong className="font-semibold text-primary">{selectedAsset.name}</strong> ({selectedAsset.jenisAsset?.name || 'Aset'}) belum dikaitkan dengan metode pengujian apa pun di sistem saat ini. Silakan hubungi Administrator untuk mendaftarkan jenis tes.
                </p>
              </div>
            ) : selectedAsset && selectedTestTypeIds.length === 0 ? (
              <div className="bg-surface-container-low border border-surface-border text-on-surface-variant p-6 rounded-xl text-center shadow-sm font-medium animate-fade-in">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline block font-light">checklist</span>
                Tidak ada jenis pengujian terpilih.<br/>
                Pilih satu atau beberapa jenis pengujian di atas untuk diisi.
              </div>
            ) : null}
          </section>
      </div>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-white border-t border-surface-border px-6 py-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sessionStatus === 'VALIDATED' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Sesi pengujian {sessionDisplayName} telah disetujui (VALIDATED). Pengeditan dinonaktifkan.</span>
            </div>
          ) : sessionStatus === 'SUBMITTED' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-base animate-pulse">pending</span>
              <span>Sesi pengujian {sessionDisplayName} telah dikirim (SUBMITTED) & menunggu verifikasi Validator.</span>
            </div>
          ) : sessionStatus === 'REJECTED' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
              <span className="material-symbols-outlined text-base">error_outline</span>
              <span>Sesi pengujian {sessionDisplayName} DITOLAK oleh Validator. Silakan perbaiki data di bawah lalu kirim ulang.</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSaveDraft}
            disabled={saveResultsMutation.isPending || createSessionMutation.isPending || sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED'}
            className="px-8 py-2.5 bg-white border border-primary text-primary hover:bg-surface-container-low rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan sebagai Draft
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitSessionMutation.isPending || saveResultsMutation.isPending || createSessionMutation.isPending || sessionStatus === 'VALIDATED' || sessionStatus === 'SUBMITTED'}
            className="px-8 py-2.5 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit untuk Validasi
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <InputForm />
    </Suspense>
  );
}

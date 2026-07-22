'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

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
  standard?: string | null;
  parameters?: any[];
}

interface Asset {
  id: string;
  name: string;
  jenisAsset?: { id: string; name: string } | null;
  serialNumber: string | null;
  testTypes?: TestType[];
}

interface UnitPembangkit {
  id: string;
  name: string;
  assets?: Asset[];
}

interface Ubp {
  id: string;
  name: string;
  unitPembangkit?: UnitPembangkit[];
}

interface EquipmentTypeGroup {
  id: string;
  name: string;
  testTypes: TestType[];
  assetIds: string[];
}

interface NewParamInput {
  name: string;
  unit: string;
  goodValue: string;
  fairValue: string;
  poorValue: string;
  badValue: string;
}

const METADATA_FIELDS = [
  { key: 'manufacture', label: 'MANUFACTURE' },
  { key: 'serialNumber', label: 'SERIAL NUMBER' },
  { key: 'mfgYear', label: 'TAHUN BUAT' },
  { key: 'type', label: 'TYPE' },
  { key: 'coolingMethod', label: 'COOLING METHOD' },
  { key: 'ratedPower', label: 'RATED POWER' },
  { key: 'frequency', label: 'FREQUENCY' },
  { key: 'hvSide', label: 'HV SIDE' },
  { key: 'hvRatedCurrent', label: 'HV RATED CURRENT' },
  { key: 'lvSide', label: 'LV SIDE' },
  { key: 'lvRatedCurrent', label: 'LV RATED CURRENT' },
];

export default function CombinedManagePengujianPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pemetaan' | 'damage-mechanism' | 'import'>('pemetaan');

  // ==========================================
  // STATE: 1. Pemetaan Tab
  // ==========================================
  const [selectedGroup, setSelectedGroup] = useState<EquipmentTypeGroup | null>(null);
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<string[]>([]);
  const [selectedInfoFields, setSelectedInfoFields] = useState<any[]>([]);
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [isAddEquipmentTypeOpen, setIsAddEquipmentTypeOpen] = useState(false);
  const [newEquipmentTypeName, setNewEquipmentTypeName] = useState('');
  const [isEditEquipmentTypeOpen, setIsEditEquipmentTypeOpen] = useState(false);
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentTypeGroup | null>(null);
  const [editEquipmentTypeName, setEditEquipmentTypeName] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'informasi' | 'pengujian'>('informasi');

  // Helper to resolve infoField string or object
  const resolveField = (item: any) => {
    if (typeof item === 'string') {
      return { key: item, placeholder: '' };
    }
    return { key: item?.key || '', placeholder: item?.placeholder || '' };
  };

  // Custom modal states for specifications
  const [isAddParamOpen, setIsAddParamOpen] = useState(false);
  const [newParamName, setNewParamName] = useState('');
  const [newParamPlaceholder, setNewParamPlaceholder] = useState('');
  const [isEditParamOpen, setIsEditParamOpen] = useState(false);
  const [editParamOldName, setEditParamOldName] = useState('');
  const [editParamOldKey, setEditParamOldKey] = useState('');
  const [editParamNewName, setEditParamNewName] = useState('');
  const [editParamPlaceholder, setEditParamPlaceholder] = useState('');

  // Create Test Type Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);
  const [newTestName, setNewTestName] = useState('');
  const [newTestStandard, setNewTestStandard] = useState('');
  const [newTestParameters, setNewTestParameters] = useState<NewParamInput[]>([
    { name: '', unit: '', goodValue: '', fairValue: '', poorValue: '', badValue: '' }
  ]);

  // ==========================================
  // STATE: 3. Import Tab
  // ==========================================
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    ubpsCount: number;
    assetsCount: number;
    sessionsCount: number;
    resultsCount: number;
    skippedRows: number;
  } | null>(null);

  // ==========================================
  // STATE: 3.2 Export Tab Filters
  // ==========================================
  const [exportUbpId, setExportUbpId] = useState('ALL');
  const [exportUnitName, setExportUnitName] = useState('ALL');
  const [exportAssetId, setExportAssetId] = useState('ALL');
  const [exportJudgement, setExportJudgement] = useState('ALL');
  const [exportEquipmentType, setExportEquipmentType] = useState('ALL');

  // ==========================================
  // QUERIES
  // ==========================================
  const { data: ubps, isLoading: isUbpsLoading } = useQuery<Ubp[]>({
    queryKey: ['ubp-assets'],
    queryFn: fetchUbpAssets,
  });

  const { data: testTypes, isLoading: isTestTypesLoading } = useQuery<TestType[]>({
    queryKey: ['test-types'],
    queryFn: fetchTestTypes,
  });

  const { data: jenisAssetList } = useQuery({
    queryKey: ['jenis-asset'],
    queryFn: async () => {
      const res = await fetch('/api/master/jenis-asset');
      if (!res.ok) throw new Error('Gagal mengambil data Jenis Asset');
      const json = await res.json();
      return json.data;
    }
  });



  // Memo fields for dynamic export filters
  const exportSelectedUbp = useMemo(() => {
    if (!ubps || !exportUbpId || exportUbpId === 'ALL') return null;
    return ubps.find((u) => u.id === exportUbpId) || null;
  }, [ubps, exportUbpId]);

  const exportUniqueUnits = useMemo(() => {
    if (exportUbpId === 'ALL') {
      if (!ubps) return [];
      const names = new Set<string>();
      ubps.forEach((u) => {
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

  const exportAssetsList = useMemo(() => {
    if (!ubps) return [];
    let list: any[] = [];
    if (exportUbpId === 'ALL') {
      ubps.forEach((u) => {
        u.unitPembangkit?.forEach((unit: any) => {
          if (unit.assets) {
            list.push(...unit.assets.map((a: any) => ({ ...a, unitName: unit.name })));
          }
        });
      });
    } else if (exportSelectedUbp?.unitPembangkit) {
      exportSelectedUbp.unitPembangkit.forEach((unit: any) => {
        if (unit.assets) {
          list.push(...unit.assets.map((a: any) => ({ ...a, unitName: unit.name })));
        }
      });
    }

    if (exportUnitName && exportUnitName !== 'ALL') {
      list = list.filter((a: any) => a.unitName === exportUnitName);
    }
    return list;
  }, [ubps, exportUbpId, exportSelectedUbp, exportUnitName]);

  const exportEquipmentTypes = useMemo(() => {
    if (!ubps) return [];
    const types = new Set<string>();
    for (const ubp of ubps) {
      for (const unit of ubp.unitPembangkit || []) {
        for (const asset of unit.assets || []) {
          if (asset.jenisAsset?.name) {
            types.add(asset.jenisAsset.name.trim());
          }
        }
      }
    }
    return Array.from(types).sort();
  }, [ubps]);

  // Calculate unique Equipment Types from all assets + custom local types
  const equipmentGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; testTypes: TestType[]; assetIds: string[] }>();

    // Read mappings from localstorage to pre-populate local types
    let localMappings: Record<string, string[]> = {};
    if (typeof window !== 'undefined') {
      const storedMap = localStorage.getItem('app_custom_equipment_type_mappings');
      if (storedMap) {
        try {
          localMappings = JSON.parse(storedMap);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (jenisAssetList) {
      for (const ja of jenisAssetList) {
        const mappedIds = localMappings[ja.name] || [];
        const mappedTestTypes = testTypes 
          ? testTypes.filter((t: any) => t.jenisAssetId === ja.id || mappedIds.includes(t.id))
          : [];

        map.set(ja.name, {
          id: ja.id,
          name: ja.name,
          testTypes: mappedTestTypes,
          assetIds: []
        });
      }
    }

    if (ubps) {
      for (const ubp of ubps) {
        for (const unit of ubp.unitPembangkit || []) {
          for (const asset of unit.assets || []) {
            const type = asset.jenisAsset?.name;
            const jenisId = asset.jenisAsset?.id;
            if (!type || type.trim() === '') continue;

            const typeKey = type.trim();
            if (!map.has(typeKey)) {
              map.set(typeKey, {
                id: jenisId || '',
                name: typeKey,
                testTypes: asset.testTypes || [],
                assetIds: [asset.id]
              });
            } else {
              const existing = map.get(typeKey)!;
              existing.assetIds.push(asset.id);
              if (jenisId && !existing.id) {
                existing.id = jenisId;
              }
              // If this group was pre-populated from defaultTypes/localMappings, but now we find it has assets in the database,
              // we should prioritize the actual database asset.testTypes over the localStorage template.
              if (existing.assetIds.length === 1) {
                existing.testTypes = asset.testTypes || [];
              } else if (existing.testTypes.length === 0 && asset.testTypes && asset.testTypes.length > 0) {
                existing.testTypes = asset.testTypes;
              }
            }
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ubps, testTypes, jenisAssetList]);

  const filteredEquipmentGroups = useMemo(() => {
    return equipmentGroups;
  }, [equipmentGroups]);

  // Sync selected group test type checkboxes when a group is selected (Pemetaan Tab)
  const handleSelectGroup = (group: EquipmentTypeGroup) => {
    setSelectedGroup(group);
    const configuredIds = group.testTypes?.map((t) => t.id) || [];
    setSelectedTestTypeIds(configuredIds);
    setRightPanelTab('informasi');

    const dbJenis = jenisAssetList?.find((j: any) => j.name === group.name);
    if (dbJenis && dbJenis.infoFields) {
      try {
        const parsed = JSON.parse(dbJenis.infoFields);
        const generalKeys = ['manufacture', 'serialNumber', 'mfgYear'];
        const existingKeys = parsed.map((i: any) => typeof i === 'string' ? i : i.key);
        const missingGeneral = generalKeys.filter((gk) => !existingKeys.includes(gk));
        setSelectedInfoFields([...missingGeneral, ...parsed]);
      } catch (e) {
        setSelectedInfoFields(['manufacture', 'serialNumber', 'mfgYear']);
      }
    } else {
      setSelectedInfoFields(['manufacture', 'serialNumber', 'mfgYear']);
    }
  };

  // Auto-select first equipment type group when loaded
  useEffect(() => {
    if (equipmentGroups.length > 0) {
      if (!selectedGroup) {
        handleSelectGroup(equipmentGroups[0]);
      } else {
        const current = equipmentGroups.find((g) => g.name === selectedGroup.name);
        if (current) {
          if (JSON.stringify(current) !== JSON.stringify(selectedGroup)) {
            setSelectedGroup(current);
          }
        } else {
          // Currently selected group was deleted, pick the topmost one
          handleSelectGroup(equipmentGroups[0]);
        }
      }
    } else {
      setSelectedGroup(null);
    }
  }, [equipmentGroups, selectedGroup]);




  const hasTestTypesChanged = useMemo(() => {
    if (!selectedGroup) return false;
    const configuredIds = selectedGroup.testTypes?.map((t) => t.id) || [];
    if (configuredIds.length !== selectedTestTypeIds.length) return true;
    const setConfig = new Set(configuredIds);
    return selectedTestTypeIds.some(id => !setConfig.has(id));
  }, [selectedGroup, selectedTestTypeIds]);

  const hasInfoFieldsChanged = useMemo(() => {
    if (!selectedGroup || !jenisAssetList) return false;
    const dbJenis = jenisAssetList.find((j: any) => j.name === selectedGroup.name);
    let configuredInfoFields: any[] = [];
    if (dbJenis && dbJenis.infoFields) {
      try {
        const parsed = JSON.parse(dbJenis.infoFields);
        const generalKeys = ['manufacture', 'serialNumber', 'mfgYear'];
        const existingKeys = parsed.map((i: any) => typeof i === 'string' ? i : i.key);
        const missingGeneral = generalKeys.filter((gk) => !existingKeys.includes(gk));
        configuredInfoFields = [...missingGeneral, ...parsed];
      } catch (e) {
        configuredInfoFields = ['manufacture', 'serialNumber', 'mfgYear'];
      }
    } else {
      configuredInfoFields = ['manufacture', 'serialNumber', 'mfgYear'];
    }
    return JSON.stringify(configuredInfoFields) !== JSON.stringify(selectedInfoFields);
  }, [selectedGroup, jenisAssetList, selectedInfoFields]);

  const hasPemetaanChanged = hasTestTypesChanged || hasInfoFieldsChanged;
  // STATE: 4. Damage Mechanism Tab
  // ==========================================
  // STATE: 4. Damage Mechanism Tab
  const [selectedDmGroup, setSelectedDmGroup] = useState<EquipmentTypeGroup | null>(null);
  const [selectedMechanism, setSelectedMechanism] = useState<string | null>(null);
  const [selectedDmTestTypeIds, setSelectedDmTestTypeIds] = useState<string[]>([]);
  const [searchDmTestQuery, setSearchDmTestQuery] = useState('');

  // Modals for CRUD
  const [isAddDmModalOpen, setIsAddDmModalOpen] = useState(false);
  const [newDmName, setNewDmName] = useState('');
  const [isEditDmModalOpen, setIsEditDmModalOpen] = useState(false);
  const [dmToEdit, setDmToEdit] = useState<string | null>(null);
  const [editDmName, setEditDmName] = useState('');

  // Queries
  const { data: dmData, isLoading: isDmLoading } = useQuery({
    queryKey: ['damage-mechanisms'],
    queryFn: async () => {
      const res = await fetch('/api/master/damage-mechanisms');
      if (!res.ok) throw new Error('Gagal mengambil data damage mechanism');
      const json = await res.json();
      return json.data as { mechanisms: string[]; testTypes: any[] };
    },
    enabled: activeTab === 'damage-mechanism',
  });

  const configuredDmTestTypeIds = useMemo(() => {
    if (!selectedMechanism || !dmData?.testTypes || !selectedDmGroup) return [];
    const activeGroupTestTypes = selectedDmGroup.testTypes || [];
    const checkedIds: string[] = [];
    for (const tt of activeGroupTestTypes) {
      const fullTt = dmData.testTypes.find((t) => t.id === tt.id);
      if (fullTt && fullTt.parameters && fullTt.parameters.length > 0) {
        const hasMech = fullTt.parameters.some((p: any) => {
          const currentMechs = p.damageMechanisms
            ? p.damageMechanisms.split(',').map((m: string) => m.trim())
            : [];
          return currentMechs.includes(selectedMechanism);
        });
        if (hasMech) {
          checkedIds.push(tt.id);
        }
      }
    }
    return checkedIds;
  }, [selectedMechanism, dmData, selectedDmGroup]);

  const hasDmPemetaanChanged = useMemo(() => {
    if (configuredDmTestTypeIds.length !== selectedDmTestTypeIds.length) return true;
    const configSet = new Set(configuredDmTestTypeIds);
    return selectedDmTestTypeIds.some(id => !configSet.has(id));
  }, [configuredDmTestTypeIds, selectedDmTestTypeIds]);

  // Auto-select first group
  useEffect(() => {
    if (equipmentGroups.length > 0 && !selectedDmGroup) {
      setSelectedDmGroup(equipmentGroups[0]);
    } else if (selectedDmGroup) {
      const current = equipmentGroups.find((g) => g.name === selectedDmGroup.name);
      if (current) setSelectedDmGroup(current);
    }
  }, [equipmentGroups, selectedDmGroup]);

  // Auto-select first mechanism
  useEffect(() => {
    if (dmData?.mechanisms && dmData.mechanisms.length > 0 && !selectedMechanism) {
      setSelectedMechanism(dmData.mechanisms[0]);
    }
  }, [dmData, selectedMechanism]);

  // Sync test type checkbox states when mechanism or selected group changes
  useEffect(() => {
    if (selectedMechanism && dmData?.testTypes && selectedDmGroup) {
      const activeGroupTestTypes = selectedDmGroup.testTypes || [];
      
      const checkedIds: string[] = [];
      for (const tt of activeGroupTestTypes) {
        const fullTt = dmData.testTypes.find((t) => t.id === tt.id);
        if (fullTt && fullTt.parameters && fullTt.parameters.length > 0) {
          const hasMech = fullTt.parameters.some((p: any) => {
            const currentMechs = p.damageMechanisms
              ? p.damageMechanisms.split(',').map((m: string) => m.trim())
              : [];
            return currentMechs.includes(selectedMechanism);
          });
          if (hasMech) {
            checkedIds.push(tt.id);
          }
        }
      }
      setSelectedDmTestTypeIds(checkedIds);
    } else {
      setSelectedDmTestTypeIds([]);
    }
  }, [selectedMechanism, selectedDmGroup, dmData]);

  // CRUD Mutations
  const createDmMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/master/damage-mechanisms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambahkan damage mechanism');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['damage-mechanisms'] });
      setIsAddDmModalOpen(false);
      setNewDmName('');
      setSelectedMechanism(data.data.name);
      alert(`Damage Mechanism "${data.data.name}" berhasil ditambahkan.`);
    },
    onError: (error: any) => {
      alert(error.message || 'Terjadi kesalahan saat menambahkan.');
    },
  });

  const updateDmMutation = useMutation({
    mutationFn: async (payload: { oldName: string; newName: string }) => {
      const res = await fetch('/api/master/damage-mechanisms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah nama damage mechanism');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['damage-mechanisms'] });
      setIsEditDmModalOpen(false);
      setDmToEdit(null);
      setEditDmName('');
      setSelectedMechanism(variables.newName);
      alert(`Damage Mechanism "${variables.oldName}" berhasil diubah menjadi "${variables.newName}".`);
    },
    onError: (error: any) => {
      alert(error.message || 'Terjadi kesalahan saat mengubah nama.');
    },
  });

  const deleteDmMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/master/damage-mechanisms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus damage mechanism');
      }
      return res.json();
    },
    onSuccess: (data, name) => {
      queryClient.invalidateQueries({ queryKey: ['damage-mechanisms'] });
      setSelectedMechanism(null);
      alert(`Damage Mechanism "${name}" berhasil dihapus.`);
    },
    onError: (error: any) => {
      alert(error.message || 'Terjadi kesalahan saat menghapus.');
    },
  });

  const saveDmMutation = useMutation({
    mutationFn: async (payload: { mechanism: string; parameterIds: string[] }) => {
      const res = await fetch('/api/master/damage-mechanisms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan pemetaan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-mechanisms'] });
      alert('Konfigurasi Damage Mechanism berhasil disimpan!');
    },
    onError: (error: any) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan.');
    },
  });

  // Calculate counts of parameters mapped to each mechanism
  const dmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!dmData?.mechanisms || !dmData?.testTypes) return counts;
    
    for (const m of dmData.mechanisms) {
      counts[m] = 0;
    }
    
    for (const tt of dmData.testTypes) {
      for (const p of tt.parameters || []) {
        const currentMechs = p.damageMechanisms
          ? p.damageMechanisms.split(',').map((mech: string) => mech.trim())
          : [];
        for (const m of currentMechs) {
          if (m in counts) {
            counts[m]++;
          }
        }
      }
    }
    return counts;
  }, [dmData]);

  const activeGroupTestTypes = useMemo(() => {
    return selectedDmGroup ? selectedDmGroup.testTypes || [] : [];
  }, [selectedDmGroup]);

  const activeGroupTestTypeIds = useMemo(() => {
    return activeGroupTestTypes.map((t) => t.id);
  }, [activeGroupTestTypes]);

  const isAllDmTestTypesSelected = useMemo(() => {
    return (
      activeGroupTestTypeIds.length > 0 &&
      activeGroupTestTypeIds.every((id) => selectedDmTestTypeIds.includes(id))
    );
  }, [activeGroupTestTypeIds, selectedDmTestTypeIds]);

  const handleToggleAllDmTestTypes = () => {
    if (isAllDmTestTypesSelected) {
      setSelectedDmTestTypeIds((prev) => prev.filter((id) => !activeGroupTestTypeIds.includes(id)));
    } else {
      setSelectedDmTestTypeIds((prev) => Array.from(new Set([...prev, ...activeGroupTestTypeIds])));
    }
  };

  const handleToggleDmTestType = (id: string) => {
    setSelectedDmTestTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveDmPemetaan = () => {
    if (!selectedMechanism || !selectedDmGroup || !dmData?.testTypes) return;

    const finalParamIds: string[] = [];

    for (const tt of dmData.testTypes) {
      // If this test type is NOT mapped to the selected Equipment Type, keep its parameters' current mappings
      if (!activeGroupTestTypeIds.includes(tt.id)) {
        for (const p of tt.parameters || []) {
          const currentMechs = p.damageMechanisms
            ? p.damageMechanisms.split(',').map((m: string) => m.trim())
            : [];
          if (currentMechs.includes(selectedMechanism)) {
            finalParamIds.push(p.id);
          }
        }
      } else {
        // If this test type IS mapped to the selected Equipment Type, include all its parameters if it is checked
        const isChecked = selectedDmTestTypeIds.includes(tt.id);
        if (isChecked) {
          for (const p of tt.parameters || []) {
            finalParamIds.push(p.id);
          }
        }
      }
    }

    saveDmMutation.mutate({
      mechanism: selectedMechanism,
      parameterIds: finalParamIds,
    });
  };

  // ==========================================
  // MUTATIONS & HANDLERS: 1. Pemetaan Tab
  // ==========================================
  const saveMutation = useMutation({
    mutationFn: async (payload: { jenisAssetId: string; testTypeIds: string[]; infoFields?: any[] }) => {
      const res = await fetch('/api/master/ubp-asset/assets/test-types/by-equipment-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan konfigurasi');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      const gName = equipmentGroups.find((g) => g.id === variables.jenisAssetId)?.name || 'Jenis Aset';
      alert(`Konfigurasi pengujian untuk jenis aset "${gName}" berhasil disimpan!`);

      setSelectedGroup((prev) => {
        if (!prev) return null;
        const matchingTestTypes = (testTypes || []).filter((t) => variables.testTypeIds.includes(t.id));
        return {
          ...prev,
          testTypes: matchingTestTypes,
        };
      });

      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-info-branched'] });
      queryClient.invalidateQueries({ queryKey: ['jenis-asset'] });
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan.');
    },
  });

  const deleteEquipmentTypeMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      if (!payload.id) {
        return { success: true, localOnly: true };
      }
      const res = await fetch(`/api/master/ubp-asset/assets?jenisAssetId=${encodeURIComponent(payload.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus jenis aset');
      }
      return res.json();
    },
    onSuccess: (data, payload) => {
      const equipmentType = payload.name;
      if (typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('app_custom_equipment_type_mappings');
        if (mappingsStr) {
          try {
            const mappings = JSON.parse(mappingsStr);
            delete mappings[equipmentType];
            localStorage.setItem('app_custom_equipment_type_mappings', JSON.stringify(mappings));
          } catch (e) {
            console.error(e);
          }
        }
      }

      alert(`Jenis aset "${equipmentType}" berhasil dihapus.`);
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-info-branched'] });
      queryClient.invalidateQueries({ queryKey: ['jenis-asset'] });
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menghapus jenis aset.');
    },
  });

  const handleDeleteEquipmentType = (group: EquipmentTypeGroup) => {
    if (group.assetIds.length > 0) {
      const confirmDelete = confirm(
        `PERINGATAN: Jenis aset "${group.name}" sedang digunakan oleh ${group.assetIds.length} unit pembangkit di database. Menghapus jenis aset ini akan menghapus SELURUH unit pembangkit tersebut beserta semua riwayat sesi pengujian dan hasil pengukurannya.\n\nApakah Anda yakin ingin melanjutkan?`
      );
      if (!confirmDelete) return;
      deleteEquipmentTypeMutation.mutate({ id: group.id, name: group.name });
    } else {
      const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus jenis aset "${group.name}"?`);
      if (!confirmDelete) return;
      deleteEquipmentTypeMutation.mutate({ id: group.id, name: group.name });
    }
  };

  const editEquipmentTypeMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      const res = await fetch('/api/master/jenis-asset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah jenis aset');
      }
      return res.json();
    },
    onSuccess: (data, payload) => {
      const oldName = editingEquipmentType?.name;
      const newName = payload.name.trim();

      if (oldName && oldName !== newName && typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('app_custom_equipment_type_mappings');
        if (mappingsStr) {
          try {
            const mappings = JSON.parse(mappingsStr);
            if (mappings[oldName]) {
              mappings[newName] = mappings[oldName];
              delete mappings[oldName];
              localStorage.setItem('app_custom_equipment_type_mappings', JSON.stringify(mappings));
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      alert(`Jenis aset berhasil diubah.`);
      
      // Update selectedGroup if it was the one edited
      if (selectedGroup && selectedGroup.id === payload.id) {
        setSelectedGroup(prev => prev ? { ...prev, name: newName } : null);
      }
      if (selectedDmGroup && selectedDmGroup.id === payload.id) {
        setSelectedDmGroup(prev => prev ? { ...prev, name: newName } : null);
      }

      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-info-branched'] });
      queryClient.invalidateQueries({ queryKey: ['jenis-asset'] });
      setIsEditEquipmentTypeOpen(false);
      setEditingEquipmentType(null);
      setEditEquipmentTypeName('');
    },
    onError: (error: any) => {
      alert(error.message || 'Terjadi kesalahan saat mengubah jenis aset.');
    },
  });

  const handleEditEquipmentType = (group: EquipmentTypeGroup) => {
    setEditingEquipmentType(group);
    setEditEquipmentTypeName(group.name);
    setIsEditEquipmentTypeOpen(true);
  };

  const deleteTestTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/test-types?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus jenis pengujian');
      }
      return res.json();
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets-info-branched'] });
      setSelectedTestTypeIds((prev) => prev.filter((item) => item !== id));
      alert('Jenis pengujian berhasil dihapus dari sistem.');
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menghapus jenis pengujian.');
    },
  });

  const handleDeleteTestType = (test: TestType) => {
    const confirmDelete = confirm(
      `PERINGATAN: Menghapus jenis pengujian "${test.name}" akan menghapus seluruh data kriteria parameter terkait dan seluruh hasil pengukuran dari semua unit pembangkit di database. Tindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin ingin menghapus?`
    );
    if (!confirmDelete) return;
    deleteTestTypeMutation.mutate(test.id);
  };


  const handleSavePemetaan = () => {
    if (!selectedGroup) return;

    if (selectedGroup.id) {
      saveMutation.mutate({
        jenisAssetId: selectedGroup.id,
        testTypeIds: selectedTestTypeIds,
        infoFields: selectedInfoFields,
      });
    } else {
      if (typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('app_custom_equipment_type_mappings') || '{}';
        try {
          const mappings = JSON.parse(mappingsStr);
          mappings[selectedGroup.name] = selectedTestTypeIds;
          localStorage.setItem('app_custom_equipment_type_mappings', JSON.stringify(mappings));
          
          alert(`Konfigurasi pengujian untuk jenis aset "${selectedGroup.name}" berhasil disimpan sebagai template! Konfigurasi ini akan otomatis diterapkan saat Anda menambahkan unit pembangkit baru dengan jenis tersebut di menu Master UBP & Aset.`);

          setSelectedGroup((prev) => {
            if (!prev) return null;
            const matchingTestTypes = (testTypes || []).filter((t) => selectedTestTypeIds.includes(t.id));
            return {
              ...prev,
              testTypes: matchingTestTypes,
            };
          });

          queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
          queryClient.invalidateQueries({ queryKey: ['ubp-assets-manage'] });
          queryClient.invalidateQueries({ queryKey: ['ubp-assets-info-branched'] });
        } catch (e) {
          console.error(e);
          alert('Gagal menyimpan konfigurasi lokal.');
        }
      }
    }
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

  const createTestTypeMutation = useMutation({
    mutationFn: async (payload: { name: string; standard: string; parameters: NewParamInput[]; jenisAssetId?: string }) => {
      const res = await fetch('/api/master/test-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat jenis pengujian baru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      const createdTestType = data.data;
      alert(`Jenis pengujian "${createdTestType.name}" berhasil ditambahkan!`);
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      setIsCreateModalOpen(false);
      resetCreateModalState();
      setEditingTestType(null);

      if (selectedGroup && createdTestType?.id) {
        setSelectedTestTypeIds((prev) => Array.from(new Set([...prev, createdTestType.id])));
      }
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan pengujian baru.');
    },
  });

  const updateTestTypeMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; standard: string; orderIndex?: number; parameters: any[] }) => {
      const res = await fetch('/api/master/test-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah jenis pengujian');
      }
      return res.json();
    },
    onSuccess: (data) => {
      alert(`Jenis pengujian "${data.data.name}" berhasil diubah!`);
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      setIsCreateModalOpen(false);
      resetCreateModalState();
      setEditingTestType(null);
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan pengujian.');
    },
  });

  const handleEditTestTypeClick = (test: TestType) => {
    setEditingTestType(test);
    setNewTestName(test.name);
    setNewTestStandard(test.standard || '');
    if (test.parameters && test.parameters.length > 0) {
      setNewTestParameters(
        test.parameters.map((p: any) => {
          const c = p.criteria && p.criteria.length > 0 ? p.criteria[0] : null;
          return {
            id: p.id,
            name: p.name,
            unit: p.unit || '',
            goodValue: c ? c.goodValue || '' : '',
            fairValue: c ? c.fairValue || '' : '',
            poorValue: c ? c.poorValue || '' : '',
            badValue: c ? c.badValue || '' : '',
          };
        })
      );
    } else {
      setNewTestParameters([
        { name: '', unit: '', goodValue: '', fairValue: '', poorValue: '', badValue: '' }
      ]);
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateTestType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) {
      alert('Nama pengujian wajib diisi!');
      return;
    }
    const invalidParam = newTestParameters.find(p => !p.name.trim());
    if (invalidParam) {
      alert('Nama parameter tidak boleh ada yang kosong!');
      return;
    }

    if (editingTestType) {
      updateTestTypeMutation.mutate({
        id: editingTestType.id,
        name: newTestName,
        standard: newTestStandard,
        orderIndex: editingTestType.orderIndex,
        parameters: newTestParameters
      });
    } else {
      createTestTypeMutation.mutate({
        name: newTestName,
        standard: newTestStandard,
        parameters: newTestParameters,
        jenisAssetId: selectedGroup?.id,
      });
    }
  };

  const resetCreateModalState = () => {
    setNewTestName('');
    setNewTestStandard('');
    setNewTestParameters([
      { name: '', unit: '', goodValue: '', fairValue: '', poorValue: '', badValue: '' }
    ]);
  };

  const handleAddParamRow = () => {
    setNewTestParameters(prev => [
      ...prev,
      { name: '', unit: '', goodValue: '', fairValue: '', poorValue: '', badValue: '' }
    ]);
  };

  const handleRemoveParamRow = (index: number) => {
    if (newTestParameters.length === 1) return;
    setNewTestParameters(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleParamChange = (index: number, field: keyof NewParamInput, val: string) => {
    setNewTestParameters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // ==========================================
  // MUTATIONS & HANDLERS: 2. Kriteria Tab
  // ==========================================


  // ==========================================
  // MUTATIONS & HANDLERS: 3. Import Tab
  // ==========================================
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const confirmPurge = confirm(
      'PERINGATAN: Mengimpor data baru akan menghapus seluruh data pengujian, unit pembangkit, dan UBP yang ada saat ini. Apakah Anda yakin ingin melanjutkan?'
    );
    if (!confirmPurge) return;

    setIsImporting(true);
    setImportMessage(null);
    setImportError(null);
    setImportSummary(null);

    try {
      const fd = new FormData();
      fd.append('file', importFile);

      const response = await fetch('/api/master/import', {
        method: 'POST',
        body: fd,
      });

      const result = await response.json();

      if (result.success) {
        setImportMessage('Data real berhasil diimpor ke database.');
        setImportSummary(result.data);
        setImportFile(null);
        queryClient.invalidateQueries();
      } else {
        setImportError(result.error || 'Gagal mengimpor file Excel.');
      }
    } catch (err) {
      console.error(err);
      setImportError('Gagal menghubungi server.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredTestTypes = useMemo(() => {
    if (!selectedGroup || !testTypes) return [];
    return testTypes.filter((t: any) => {
      const matchesSearch = t.name.toLowerCase().includes(searchTestQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (t.jenisAssetId) {
        return t.jenisAssetId === selectedGroup.id;
      }

      const inDraft = selectedTestTypeIds.includes(t.id);
      const inSaved = selectedGroup.testTypes?.some((gt) => gt.id === t.id);
      return inDraft || inSaved;
    });
  }, [selectedGroup, testTypes, searchTestQuery, selectedTestTypeIds]);

  const isLoading = isUbpsLoading || isTestTypesLoading;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1440px] mx-auto pb-20">
      {/* Breadcrumbs */}
      <nav className="flex mb-2">
        <ol className="inline-flex items-center space-x-2">
          <li><span className="text-on-surface-variant font-mono text-xs">Master Data</span></li>
          <li>
            <div className="flex items-center">
              <span className="material-symbols-outlined text-sm text-on-surface-variant mx-1 select-none">chevron_right</span>
              <span className="text-primary font-mono text-xs font-bold">
                {activeTab === 'pemetaan' 
                  ? 'Pengaturan Pengujian' 
                  : activeTab === 'damage-mechanism'
                    ? 'Faktor Damage Mechanism'
                    : 'Import Excel'}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-surface-border gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-1">Kriteria Standard</h2>
          <p className="text-xs text-on-surface-variant">Konfigurasikan pengujian yang berlaku bagi jenis aset, sesuaikan standardisasi kriteria ambang batas parameter, dan import berkas Excel.</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-surface-border gap-4">
        <button
          onClick={() => setActiveTab('pemetaan')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer ${
            activeTab === 'pemetaan'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Pengaturan Pengujian
        </button>
        <button
          onClick={() => setActiveTab('damage-mechanism')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer ${
            activeTab === 'damage-mechanism'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Faktor Damage Mechanism
        </button>
        {/*
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer ${
            activeTab === 'import'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Import Data Real (Excel)
        </button>
        */}
      </div>

      {/* ==========================================
          TAB CONTENT: 1. Pemetaan Pengujian
          ========================================== */}
      {activeTab === 'pemetaan' && (
        <div className="grid grid-cols-12 gap-6 items-stretch animate-fade-in">
          {/* Left Sidebar: Jenis Aset List */}
          <div className="col-span-12 lg:col-span-4 flex flex-col">
            <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm h-[620px] flex flex-col justify-between overflow-hidden">
              <h3 className="text-sm font-bold text-on-surface mb-2 shrink-0">
                Daftar Jenis Aset (Equipment Type)
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-10 flex-1">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredEquipmentGroups.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant font-medium text-xs flex-1 flex items-center justify-center">
                  Tidak ada data jenis aset.
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                  {filteredEquipmentGroups.map((group) => {
                    const isSelected = selectedGroup?.name === group.name;
                    const testCount = group.testTypes?.length || 0;
                    const assetCount = group.assetIds?.length || 0;

                    return (
                      <button
                        key={group.name}
                        onClick={() => handleSelectGroup(group)}
                        className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer group/item ${
                          isSelected
                            ? 'bg-primary-container/20 border-primary text-primary-text font-semibold'
                            : 'bg-white border-surface-border hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="text-xs font-bold truncate">{group.name}</span>
                          <span className="text-[9px] text-on-surface-variant/80 font-medium">
                            Digunakan oleh {assetCount} unit pembangkit
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            testCount > 0 
                              ? 'bg-status-good/15 text-status-good-text' 
                              : 'bg-outline/10 text-on-surface-variant'
                          }`}>
                            {testCount} Jenis Tes
                          </span>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEquipmentType(group);
                            }}
                            className="p-1 text-outline hover:text-primary hover:bg-primary/5 rounded transition-all cursor-pointer flex items-center justify-center"
                            title="Edit Jenis Aset"
                          >
                            <span className="material-symbols-outlined text-[15px] select-none">edit</span>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEquipmentType(group);
                            }}
                            className="p-1 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded transition-all cursor-pointer flex items-center justify-center"
                            title="Hapus Jenis Aset"
                          >
                            <span className="material-symbols-outlined text-[15px] select-none">delete</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Add Equipment Type Button in Sidebar */}
              <button
                onClick={() => {
                  setNewEquipmentTypeName('');
                  setIsAddEquipmentTypeOpen(true);
                }}
                className="w-full mt-3 py-2.5 border border-dashed border-primary text-primary hover:bg-primary/5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px] select-none">add_circle</span>
                Tambah Jenis Aset Baru
              </button>
            </div>
          </div>

          {/* Right Panel: Checkbox Map */}
          <div className="col-span-12 lg:col-span-8 flex flex-col">
            {selectedGroup ? (
              <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm h-[620px] flex flex-col justify-between overflow-hidden">
                <div className="bg-surface-container-low p-3.5 rounded-lg border border-surface-border flex justify-between items-center shrink-0">
                  <div>
                    <span className="bg-primary/10 text-primary text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Jenis Aset aktif
                    </span>
                    <h4 className="text-base font-bold text-on-surface mt-1">{selectedGroup.name}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-outline">Pengujian Aktif</p>
                    <p className="text-base font-bold text-primary font-mono">{selectedTestTypeIds.length} / {testTypes?.length || 0}</p>
                  </div>
                </div>

                {/* Tab Selector inside Right Panel */}
                <div className="flex border-b border-surface-border/60 gap-6 my-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('informasi')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all px-1 cursor-pointer ${
                      rightPanelTab === 'informasi'
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Informasi Spesifikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('pengujian')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all px-1 cursor-pointer ${
                      rightPanelTab === 'pengujian'
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Jenis Pengujian ({selectedTestTypeIds.length})
                  </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 min-h-0">
                  {rightPanelTab === 'informasi' && (
                    <div className="space-y-3 shrink-0 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5 border-b border-surface-border">
                      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide">
                        Parameter Informasi Spesifikasi
                      </h3>
                    </div>

                    <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm max-w-xl space-y-3">
                      <div className="border border-surface-border rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low border-b border-surface-border font-mono text-[9px] uppercase font-bold text-on-surface-variant h-10">
                              <th className="px-4 py-2 w-[70%] border-r border-surface-border">Nama Parameter</th>
                              <th className="px-4 py-2 w-[30%] text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {selectedInfoFields.map((item) => {
                              const { key, placeholder } = resolveField(item);
                              const standardField = METADATA_FIELDS.find((f) => f.key === key);
                              const label = standardField ? standardField.label : key.toUpperCase();
                              const isGeneral = key === 'manufacture' || key === 'serialNumber' || key === 'mfgYear';

                              return (
                                <tr key={key} className="h-11 hover:bg-surface-container-low/10 transition-colors">
                                  <td className="px-4 py-2 font-semibold text-on-surface border-r border-surface-border bg-surface-container-low/5 w-[70%] align-middle">
                                    <div>{label}</div>
                                  </td>
                                  <td className="px-4 py-2 text-center w-[30%] align-middle">
                                    {isGeneral ? (
                                      <span className="text-gray-400 text-[10px] italic select-none">General (Bawaan)</span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditParamOldName(label);
                                            setEditParamOldKey(key);
                                            setEditParamNewName(label);
                                            setEditParamPlaceholder(placeholder);
                                            setIsEditParamOpen(true);
                                          }}
                                          className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-primary/5 transition-all cursor-pointer inline-flex items-center justify-center h-7 w-7"
                                          title="Edit Parameter"
                                        >
                                          <span className="material-symbols-outlined text-[15px] select-none">edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`Apakah Anda yakin ingin menghapus parameter "${label}"?`)) {
                                              setSelectedInfoFields((prev) =>
                                                prev.filter((i) => {
                                                  const k = typeof i === 'string' ? i : i.key;
                                                  return k !== key;
                                                })
                                              );
                                            }
                                          }}
                                          className="p-1 text-on-surface-variant hover:text-status-bad rounded hover:bg-status-bad/5 transition-all cursor-pointer inline-flex items-center justify-center h-7 w-7"
                                          title="Hapus Parameter"
                                        >
                                          <span className="material-symbols-outlined text-[15px] select-none">delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {selectedInfoFields.length === 0 && (
                              <tr>
                                <td colSpan={2} className="text-center py-4 text-on-surface-variant italic text-[11px]">
                                  Belum ada parameter spesifikasi aktif.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>


                    </div>
                  </div>
                )}

                  {rightPanelTab === 'pengujian' && (
                    <div className="flex flex-col space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5 border-b border-surface-border">
                      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide">
                        Jenis Pengujian ({selectedGroup?.name || ''})
                      </h3>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={handleSelectAll}
                          className="text-xs font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                        >
                          {testTypes && selectedTestTypeIds.length === testTypes.length ? 'Batal Semua' : 'Pilih Semua'}
                        </button>
                        <div className="relative w-44">
                          <input
                            type="text"
                            placeholder="Cari pengujian..."
                            value={searchTestQuery}
                            onChange={(e) => setSearchTestQuery(e.target.value)}
                            className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1 px-8 pr-3 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-all"
                          />
                          <span className="material-symbols-outlined text-outline absolute left-2 top-1/2 -translate-y-1/2 text-sm select-none">
                            search
                          </span>
                        </div>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : !filteredTestTypes || filteredTestTypes.length === 0 ? (
                      <div className="text-center py-10 text-on-surface-variant font-medium text-xs">
                        {searchTestQuery
                          ? 'Tidak ada jenis pengujian yang cocok.'
                          : `Belum ada jenis pengujian untuk jenis aset "${selectedGroup?.name || ''}". Klik tombol "Tambah Pengujian Baru" di bawah untuk menambahkan.`}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start pr-1 pb-4">
                        {filteredTestTypes.map((test) => {
                          const isChecked = selectedTestTypeIds.includes(test.id);

                          return (
                            <div
                              key={test.id}
                              onClick={() => handleToggleTestType(test.id)}
                              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer select-none transition-all group/checkbox-row ${
                                isChecked
                                  ? 'border-primary bg-primary-container/5 text-primary-text'
                                  : 'border-surface-border bg-white text-on-surface hover:bg-surface-container-low'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="h-4 w-4 text-primary border-surface-border rounded focus:ring-primary cursor-pointer shrink-0"
                                />
                                <span className="text-xs font-semibold truncate leading-none">{test.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTestTypeClick(test);
                                  }}
                                  className="p-1 text-outline hover:text-primary hover:bg-primary/5 rounded transition-all cursor-pointer flex items-center justify-center"
                                  title="Edit Jenis Pengujian"
                                >
                                  <span className="material-symbols-outlined text-[14px] select-none">edit</span>
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTestType(test);
                                  }}
                                  className="p-1 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded transition-all cursor-pointer flex items-center justify-center"
                                  title="Hapus Jenis Pengujian"
                                >
                                  <span className="material-symbols-outlined text-[14px] select-none">delete</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-border">
                  <div>
                    {rightPanelTab === 'pengujian' && (
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white hover:brightness-110 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 animate-fade-in"
                      >
                        <span className="material-symbols-outlined text-[16px] select-none">add_circle</span> Tambah Pengujian Baru
                      </button>
                    )}
                    {rightPanelTab === 'informasi' && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewParamName('');
                          setNewParamPlaceholder('');
                          setIsAddParamOpen(true);
                        }}
                        className="px-4 py-2 bg-primary text-white hover:brightness-110 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 animate-fade-in"
                      >
                        <span className="material-symbols-outlined text-[16px] select-none">add_circle</span> Tambah Parameter Baru
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectGroup(selectedGroup)}
                      disabled={saveMutation.isPending}
                      className="px-4 py-2 border border-surface-border hover:bg-surface-container-low rounded-lg font-bold text-xs text-on-surface-variant transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Reset Pilihan
                    </button>
                    <button
                      onClick={handleSavePemetaan}
                      disabled={saveMutation.isPending || !hasPemetaanChanged}
                      className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                        saveMutation.isPending || !hasPemetaanChanged
                          ? 'bg-surface-container border border-surface-border text-on-surface-variant/40 cursor-not-allowed'
                          : 'bg-primary text-white hover:brightness-110 shadow active:scale-95 cursor-pointer'
                      }`}
                    >
                      {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                      {!saveMutation.isPending && (
                        <span className="material-symbols-outlined text-sm select-none">save</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-surface-border p-12 shadow-sm text-center flex flex-col items-center justify-center h-[620px]">
                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl select-none">fact_check</span>
                </div>
                <h3 className="text-base font-bold text-on-surface mb-2">Pilih Jenis Aset Terlebih Dahulu</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Silakan pilih salah satu jenis aset di daftar sebelah kiri untuk mengonfigurasi jenis pengujian yang berlaku.
                </p>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ==========================================
          TAB CONTENT: 4. Damage Mechanism Mapping
          ========================================== */}
      {activeTab === 'damage-mechanism' && (
        <div className="grid grid-cols-12 gap-6 items-stretch animate-fade-in">
          {/* Left Sidebar: Equipment Types List */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-3 shrink-0">
                  Daftar Jenis Aset (Equipment Type)
                </h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-10 flex-1">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : equipmentGroups.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant font-medium text-xs flex-1 flex items-center justify-center">
                    Tidak ada data jenis aset.
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[300px] max-h-[60vh]">
                    {equipmentGroups.map((group) => {
                      const isSelected = selectedDmGroup?.name === group.name;
                      const assetCount = group.assetIds?.length || 0;

                      return (
                        <button
                          key={group.name}
                          onClick={() => setSelectedDmGroup(group)}
                          className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer group/item ${
                            isSelected
                              ? 'bg-primary-container/20 border-primary text-primary-text font-semibold'
                              : 'bg-white border-surface-border hover:bg-surface-container-low text-on-surface'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-xs font-bold truncate">{group.name}</span>
                            <span className="text-[9px] text-on-surface-variant/80 font-medium">
                              Digunakan oleh {assetCount} unit pembangkit
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Damage Mechanism Selection & Test Type checklist */}
          <div className="col-span-12 lg:col-span-8 min-h-[50vh] max-h-[70vh] flex flex-col">
            {selectedDmGroup ? (
              <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm space-y-5 flex-1 flex flex-col justify-between overflow-hidden">
                
                {/* Top Section: active asset */}
                <div className="bg-surface-container-low p-4 rounded-lg border border-surface-border flex flex-col gap-4 shrink-0">
                  <div className="flex justify-between items-center border-b border-surface-border/50 pb-2">
                    <div>
                      <span className="bg-primary/10 text-primary text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                        Jenis Asset aktif
                      </span>
                      <h4 className="text-base font-bold text-on-surface mt-1">{selectedDmGroup.name}</h4>
                    </div>
                    
                    <button
                      onClick={() => {
                        setNewDmName('');
                        setIsAddDmModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-primary text-white hover:brightness-110 rounded-lg text-xs font-bold shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[15px] select-none">add_circle</span>
                      Tambah Damage Mechanism
                    </button>
                  </div>

                  {/* Dropdown Selector for Damage Mechanism */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 w-full sm:w-auto flex-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Damage Mechanism
                      </label>
                      {isDmLoading ? (
                        <div className="h-8 w-48 bg-surface-container rounded animate-pulse" />
                      ) : !dmData?.mechanisms || dmData.mechanisms.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">Tidak ada damage mechanism.</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedMechanism || ''}
                            onChange={(e) => setSelectedMechanism(e.target.value)}
                            className="bg-white border border-surface-border rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:border-primary font-semibold text-on-surface cursor-pointer flex-1 sm:max-w-xs"
                          >
                            {dmData.mechanisms.map((mech) => (
                              <option key={mech} value={mech}>
                                {mech}
                              </option>
                            ))}
                          </select>

                          {selectedMechanism && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setDmToEdit(selectedMechanism);
                                  setEditDmName(selectedMechanism);
                                  setIsEditDmModalOpen(true);
                                }}
                                className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded border border-surface-border transition-all cursor-pointer flex items-center justify-center bg-white"
                                title="Edit Nama Damage Mechanism"
                              >
                                <span className="material-symbols-outlined text-[16px] select-none">edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus Damage Mechanism "${selectedMechanism}"?\nSemua pemetaan parameter untuk mekanisme ini akan dihapus.`)) {
                                    deleteDmMutation.mutate(selectedMechanism);
                                  }
                                }}
                                className="p-1.5 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded border border-surface-border transition-all cursor-pointer flex items-center justify-center bg-white"
                                title="Hapus Damage Mechanism"
                              >
                                <span className="material-symbols-outlined text-[16px] select-none">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5 border-b border-surface-border shrink-0">
                    <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide">
                      Pilih Jenis Pengujian yang Sesuai
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleToggleAllDmTestTypes}
                        className="text-xs font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                      >
                        {isAllDmTestTypesSelected ? 'Batal Semua' : 'Pilih Semua'}
                      </button>
                      <div className="relative w-44">
                        <input
                          type="text"
                          placeholder="Cari pengujian..."
                          value={searchDmTestQuery}
                          onChange={(e) => setSearchDmTestQuery(e.target.value)}
                          className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1 px-8 pr-3 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-all"
                        />
                        <span className="material-symbols-outlined text-outline absolute left-2 top-1/2 -translate-y-1/2 text-sm select-none">
                          search
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* List of Mapped Test Types */}
                  {isDmLoading ? (
                    <div className="flex items-center justify-center py-20 flex-1">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : activeGroupTestTypes.length === 0 ? (
                    <div className="text-center py-20 text-on-surface-variant font-medium text-xs flex-1 flex items-center justify-center">
                      Tidak ada jenis pengujian yang dipetakan ke jenis aset "{selectedDmGroup.name}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start overflow-y-auto custom-scrollbar pr-1 pb-4 flex-1 min-h-0">
                      {activeGroupTestTypes
                        .filter((tt) => tt.name.toLowerCase().includes(searchDmTestQuery.toLowerCase()))
                        .map((tt) => {
                          const isChecked = selectedDmTestTypeIds.includes(tt.id);
                          return (
                            <div
                              key={tt.id}
                              onClick={() => handleToggleDmTestType(tt.id)}
                              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer select-none transition-all group/checkbox-row ${
                                isChecked
                                  ? 'border-primary bg-primary-container/5 text-primary-text font-semibold'
                                  : 'border-surface-border bg-white text-on-surface hover:bg-surface-container-low'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="h-4 w-4 text-primary border-surface-border rounded focus:ring-primary cursor-pointer shrink-0"
                                />
                                <span className="text-xs font-semibold truncate leading-none">{tt.name}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Footer Save / Reset Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border shrink-0">
                  <button
                    onClick={() => {
                      if (selectedMechanism && dmData?.testTypes && selectedDmGroup) {
                        const activeGroupTestTypes = selectedDmGroup.testTypes || [];
                        
                        const checkedIds: string[] = [];
                        for (const tt of activeGroupTestTypes) {
                          const fullTt = dmData.testTypes.find((t) => t.id === tt.id);
                          if (fullTt && fullTt.parameters && fullTt.parameters.length > 0) {
                            const hasMech = fullTt.parameters.some((p: any) => {
                              const currentMechs = p.damageMechanisms
                                ? p.damageMechanisms.split(',').map((m: string) => m.trim())
                                : [];
                              return currentMechs.includes(selectedMechanism);
                            });
                            if (hasMech) {
                              checkedIds.push(tt.id);
                            }
                          }
                        }
                        setSelectedDmTestTypeIds(checkedIds);
                        alert('Pilihan di-reset.');
                      }
                    }}
                    disabled={saveDmMutation.isPending}
                    className="px-4 py-2 border border-surface-border hover:bg-surface-container-low rounded-lg font-bold text-xs text-on-surface-variant transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Reset Pilihan
                  </button>
                  <button
                    onClick={handleSaveDmPemetaan}
                    disabled={saveDmMutation.isPending || !hasDmPemetaanChanged}
                    className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      saveDmMutation.isPending || !hasDmPemetaanChanged
                        ? 'bg-surface-container border border-surface-border text-on-surface-variant/40 cursor-not-allowed'
                        : 'bg-primary text-white hover:brightness-110 shadow active:scale-95 cursor-pointer'
                    }`}
                  >
                    {saveDmMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                    {!saveDmMutation.isPending && (
                      <span className="material-symbols-outlined text-sm select-none">save</span>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-xl border border-surface-border p-12 shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[50vh]">
                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl select-none">fact_check</span>
                </div>
                <h3 className="text-base font-bold text-on-surface mb-2">Pilih Jenis Asset Terlebih Dahulu</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Silakan pilih salah satu jenis aset di daftar sebelah kiri untuk mengonfigurasi jenis pengujian yang sesuai.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB CONTENT: 5. Import Data Real (Excel)
          ========================================== */}
      {activeTab === 'import' && (
        <div className="space-y-6 animate-fade-in">
          {/* Excel Import Guidelines */}
          <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-6 space-y-3 shadow-xs">
            <h4 className="font-bold text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-700 text-lg select-none">warning</span>
              PETUNJUK FORMAT EXCEL IMPORT DATA REAL
            </h4>
            <div className="text-xs space-y-2 leading-relaxed">
              <p>Untuk mengimpor data real ke database, mohon persiapkan berkas Excel (.xlsx) dengan struktur lembar kerja (worksheet) pertama sebagai berikut:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Baris pertama berisi **Header Kolom** (Nama Kolom).</li>
                <li>Data spesifikasi wajib diletakkan di kolom terpetakan berikut:
                  <ul className="list-disc list-inside ml-6 space-y-0.5 text-on-surface-variant">
                    <li><strong className="text-on-surface">Nama Unit Bisnis / UBP</strong> (kolom C, index 2)</li>
                    <li><strong className="text-on-surface">Nama Aset (Trafo)</strong> (kolom E, index 4)</li>
                    <li><strong className="text-on-surface">Jenis Aset</strong> (kolom F, index 5)</li>
                    <li><strong className="text-on-surface">Vector Group</strong> (kolom G, index 6)</li>
                    <li><strong className="text-on-surface">Serial Number</strong> (kolom H, index 7)</li>
                  </ul>
                </li>
                <li>Kolom nilai pengukuran terentang di kolom **J sampai CV (kolom 9 - 99)**, dengan kolom hasil kalkulasi score terpetang sejajar di kolom **DY sampai GR (kolom 103 - 177)**.</li>
              </ul>
            </div>
          </div>

          {/* Import Form */}
          <form onSubmit={handleImportSubmit} className="bg-white border border-surface-border rounded-xl p-6 space-y-6 shadow-xs">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
                Pilih Berkas Excel (.xlsx)
              </label>
              
              <div className="flex items-center gap-3">
                <input
                  id="excel-file-input"
                  type="file"
                  required
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={isImporting}
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] || null);
                    setImportMessage(null);
                    setImportError(null);
                    setImportSummary(null);
                  }}
                  className="text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-[#dae2ff] file:cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {importMessage && (
              <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg border border-emerald-200 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-700 select-none">check_circle</span>
                <span>{importMessage}</span>
              </div>
            )}

            {importError && (
              <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-700 select-none">error</span>
                <span>{importError}</span>
              </div>
            )}

            {importSummary && (
              <div className="bg-surface-container-low p-4 rounded-lg border border-surface-border text-xs space-y-2 font-mono">
                <p className="font-bold text-on-surface">RINGKASAN DATA REAL DIIMPOR:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>✓ Jumlah UBP:</div>
                  <div className="font-bold text-primary">{importSummary.ubpsCount}</div>
                  <div>✓ Jumlah Unit Pembangkit:</div>
                  <div className="font-bold text-primary">{importSummary.assetsCount}</div>
                  <div>✓ Jumlah Test Sessions:</div>
                  <div className="font-bold text-primary">{importSummary.sessionsCount}</div>
                  <div>✓ Jumlah Hasil Pengujian:</div>
                  <div className="font-bold text-primary">{importSummary.resultsCount} rows</div>
                  {importSummary.skippedRows > 0 && (
                    <>
                      <div className="text-on-surface-variant">⚠️ Baris Kosong/Dilewati:</div>
                      <div className="font-bold text-amber-600">{importSummary.skippedRows} rows</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-surface-border">
              <button
                type="submit"
                disabled={isImporting || !importFile}
                className="px-6 py-2.5 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                {isImporting && (
                  <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                )}
                {isImporting ? 'Mengimpor Data...' : 'Mulai Import'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Tambah Pengujian Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-surface-border bg-surface-background flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary select-none">
                  {editingTestType ? 'edit_note' : 'add_box'}
                </span>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                  {editingTestType ? 'Edit Jenis Pengujian' : 'Tambah Jenis Pengujian Baru'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateModalState();
                  setEditingTestType(null);
                }}
                className="text-on-surface-variant hover:text-on-surface rounded p-1 hover:bg-surface-container transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg select-none">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTestType} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                    Nama Pengujian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    placeholder="Contoh: Insulation Resistance Winding"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                    Standard Referensi
                  </label>
                  <input
                    type="text"
                    value={newTestStandard}
                    onChange={(e) => setNewTestStandard(e.target.value)}
                    placeholder="Contoh: IEEE Std C57.152-2013"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-surface-border">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Parameter & Ambang Batas (Threshold)</h4>
                <button
                  type="button"
                  onClick={handleAddParamRow}
                  className="px-2.5 py-1 border border-primary text-primary hover:bg-primary/5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[12px] select-none">add</span> Tambah Parameter
                </button>
              </div>

              <div className="space-y-3.5 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                {newTestParameters.map((param, index) => (
                  <div key={index} className="p-3 bg-surface-container-lowest border border-surface-border rounded-lg space-y-2 relative group/row">
                    {newTestParameters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParamRow(index)}
                        className="absolute right-2 top-2 p-1 text-on-surface-variant hover:text-status-bad hover:bg-status-bad/5 rounded cursor-pointer transition-all"
                        title="Hapus Parameter"
                      >
                        <span className="material-symbols-outlined text-[16px] select-none">delete</span>
                      </button>
                    )}

                    <div className="grid grid-cols-12 gap-3 pr-6">
                      <div className="col-span-8">
                        <label className="block text-[9px] font-bold text-on-surface-variant/80 uppercase">
                          Nama Parameter <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={param.name}
                          onChange={(e) => handleParamChange(index, 'name', e.target.value)}
                          placeholder="e.g. HV-LV atau R-S"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[9px] font-bold text-on-surface-variant/80 uppercase">
                          Satuan
                        </label>
                        <input
                          type="text"
                          value={param.unit}
                          onChange={(e) => handleParamChange(index, 'unit', e.target.value)}
                          placeholder="e.g. G Ohm, kV, atau %"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="block text-[8px] font-bold text-status-good uppercase tracking-wider mb-0.5">
                          Good
                        </label>
                        <input
                          type="text"
                          value={param.goodValue}
                          onChange={(e) => handleParamChange(index, 'goodValue', e.target.value)}
                          placeholder="e.g. >= 2"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-[10px] focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-status-fair uppercase tracking-wider mb-0.5">
                          Fair
                        </label>
                        <input
                          type="text"
                          value={param.fairValue}
                          onChange={(e) => handleParamChange(index, 'fairValue', e.target.value)}
                          placeholder="e.g. 1.0 - 1.99"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-[10px] focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-status-poor uppercase tracking-wider mb-0.5">
                          Poor
                        </label>
                        <input
                          type="text"
                          value={param.poorValue}
                          onChange={(e) => handleParamChange(index, 'poorValue', e.target.value)}
                          placeholder="e.g. 0.5 - 0.99"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-[10px] focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-status-bad uppercase tracking-wider mb-0.5">
                          Bad
                        </label>
                        <input
                          type="text"
                          value={param.badValue}
                          onChange={(e) => handleParamChange(index, 'badValue', e.target.value)}
                          placeholder="e.g. < 0.5"
                          className="w-full bg-white border border-outline-variant rounded-md py-1 px-2 text-[10px] focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateModalState();
                    setEditingTestType(null);
                  }}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg font-bold text-xs text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createTestTypeMutation.isPending || updateTestTypeMutation.isPending}
                  className="px-5 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow-md shadow-primary/10 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {(createTestTypeMutation.isPending || updateTestTypeMutation.isPending) && (
                    <span className="material-symbols-outlined animate-spin text-[14px] select-none">progress_activity</span>
                  )}
                  {editingTestType ? 'Simpan Perubahan' : 'Simpan Pengujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Tambah Jenis Aset Baru dari Sidebar */}
      {isAddEquipmentTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Tambah Jenis Aset Baru (Equipment Type)
            </h3>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const newName = newEquipmentTypeName.trim();
                if (!newName) return;

                const exists = equipmentGroups.some(g => g.name.toLowerCase() === newName.toLowerCase());
                if (exists) {
                  alert(`Jenis aset "${newName}" sudah terdaftar.`);
                  return;
                }

                try {
                  const res = await fetch('/api/master/jenis-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName, category: 'Trafo' }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Gagal menambahkan jenis aset');
                  }
                  const json = await res.json();
                  const newGroup: EquipmentTypeGroup = {
                    id: json.data.id,
                    name: newName,
                    testTypes: [],
                    assetIds: []
                  };
                  setSelectedGroup(newGroup);
                  setSelectedTestTypeIds([]);
                  queryClient.invalidateQueries({ queryKey: ['jenis-asset'] });
                  setIsAddEquipmentTypeOpen(false);
                  setNewEquipmentTypeName('');
                  alert(`Jenis aset baru "${newName}" berhasil ditambahkan! Silakan tentukan jenis pengujian yang berlaku.`);
                } catch (err: any) {
                  alert(err.message || 'Terjadi kesalahan saat menambahkan jenis aset baru.');
                }
              }}
              className="space-y-6 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Nama Jenis Aset <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Trafo Start, Emergency Generator, dll"
                  value={newEquipmentTypeName}
                  onChange={(e) => setNewEquipmentTypeName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsAddEquipmentTypeOpen(false)}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
                >
                  Simpan Jenis Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Jenis Aset Baru dari Sidebar */}
      {isEditEquipmentTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Edit Jenis Aset (Equipment Type)
            </h3>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const name = editEquipmentTypeName.trim();
                if (!name || !editingEquipmentType) return;

                const exists = equipmentGroups.some(
                  g => g.name.toLowerCase() === name.toLowerCase() && g.id !== editingEquipmentType.id
                );
                if (exists) {
                  alert(`Jenis aset "${name}" sudah terdaftar.`);
                  return;
                }

                editEquipmentTypeMutation.mutate({
                  id: editingEquipmentType.id,
                  name: name
                });
              }}
              className="space-y-6 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Nama Jenis Aset <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Trafo Start, Emergency Generator, dll"
                  value={editEquipmentTypeName}
                  onChange={(e) => setEditEquipmentTypeName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEquipmentTypeOpen(false);
                    setEditingEquipmentType(null);
                    setEditEquipmentTypeName('');
                  }}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editEquipmentTypeMutation.isPending}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editEquipmentTypeMutation.isPending && (
                    <span className="material-symbols-outlined animate-spin text-[14px] select-none">progress_activity</span>
                  )}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Parameter Baru */}
      {isAddParamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Tambah Parameter Spesifikasi Baru
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = newParamName.trim();
                if (!name) return;
                const cleanKey = name.toLowerCase();
                const placeholder = newParamPlaceholder.trim();
                
                const exists = selectedInfoFields.some((item) => {
                  const itemKey = typeof item === 'string' ? item : item.key;
                  return itemKey.toLowerCase() === cleanKey.toLowerCase();
                });
                if (exists) {
                  alert('Parameter tersebut sudah terdaftar.');
                  return;
                }
                
                const newItem = placeholder ? { key: cleanKey, placeholder } : cleanKey;
                setSelectedInfoFields((prev) => [...prev, newItem]);
                setIsAddParamOpen(false);
                setNewParamName('');
                setNewParamPlaceholder('');
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Nama Parameter <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ketebalan Oli, Kapasitas Tangki, dll"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Contoh Nilai (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 10 mm, 500 kVA, dll"
                  value={newParamPlaceholder}
                  onChange={(e) => setNewParamPlaceholder(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddParamOpen(false);
                    setNewParamName('');
                    setNewParamPlaceholder('');
                  }}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
                >
                  Simpan Parameter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Parameter */}
      {isEditParamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Edit Parameter Spesifikasi
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newName = editParamNewName.trim();
                if (!newName) return;
                const newKey = newName.toLowerCase();
                const placeholder = editParamPlaceholder.trim();
                
                const exists = selectedInfoFields.some((item) => {
                  const itemKey = typeof item === 'string' ? item : item.key;
                  return itemKey.toLowerCase() === newKey.toLowerCase() && itemKey.toLowerCase() !== editParamOldKey.toLowerCase();
                });
                if (exists) {
                  alert('Parameter dengan nama tersebut sudah ada.');
                  return;
                }
                
                const newItem = placeholder ? { key: newKey, placeholder } : newKey;
                setSelectedInfoFields((prev) =>
                  prev.map((item) => {
                    const itemKey = typeof item === 'string' ? item : item.key;
                    return itemKey.toLowerCase() === editParamOldKey.toLowerCase() ? newItem : item;
                  })
                );
                setIsEditParamOpen(false);
                setEditParamOldName('');
                setEditParamOldKey('');
                setEditParamNewName('');
                setEditParamPlaceholder('');
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Nama Parameter <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ketebalan Oli, Kapasitas Tangki, dll"
                  value={editParamNewName}
                  onChange={(e) => setEditParamNewName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Contoh Nilai (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 10 mm, 500 kVA, dll"
                  value={editParamPlaceholder}
                  onChange={(e) => setEditParamPlaceholder(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditParamOpen(false);
                    setEditParamOldName('');
                    setEditParamOldKey('');
                    setEditParamNewName('');
                    setEditParamPlaceholder('');
                  }}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Damage Mechanism Baru */}
      {isAddDmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Tambah Damage Mechanism Baru
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = newDmName.trim();
                if (!name) return;
                createDmMutation.mutate(name);
              }}
              className="space-y-6 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Nama Damage Mechanism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Thermal Problem, Mechanical Defect, dll"
                  value={newDmName}
                  onChange={(e) => setNewDmName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsAddDmModalOpen(false)}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createDmMutation.isPending}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {createDmMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Damage Mechanism Name */}
      {isEditDmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-border p-7 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Edit Nama Damage Mechanism
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newName = editDmName.trim();
                if (!newName || !dmToEdit) return;
                updateDmMutation.mutate({ oldName: dmToEdit, newName });
              }}
              className="space-y-6 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Nama Baru Damage Mechanism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Thermal Problem, Mechanical Defect, dll"
                  value={editDmName}
                  onChange={(e) => setEditDmName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsEditDmModalOpen(false)}
                  className="px-4.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateDmMutation.isPending}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {updateDmMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

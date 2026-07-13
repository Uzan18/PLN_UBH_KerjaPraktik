'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { CriteriaRow } from '@/types';

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

async function fetchCriteria(testTypeId: string) {
  if (!testTypeId) return [];
  const res = await fetch(`/api/master/criteria?testTypeId=${testTypeId}`);
  if (!res.ok) throw new Error('Gagal mengambil kriteria');
  const json = await res.json();
  return json.data;
}

interface TestType {
  id: string;
  name: string;
  orderIndex: number;
  standard?: string | null;
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

interface EquipmentTypeGroup {
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

export default function CombinedManagePengujianPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pemetaan' | 'kriteria' | 'import'>('pemetaan');

  // ==========================================
  // STATE: 1. Pemetaan Tab
  // ==========================================
  const [selectedGroup, setSelectedGroup] = useState<EquipmentTypeGroup | null>(null);
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<string[]>([]);
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [extraEquipmentTypes, setExtraEquipmentTypes] = useState<string[]>([]);
  const [hiddenEquipmentTypes, setHiddenEquipmentTypes] = useState<string[]>([]);
  const [isAddEquipmentTypeOpen, setIsAddEquipmentTypeOpen] = useState(false);
  const [newEquipmentTypeName, setNewEquipmentTypeName] = useState('');

  // Create Test Type Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestStandard, setNewTestStandard] = useState('');
  const [newTestParameters, setNewTestParameters] = useState<NewParamInput[]>([
    { name: '', unit: '', goodValue: '', fairValue: '', poorValue: '', badValue: '' }
  ]);


  // ==========================================
  // STATE: 2. Kriteria Tab
  // ==========================================
  const [criteriaTestTypeId, setCriteriaTestTypeId] = useState('');
  const [editingCriteria, setEditingCriteria] = useState<CriteriaRow | null>(null);
  const [goodValue, setGoodValue] = useState('');
  const [fairValue, setFairValue] = useState('');
  const [poorValue, setPoorValue] = useState('');
  const [badValue, setBadValue] = useState('');
  const [standardText, setStandardText] = useState('');

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

  const activeCriteriaTestTypeId = criteriaTestTypeId || (testTypes && testTypes.length > 0 ? testTypes[0].id : '');

  const { data: criteriaList, isLoading: isCriteriaLoading } = useQuery({
    queryKey: ['criteria', activeCriteriaTestTypeId],
    queryFn: () => fetchCriteria(activeCriteriaTestTypeId),
    enabled: !!activeCriteriaTestTypeId && activeTab === 'kriteria',
  });

  // Calculate unique Equipment Types from all assets + custom local types
  const equipmentGroups = useMemo(() => {
    const map = new Map<string, { name: string; testTypes: TestType[]; assetIds: string[] }>();
    
    // Default and custom local equipment types
    const defaultTypes = ['Main Trafo', 'UAT', 'SST', 'Trafo Bantu', ...extraEquipmentTypes]
      .filter(t => !hiddenEquipmentTypes.includes(t));
    
    // Read mappings from localstorage to pre-populate local types
    let localMappings: Record<string, string[]> = {};
    if (typeof window !== 'undefined') {
      const storedMap = localStorage.getItem('siat_custom_equipment_type_mappings');
      if (storedMap) {
        try {
          localMappings = JSON.parse(storedMap);
        } catch (e) {
          console.error(e);
        }
      }
    }

    for (const type of defaultTypes) {
      const mappedIds = localMappings[type] || [];
      const mappedTestTypes = testTypes 
        ? testTypes.filter((t) => mappedIds.includes(t.id))
        : [];

      map.set(type, {
        name: type,
        testTypes: mappedTestTypes,
        assetIds: []
      });
    }

    if (ubps) {
      for (const ubp of ubps) {
        for (const asset of ubp.assets || []) {
          const type = asset.equipmentType;
          if (!type || type.trim() === '') continue;
          if (hiddenEquipmentTypes.includes(type.trim())) continue;
          
          const typeKey = type.trim();
          if (!map.has(typeKey)) {
            map.set(typeKey, {
              name: typeKey,
              testTypes: asset.testTypes || [],
              assetIds: [asset.id]
            });
          } else {
            const existing = map.get(typeKey)!;
            existing.assetIds.push(asset.id);
            // Prefer testTypes from an asset that has them configured
            if (existing.testTypes.length === 0 && asset.testTypes && asset.testTypes.length > 0) {
              existing.testTypes = asset.testTypes;
            }
          }
        }
      }
    }
    
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ubps, extraEquipmentTypes, hiddenEquipmentTypes, testTypes]);

  // ==========================================
  // EFFECTS
  // ==========================================
  // Load custom equipment types from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('siat_custom_equipment_types');
      if (stored) {
        try {
          setExtraEquipmentTypes(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
      const storedHidden = localStorage.getItem('siat_hidden_equipment_types');
      if (storedHidden) {
        try {
          setHiddenEquipmentTypes(JSON.parse(storedHidden));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Sync selected group test type checkboxes when a group is selected (Pemetaan Tab)
  const handleSelectGroup = (group: EquipmentTypeGroup) => {
    setSelectedGroup(group);
    const configuredIds = group.testTypes?.map((t) => t.id) || [];
    setSelectedTestTypeIds(configuredIds);
  };

  // Auto-select first equipment type group when loaded
  useEffect(() => {
    if (equipmentGroups.length > 0 && !selectedGroup) {
      handleSelectGroup(equipmentGroups[0]);
    } else if (selectedGroup) {
      const current = equipmentGroups.find((g) => g.name === selectedGroup.name);
      if (current) {
        setSelectedGroup(current);
      }
    }
  }, [equipmentGroups, selectedGroup]);

  // Auto-select first test type in criteria tab when loaded
  useEffect(() => {
    if (testTypes && testTypes.length > 0 && !criteriaTestTypeId) {
      setCriteriaTestTypeId(testTypes[0].id);
    }
  }, [testTypes, criteriaTestTypeId]);

  // Sync standardText input when activeCriteriaTestTypeId changes (Kriteria Tab)
  useEffect(() => {
    if (testTypes && activeCriteriaTestTypeId) {
      const activeTestType = testTypes.find((t) => t.id === activeCriteriaTestTypeId);
      setStandardText(activeTestType?.standard || '');
    }
  }, [activeCriteriaTestTypeId, testTypes]);

  // ==========================================
  // MUTATIONS & HANDLERS: 1. Pemetaan Tab
  // ==========================================
  const saveMutation = useMutation({
    mutationFn: async (payload: { equipmentType: string; testTypeIds: string[] }) => {
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
      alert(`Konfigurasi pengujian untuk jenis aset "${variables.equipmentType}" berhasil disimpan!`);
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan.');
    },
  });

  const deleteEquipmentTypeMutation = useMutation({
    mutationFn: async (equipmentType: string) => {
      const res = await fetch(`/api/master/ubp-asset/assets?equipmentType=${encodeURIComponent(equipmentType)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus jenis aset');
      }
      return res.json();
    },
    onSuccess: (data, equipmentType) => {
      const updatedExtra = extraEquipmentTypes.filter((t) => t !== equipmentType);
      setExtraEquipmentTypes(updatedExtra);
      if (typeof window !== 'undefined') {
        localStorage.setItem('siat_custom_equipment_types', JSON.stringify(updatedExtra));
      }

      const updatedHidden = [...hiddenEquipmentTypes, equipmentType];
      setHiddenEquipmentTypes(updatedHidden);
      if (typeof window !== 'undefined') {
        localStorage.setItem('siat_hidden_equipment_types', JSON.stringify(updatedHidden));
      }

      if (typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('siat_custom_equipment_type_mappings');
        if (mappingsStr) {
          try {
            const mappings = JSON.parse(mappingsStr);
            delete mappings[equipmentType];
            localStorage.setItem('siat_custom_equipment_type_mappings', JSON.stringify(mappings));
          } catch (e) {
            console.error(e);
          }
        }
      }

      alert(`Jenis aset "${equipmentType}" berhasil dihapus.`);
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
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
      deleteEquipmentTypeMutation.mutate(group.name);
    } else {
      const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus jenis aset "${group.name}"?`);
      if (!confirmDelete) return;

      const updatedExtra = extraEquipmentTypes.filter((t) => t !== group.name);
      setExtraEquipmentTypes(updatedExtra);
      if (typeof window !== 'undefined') {
        localStorage.setItem('siat_custom_equipment_types', JSON.stringify(updatedExtra));
      }

      const updatedHidden = [...hiddenEquipmentTypes, group.name];
      setHiddenEquipmentTypes(updatedHidden);
      if (typeof window !== 'undefined') {
        localStorage.setItem('siat_hidden_equipment_types', JSON.stringify(updatedHidden));
      }

      if (typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('siat_custom_equipment_type_mappings');
        if (mappingsStr) {
          try {
            const mappings = JSON.parse(mappingsStr);
            delete mappings[group.name];
            localStorage.setItem('siat_custom_equipment_type_mappings', JSON.stringify(mappings));
          } catch (e) {
            console.error(e);
          }
        }
      }

      alert(`Jenis aset "${group.name}" berhasil dihapus.`);
      setSelectedGroup(null);
    }
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
      queryClient.invalidateQueries({ queryKey: ['criteria'] });
      queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
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

    if (selectedGroup.assetIds.length === 0) {
      if (typeof window !== 'undefined') {
        const mappingsStr = localStorage.getItem('siat_custom_equipment_type_mappings') || '{}';
        try {
          const mappings = JSON.parse(mappingsStr);
          mappings[selectedGroup.name] = selectedTestTypeIds;
          localStorage.setItem('siat_custom_equipment_type_mappings', JSON.stringify(mappings));
          
          alert(`Konfigurasi pengujian untuk jenis aset "${selectedGroup.name}" berhasil disimpan sebagai template! Konfigurasi ini akan otomatis diterapkan saat Anda menambahkan unit aset baru dengan jenis tersebut di menu Master UBP & Aset.`);
          queryClient.invalidateQueries({ queryKey: ['ubp-assets'] });
        } catch (e) {
          console.error(e);
          alert('Gagal menyimpan konfigurasi lokal.');
        }
      }
    } else {
      saveMutation.mutate({
        equipmentType: selectedGroup.name,
        testTypeIds: selectedTestTypeIds,
      });
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
    mutationFn: async (payload: { name: string; standard: string; parameters: NewParamInput[] }) => {
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
      alert(`Jenis pengujian "${data.data.name}" berhasil ditambahkan!`);
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      setIsCreateModalOpen(false);
      resetCreateModalState();
    },
    onError: (error) => {
      alert(error.message || 'Terjadi kesalahan saat menyimpan pengujian baru.');
    },
  });

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

    createTestTypeMutation.mutate({
      name: newTestName,
      standard: newTestStandard,
      parameters: newTestParameters
    });
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
  const updateCriteriaMutation = useMutation({
    mutationFn: async (payload: {
      parameterId: string;
      goodValue: string;
      fairValue: string;
      poorValue: string;
      badValue: string;
    }) => {
      const res = await fetch('/api/master/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui kriteria');
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingCriteria(null);
      queryClient.invalidateQueries({ queryKey: ['criteria', activeCriteriaTestTypeId] });
    },
    onError: (error) => {
      alert(error.message || 'Gagal memperbarui kriteria.');
    }
  });

  const updateStandardMutation = useMutation({
    mutationFn: async (payload: { id: string; standard: string }) => {
      const res = await fetch('/api/master/test-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan standard');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      alert('Standard referensi berhasil diperbarui!');
    },
    onError: (error) => {
      alert(error.message || 'Gagal menyimpan standard.');
    }
  });

  const handleSaveStandard = () => {
    if (!activeCriteriaTestTypeId) return;
    updateStandardMutation.mutate({
      id: activeCriteriaTestTypeId,
      standard: standardText,
    });
  };

  const startEditCriteria = (criteria: CriteriaRow) => {
    setEditingCriteria(criteria);
    setGoodValue(criteria.goodValue || '');
    setFairValue(criteria.fairValue || '');
    setPoorValue(criteria.poorValue || '');
    setBadValue(criteria.badValue || '');
  };

  const handleSaveCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCriteria) return;

    updateCriteriaMutation.mutate({
      parameterId: editingCriteria.parameterId,
      goodValue,
      fairValue,
      poorValue,
      badValue,
    });
  };

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

  // Filters & Loading
  const filteredTestTypes = testTypes?.filter((t) =>
    t.name.toLowerCase().includes(searchTestQuery.toLowerCase())
  );

  const isLoading = isUbpsLoading || isTestTypesLoading || isCriteriaLoading;

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
                {activeTab === 'pemetaan' ? 'Pemetaan Pengujian' : activeTab === 'kriteria' ? 'Kriteria Parameter' : 'Import Excel'}
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
        {activeTab === 'pemetaan' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-primary text-white hover:brightness-110 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span> Tambah Pengujian Baru
          </button>
        )}
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
          Pemetaan Pengujian Aset
        </button>
        <button
          onClick={() => setActiveTab('kriteria')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer ${
            activeTab === 'kriteria'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Kriteria Ambang Batas (Threshold)
        </button>
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
      </div>

      {/* ==========================================
          TAB CONTENT: 1. Pemetaan Pengujian
          ========================================== */}
      {activeTab === 'pemetaan' && (
        <div className="grid grid-cols-12 gap-6 items-stretch animate-fade-in">
          {/* Left Sidebar: Jenis Aset List */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm h-full flex flex-col justify-between">
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
                            Digunakan oleh {assetCount} unit aset
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
                              handleDeleteEquipmentType(group);
                            }}
                            className="p-1 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer flex items-center justify-center"
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
          <div className="col-span-12 lg:col-span-8 h-full">
            {selectedGroup ? (
              <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm space-y-5 h-full flex flex-col justify-between">
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

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5 border-b border-surface-border">
                    <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide">Pilih Jenis Pengujian yang Berlaku</h3>
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
                          className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-1 px-8 pr-3 focus:ring-primary focus:border-primary"
                        />
                        <span className="material-symbols-outlined text-outline absolute left-2 top-1/2 -translate-y-1/2 text-sm select-none">
                          search
                        </span>
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : !filteredTestTypes || filteredTestTypes.length === 0 ? (
                    <div className="text-center py-20 text-on-surface-variant font-medium text-xs">
                      {searchTestQuery ? 'Tidak ada jenis pengujian yang cocok.' : 'Tidak ada jenis pengujian tersedia.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[300px] max-h-[50vh]">
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
                              <span className="bg-surface-container text-on-surface-variant font-mono text-[9px] px-1 py-0.5 rounded border border-surface-border/50">
                                Idx: {test.orderIndex}
                              </span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTestType(test);
                                }}
                                className="p-1 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded opacity-0 group-hover/checkbox-row:opacity-100 transition-all cursor-pointer flex items-center justify-center"
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

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                  <button
                    onClick={() => handleSelectGroup(selectedGroup)}
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 border border-surface-border hover:bg-surface-container-low rounded-lg font-bold text-xs text-on-surface-variant transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Reset Pilihan
                  </button>
                  <button
                    onClick={handleSavePemetaan}
                    disabled={saveMutation.isPending}
                    className="px-5 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                    {!saveMutation.isPending && (
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
          TAB CONTENT: 2. Kriteria Ambang Batas
          ========================================== */}
      {activeTab === 'kriteria' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter & Standard Section */}
          <div className="bg-white border border-surface-border rounded-xl shadow-xs p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Select Dropdown */}
              <div className="flex-1">
                <label className="block font-mono text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Pilih Jenis Pengujian
                </label>
                <div className="relative">
                  {isTestTypesLoading ? (
                    <div className="h-9 bg-surface-container-low animate-pulse rounded-lg" />
                  ) : (
                    <select 
                      value={activeCriteriaTestTypeId}
                      onChange={(e) => setCriteriaTestTypeId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 pr-8 text-sm font-semibold text-primary focus:border-primary focus:ring-0 appearance-none cursor-pointer transition-all"
                    >
                      {testTypes?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary font-bold text-lg select-none">unfold_more</span>
                </div>
              </div>

              {/* Standard Input Group */}
              <div className="flex-1">
                <label className="block font-mono text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Dasar Penilaian (Standard Referensi)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={standardText}
                    onChange={(e) => setStandardText(e.target.value)}
                    placeholder="Contoh: IEEE Std C57.152, IEC 60076, CIGRE445, dll"
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleSaveStandard}
                    disabled={updateStandardMutation.isPending}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {updateStandardMutation.isPending ? (
                      <span className="material-symbols-outlined animate-spin text-[14px] select-none">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] select-none">save</span>
                    )}
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Threshold Table */}
          <div className="bg-white border border-surface-border rounded-xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border bg-surface-background flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg select-none">tune</span>
                <h3 className="text-sm font-bold text-on-surface">Parameter Ambang Batas (Threshold)</h3>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {isCriteriaLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : !criteriaList || criteriaList.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant text-xs">Tidak ada parameter kriteria untuk pengujian ini.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-surface-border">
                      <th className="px-4 py-2 font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 min-w-[120px]">Parameter</th>
                      <th className="px-4 py-2 font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Satuan</th>
                      {([
                        { label: 'Good', color: '#22C55E', score: '5' },
                        { label: 'Fair', color: '#EAB308', score: '4' },
                        { label: 'Poor', color: '#F97316', score: '2' },
                        { label: 'Bad', color: '#EF4444', score: '1' },
                      ] as const).map((col) => (
                        <th key={col.label} className="px-4 py-2 min-w-[100px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase" style={{ backgroundColor: `${col.color}15`, color: col.color }}>
                              {col.label}
                            </span>
                            <span className="text-[9px] text-on-surface-variant/80 mt-0.5">(Score {col.score})</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-2 font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {criteriaList.map((row: CriteriaRow) => (
                      <tr key={row.criteriaId} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="px-4 py-1.5 text-xs font-bold text-on-surface sticky left-0 bg-white group-hover:bg-surface-container-lowest z-10">{row.parameterName}</td>
                        <td className="px-4 py-1.5 font-mono text-xs text-on-surface-variant text-center font-bold">{row.unit || '—'}</td>
                        
                        <td className="px-4 py-1.5">
                          <div className="flex items-center justify-center py-0.5 px-1.5 rounded border font-mono font-bold text-center text-[11px]" style={{ backgroundColor: '#22C55E08', borderColor: '#22C55E20', color: '#22C55E' }}>
                            {row.goodValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center justify-center py-0.5 px-1.5 rounded border font-mono font-bold text-center text-[11px]" style={{ backgroundColor: '#EAB30808', borderColor: '#EAB30820', color: '#EAB308' }}>
                            {row.fairValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center justify-center py-0.5 px-1.5 rounded border font-mono font-bold text-center text-[11px]" style={{ backgroundColor: '#F9731608', borderColor: '#F9731620', color: '#F97316' }}>
                            {row.poorValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center justify-center py-0.5 px-1.5 rounded border font-mono font-bold text-center text-[11px]" style={{ backgroundColor: '#EF444408', borderColor: '#EF444420', color: '#EF4444' }}>
                            {row.badValue || 'N/A'}
                          </div>
                        </td>

                        <td className="px-4 py-1.5 text-right">
                          <button 
                            onClick={() => startEditCriteria(row)}
                            className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded transition-all cursor-pointer" 
                            title="Edit Kriteria"
                          >
                            <span className="material-symbols-outlined text-[16px] select-none">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB CONTENT: 3. Import Data Real (Excel)
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
                <span className="material-symbols-outlined text-primary select-none">add_box</span>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Tambah Jenis Pengujian Baru</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateModalState();
                }}
                className="text-on-surface-variant hover:text-on-surface rounded p-1 hover:bg-surface-container transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg select-none">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTestType} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Nama Pengujian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    placeholder="Contoh: Insulation Resistance Winding"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Standard Referensi
                  </label>
                  <input
                    type="text"
                    value={newTestStandard}
                    onChange={(e) => setNewTestStandard(e.target.value)}
                    placeholder="Contoh: IEEE Std C57.152-2013"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateModalState();
                  }}
                  className="px-4 py-2 border border-surface-border hover:bg-surface-container-low rounded-lg font-bold text-xs text-on-surface-variant transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createTestTypeMutation.isPending}
                  className="px-5 py-2 bg-primary text-white hover:brightness-110 rounded-lg font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createTestTypeMutation.isPending && (
                    <span className="material-symbols-outlined animate-spin text-[14px] select-none">progress_activity</span>
                  )}
                  Simpan Pengujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Criteria Thresholds */}
      {editingCriteria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border p-6 max-w-lg w-full mx-4 animate-fade-in">
            <h3 className="text-sm font-bold text-on-surface mb-1">Edit Kriteria: {editingCriteria.parameterName}</h3>
            <p className="text-[10px] text-on-surface-variant mb-6">
              Nilai disimpan sebagai string untuk mendukung formula/operator. Contoh: &quot;&gt;= 2&quot; atau &quot;1.25 - 1.99&quot;.
            </p>
            <form onSubmit={handleSaveCriteria} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#22C55E] uppercase">Good (Score 5)</label>
                  <input
                    type="text"
                    value={goodValue}
                    onChange={(e) => setGoodValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#EAB308] uppercase">Fair (Score 4)</label>
                  <input
                    type="text"
                    value={fairValue}
                    onChange={(e) => setFairValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#F97316] uppercase">Poor (Score 2)</label>
                  <input
                    type="text"
                    value={poorValue}
                    onChange={(e) => setPoorValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#EF4444] uppercase">Bad (Score 1)</label>
                  <input
                    type="text"
                    value={badValue}
                    onChange={(e) => setBadValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingCriteria(null)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateCriteriaMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:brightness-110 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {updateCriteriaMutation.isPending ? 'Menyimpan...' : 'Simpan Versi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Tambah Jenis Aset Baru dari Sidebar */}
      {isAddEquipmentTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border p-6 max-w-md w-full mx-4 animate-fade-in space-y-4">
            <h3 className="text-sm font-bold text-on-surface mb-1">
              Tambah Jenis Aset Baru (Equipment Type)
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newName = newEquipmentTypeName.trim();
                if (!newName) return;

                const exists = equipmentGroups.some(g => g.name.toLowerCase() === newName.toLowerCase());
                if (exists) {
                  alert(`Jenis aset "${newName}" sudah terdaftar.`);
                  return;
                }

                const updatedList = [...extraEquipmentTypes, newName];
                setExtraEquipmentTypes(updatedList);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('siat_custom_equipment_types', JSON.stringify(updatedList));
                }

                const newGroup: EquipmentTypeGroup = {
                  name: newName,
                  testTypes: [],
                  assetIds: []
                };
                setSelectedGroup(newGroup);
                setSelectedTestTypeIds([]);

                setIsAddEquipmentTypeOpen(false);
                setNewEquipmentTypeName('');
                alert(`Jenis aset baru "${newName}" berhasil ditambahkan! Silakan tentukan jenis pengujian yang berlaku.`);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                  Nama Jenis Aset <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Trafo Start, Generator, dll"
                  value={newEquipmentTypeName}
                  onChange={(e) => setNewEquipmentTypeName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-border rounded-lg py-2 px-3 text-xs focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsAddEquipmentTypeOpen(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:brightness-110 transition-colors active:scale-95 cursor-pointer"
                >
                  Simpan Jenis Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

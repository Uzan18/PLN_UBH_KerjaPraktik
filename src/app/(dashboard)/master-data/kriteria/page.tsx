'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { CriteriaRow } from '@/types';

// Fetch helpers
async function fetchTestTypes() {
  const res = await fetch('/api/master/test-types');
  if (!res.ok) throw new Error('Gagal mengambil data jenis pengujian');
  const json = await res.json();
  return json.data;
}

async function fetchCriteria(testTypeId: string) {
  const res = await fetch(`/api/master/criteria?testTypeId=${testTypeId}`);
  if (!res.ok) throw new Error('Gagal mengambil kriteria');
  const json = await res.json();
  return json.data;
}

export default function MasterDataKriteriaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'kriteria' | 'import'>('kriteria');
  
  // Criteria State
  const [selectedTestTypeId, setSelectedTestTypeId] = useState('');
  const [editingCriteria, setEditingCriteria] = useState<CriteriaRow | null>(null);
  
  // Edited values state
  const [goodValue, setGoodValue] = useState('');
  const [fairValue, setFairValue] = useState('');
  const [poorValue, setPoorValue] = useState('');
  const [badValue, setBadValue] = useState('');

  // Import State
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

  // Queries
  const { data: testTypes, isLoading: isTestTypesLoading } = useQuery({
    queryKey: ['test-types'],
    queryFn: fetchTestTypes,
  });

  // Automatically select first test type when loaded
  useEffect(() => {
    if (testTypes && testTypes.length > 0 && !selectedTestTypeId) {
      setSelectedTestTypeId(testTypes[0].id);
    }
  }, [testTypes, selectedTestTypeId]);

  // Automatically select first test type if none selected
  const activeTestTypeId = selectedTestTypeId || (testTypes && testTypes.length > 0 ? testTypes[0].id : '');

  const { data: criteriaList, isLoading: isCriteriaLoading } = useQuery({
    queryKey: ['criteria', activeTestTypeId],
    queryFn: () => fetchCriteria(activeTestTypeId),
    enabled: !!activeTestTypeId && activeTab === 'kriteria',
  });

  // Update mutation (versioned update)
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
      queryClient.invalidateQueries({ queryKey: ['criteria', activeTestTypeId] });
    },
  });

  function startEdit(criteria: CriteriaRow) {
    setEditingCriteria(criteria);
    setGoodValue(criteria.goodValue || '');
    setFairValue(criteria.fairValue || '');
    setPoorValue(criteria.poorValue || '');
    setBadValue(criteria.badValue || '');
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCriteria) return;

    updateCriteriaMutation.mutate({
      parameterId: editingCriteria.parameterId,
      goodValue,
      fairValue,
      poorValue,
      badValue,
    });
  }

  // Handle Excel file import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const confirmPurge = confirm(
      'PERINGATAN: Mengimpor data baru akan menghapus seluruh data pengujian dummy, unit pembangkit, dan UBP yang ada saat ini. Apakah Anda yakin ingin melanjutkan?'
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
        
        // Invalidate all related dashboard query keys
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

  const isLoading = isTestTypesLoading || isCriteriaLoading;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1440px] font-sans">
      {/* Breadcrumb */}
      <nav className="flex mb-2">
        <ol className="inline-flex items-center space-x-2">
          <li><span className="text-on-surface-variant font-mono text-xs">Master Data</span></li>
          <li>
            <div className="flex items-center">
              <span className="material-symbols-outlined text-sm text-on-surface-variant mx-1">chevron_right</span>
              <span className="text-primary font-mono text-xs font-bold">
                {activeTab === 'kriteria' ? 'Kriteria Penilaian' : 'Import Excel'}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Tabs bar */}
      <div className="flex border-b border-surface-border gap-4">
        <button
          onClick={() => setActiveTab('kriteria')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer ${
            activeTab === 'kriteria'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Kriteria Penilaian
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

      {/* TAB 1: Kriteria Penilaian */}
      {activeTab === 'kriteria' && (
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-on-surface">Pengaturan Kriteria Penilaian</h1>

          {/* Filter Section */}
          <div className="bg-white border border-surface-border rounded-xl shadow-xs p-6">
            <div className="max-w-md">
              <label className="block font-mono text-xs text-on-surface-variant mb-2 font-bold uppercase tracking-wider">Pilih Jenis Pengujian</label>
              <div className="relative">
                {isTestTypesLoading ? (
                  <div className="h-12 bg-surface-container-low animate-pulse rounded-lg" />
                ) : (
                  <select 
                    value={activeTestTypeId}
                    onChange={(e) => setSelectedTestTypeId(e.target.value)}
                    className="w-full bg-surface-container-low border-2 border-outline-variant rounded-lg py-3 px-4 text-xl font-semibold text-primary focus:border-primary focus:ring-0 appearance-none cursor-pointer transition-all"
                  >
                    {testTypes?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary font-bold">unfold_more</span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant/70 italic">Kriteria ini digunakan sebagai dasar perhitungan scoring secara otomatis.</p>
            </div>
          </div>

          {/* Threshold Table */}
          <div className="bg-white border border-surface-border rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border bg-surface-background flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h3 className="text-xl font-semibold text-on-surface">Parameter Ambang Batas (Threshold)</h3>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : !criteriaList || criteriaList.length === 0 ? (
                <div className="text-center py-20 text-on-surface-variant">Tidak ada parameter kriteria untuk pengujian ini.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-surface-border">
                      <th className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 min-w-[150px]">Parameter</th>
                      <th className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Satuan</th>
                      {([
                        { label: 'Good', color: '#22C55E', score: '5' },
                        { label: 'Fair', color: '#EAB308', score: '4' },
                        { label: 'Poor', color: '#F97316', score: '2' },
                        { label: 'Bad', color: '#EF4444', score: '1' },
                      ] as const).map((col) => (
                        <th key={col.label} className="px-6 py-4 min-w-[160px] text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold uppercase" style={{ backgroundColor: `${col.color}15`, color: col.color }}>
                              {col.label}
                            </span>
                            <span className="text-xs text-on-surface-variant">(Score {col.score})</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {criteriaList.map((row: CriteriaRow) => (
                      <tr key={row.criteriaId} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="px-6 py-5 text-lg font-bold text-primary sticky left-0 bg-white group-hover:bg-surface-container-lowest z-10">{row.parameterName}</td>
                        <td className="px-6 py-5 font-mono text-xs text-on-surface-variant text-center font-bold">{row.unit || '—'}</td>
                        
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center py-2 px-3 rounded-lg border font-mono font-bold text-center text-xs" style={{ backgroundColor: '#22C55E08', borderColor: '#22C55E20', color: '#22C55E' }}>
                            {row.goodValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center py-2 px-3 rounded-lg border font-mono font-bold text-center text-xs" style={{ backgroundColor: '#EAB30808', borderColor: '#EAB30820', color: '#EAB308' }}>
                            {row.fairValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center py-2 px-3 rounded-lg border font-mono font-bold text-center text-xs" style={{ backgroundColor: '#F9731608', borderColor: '#F9731620', color: '#F97316' }}>
                            {row.poorValue || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center py-2 px-3 rounded-lg border font-mono font-bold text-center text-xs" style={{ backgroundColor: '#EF444408', borderColor: '#EF444420', color: '#EF4444' }}>
                            {row.badValue || 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => startEdit(row)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all cursor-pointer" 
                            title="Edit Kriteria"
                          >
                            <span className="material-symbols-outlined">edit</span>
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

      {/* TAB 2: Import Data Real */}
      {activeTab === 'import' && (
        <div className="space-y-6 animate-fade-in max-w-3xl">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Import Data Pengujian Real</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Impor UBP, Unit Pembangkit, serta riwayat data pengujian assessment langsung dari spreadsheet Excel.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm flex gap-3 text-red-800">
            <span className="material-symbols-outlined text-[20px] select-none shrink-0 text-red-700">warning</span>
            <div className="space-y-1">
              <p className="font-bold">PERHATIAN: PEMBERSIHAN DATA OPERASIONAL</p>
              <p>
                Proses import ini akan **menghapus secara permanen** seluruh data operational dummy yang ada, meliputi:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 font-medium">
                <li>Seluruh riwayat data pengujian (Test Sessions & Results)</li>
                <li>Seluruh data Unit Pembangkit (Assets)</li>
                <li>Seluruh data UBP (Unit Bisnis Pembangkitan)</li>
                <li>Seluruh file laporan & folder di page Laporan</li>
              </ul>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="bg-white border border-surface-border rounded-xl p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              Panduan Format File Excel
            </h3>
            <div className="text-xs text-on-surface-variant space-y-2 leading-relaxed">
              <p>Format spreadsheet wajib mematuhi ketentuan berikut:</p>
              <ul className="list-decimal pl-4 space-y-1">
                <li>Mengandung sheet bernama <code className="bg-surface-container px-1 py-0.5 rounded font-mono font-bold text-primary">PLAN MODEL</code>.</li>
                <li>Header parameter utama terletak pada **baris 10** (kolom J ke kanan) dalam format <code className="bg-surface-container px-1 py-0.5 rounded font-mono font-bold text-primary">NamaPengujian;Parameter;Satuan</code>.</li>
                <li>Data riwayat pengujian terpetak per baris mulai dari **baris 11**.</li>
                <li>Kolom metadata wajib meliputi:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li><strong className="text-on-surface">Tahun Pengujian</strong> (kolom B, index 1)</li>
                    <li><strong className="text-on-surface">Unit Pembangkit (UBP)</strong> (kolom C, index 2)</li>
                    <li><strong className="text-on-surface">Asset (Unit Pembangkit)</strong> (kolom D, index 3)</li>
                    <li><strong className="text-on-surface">Manufacturing Years</strong> (kolom E, index 4)</li>
                    <li><strong className="text-on-surface">Equipment Type</strong> (kolom F, index 5)</li>
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
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                )}
                {isImporting ? 'Mengimpor Data...' : 'Mulai Import'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Criteria Modal */}
      {editingCriteria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border p-6 max-w-lg w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-bold text-on-surface mb-1">Edit Kriteria: {editingCriteria.parameterName}</h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Nilai disimpan sebagai string untuk mendukung formula/operator. Contoh: &quot;&gt;= 2&quot; atau &quot;1.25 - 1.99&quot;.
            </p>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#22C55E] uppercase">Good (Score 5)</label>
                  <input
                    type="text"
                    value={goodValue}
                    onChange={(e) => setGoodValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#EAB308] uppercase">Fair (Score 4)</label>
                  <input
                    type="text"
                    value={fairValue}
                    onChange={(e) => setFairValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#F97316] uppercase">Poor (Score 2)</label>
                  <input
                    type="text"
                    value={poorValue}
                    onChange={(e) => setPoorValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#EF4444] uppercase">Bad (Score 1)</label>
                  <input
                    type="text"
                    value={badValue}
                    onChange={(e) => setBadValue(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingCriteria(null)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateCriteriaMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:brightness-110 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {updateCriteriaMutation.isPending ? 'Menyimpan...' : 'Simpan Versi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ReportDirectory {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface ReportFile {
  id: string;
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  directoryId: string;
  uploadedById: string;
  uploadedBy?: {
    name: string;
  };
  createdAt: string;
}

interface PathItem {
  id: string | null;
  name: string;
}

export default function LaporanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentication and Roles
  const userRole = (session?.user as { role?: string })?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';
  const canUpload = userRole === 'ADMIN' || userRole === 'QC' || userRole === 'INPUT';

  // State Management
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [subDirectories, setSubDirectories] = useState<ReportDirectory[]>([]);
  const [files, setFiles] = useState<ReportFile[]>([]);
  const [pathTrail, setPathTrail] = useState<PathItem[]>([{ id: null, name: 'Laporan' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Current Level in the hierarchy
  // Level 1: Root / UBP List (synced from Master UBP)
  // Level 2: UBP Selected / Unit Pembangkit List (synced from Master UBP)
  // Level 3+: Sub-folders and Files (admin can create sub-folders here)
  const currentLevel = pathTrail.length;

  // Fetch directory contents
  const fetchDirectory = async (folderId: string | null) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const parentQuery = folderId ? `?parentId=${folderId}` : '';
      const response = await fetch(`/api/reports/directories${parentQuery}`);
      const result = await response.json();

      if (result.success) {
        setSubDirectories(result.data.subDirectories);
        setFiles(result.data.files || []);
        if (result.data.pathTrail) {
          setPathTrail(result.data.pathTrail);
        }
      } else {
        setErrorMsg(result.error || 'Gagal memuat data laporan.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Koneksi internet bermasalah atau server error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDirectory(currentFolderId);
    }
  }, [currentFolderId, status]);

  // Navigate folder
  const handleFolderClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  // Create sub-folder (only at Level 3+)
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/reports/directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setNewFolderName('');
        setIsFolderModalOpen(false);
        fetchDirectory(currentFolderId);
      } else {
        setErrorMsg(result.error || 'Gagal membuat folder.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete sub-folder (only at Level 3+)
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus folder ini beserta seluruh isinya?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/directories?id=${folderId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        fetchDirectory(currentFolderId);
      } else {
        alert(result.error || 'Gagal menghapus folder.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit sub-folder (only at Level 3+)
  const handleEditFolderClick = (dir: ReportDirectory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFolderId(dir.id);
    setEditFolderName(dir.name);
    setErrorMsg(null);
    setIsEditFolderModalOpen(true);
  };

  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderName.trim() || !editFolderId) return;

    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/reports/directories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editFolderId,
          name: editFolderName.trim(),
        }),
      });
      const result = await response.json();

      if (result.success) {
        setEditFolderId(null);
        setEditFolderName('');
        setIsEditFolderModalOpen(false);
        fetchDirectory(currentFolderId);
      } else {
        setErrorMsg(result.error || 'Gagal mengubah nama folder.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Upload file
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !currentFolderId) return;

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMsg('Ukuran file melebihi batas maksimum 20MB.');
      return;
    }

    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('directoryId', currentFolderId);

      const response = await fetch('/api/reports/files', {
        method: 'POST',
        body: fd,
      });
      const result = await response.json();

      if (result.success) {
        setSelectedFile(null);
        setIsFileModalOpen(false);
        fetchDirectory(currentFolderId);
      } else {
        setErrorMsg(result.error || 'Gagal mengunggah file.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/files?id=${fileId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        fetchDirectory(currentFolderId);
      } else {
        alert(result.error || 'Gagal menghapus file.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format File Size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format Date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter lists based on search query
  const filteredDirs = subDirectories.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-primary text-[40px]">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Memuat profil sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Manajemen File Laporan</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Tempat penyimpanan dan pengelolaan file laporan evaluasi assessment trafo serta sertifikat kalibrasi semua cabang.
            {currentLevel <= 2 && (
              <span className="text-primary/70 ml-1">
                (Struktur UBP & Unit Pembangkit dikelola melalui <span className="font-semibold">Master UBP & Aset</span>)
              </span>
            )}
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {/* Admin sub-folder creation only at Level 3+ */}
          {isAdmin && currentLevel >= 3 && (
            <button
              id="btn-create-directory"
              onClick={() => setIsFolderModalOpen(true)}
              className="px-4 py-2 bg-white text-on-surface hover:bg-surface-container-low border border-surface-border text-sm font-medium rounded-md flex items-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
              Tambah Sub-Folder
            </button>
          )}

          {/* Upload reports inside categories */}
          {canUpload && currentLevel >= 3 && (
            <button
              id="btn-upload-file"
              onClick={() => setIsFileModalOpen(true)}
              className="px-4 py-2 bg-primary text-white hover:bg-primary/90 text-sm font-medium rounded-md flex items-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Unggah Laporan
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Path & Search bar */}
      <div className="bg-white p-4 rounded-lg border border-surface-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {pathTrail.map((item, idx) => {
            const isLast = idx === pathTrail.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px] select-none">
                    chevron_right
                  </span>
                )}
                {isLast ? (
                  <span className="text-on-surface font-semibold bg-surface-container px-2.5 py-1 rounded-md text-xs select-none">
                    {item.name}
                  </span>
                ) : (
                  <button
                    onClick={() => handleFolderClick(item.id)}
                    className="text-primary hover:underline hover:text-primary/80 text-left font-medium cursor-pointer transition-colors text-xs"
                  >
                    {item.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Local Search inside current view */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] select-none">
            search
          </span>
          <input
            id="explorer-search-input"
            type="text"
            placeholder={
              currentLevel === 1
                ? "Cari UBP..."
                : currentLevel === 2
                ? "Cari Unit Pembangkit..."
                : "Cari File..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-md border border-surface-border bg-white text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] select-none">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[450px]">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-surface-border shadow-xs flex flex-col items-center justify-center py-24 gap-2">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
              progress_activity
            </span>
            <p className="text-on-surface-variant text-sm font-medium">Memuat data...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* LEVEL 1: UBP List (read-only, no create/delete) */}
            {currentLevel === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <h2 className="text-sm font-bold tracking-wide text-on-surface-variant uppercase flex items-center gap-2 select-none">
                    Pilih Kantor Cabang UBP ({filteredDirs.length})
                  </h2>
                </div>

                {filteredDirs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredDirs.map((dir) => (
                      <div
                        key={dir.id}
                        onClick={() => handleFolderClick(dir.id)}
                        className="bg-white p-5 rounded-xl border border-surface-border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                      >
                        {/* Decorative Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10 group-hover:bg-primary transition-colors" />

                        <div className="flex gap-4 items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-on-surface text-base truncate group-hover:text-primary transition-colors font-sans">
                              {dir.name}
                            </h3>
                            <p className="text-on-surface-variant text-xs mt-1">
                              Unit Bisnis Pembangkitan
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-surface-border/50 text-xs text-primary font-medium select-none">
                          <span className="flex items-center gap-1">
                            Kelola File Laporan
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-surface-border py-20 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-on-surface-variant/20 text-[64px] mb-3">
                      folder_off
                    </span>
                    <p className="text-on-surface font-semibold text-lg">Tidak Ada UBP</p>
                    <p className="text-on-surface-variant text-sm mt-1 max-w-sm">
                      Belum ada UBP yang terdaftar. Tambahkan melalui halaman <span className="font-semibold text-primary">Master UBP & Aset</span>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2: Unit Pembangkit List (read-only, no create/delete) */}
            {currentLevel === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <h2 className="text-sm font-bold tracking-wide text-on-surface-variant uppercase flex items-center gap-2 select-none">
                    Pilih Unit Pembangkit ({filteredDirs.length})
                  </h2>
                </div>

                {filteredDirs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredDirs.map((dir) => {
                      const isArrester = dir.name.toLowerCase().includes('arrester');
                      return (
                        <div
                          key={dir.id}
                          onClick={() => handleFolderClick(dir.id)}
                          className="bg-white p-5 rounded-xl border border-surface-border hover:border-sky-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                        >
                          {/* Decorative Top Line */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-100 group-hover:bg-sky-50 transition-colors" />

                          <div className="flex gap-4 items-start">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-on-surface text-base line-clamp-2 group-hover:text-sky-600 transition-colors">
                                {dir.name}
                              </h3>
                              <p className="text-on-surface-variant text-xs mt-1 font-medium">
                                {isArrester ? 'Peralatan: Arrester' : 'Unit Pembangkit'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between pt-4 border-t border-surface-border/50 text-xs text-sky-600 font-medium select-none">
                            <span>Buka Laporan</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-surface-border py-20 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-on-surface-variant/20 text-[64px] mb-3">
                      folder_off
                    </span>
                    <p className="text-on-surface font-semibold text-lg font-sans">Folder Kosong</p>
                    <p className="text-on-surface-variant text-sm mt-1 max-w-sm">
                      Belum ada Unit Pembangkit di bawah UBP ini. Tambahkan melalui halaman <span className="font-semibold text-primary">Master UBP & Aset</span>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 3+: Unit Pembangkit Contents (Sub-folders & Files) */}
            {currentLevel >= 3 && (
              <div className="bg-white rounded-xl border border-surface-border shadow-xs overflow-hidden flex flex-col justify-between min-h-[400px]">
                <div className="p-6">
                  {/* Render Nested Folders if any */}
                  {filteredDirs.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-4 select-none">
                        Sub-Folder ({filteredDirs.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredDirs.map((dir) => (
                          <div
                            key={dir.id}
                            onClick={() => handleFolderClick(dir.id)}
                            className="p-4 rounded-lg border border-surface-border hover:border-primary hover:bg-surface-container-low transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="material-symbols-outlined text-[#F59E0B] text-[28px] select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                folder
                              </span>
                              <span className="text-sm font-semibold text-on-surface truncate pr-2 font-sans">
                                {dir.name}
                              </span>
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleEditFolderClick(dir, e)}
                                  className="p-1 hover:bg-[#E0E7FF] hover:text-primary text-on-surface-variant/60 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                                  title="Ubah Nama Folder"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteFolder(dir.id, e)}
                                  className="p-1 hover:bg-red-50 hover:text-red-600 text-on-surface-variant/40 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                                  title="Hapus Folder"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Files Section */}
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase mb-4 select-none">
                      Berkas PDF Laporan ({filteredFiles.length})
                    </h3>

                    {filteredFiles.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-border text-on-surface-variant font-mono text-xs font-medium uppercase select-none">
                              <th className="py-3 px-4">Nama Berkas</th>
                              <th className="py-3 px-4 text-center">Ukuran</th>
                              <th className="py-3 px-4 text-center">Tanggal Unggah</th>
                              <th className="py-3 px-4">Pengunggah</th>
                              <th className="py-3 px-4 text-center w-[120px]">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border text-sm">
                            {filteredFiles.map((file) => (
                              <tr
                                key={file.id}
                                className="hover:bg-surface-container-low/50 transition-colors group"
                              >
                                <td className="py-3.5 px-4 font-medium text-on-surface max-w-xs sm:max-w-md truncate">
                                  <div className="flex items-center gap-3 min-w-0 font-sans">
                                    <span className="material-symbols-outlined text-red-500 text-[22px] select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                      picture_as_pdf
                                    </span>
                                    <span className="truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center text-on-surface-variant font-mono text-[13px]">
                                  {formatBytes(file.fileSize)}
                                </td>
                                <td className="py-3.5 px-4 text-center text-on-surface-variant">
                                  {formatDate(file.createdAt)}
                                </td>
                                <td className="py-3.5 px-4 text-on-surface-variant">
                                  {file.uploadedBy?.name || 'Sistem'}
                                </td>
                                <td className="py-3.5 px-4 text-center font-sans">
                                  <div className="flex items-center justify-center gap-2">
                                    <a
                                      href={`/api/reports/files/${file.id}/download?inline=true`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 hover:bg-surface-container text-on-surface-variant rounded-md transition-colors flex items-center justify-center"
                                      title="Lihat Berkas"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    </a>
                                    <a
                                      href={`/api/reports/files/${file.id}/download`}
                                      className="p-1.5 hover:bg-primary-container/20 text-primary rounded-md transition-colors flex items-center justify-center"
                                      title="Unduh Berkas"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">download</span>
                                    </a>
                                    {isAdmin && (
                                      <button
                                        onClick={(e) => handleDeleteFile(file.id, e)}
                                        className="p-1.5 hover:bg-red-50 text-on-surface-variant/40 hover:text-red-600 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                        title="Hapus Berkas"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      filteredDirs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center select-none font-sans">
                          <span className="material-symbols-outlined text-on-surface-variant/20 text-[56px] mb-2">
                            folder_open
                          </span>
                          <p className="text-on-surface font-semibold">Folder ini kosong</p>
                          <p className="text-on-surface-variant text-xs mt-1 max-w-xs">
                            Belum ada dokumen PDF laporan yang diunggah di dalam folder kategori ini.
                          </p>
                          {canUpload && (
                            <button
                              onClick={() => setIsFileModalOpen(true)}
                              className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">upload_file</span>
                              Unggah Laporan Pertama
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ===== Create Sub-Folder Modal (only used at Level 3+) ===== */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full shadow-lg border border-surface-border overflow-hidden animate-fade-in font-sans">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h3 className="font-bold text-on-surface text-lg font-sans">Tambah Sub-Folder</h3>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
                    Nama Folder
                  </label>
                  <input
                    id="input-new-folder-name"
                    type="text"
                    required
                    placeholder="Contoh: Hasil Pengujian 2024"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-surface-border rounded-md focus:outline-none focus:border-primary bg-white text-on-surface text-sm font-sans"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-surface-container-low border-t border-surface-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-surface-container border border-surface-border text-sm font-medium rounded-md text-on-surface cursor-pointer font-sans"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-folder"
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-sm font-medium rounded-md text-white flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  {isActionLoading && (
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                  )}
                  Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Edit Sub-Folder Modal ===== */}
      {isEditFolderModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full shadow-lg border border-surface-border overflow-hidden animate-fade-in font-sans">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h3 className="font-bold text-on-surface text-lg font-sans">Ubah Nama Sub-Folder</h3>
              <button
                onClick={() => setIsEditFolderModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditFolder}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded border border-red-200">
                    {errorMsg}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
                    Nama Folder Baru
                  </label>
                  <input
                    id="input-edit-folder-name"
                    type="text"
                    required
                    placeholder="Contoh: Hasil Pengujian 2024"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-surface-border rounded-md focus:outline-none focus:border-primary bg-white text-on-surface text-sm font-sans"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-surface-container-low border-t border-surface-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditFolderModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-surface-container border border-surface-border text-sm font-medium rounded-md text-on-surface cursor-pointer font-sans"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-edit-folder"
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-sm font-medium rounded-md text-white flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  {isActionLoading && (
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                  )}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Upload File Modal ===== */}
      {isFileModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full shadow-lg border border-surface-border overflow-hidden animate-fade-in font-sans">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between font-sans">
              <h3 className="font-bold text-on-surface text-lg font-sans">Unggah Laporan Evaluasi</h3>
              <button
                onClick={() => setIsFileModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUploadFile}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
                    Pilih File PDF Laporan
                  </label>
                  <input
                    id="input-upload-file"
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-surface-container file:text-primary hover:file:bg-[#dae2ff] file:cursor-pointer font-sans"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1 font-sans">
                    Hanya berkas format PDF (.pdf) dengan ukuran maksimum 20MB.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 bg-surface-container-low border-t border-surface-border flex justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setIsFileModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-surface-container border border-surface-border text-sm font-medium rounded-md text-on-surface cursor-pointer font-sans"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-upload"
                  type="submit"
                  disabled={isActionLoading || !selectedFile}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-sm font-medium rounded-md text-white flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  {isActionLoading && (
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                  )}
                  Unggah Berkas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

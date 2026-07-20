'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// Fetch helper for users
async function fetchUsers() {
  const res = await fetch('/api/master/users');
  if (!res.ok) throw new Error('Gagal mengambil data akun pengguna');
  const json = await res.json();
  return json.data;
}

// Fetch helper for UBPs
async function fetchUbps() {
  const res = await fetch('/api/master/ubp-asset');
  if (!res.ok) throw new Error('Gagal mengambil data UBP');
  const json = await res.json();
  return json.data || [];
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'INPUT' | 'QC' | 'ADMIN'>('VIEWER');
  const [isActive, setIsActive] = useState(true);
  const [selectedUbpIds, setSelectedUbpIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const { data: ubps, isLoading: isUbpsLoading } = useQuery({
    queryKey: ['ubp-list'],
    queryFn: fetchUbps,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!users) return { total: 0, admin: 0, qc: 0, input: 0, viewer: 0 };
    return {
      total: users.length,
      admin: users.filter((u: any) => u.role === 'ADMIN').length,
      qc: users.filter((u: any) => u.role === 'QC').length,
      input: users.filter((u: any) => u.role === 'INPUT').length,
      viewer: users.filter((u: any) => u.role === 'VIEWER').length,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/master/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat akun');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddModalOpen(false);
      resetForm();
      alert('Akun pengguna baru berhasil dibuat!');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/master/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui akun');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      resetForm();
      alert('Akun pengguna berhasil diperbarui!');
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/users?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus akun');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Akun pengguna berhasil dihapus dari sistem.');
    },
    onError: (err: any) => {
      alert(err.message);
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('VIEWER');
    setIsActive(true);
    setSelectedUbpIds([]);
    setErrorMsg('');
    setSelectedUser(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: any) => {
    resetForm();
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(!!user.isActive);
    setSelectedUbpIds(user.allowedUbpIds ? user.allowedUbpIds.split(',') : []);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || (!password && !selectedUser) || !role) {
      setErrorMsg('Nama, email, password, dan peran wajib diisi!');
      return;
    }

    const ubpString = selectedUbpIds.length > 0 ? selectedUbpIds.join(',') : null;
    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      allowedUbpIds: ubpString,
      isActive,
    };

    if (password.trim()) {
      payload.password = password;
    }

    if (selectedUser) {
      payload.id = selectedUser.id;
      updateUserMutation.mutate(payload);
    } else {
      createUserMutation.mutate(payload);
    }
  };

  const handleDeleteUser = (user: any) => {
    if (user.id === session?.user?.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri.');
      return;
    }
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus akun "${user.name}"?`);
    if (confirmDelete) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleUbpSelection = (ubpId: string) => {
    setSelectedUbpIds((prev) =>
      prev.includes(ubpId) ? prev.filter((id) => id !== ubpId) : [...prev, ubpId]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold text-[10px] tracking-wide uppercase border border-red-100 font-sans">
            Admin
          </span>
        );
      case 'QC':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] tracking-wide uppercase border border-purple-100 font-sans">
            Validator
          </span>
        );
      case 'INPUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] tracking-wide uppercase border border-blue-100 font-sans">
            Inputter
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-700 font-semibold text-[10px] tracking-wide uppercase border border-slate-200 font-sans">
            Viewer
          </span>
        );
    }
  };

  return (
    <div className="pb-32 animate-fade-in max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">Kelola Pengguna</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Konfigurasi akun, peran otorisasi, dan hak akses Unit Bisnis (UBP) PLN.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-white hover:brightness-110 font-bold text-xs py-2.5 px-4.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm select-none font-bold">person_add</span>
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg select-none">group</span>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-outline">Total Akun</p>
            <h3 className="text-xl font-bold text-on-surface font-mono">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg select-none">edit_document</span>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-outline">Inputter</p>
            <h3 className="text-xl font-bold text-on-surface font-mono">{stats.input}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg select-none">rule</span>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-outline">Validator</p>
            <h3 className="text-xl font-bold text-on-surface font-mono">{stats.qc}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg select-none">visibility</span>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-outline">Viewer</p>
            <h3 className="text-xl font-bold text-on-surface font-mono">{stats.viewer}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg select-none">shield</span>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-outline">Administrator</p>
            <h3 className="text-xl font-bold text-on-surface font-mono">{stats.admin}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white rounded-xl border border-surface-border p-4 shadow-sm space-y-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-border rounded-lg text-xs py-2 px-8.5 focus:ring-1 focus:ring-primary focus:border-primary focus:bg-white transition-all outline-none font-medium"
            />
            <span className="material-symbols-outlined text-outline absolute left-2.5 top-1/2 -translate-y-1/2 text-sm select-none">
              search
            </span>
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-surface-border rounded-lg text-xs py-2 px-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer font-semibold text-on-surface-variant"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">AKTIF</option>
            <option value="INACTIVE">NONAKTIF</option>
          </select>

          {/* Clear filters button */}
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs select-none">filter_alt_off</span>
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container with Tabbed Menu */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
        {/* Tab Menu Header */}
        <div className="flex border-b border-surface-border bg-surface-container-low/20 overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'Semua Pengguna', count: stats.total, icon: 'group' },
            { id: 'INPUT', label: 'Inputter', count: stats.input, icon: 'edit_document' },
            { id: 'QC', label: 'Validator', count: stats.qc, icon: 'verified' },
            { id: 'VIEWER', label: 'Viewer', count: stats.viewer, icon: 'visibility' },
            { id: 'ADMIN', label: 'Administrator', count: stats.admin, icon: 'shield' },
          ].map((tab) => {
            const isActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition-all duration-200 outline-none cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary bg-white'
                    : 'border-transparent text-outline hover:text-on-surface hover:bg-surface-container-low/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-surface-container-high text-outline'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table Area */}
        {isUsersLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant text-xs font-semibold">
            {searchQuery || statusFilter !== 'ALL' 
              ? 'Tidak ada pengguna yang cocok dengan kriteria filter.' 
              : 'Belum ada pengguna terdaftar untuk kategori ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="bg-surface-container-low/10 border-b border-surface-border font-bold font-sans text-[10px] uppercase tracking-wider text-outline">
                  <th className="py-3.5 px-4 w-[25%]">Nama Pengguna</th>
                  <th className="py-3.5 px-4 w-[25%]">Email Login</th>
                  <th className="py-3.5 px-4 text-center w-[15%]">Peran Otorisasi</th>
                  <th className="py-3.5 px-4 text-center w-[15%]">Akses Wilayah UBP</th>
                  <th className="py-3.5 px-4 text-center w-[10%]">Status</th>
                  <th className="py-3.5 px-4 text-center w-[10%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/40">
                {filteredUsers.map((user: any) => {
                  const allowedUbps = user.allowedUbpIds
                    ? ubps
                      ? ubps.filter((u: any) => user.allowedUbpIds.split(',').includes(u.id)).map((u: any) => u.name).join(', ')
                      : user.allowedUbpIds
                    : null;

                  return (
                    <tr 
                      key={user.id} 
                      className="hover:bg-surface-container-low/10 transition-all border-l-4 border-l-transparent hover:border-l-primary group/row"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-surface-container-high text-primary font-bold text-xs flex items-center justify-center border border-surface-border/50 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-xs text-on-surface truncate">
                              {user.name}
                            </span>
                            {user.id === session?.user?.id && (
                              <span className="bg-status-good/10 text-status-good-text text-[8px] tracking-wide font-bold px-1.5 py-0.5 rounded border border-status-good/20 uppercase shrink-0">
                                Akun Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-medium text-xs truncate" title={user.email}>{user.email}</td>
                      <td className="py-3 px-4 text-center">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-3 px-4 text-center text-on-surface-variant font-medium text-xs max-w-[240px] truncate" title={allowedUbps || 'Semua UBP'}>
                        {allowedUbps ? 'Terbatas' : 'Semua UBP'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold ${
                          user.isActive
                            ? 'bg-status-good/10 text-status-good-text'
                            : 'bg-outline/10 text-on-surface-variant'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${user.isActive ? 'bg-status-good' : 'bg-outline'}`} />
                          {user.isActive ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="h-7 w-7 text-primary hover:bg-primary/5 rounded-lg border border-surface-border hover:border-primary/20 transition-all cursor-pointer flex items-center justify-center"
                            title="Edit Pengguna"
                          >
                            <span className="material-symbols-outlined text-[15px] select-none font-semibold">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.id === session?.user?.id}
                            className="h-7 w-7 text-outline hover:text-status-bad hover:bg-status-bad/5 rounded-lg border border-transparent hover:border-status-bad/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                            title="Hapus Pengguna"
                          >
                            <span className="material-symbols-outlined text-[15px] select-none font-semibold">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah / Edit Pengguna */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-surface-border p-6 max-w-xl w-full mx-4 animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-2 border-b border-surface-border pb-3">
              <span className="material-symbols-outlined text-primary text-xl select-none font-bold">
                {selectedUser ? 'manage_accounts' : 'person_add'}
              </span>
              {selectedUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm select-none font-bold">warning</span>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama Pengguna */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Nama Pengguna <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ali Firdaus"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none focus:bg-white transition-all font-medium"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Email Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alifirdaus@pln.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none focus:bg-white transition-all font-medium"
                  />
                </div>

                {/* Peran (Role) */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Peran Otorisasi (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer font-bold text-primary"
                  >
                    <option value="VIEWER">VIEWER (Lihat Saja)</option>
                    <option value="INPUT">INPUT (Input Data Pengujian)</option>
                    <option value="QC">VALIDATOR (Validasi Data Pengujian)</option>
                    <option value="ADMIN">ADMIN (Kelola Pengguna/Master)</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                    Kata Sandi (Password) {!selectedUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    required={!selectedUser}
                    placeholder={selectedUser ? 'Biarkan kosong jika tidak ingin diubah' : 'Minimal 6 karakter'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-border rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Status Toggle (Khusus Edit) */}
              {selectedUser && (
                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-primary border-surface-border rounded focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="isActiveToggle" className="font-bold text-on-surface select-none cursor-pointer">
                    Akun Aktif (Pengguna dapat masuk)
                  </label>
                </div>
              )}

              {/* Akses UBP (Otoritas Khusus Unit Bisnis) */}
              <div className="border-t border-surface-border/50 pt-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-on-surface-variant">
                      Hak Akses Unit Bisnis (UBP)
                    </label>
                    <p className="text-[10px] text-on-surface-variant/80 mt-0.5">
                      Batasi akses data pengguna hanya ke UBP tertentu. Jika kosong, pengguna memiliki akses ke **Semua UBP**.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUbpIds([])}
                    className="text-primary font-bold hover:underline"
                  >
                    Batal Pilih Semua
                  </button>
                </div>

                {isUbpsLoading ? (
                  <div className="flex items-center justify-center py-5">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1.5 border border-surface-border/80 rounded-lg bg-surface-container-lowest">
                    {ubps?.map((ubp: any) => {
                      const isChecked = selectedUbpIds.includes(ubp.id);
                      return (
                        <div
                          key={ubp.id}
                          onClick={() => handleToggleUbpSelection(ubp.id)}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-primary bg-primary/5 text-primary-text font-semibold'
                              : 'border-surface-border bg-white hover:bg-surface-container-low text-on-surface'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="h-3.5 w-3.5 text-primary border-surface-border rounded focus:ring-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate leading-none">{ubp.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {createUserMutation.isPending || updateUserMutation.isPending ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

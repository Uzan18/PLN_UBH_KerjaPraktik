export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-700">SIAT PLN IP</div>
        <nav className="flex-1 p-4 space-y-2 text-sm font-medium">
          <a href="/dashboard" className="block p-2 rounded hover:bg-slate-800">Dashboard</a>
          <a href="/unit" className="block p-2 rounded hover:bg-slate-800">Unit</a>
          <a href="/input" className="block p-2 rounded hover:bg-slate-800">Input Data Pengujian</a>
          <a href="/validasi" className="block p-2 rounded hover:bg-slate-800">Validasi (QC)</a>
          <div className="pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</div>
          <a href="/master-data/equipment-testtype" className="block p-2 rounded hover:bg-slate-800">Eq-TestType Mapping</a>
          <a href="/master-data/kriteria" className="block p-2 rounded hover:bg-slate-800">Kriteria Penilaian</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
          <div className="text-lg font-semibold">Dashboard Utama</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">ADMIN</span>
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
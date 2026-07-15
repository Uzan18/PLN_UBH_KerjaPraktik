'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['VIEWER', 'INPUT', 'QC', 'ADMIN'] },
  { href: '/laporan', icon: 'analytics', label: 'Laporan', roles: ['VIEWER', 'INPUT', 'QC', 'ADMIN'] },
  { href: '/informasi-asset', icon: 'info', label: 'Hasil Pengujian', roles: ['VIEWER', 'INPUT', 'QC', 'ADMIN'] },
  { href: '/input', icon: 'edit_document', label: 'Input Data', roles: ['INPUT'] },
  { href: '/riwayat', icon: 'assignment', label: 'Riwayat Uji', roles: ['INPUT', 'QC', 'ADMIN'] },
  { href: '/validasi', icon: 'rule', label: 'Validasi Data', roles: ['QC'] },
  { href: '/master-data/ubp-asset', icon: 'domain', label: 'Master UBP & Aset', roles: ['ADMIN'] },
  { href: '/master-data/pengujian', icon: 'fact_check', label: 'Master Jenis Pengujian', roles: ['ADMIN'] },
  { href: '/master-data/users', icon: 'group', label: 'Kelola Pengguna', roles: ['ADMIN'] },
  { href: '/log', icon: 'history', label: 'Log Audit', roles: ['ADMIN'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string })?.role || 'VIEWER';
  const userName = session?.user?.name || 'User';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex min-h-screen">
      {/* ===== Side Navigation Bar ===== */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-surface-border flex flex-col py-6 z-50">
        {/* Logo / Brand */}
        <div className="px-6 mb-8 flex justify-center">
          <img src="/logofix.png" alt="PLN Logo" className="h-10 w-auto object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high active:scale-95'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="px-6 pt-6 border-t border-surface-border mt-auto space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
              {userInitials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-on-surface truncate">
                {userName}
              </p>
              <p className="text-xs font-mono text-on-surface-variant truncate">
                {userRole === 'QC' ? 'Validator' : userRole === 'INPUT' ? 'Inputter' : userRole === 'ADMIN' ? 'Admin' : 'Viewer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Keluar
          </button>
        </div>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 h-16 bg-surface border-b border-surface-border flex justify-between items-center px-6 z-40">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-semibold text-primary truncate max-w-[300px]">
              {getPageTitle(pathname)}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {userRole === 'INPUT' && (
              <Link
                href="/input"
                className="bg-primary text-on-primary px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform hover:brightness-110"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Input Baru
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 w-full max-w-[1440px] mx-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard Monitoring';
  if (pathname.startsWith('/informasi-asset')) return 'Informasi Aset';
  if (pathname.startsWith('/input')) return 'Input Data';
  if (pathname.startsWith('/riwayat')) return 'Riwayat Uji';
  if (pathname.startsWith('/validasi')) return 'Validasi Data';
  if (pathname.startsWith('/master-data')) return 'Master Data';
  if (pathname.startsWith('/unit/')) return 'Detail Asset';
  if (pathname.startsWith('/laporan')) return 'Laporan';
  return 'Assessment Trafo';
}

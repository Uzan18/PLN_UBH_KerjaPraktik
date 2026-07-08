import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-surface-background min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Topbar />
        <main className="ml-64 pt-24 p-grid-margin min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
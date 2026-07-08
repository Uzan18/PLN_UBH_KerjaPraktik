export function Topbar() {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-surface border-b border-surface-border flex justify-between items-center px-grid-margin z-40">
      <div className="flex items-center gap-8">
        <h2 className="font-headline-md text-headline-md text-primary truncate max-w-[300px]">Dashboard Monitoring</h2>
        <div className="flex items-center gap-4 bg-surface-container-low px-4 py-1.5 rounded-md border border-surface-border">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-label-md text-on-surface-variant">Tahun:</span>
            <select className="bg-transparent border-none text-label-md font-bold focus:ring-0 p-0 cursor-pointer">
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <div className="h-4 w-px bg-surface-border"></div>
          <div className="flex items-center gap-2">
            <span className="text-label-md font-label-md text-on-surface-variant">UBP:</span>
            <select className="bg-transparent border-none text-label-md font-bold focus:ring-0 p-0 cursor-pointer">
              <option>Semua UBP</option>
              <option>Suralaya</option>
            </select>
          </div>
          <div className="h-4 w-px bg-surface-border"></div>
          <div className="flex items-center gap-2">
            <span className="text-label-md font-label-md text-on-surface-variant">Asset:</span>
            <select className="bg-transparent border-none text-label-md font-bold focus:ring-0 p-0 cursor-pointer">
              <option>Semua Asset</option>
              <option>Unit 4</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-body-md font-bold flex items-center gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Input Baru
        </button>
      </div>
    </header>
  );
}
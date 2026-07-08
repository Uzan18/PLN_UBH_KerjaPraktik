export default function DashboardPage() {
  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-5 gap-grid-gutter mb-grid-margin">
        <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4">Total Aset</p>
          <div className="flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-primary">24</span>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">electrical_services</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4">Total Record</p>
          <div className="flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-on-surface">35</span>
            <div className="h-12 w-12 bg-surface-container rounded-lg flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">description</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between border-l-4 border-l-status-good transition-all hover:shadow-md">
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4">Kondisi Good</p>
          <div className="flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-status-good">6</span>
            <div className="h-12 w-12 bg-status-good/10 rounded-lg flex items-center justify-center text-status-good">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between border-l-4 border-l-status-fair transition-all hover:shadow-md">
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4">Kondisi Fair</p>
          <div className="flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-status-fair">10</span>
            <div className="h-12 w-12 bg-status-fair/10 rounded-lg flex items-center justify-center text-status-fair">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between border-l-4 border-l-status-bad transition-all hover:shadow-md">
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4">Poor + Bad</p>
          <div className="flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-status-bad">22</span>
            <div className="h-12 w-12 bg-status-bad/10 rounded-lg flex items-center justify-center text-status-bad">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Assessment Table Widget Placeholder */}
      <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden mb-grid-margin rounded-xl">
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-white">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Kondisi Trafo per Unit x Jenis Pengujian</h3>
            <p className="text-body-md text-on-surface-variant mt-0.5">Ringkasan status pengujian transformer terbaru per unit pembangkit.</p>
          </div>
        </div>
        <div className="p-12 text-center text-on-surface-variant">
          (Tabel Data Akan Ditampilkan Di Sini)
        </div>
      </section>

      {/* Chart Widgets Placeholder */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gutter pb-grid-margin">
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
          <h4 className="font-headline-sm text-on-surface mb-6">Rekap by Damage Mechanism</h4>
          <div className="h-64 flex items-center justify-center text-on-surface-variant">(Donut Chart)</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
          <h4 className="font-headline-sm text-on-surface mb-6">Tren Kondisi per Tahun</h4>
          <div className="h-64 flex items-center justify-center text-on-surface-variant">(Line Chart)</div>
        </div>
      </section>
    </>
  );
}
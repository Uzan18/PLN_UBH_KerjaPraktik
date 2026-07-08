export default function InputPage() {
  return (
    <>
      <div className="mb-lg">
        <h2 className="font-headline-md text-headline-md text-primary mb-1">Input Hasil Pengujian Trafo</h2>
        <p className="font-body-md text-on-surface-variant">Masukkan data hasil inspeksi dan pemeliharaan rutin trafo.</p>
      </div>

      <section className="bg-white border border-surface-border rounded-xl p-lg mb-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface-variant">Tahun Pengujian</label>
            <select className="w-full bg-surface-container-low border-surface-border rounded-lg text-body-md py-2.5 px-3 focus:ring-primary">
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface-variant">UBP</label>
            <select className="w-full bg-surface-container-low border-surface-border rounded-lg text-body-md py-2.5 px-3 focus:ring-primary">
              <option disabled value="">Pilih UBP</option>
              <option value="suralaya">UBP Suralaya</option>
              <option value="grati">UBP Grati</option>
              <option value="muaratawar">UBP Muara Tawar</option>
            </select>
          </div>
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface-variant">Unit Pembangkit/Asset</label>
            <select className="w-full bg-surface-container-low border-surface-border rounded-lg text-body-md py-2.5 px-3 focus:ring-primary">
              <option disabled value="">Pilih Unit</option>
              <option value="1">Unit 1</option>
              <option value="2">Unit 2</option>
              <option value="3">Unit 3</option>
            </select>
          </div>
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface-variant">Equipment</label>
            <select className="w-full bg-surface-container-low border-surface-border rounded-lg text-body-md py-2.5 px-3 focus:ring-primary">
              <option disabled value="">Pilih Equipment</option>
              <option value="main">Main Transformer 1</option>
              <option value="station">Station Transformer 1</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-sm pt-md border-t border-surface-border">
          <div className="px-md py-2 bg-surface-container-low border border-surface-border rounded-full flex items-center gap-sm">
            <span className="text-[10px] uppercase font-bold text-outline">Mfg Year:</span>
            <span className="text-body-md font-semibold text-on-surface-variant">2009</span>
          </div>
          <div className="px-md py-2 bg-surface-container-low border border-surface-border rounded-full flex items-center gap-sm">
            <span className="text-[10px] uppercase font-bold text-outline">Vector:</span>
            <span className="text-body-md font-semibold text-on-surface-variant">YNd11</span>
          </div>
          <div className="px-md py-2 bg-surface-container-low border border-surface-border rounded-full flex items-center gap-sm">
            <span className="text-[10px] uppercase font-bold text-outline">Serial:</span>
            <span className="text-body-md font-semibold text-on-surface-variant">20093S13</span>
          </div>
        </div>
      </section>

      <section className="mb-lg">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-md">Pilih Jenis Pengujian</h3>
        <div className="flex flex-wrap gap-sm overflow-x-auto pb-2 scrollbar-hide">
          <button className="px-lg py-2.5 bg-primary text-white rounded-full font-label-md text-label-md flex items-center gap-sm shadow-md whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Insulation Resistance
          </button>
          <button className="px-lg py-2.5 bg-white border border-surface-border text-on-surface-variant hover:bg-surface-container-low rounded-full font-label-md text-label-md transition-all whitespace-nowrap">
            Polarity Index
          </button>
          <button className="px-lg py-2.5 bg-white border border-surface-border text-on-surface-variant hover:bg-surface-container-low rounded-full font-label-md text-label-md transition-all whitespace-nowrap">
            Turn to Turn Ratio
          </button>
          <button className="px-lg py-2.5 bg-white border border-surface-border text-on-surface-variant hover:bg-surface-container-low rounded-full font-label-md text-label-md transition-all whitespace-nowrap">
            Winding Resistance
          </button>
        </div>
      </section>

      <section className="space-y-md mb-24">
        {/* Insulation Resistance Card Placeholder */}
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden transition-all duration-300">
          <div className="p-md bg-surface-container-low flex items-center justify-between cursor-pointer border-b border-surface-border">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-primary">bolt</span>
              <h4 className="font-headline-sm text-headline-sm text-primary">Insulation Resistance</h4>
            </div>
            <span className="material-symbols-outlined text-outline">keyboard_arrow_up</span>
          </div>
          <div className="p-lg space-y-md">
            <div className="grid grid-cols-12 items-center gap-md border-b border-surface-border/50 pb-md">
              <label className="col-span-3 font-body-lg text-body-lg text-on-surface-variant">HV (G Ohm)</label>
              <div className="col-span-6 relative">
                <input type="number" className="w-full bg-surface-container-lowest border border-surface-border rounded-lg py-3 px-md font-label-md text-body-lg focus:ring-primary outline-none focus:border-primary" placeholder="0.00" defaultValue="15.20" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-outline">
                  <span className="text-xs font-bold uppercase">GΩ</span>
                </div>
              </div>
              <div className="col-span-3 flex justify-end">
                <div className="flex items-center gap-xs px-md py-1.5 bg-status-good/10 text-status-good rounded-full border border-status-good/20">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="font-label-md text-[13px] font-bold">GOOD</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-md border-b border-surface-border/50 pb-md">
              <label className="col-span-3 font-body-lg text-body-lg text-on-surface-variant">LV (G Ohm)</label>
              <div className="col-span-6 relative">
                <input type="number" className="w-full bg-surface-container-lowest border border-surface-border rounded-lg py-3 px-md font-label-md text-body-lg focus:ring-primary outline-none focus:border-primary" placeholder="0.00" defaultValue="12.45" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-outline">
                  <span className="text-xs font-bold uppercase">GΩ</span>
                </div>
              </div>
              <div className="col-span-3 flex justify-end">
                <div className="flex items-center gap-xs px-md py-1.5 bg-status-good/10 text-status-good rounded-full border border-status-good/20">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="font-label-md text-[13px] font-bold">GOOD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Sticky Bar */}
      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-white border-t border-surface-border px-lg py-md z-40 flex items-center justify-between">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-status-good">info</span>
          <span className="font-body-md">Sistem secara otomatis menghitung skor berdasarkan ambang batas standar PLN.</span>
        </div>
        <div className="flex items-center gap-md">
          <button className="px-xl py-2.5 bg-white border border-primary text-primary hover:bg-surface-container-low rounded-lg font-bold text-body-md transition-all active:scale-95">
            Simpan sebagai Draft
          </button>
          <button className="px-xl py-2.5 bg-primary text-white hover:bg-primary-container rounded-lg font-bold text-body-md shadow-md transition-all active:scale-95 flex items-center gap-sm">
            Submit untuk Validasi
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </footer>
    </>
  );
}
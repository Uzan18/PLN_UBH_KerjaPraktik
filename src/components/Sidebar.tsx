import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-surface-border flex flex-col py-6 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <img alt="PLN Indonesia Power Logo" className="h-10 w-10 object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLur8-gyRN27bQmOQzHxfvFAaWTsWO3mrgD5AxUhxVCvpPHy3e4Mz9qktQBqJXmz061ri8xZDG11ERj4QEo4Eg38pqMJ0Fmtrm1kv85RFM-rMXzRi-fH9-FVJqui2zp48Jj0G3pPu287SJX_0-Ddh9cvKcqS94_1EDG3Nd4QzZ4YOXkZnqak5kv2wk_dLMk4JKlTNFh0UfJLko06AyRHS1kJ3jX1j8BPsSAcJAuXFrY_EciXcoiv4HXJkYjh"/>
        <div>
          <h1 className="text-headline-sm font-headline-sm text-primary">SIAT PLN</h1>
          <p className="text-[10px] leading-tight font-medium text-on-surface-variant tracking-wider uppercase">Assessment Trafo</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 bg-primary-container text-on-primary-container font-semibold rounded-md transition-transform active:scale-95">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-body-md font-body-md">Dashboard</span>
        </Link>
        <Link href="/input" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 rounded-md active:scale-95">
          <span className="material-symbols-outlined">edit_document</span>
          <span className="text-body-md font-body-md">Input Data</span>
        </Link>
        <Link href="/validasi" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 rounded-md active:scale-95">
          <span className="material-symbols-outlined">rule</span>
          <span className="text-body-md font-body-md">Validasi Data</span>
        </Link>
        <Link href="/master-data" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 rounded-md active:scale-95">
          <span className="material-symbols-outlined">database</span>
          <span className="text-body-md font-body-md">Master Data</span>
        </Link>
      </nav>
      <div className="px-6 pt-6 border-t border-surface-border mt-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">person</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-body-md font-bold text-on-surface truncate">Admin Utama</p>
            <p className="text-label-md text-on-surface-variant truncate">PT PLN IP</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
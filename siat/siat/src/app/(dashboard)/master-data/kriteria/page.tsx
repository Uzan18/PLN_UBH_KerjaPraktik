export default function KriteriaPenilaian() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Master Data: Kriteria Penilaian (Thresholds)</h1>
          <p className="text-gray-600">Kelola ambang batas kondisi (Good/Fair/Poor/Bad) dan dasar judgemental.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">+ Parameter Baru</button>
      </div>

      <div className="bg-white border rounded shadow">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between font-semibold">
          <div className="flex items-center gap-4">
            <div className="text-lg">Insulation Resistance - IR Value</div>
            <span className="bg-slate-200 px-2 py-1 text-xs rounded">MAX</span>
          </div>
          <a href="/master-data/kriteria/1/history" className="text-blue-600 text-sm font-normal hover:underline">Lihat History</a>
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-green-700 font-bold mb-1">GOOD (≥)</label>
              <input type="number" className="w-full border rounded p-2 bg-green-50" defaultValue="100" />
            </div>
            <div>
              <label className="block text-sm text-yellow-700 font-bold mb-1">FAIR (≥)</label>
              <input type="number" className="w-full border rounded p-2 bg-yellow-50" defaultValue="50" />
            </div>
            <div>
              <label className="block text-sm text-orange-700 font-bold mb-1">POOR (≥)</label>
              <input type="number" className="w-full border rounded p-2 bg-orange-50" defaultValue="20" />
            </div>
            <div>
              <label className="block text-sm text-red-700 font-bold mb-1">BAD (&lt;)</label>
              <div className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed">20 (Auto)</div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2 text-sm text-gray-800">
              Dasar Judgemental <span className="text-red-500">*</span> (Wajib diisi min 20 char)
            </label>
            <textarea 
              className="w-full border rounded p-3 h-20 text-sm focus:ring focus:border-blue-500" 
              defaultValue="Berdasarkan standar IEEE C57.152-2013 untuk trafo daya di atas 69kV"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700">Update Kriteria (Version Baru)</button>
          </div>
        </div>
      </div>
      
      {/* Another mock row */}
      <div className="bg-white border rounded shadow">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between font-semibold">
          <div className="flex items-center gap-4">
            <div className="text-lg">Tan Delta Winding - C1</div>
            <span className="bg-slate-200 px-2 py-1 text-xs rounded">MIN</span>
          </div>
          <a href="#" className="text-blue-600 text-sm font-normal hover:underline">Lihat History</a>
        </div>
        <div className="p-4 text-center text-gray-500 text-sm">
          Expand to see thresholds
        </div>
      </div>
    </div>
  );
}
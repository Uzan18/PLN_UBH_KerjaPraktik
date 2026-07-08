import { StatusBadge } from '@/components/StatusBadge';
import { TrendChart } from '@/components/TrendChart';

export default function AssetDetail({ params }: { params: { assetId: string } }) {
  const chartData = [
    { year: '2020', score: 95 },
    { year: '2021', score: 90 },
    { year: '2022', score: 85 },
    { year: '2023', score: 70 },
    { year: '2024', score: 88 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-1">Trafo Unit 4</h1>
          <div className="text-gray-500 text-sm mb-4">Main Trafo • UBP Suralaya</div>
          <div className="flex gap-4">
            <div className="border rounded p-3 bg-gray-50 w-48">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Current Status</div>
              <StatusBadge judgement="FAIR" />
            </div>
            <div className="border rounded p-3 bg-gray-50 w-48">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Last Tested</div>
              <div className="font-medium">12 Oct 2024</div>
            </div>
          </div>
        </div>
        <div className="w-1/3">
          <label className="block text-sm font-semibold mb-2">Keterangan Alat</label>
          <textarea 
            className="w-full border rounded p-2 text-sm h-24 focus:ring focus:ring-blue-200 focus:border-blue-500" 
            defaultValue="Bushing fasa R pernah diganti tahun 2022. Suhu sekitar sering tinggi saat beban puncak."
          />
          <button className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 float-right">Simpan Notes</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Status per Jenis Pengujian (2024)</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center border p-3 rounded">
              <span className="font-medium">Insulation Resistance</span>
              <StatusBadge judgement="GOOD" />
            </div>
            <div className="flex justify-between items-center border p-3 rounded bg-orange-50">
              <span className="font-medium">Turn to Turn Ratio</span>
              <StatusBadge judgement="POOR" />
            </div>
            {/* Expandable row mock */}
            <div className="border p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-600">Dissolved Gas Analysis (Expand)</span>
                <StatusBadge judgement="FAIR" />
              </div>
              <div className="text-sm bg-gray-50 p-2 rounded grid grid-cols-3 gap-2 border">
                <div><span className="text-gray-500">H2:</span> 50 ppm</div>
                <div><span className="text-gray-500">CH4:</span> 120 ppm</div>
                <div><span className="text-gray-500">CO:</span> 300 ppm</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Trend Kondisi Keseluruhan</h2>
          <TrendChart data={chartData} />
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Analisis Damage Mechanism</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="border p-3 rounded flex justify-between"><span>Dielectric Breakdown</span> <StatusBadge judgement="GOOD" /></div>
          <div className="border p-3 rounded flex justify-between bg-yellow-50"><span>Thermal Degradation</span> <StatusBadge judgement="FAIR" /></div>
          <div className="border p-3 rounded flex justify-between"><span>Mechanical Fault</span> <StatusBadge judgement="GOOD" /></div>
          <div className="border p-3 rounded flex justify-between bg-gray-100"><span>Contamination</span> <StatusBadge judgement="NO_DATA" /></div>
          <div className="border p-3 rounded flex justify-between"><span>Moisture Ingress</span> <StatusBadge judgement="GOOD" /></div>
          <div className="border p-3 rounded flex justify-between bg-red-50"><span>Aging</span> <StatusBadge judgement="BAD" /></div>
        </div>
      </div>
    </div>
  );
}
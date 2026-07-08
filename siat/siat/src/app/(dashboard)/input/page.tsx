'use client';
import { CascadingSelector } from '@/components/CascadingSelector';

export default function InputData() {
  const handleSelect = (year: string, ubp: string, asset: string) => {
    console.log('Selected:', { year, ubp, asset });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Input Data Pengujian</h1>
        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-semibold">STATUS: DRAFT</div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
        Silakan pilih Tahun, Unit Induk, dan Asset terlebih dahulu. Form input akan menyesuaikan dengan jenis pengujian (Equipment-TestType mapping) yang berlaku untuk aset tersebut.
      </div>

      <CascadingSelector onSelect={handleSelect} />

      <div className="space-y-4">
        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center cursor-pointer font-semibold">
            <span>Insulation Resistance</span>
            <span>▼</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">IR Value (MΩ)</label>
              <div className="flex gap-2 items-center">
                <input type="number" className="border rounded p-2 w-full focus:ring focus:border-blue-500" defaultValue="150" />
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">GOOD</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Suhu (°C)</label>
              <div className="flex gap-2 items-center">
                <input type="number" className="border rounded p-2 w-full focus:ring focus:border-blue-500" defaultValue="35" />
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">NA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center cursor-pointer font-semibold">
            <span>Turn to Turn Ratio</span>
            <span>▼</span>
          </div>
          <div className="p-4 text-sm text-gray-500">
            Form is collapsed. Click header to expand.
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 border-t pt-6 mt-8">
        <button className="px-6 py-2 border rounded font-medium hover:bg-gray-50">Simpan Draft</button>
        <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Submit untuk Validasi</button>
      </div>
    </div>
  );
}
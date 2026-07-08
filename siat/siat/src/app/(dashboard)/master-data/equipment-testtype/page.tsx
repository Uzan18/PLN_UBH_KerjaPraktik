'use client';
import { useState } from 'react';

export default function EquipmentTestTypeMapping() {
  const testTypes = [
    { id: 1, name: 'Insulation Resistance', checked: true, mandatory: true },
    { id: 2, name: 'Polarity Index', checked: true, mandatory: true },
    { id: 3, name: 'Tan Delta Winding', checked: false, mandatory: false },
    { id: 4, name: 'Arrester Ground', checked: false, mandatory: false },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Equipment - Test Type Mapping</h1>
          <p className="text-gray-600">Tentukan jenis pengujian apa saja yang berlaku untuk sebuah Equipment Type.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow border">
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Equipment Type</label>
          <select className="border p-2 rounded w-64 text-sm focus:ring">
            <option>Main Trafo</option>
            <option>Arrester</option>
          </select>
        </div>

        <div>
          <h3 className="font-semibold border-b pb-2 mb-4">Pilih Jenis Pengujian yang Berlaku</h3>
          <div className="space-y-3">
            {testTypes.map(tt => (
              <div key={tt.id} className="flex items-center gap-6 p-2 hover:bg-gray-50 rounded">
                <label className="flex items-center gap-3 w-64 cursor-pointer">
                  <input type="checkbox" defaultChecked={tt.checked} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <span className={tt.checked ? 'font-medium' : 'text-gray-600'}>{tt.name}</span>
                </label>
                {tt.checked && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" defaultChecked={tt.mandatory} className="rounded" />
                    <span>Mandatory (Wajib Diisi)</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t pt-4 flex justify-end">
          <button className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700">Simpan Mapping</button>
        </div>
      </div>
    </div>
  );
}
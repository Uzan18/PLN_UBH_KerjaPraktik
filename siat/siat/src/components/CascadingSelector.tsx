'use client';
import { useState } from 'react';

export function CascadingSelector({ onSelect }: { onSelect: (year: string, ubp: string, asset: string) => void }) {
  const [year, setYear] = useState('');
  const [ubp, setUbp] = useState('');
  const [asset, setAsset] = useState('');

  // Mock data for now, should be fetched via API
  const ubps = [{ id: '1', name: 'UBP Suralaya' }, { id: '2', name: 'UBP Paiton' }];
  const assets = [{ id: '1', ubpId: '1', name: 'Trafo 1' }, { id: '6', ubpId: '2', name: 'Arrester 1' }];

  const filteredAssets = assets.filter(a => a.ubpId === ubp);

  const handleApply = () => {
    onSelect(year, ubp, asset);
  };

  return (
    <div className="flex gap-4 mb-6 items-end bg-white p-4 rounded shadow">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
        <select className="border p-2 rounded text-sm w-32" value={year} onChange={e => setYear(e.target.value)}>
          <option value="">Select Year</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">UBP</label>
        <select className="border p-2 rounded text-sm w-48" value={ubp} onChange={e => { setUbp(e.target.value); setAsset(''); }}>
          <option value="">Select UBP</option>
          {ubps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Asset</label>
        <select className="border p-2 rounded text-sm w-48" value={asset} onChange={e => setAsset(e.target.value)} disabled={!ubp}>
          <option value="">Select Asset</option>
          {filteredAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button 
        onClick={handleApply}
        disabled={!year || !ubp || !asset}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        Select
      </button>
    </div>
  );
}
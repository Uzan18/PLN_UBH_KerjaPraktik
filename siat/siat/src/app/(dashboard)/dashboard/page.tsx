import { JudgementMatrixTable } from '@/components/JudgementMatrixTable';
import { DamageMechanismChart } from '@/components/DamageMechanismChart';
import { StatusBadge } from '@/components/StatusBadge';

export default function Dashboard() {
  const kpiData = {
    total: 120,
    good: 85,
    fairPoor: 25,
    bad: 10
  };

  const chartData = [
    { name: 'Dielectric', value: 40, fill: '#22C55E' },
    { name: 'Thermal', value: 30, fill: '#EAB308' },
    { name: 'Mechanical', value: 20, fill: '#F97316' },
    { name: 'Moisture', value: 10, fill: '#EF4444' }
  ];

  const tableData = [
    { id: 1, name: 'Trafo 1', equipmentType: 'Main Trafo', testCount: 15 },
    { id: 2, name: 'Arrester 1', equipmentType: 'Arrester', testCount: 4 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Executive Summary</h1>
        <div className="flex gap-4">
          <select className="border p-2 rounded text-sm"><option>2024</option></select>
          <select className="border p-2 rounded text-sm"><option>All UBP</option></select>
          <select className="border p-2 rounded text-sm"><option>All Equipment</option></select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Total Asset</div>
          <div className="text-2xl font-bold">{kpiData.total}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-500">Good</div>
          <div className="text-2xl font-bold">{kpiData.good}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
          <div className="text-sm text-gray-500">Fair / Poor</div>
          <div className="text-2xl font-bold">{kpiData.fairPoor}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
          <div className="text-sm text-gray-500">Bad</div>
          <div className="text-2xl font-bold">{kpiData.bad}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Judgement Matrix (10 rows/page)</h2>
          <JudgementMatrixTable data={tableData} />
          {/* Pagination component goes here */}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Rekap Damage Mechanism</h2>
          <div className="bg-white p-4 rounded shadow">
            <DamageMechanismChart data={chartData} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded"></div> Dielectric</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Thermal</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded"></div> Mechanical</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded"></div> Moisture</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
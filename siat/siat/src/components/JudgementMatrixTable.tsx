import { StatusBadge } from '@/components/StatusBadge';

export function JudgementMatrixTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left">Asset</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-center">Tests</th>
            <th className="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map(asset => (
            <tr key={asset.id} className="border-b">
              <td className="px-4 py-2">{asset.name}</td>
              <td className="px-4 py-2">{asset.equipmentType}</td>
              <td className="px-4 py-2 text-center">{asset.testCount}</td>
              <td className="px-4 py-2 text-center">
                <a href={`/unit/${asset.id}`} className="text-blue-600 hover:underline">Detail</a>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No data found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
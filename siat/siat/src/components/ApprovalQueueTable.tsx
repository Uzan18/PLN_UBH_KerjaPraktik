export function ApprovalQueueTable({ sessions, onReview }: { sessions: any[], onReview: (id: string) => void }) {
  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left">Year</th>
            <th className="px-4 py-2 text-left">Asset</th>
            <th className="px-4 py-2 text-left">Test Type</th>
            <th className="px-4 py-2 text-left">Created By</th>
            <th className="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} className="border-b">
              <td className="px-4 py-2">{s.testYear}</td>
              <td className="px-4 py-2">{s.asset?.name}</td>
              <td className="px-4 py-2">{s.testType?.name}</td>
              <td className="px-4 py-2">{s.createdBy?.name}</td>
              <td className="px-4 py-2 text-center">
                <button 
                  onClick={() => onReview(s.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-gray-500">No sessions waiting for validation.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
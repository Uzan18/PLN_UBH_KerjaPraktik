export function StatusBadge({ judgement }: { judgement: 'GOOD'|'FAIR'|'POOR'|'BAD'|'NA'|'NO_DATA' }) {
  const colors = {
    GOOD: 'bg-green-500 text-white',     // #22C55E
    FAIR: 'bg-yellow-500 text-white',    // #EAB308
    POOR: 'bg-orange-500 text-white',    // #F97316
    BAD: 'bg-red-500 text-white',        // #EF4444
    NA: 'bg-gray-400 text-white',
    NO_DATA: 'bg-gray-400 text-white',   // #9CA3AF — WAJIB BEDA dari GOOD
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[judgement]}`}>{judgement}</span>;
}
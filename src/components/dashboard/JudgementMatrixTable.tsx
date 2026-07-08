'use client';

import type { MatrixRow } from '@/types';
import { StatusBadge } from './StatusBadge';

interface JudgementMatrixTableProps {
  rows: MatrixRow[];
  testTypeHeaders: string[];
  totalUnits: number;
  currentPage: number;
  onRowClick?: (assetId: string) => void;
  onExport?: () => void;
}

export function JudgementMatrixTable({
  rows,
  testTypeHeaders,
  totalUnits,
  currentPage,
  onRowClick,
  onExport,
}: JudgementMatrixTableProps) {
  return (
    <section className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-white">
        <div>
          <h3 className="text-[20px] leading-[28px] font-semibold text-[#111c2d] font-[Hanken_Grotesk]">
            Kondisi Trafo per Unit x Jenis Pengujian
          </h3>
          <p className="text-[14px] text-[#434652] mt-0.5">
            Ringkasan status pengujian transformer terbaru per unit pembangkit.
          </p>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="bg-white border border-[#00286a] text-[#00286a] px-4 py-2 rounded-md font-bold text-[14px] flex items-center gap-2 hover:bg-[#f0f3ff] transition-colors active:opacity-80"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f3ff]">
              <th className="px-6 py-4 font-mono text-[12px] tracking-[0.05em] font-medium text-[#434652] uppercase sticky left-0 bg-[#f0f3ff] z-10 border-r border-[#E2E8F0]">
                Unit Pembangkit
              </th>
              {testTypeHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 font-mono text-[12px] tracking-[0.05em] font-medium text-[#434652] uppercase text-center"
                >
                  {header}
                </th>
              ))}
              <th className="px-6 py-4 font-mono text-[12px] tracking-[0.05em] font-medium text-[#434652] uppercase text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row, idx) => (
              <tr
                key={row.assetId}
                className={`hover:bg-[#f0f3ff] transition-colors group cursor-pointer ${
                  idx % 2 === 1 ? 'bg-[#F8FAFC]' : ''
                }`}
                onClick={() => onRowClick?.(row.assetId)}
              >
                <td
                  className={`px-6 py-4 text-[13px] font-bold sticky left-0 z-10 border-r border-[#E2E8F0] ${
                    idx % 2 === 1
                      ? 'bg-[#F8FAFC] group-hover:bg-[#f0f3ff]'
                      : 'bg-white group-hover:bg-[#f0f3ff]'
                  }`}
                >
                  {row.assetName}
                </td>
                {testTypeHeaders.map((header) => {
                  const cell = row.cells.find((c) => c.testTypeName === header);
                  return (
                    <td key={header} className="px-6 py-4 text-center">
                      {cell ? (
                        <StatusBadge judgement={cell.judgement} size="sm" />
                      ) : (
                        <span className="text-[#94A3B8] text-[11px]">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-6 py-4 text-center">
                  <span className="material-symbols-outlined text-[#434652] group-hover:text-[#00286a]">
                    chevron_right
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#E2E8F0] flex justify-between items-center bg-[#f0f3ff]">
        <span className="font-mono text-[12px] text-[#434652]">
          Showing {rows.length} of {totalUnits} Units
        </span>
        <div className="flex gap-2">
          <button
            className="p-1 rounded hover:bg-[#e7eeff] transition-colors disabled:opacity-50"
            disabled={currentPage <= 1}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="p-1 rounded hover:bg-[#e7eeff] transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
}

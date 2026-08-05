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
    <section className="bg-white rounded-lg border border-surface-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-white">
        <div>
          <h3 className="text-xl font-semibold text-on-surface">
            Kondisi Asset per Unit x Jenis Pengujian
          </h3>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Ringkasan status pengujian asset terbaru per unit pembangkit.
          </p>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="border border-primary text-primary hover:bg-primary-container/10 p-2 rounded-lg font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer"
            title="Export Excel"
          >
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-surface-container-low h-14">
              <th className="px-4 py-1.5 h-14 font-mono text-xs leading-tight tracking-wider font-medium text-on-surface-variant uppercase sticky left-0 bg-surface-container-low z-20 border-r border-b border-surface-border min-w-[200px] max-w-[200px] w-[200px] align-middle box-border">
                Unit Pembangkit
              </th>
              <th
                style={{ left: '200px' }}
                className="px-4 py-1.5 h-14 font-mono text-xs leading-tight tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[150px] max-w-[150px] w-[150px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border align-middle box-border"
              >
                Nama Asset
              </th>
              <th
                style={{ left: '350px' }}
                className="px-4 py-1.5 h-14 font-mono text-xs leading-tight tracking-wider font-medium text-on-surface-variant uppercase text-center min-w-[80px] max-w-[80px] w-[80px] sticky bg-surface-container-low z-20 border-r border-b border-surface-border align-middle box-border"
              >
                Tahun Uji
              </th>
              {testTypeHeaders.map((header) => (
                <th
                  key={header}
                  title={header}
                  className="px-2 py-1.5 h-14 font-mono text-[10px] leading-[1.15] tracking-tight font-bold text-on-surface-variant uppercase text-center min-w-[120px] max-w-[160px] whitespace-normal break-words cursor-help hover:text-primary transition-colors border-r border-b border-surface-border align-middle box-border"
                >
                  {header}
                </th>
              ))}
              <th className="px-2 py-1.5 h-14 font-mono text-xs leading-tight tracking-wider font-medium text-on-surface-variant uppercase text-center w-[60px] border-b border-surface-border align-middle box-border">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.sessionId || row.assetId}
                onClick={() => onRowClick?.(row.assetId)}
                className={`h-12 hover:bg-surface-container-low transition-colors group cursor-pointer ${
                  idx % 2 === 1 ? 'bg-surface-background' : ''
                }`}
              >
                <td
                  className={`px-4 py-1 h-12 text-[12px] font-bold sticky left-0 z-10 border-r border-b border-surface-border min-w-[200px] max-w-[200px] w-[200px] align-middle box-border ${
                    idx % 2 === 1
                      ? 'bg-surface-background group-hover:bg-surface-container-low'
                      : 'bg-white group-hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex flex-col justify-center leading-tight">
                    <span className="truncate max-w-[160px] block text-[12px] font-bold text-on-surface" title={row.unitName}>
                      {row.unitName}
                    </span>
                    <span className="truncate max-w-[160px] block text-[9px] font-mono text-on-surface-variant font-normal uppercase mt-0.5" title={row.ubpName || '—'}>
                      {row.ubpName || '—'}
                    </span>
                  </div>
                </td>
                <td
                  style={{ left: '200px' }}
                  className={`px-4 py-1 h-12 text-center text-[12px] text-on-surface border-r border-b border-surface-border font-medium sticky z-10 min-w-[150px] max-w-[150px] w-[150px] truncate align-middle box-border ${
                    idx % 2 === 1
                      ? 'bg-surface-background group-hover:bg-surface-container-low'
                      : 'bg-white group-hover:bg-surface-container-low'
                  }`}
                >
                  {row.assetName || '—'}
                </td>
                <td
                  style={{ left: '350px' }}
                  className={`px-4 py-1 h-12 text-center text-[12px] text-on-surface-variant border-r border-b border-surface-border font-mono sticky z-10 min-w-[80px] max-w-[80px] w-[80px] align-middle box-border ${
                    idx % 2 === 1
                      ? 'bg-surface-background group-hover:bg-surface-container-low'
                      : 'bg-white group-hover:bg-surface-container-low'
                  }`}
                >
                  {row.testYear || '—'}
                </td>
                {testTypeHeaders.map((header) => {
                  const cell = row.cells.find((c) => c.testTypeName === header);
                  return (
                    <td key={header} className="px-1 py-1 h-12 text-center border-r border-b border-surface-border min-w-[120px] max-w-[160px] align-middle box-border">
                      <StatusBadge judgement={cell?.judgement || 'NA'} size="sm" iconOnly />
                    </td>
                  );
                })}
                <td className="px-2 py-1 h-12 text-center border-b border-surface-border align-middle box-border">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-sm">
                    chevron_right
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-surface-border flex justify-between items-center bg-surface-container-low">
        <span className="font-mono text-xs text-on-surface-variant">
          Showing {rows.length} of {totalUnits} Units
        </span>
        <div className="flex gap-2">
          <button
            className="p-1 rounded hover:bg-surface-container transition-colors disabled:opacity-50"
            disabled={currentPage <= 1}
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button className="p-1 rounded hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
}

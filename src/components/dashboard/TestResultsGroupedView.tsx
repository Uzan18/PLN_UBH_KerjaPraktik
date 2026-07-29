'use client';

import React, { useState, useMemo } from 'react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { JUDGEMENT_SEVERITY, JudgementLabel } from '@/types';

interface TestResultsGroupedViewProps {
  details: any[] | undefined | null;
  isLoading?: boolean;
  borderless?: boolean;
}

export function TestResultsGroupedView({ details, isLoading = false, borderless = false }: TestResultsGroupedViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 1. Calculate overall metrics
  const metrics = useMemo(() => {
    if (!details || details.length === 0) {
      return { total: 0, good: 0, fair: 0, poor: 0, bad: 0, na: 0, issuesTotal: 0 };
    }

    let good = 0;
    let fair = 0;
    let poor = 0;
    let bad = 0;
    let na = 0;

    details.forEach((item) => {
      const j = (item.judgement || 'NA').toUpperCase() as JudgementLabel;
      if (j === 'GOOD') good++;
      else if (j === 'FAIR') fair++;
      else if (j === 'POOR') poor++;
      else if (j === 'BAD') bad++;
      else na++;
    });

    return {
      total: details.length,
      good,
      fair,
      poor,
      bad,
      na,
      issuesTotal: fair + poor + bad,
    };
  }, [details]);

  // 2. Group parameters dynamically by Test Type
  const groupedData = useMemo(() => {
    if (!details || details.length === 0) return [];

    const map: Record<string, any[]> = {};

    details.forEach((item) => {
      const testTypeName = (item.parameter?.testType?.name || 'PENGUKURAN LAIN').trim();
      if (!map[testTypeName]) {
        map[testTypeName] = [];
      }
      map[testTypeName].push(item);
    });

    // Convert map to array of group objects
    const groups = Object.keys(map).map((testTypeName) => {
      const items = map[testTypeName];
      const testTypeOrderIndex = items[0]?.parameter?.testType?.orderIndex ?? 999;

      // Sort items inside group by orderIndex or parameter name
      items.sort((a, b) => {
        const orderA = a.parameter?.orderIndex ?? 999;
        const orderB = b.parameter?.orderIndex ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.parameter?.name || '').localeCompare(b.parameter?.name || '');
      });

      // Compute worst judgement severity for this group
      let worstJudgement: JudgementLabel = 'GOOD';
      let maxSeverity = 0;

      items.forEach((it) => {
        const j = (it.judgement || 'NA').toUpperCase() as JudgementLabel;
        const sev = JUDGEMENT_SEVERITY[j] ?? 0;
        if (sev > maxSeverity) {
          maxSeverity = sev;
          worstJudgement = j;
        }
      });

      const issueCount = items.filter((it) => {
        const j = (it.judgement || '').toUpperCase();
        return j === 'FAIR' || j === 'POOR' || j === 'BAD';
      }).length;

      return {
        testTypeName,
        testTypeOrderIndex,
        items,
        worstJudgement,
        issueCount,
      };
    });

    // Sort groups dynamically according to database orderIndex first, then alphabetically
    groups.sort((a, b) => {
      if (a.testTypeOrderIndex !== b.testTypeOrderIndex) {
        return a.testTypeOrderIndex - b.testTypeOrderIndex;
      }
      return a.testTypeName.localeCompare(b.testTypeName);
    });

    return groups;
  }, [details]);

  // 3. Filter groups based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groupedData.map((g) => ({ ...g, filteredItems: g.items }));

    return groupedData
      .map((group) => {
        const matchesGroupName = group.testTypeName.toLowerCase().includes(q);

        const matchingItems = group.items.filter((item) => {
          const paramName = (item.parameter?.name || '').toLowerCase();
          const valStr = String(item.displayValue || item.value || '').toLowerCase();
          return matchesGroupName || paramName.includes(q) || valStr.includes(q);
        });

        return {
          ...group,
          filteredItems: matchingItems,
        };
      })
      .filter((group) => group.filteredItems.length > 0);
  }, [groupedData, searchQuery]);

  const toggleGroup = (testTypeName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [testTypeName]: !prev[testTypeName],
    }));
  };



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-on-surface-variant font-medium">Memuat data hasil pengujian...</span>
      </div>
    );
  }

  if (!details || details.length === 0) {
    return (
      <div className={borderless ? "p-8 text-center bg-surface-container-low/20" : "p-8 text-center bg-surface-container-low/30 rounded-xl border border-surface-border"}>
        <span className="material-symbols-outlined text-outline text-3xl mb-1">inventory_2</span>
        <p className="text-xs font-semibold text-on-surface-variant">Tidak ada hasil parameter pengujian ditemukan.</p>
      </div>
    );
  }

  return (
    <div className={borderless ? "bg-white overflow-hidden" : "bg-white border border-surface-border rounded-xl shadow-xs overflow-hidden"}>
      {/* Integrated Header: Title + KPI Metrics + Search Input (Sticky Top Solid Shield) */}
      <div className="p-4 bg-white border-b border-surface-border space-y-3 sticky top-0 z-20 shadow-sm">
        {/* Title & KPI Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-on-surface text-xs sm:text-sm font-sans">Hasil Pengukuran Parameter</h4>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-primary/10 rounded font-mono font-bold text-primary">
              {metrics.total} Parameter
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            {metrics.good > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Good: {metrics.good}</span>
              </div>
            )}
            {metrics.fair > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Fair: {metrics.fair}</span>
              </div>
            )}
            {metrics.poor > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Poor: {metrics.poor}</span>
              </div>
            )}
            {metrics.bad > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Bad: {metrics.bad}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-sm select-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jenis pengujian, parameter, nilai..."
            className="w-full bg-white border border-surface-border rounded-lg text-xs py-1.5 pl-8 pr-7 focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline/70 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-sm select-none">cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Unified Accordion Groups List (1 Single High-Performance Table for 60fps Locked Scroll Sync) */}
      {filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-white space-y-1">
          <span className="material-symbols-outlined text-outline text-2xl select-none">search_off</span>
          <p className="text-xs font-bold text-on-surface">Tidak ada parameter yang cocok.</p>
          <p className="text-[11px] text-on-surface-variant">
            Coba ubah kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <tbody className="divide-y divide-surface-border">
              {filteredGroups.map((group) => {
                const isCollapsed = !!collapsedGroups[group.testTypeName];

                return (
                  <React.Fragment key={group.testTypeName}>
                    {/* Group Header Row */}
                    <tr
                      onClick={() => toggleGroup(group.testTypeName)}
                      className="bg-surface-container-low/40 hover:bg-surface-container-low/70 cursor-pointer select-none border-t border-b border-surface-border"
                    >
                      <td colSpan={3} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <h5 className="font-bold text-xs text-on-surface font-sans">
                              {group.testTypeName}
                            </h5>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-surface-border text-on-surface-variant font-mono shrink-0">
                              {group.filteredItems.length} Parameter
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-outline font-medium hidden sm:inline">Status:</span>
                              <StatusBadge judgement={group.worstJudgement} size="sm" showIcon={true} />
                            </div>

                            <span
                              className={`material-symbols-outlined text-outline transition-transform duration-200 text-lg select-none ${
                                isCollapsed ? '-rotate-90' : ''
                              }`}
                            >
                              expand_more
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Table Sub-Header + Parameter Data Rows (Only when not collapsed) */}
                    {!isCollapsed && (
                      <>
                        <tr className="bg-surface-container-low/20 font-mono text-[9px] uppercase font-bold text-outline border-b border-surface-border">
                          <th className="px-4 py-1.5 w-[45%] font-bold">Parameter</th>
                          <th className="px-4 py-1.5 w-[35%] font-bold">Nilai Pengukuran</th>
                          <th className="px-4 py-1.5 text-center w-[20%] font-bold">Status</th>
                        </tr>
                        {group.filteredItems.map((r: any) => (
                          <tr key={r.id} className="bg-white hover:bg-surface-container-low/10">
                            <td className="px-4 py-2.5 font-semibold text-on-surface">
                              {r.parameter?.name || '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-on-surface">
                              {r.displayValue ? (
                                <span className="font-medium text-on-surface">{r.displayValue}</span>
                              ) : r.isNotApplicable ? (
                                <span className="text-outline/40 italic">N/A</span>
                              ) : r.value !== null && r.value !== undefined ? (
                                <span className="font-semibold">{r.value}</span>
                              ) : (
                                <span className="text-outline/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <StatusBadge judgement={r.judgement} size="sm" showIcon={false} />
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

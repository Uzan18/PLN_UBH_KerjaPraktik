'use client';

import { useState, useMemo, useEffect } from 'react';
import type { JudgementLabel } from '@/types';
import { FilterSelect } from '@/components/dashboard/FilterSelect';

interface ParameterTrendCardProps {
  testTypeStatuses?: Array<{
    testTypeId: string;
    testTypeName: string;
    parameters: Array<{
      parameterId: string;
      parameterName: string;
      unit?: string | null;
    }>;
  }>;
  allSessions?: Array<{
    id: string;
    testYear: number;
    testEvent?: string | null;
    createdAt?: string;
    testResults?: Array<{
      parameterId: string;
      value?: number | null;
      displayValue?: string | null;
      isNotApplicable?: boolean;
      judgement?: string | null;
      parameter?: {
        id?: string;
        name?: string;
        unit?: string | null;
        testTypeId?: string;
      };
    }>;
  }>;
}

export function ParameterTrendCard({
  testTypeStatuses = [],
  allSessions = [],
}: ParameterTrendCardProps) {
  // 1. Selectable Test Types list
  const availableTestTypes = useMemo(() => {
    return testTypeStatuses.filter((tt) => tt.parameters && tt.parameters.length > 0);
  }, [testTypeStatuses]);

  const [selectedTestTypeId, setSelectedTestTypeId] = useState<string>('');
  const [selectedParamId, setSelectedParamId] = useState<string>('');

  // Default selection on mount / when availableTestTypes changes
  useEffect(() => {
    if (availableTestTypes.length > 0) {
      if (!selectedTestTypeId || !availableTestTypes.some((tt) => tt.testTypeId === selectedTestTypeId)) {
        const firstTt = availableTestTypes[0];
        setSelectedTestTypeId(firstTt.testTypeId);
        if (firstTt.parameters.length > 0) {
          setSelectedParamId(firstTt.parameters[0].parameterId);
        }
      }
    }
  }, [availableTestTypes, selectedTestTypeId]);

  // Selected Test Type object
  const currentTestTypeObj = useMemo(() => {
    return availableTestTypes.find((tt) => tt.testTypeId === selectedTestTypeId);
  }, [availableTestTypes, selectedTestTypeId]);

  // Parameters under selected Test Type
  const availableParameters = useMemo(() => {
    return currentTestTypeObj?.parameters || [];
  }, [currentTestTypeObj]);

  // Sync selected parameter when test type changes
  useEffect(() => {
    if (availableParameters.length > 0) {
      if (!selectedParamId || !availableParameters.some((p) => p.parameterId === selectedParamId)) {
        setSelectedParamId(availableParameters[0].parameterId);
      }
    } else {
      setSelectedParamId('');
    }
  }, [availableParameters, selectedParamId]);

  // Selected parameter object
  const currentParamObj = useMemo(() => {
    return availableParameters.find((p) => p.parameterId === selectedParamId);
  }, [availableParameters, selectedParamId]);

  // Options for FilterSelect
  const testTypeOptions = useMemo(() => {
    return availableTestTypes.map((tt) => ({
      value: tt.testTypeId,
      label: tt.testTypeName,
    }));
  }, [availableTestTypes]);

  const paramOptions = useMemo(() => {
    return availableParameters.map((p) => ({
      value: p.parameterId,
      label: `${p.parameterName}${p.unit ? ` (${p.unit})` : ''}`,
    }));
  }, [availableParameters]);

  // Process historical data across all sessions for this parameter
  const trendHistory = useMemo(() => {
    if (!selectedParamId || !allSessions || allSessions.length === 0) return [];

    // Sort sessions chronologically (oldest first for trend line/bar left-to-right)
    const sortedSessions = [...allSessions].sort((a, b) => {
      if (a.testYear !== b.testYear) return a.testYear - b.testYear;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    const historyData: Array<{
      sessionId: string;
      testYear: number;
      label: string;
      displayValue: string;
      judgement: JudgementLabel;
      isNotApplicable: boolean;
    }> = [];

    for (const sess of sortedSessions) {
      const results = sess.testResults || [];
      const match = results.find(
        (r) =>
          r.parameterId === selectedParamId ||
          (r.parameter?.name && currentParamObj?.parameterName && r.parameter.name.toLowerCase() === currentParamObj.parameterName.toLowerCase())
      );

      if (match) {
        const isNA = Boolean(match.isNotApplicable);
        let valStr = '-';

        if (isNA) {
          valStr = 'N/A';
        } else if (match.displayValue) {
          valStr = match.displayValue;
        } else if (match.value !== null && match.value !== undefined) {
          valStr = String(match.value);
        }

        const sessionLabel =
          sess.testEvent && sess.testEvent !== 'default'
            ? `${sess.testYear} (${sess.testEvent})`
            : `Tahun ${sess.testYear}`;

        historyData.push({
          sessionId: sess.id,
          testYear: sess.testYear,
          label: sessionLabel,
          displayValue: valStr,
          judgement: (match.judgement as JudgementLabel) || 'NA',
          isNotApplicable: isNA,
        });
      }
    }

    return historyData;
  }, [selectedParamId, allSessions, currentParamObj]);

  return (
    <div className="bg-white p-5 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between h-full space-y-4">
      {/* Header & Controls */}
      <div className="space-y-3 min-h-[92px] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-on-surface text-sm">
            Tren Pengujian Per Parameter
          </h4>
          {currentParamObj?.unit && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
              Satuan: {currentParamObj.unit}
            </span>
          )}
        </div>

        {/* 2 Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Filter 1: Pengujian */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
              Jenis Pengujian
            </label>
            <FilterSelect
              value={selectedTestTypeId}
              onChange={setSelectedTestTypeId}
              options={testTypeOptions}
              placeholder="Pilih Jenis Pengujian..."
              showPlaceholderOption={false}
            />
          </div>

          {/* Filter 2: Parameter */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
              Parameter
            </label>
            <FilterSelect
              value={selectedParamId}
              onChange={setSelectedParamId}
              options={paramOptions}
              placeholder="Pilih Parameter..."
              disabled={availableParameters.length === 0}
              showPlaceholderOption={false}
            />
          </div>
        </div>
      </div>

      {/* Chart / Trend Visualization */}
      {trendHistory.length === 0 ? (
        <div className="h-36 flex items-center justify-center border-b border-surface-border text-center mt-2">
          <span className="text-on-surface-variant font-medium text-xs">
            Belum ada riwayat hasil pengujian untuk parameter ini.
          </span>
        </div>
      ) : (
        <div className="h-44 relative pt-12 pb-4 border-b border-surface-border mt-2 overflow-x-auto custom-scrollbar">
          {/* Background Grid Lines */}
          <div className="absolute inset-x-0 top-12 bottom-4 flex flex-col justify-between pointer-events-none">
            <div className="w-full border-t border-surface-border/30" />
            <div className="w-full border-t border-surface-border/30" />
            <div className="w-full border-t border-surface-border/30" />
          </div>

          <div className="flex items-end justify-around h-full min-w-full gap-2 px-1">
            {trendHistory.map((item, idx) => {
              // Determine bar height based on status / condition score
              let heightPct = 15;
              let barColor = 'bg-slate-300';
              if (item.judgement === 'GOOD') {
                heightPct = 90;
                barColor = 'bg-status-good';
              } else if (item.judgement === 'FAIR') {
                heightPct = 65;
                barColor = 'bg-status-fair';
              } else if (item.judgement === 'POOR') {
                heightPct = 40;
                barColor = 'bg-status-poor';
              } else if (item.judgement === 'BAD') {
                heightPct = 25;
                barColor = 'bg-status-bad';
              }

              return (
                <div
                  key={item.sessionId || idx}
                  className="flex flex-col items-center gap-1 z-10 shrink-0 flex-1 min-w-[50px] max-w-[80px]"
                >
                  {/* Top Value Label */}
                  <span className="text-[10px] font-bold text-on-surface font-mono truncate max-w-full" title={item.displayValue}>
                    {item.displayValue}
                  </span>

                  {/* Bar Indicator */}
                  <div className="flex items-end justify-center h-16 w-full">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-3.5 sm:w-4 ${barColor} rounded-t-xs transition-all duration-500 relative group/bar cursor-pointer`}
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bar:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded shadow-lg z-30 whitespace-nowrap">
                        <span className="font-bold">{item.label}</span>
                        <span>Hasil: {item.displayValue} {currentParamObj?.unit || ''}</span>
                        <span>Status: {item.judgement}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Session / Year Label */}
                  <span
                    className="font-mono text-[9px] font-semibold text-on-surface-variant max-w-full truncate text-center cursor-help mt-0.5"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parameter Trend Summary Note */}
      <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium min-h-[20px]">
        <span>Menampilkan {trendHistory.length} titik pengukuran</span>
        <span className="text-outline">*Berdasarkan riwayat pengujian terverifikasi</span>
      </div>
    </div>
  );
}

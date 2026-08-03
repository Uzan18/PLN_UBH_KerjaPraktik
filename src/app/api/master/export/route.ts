import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { Criteria } from '@/entities/Criteria';
import { JenisAsset } from '@/entities/JenisAsset';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import { mapQualitativeValueToNumber } from '@/lib/scoring/calculateScore';
import type { JudgementLabel } from '@/types';
// @ts-ignore
import XLSXStyle from 'xlsx-js-style';

// ─── Style helpers ───────────────────────────────────────────────────────────

/** Cell style: Title banner — dark navy background, white bold text */
const S_TITLE = {
  font: { name: 'Calibri', bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: '1B3A6B' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'medium', color: { rgb: '000000' } }, bottom: { style: 'medium', color: { rgb: '000000' } }, left: { style: 'medium', color: { rgb: '000000' } }, right: { style: 'medium', color: { rgb: '000000' } } },
};

/** Cell style: Static info header (No, Tahun Uji, UBP …) — medium blue */
const S_META_HDR = {
  font: { name: 'Calibri', bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: '2E5CA6' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } },
};

/** Cell style: Test-type group header — sky-blue background */
const S_TT_HDR = {
  font: { name: 'Calibri', bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: '1E78BB' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } },
};

/** Cell style: Parameter name sub-header — light blue */
const S_PARAM_HDR = {
  font: { name: 'Calibri', bold: true, sz: 9, color: { rgb: '0D2B5A' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'D0E4F7' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } },
};

/** Cell style: Unit (satuan) row — very light blue */
const S_UNIT_HDR = {
  font: { name: 'Calibri', italic: true, sz: 8, color: { rgb: '4A5568' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'EBF4FB' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'medium', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } },
};

/** Cell style: Data row even */
const S_DATA_EVEN = {
  font: { name: 'Calibri', sz: 9, color: { rgb: '1A1A1A' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
  border: { top: { style: 'thin', color: { rgb: 'DDDDDD' } }, bottom: { style: 'thin', color: { rgb: 'DDDDDD' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } },
};

/** Cell style: Data row odd — subtle stripe */
const S_DATA_ODD = {
  font: { name: 'Calibri', sz: 9, color: { rgb: '1A1A1A' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'F2F8FF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
  border: { top: { style: 'thin', color: { rgb: 'DDDDDD' } }, bottom: { style: 'thin', color: { rgb: 'DDDDDD' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } },
};

/** Data style left-aligned (for text cells like UBP name, asset name) */
const S_DATA_LEFT = (isOdd: boolean) => ({
  ...( isOdd ? S_DATA_ODD : S_DATA_EVEN ),
  alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
});

/** Judgement-coloured cell style */
function S_JUDGEMENT(judge: string | null, isOdd: boolean) {
  const base = isOdd ? S_DATA_ODD : S_DATA_EVEN;
  let rgb = isOdd ? 'F2F8FF' : 'FFFFFF';
  let fgRgb = '1A1A1A';
  switch ((judge || '').toUpperCase()) {
    case 'GOOD':  rgb = 'E6F4EA'; fgRgb = '1B5E20'; break;
    case 'FAIR':  rgb = 'FFF8E1'; fgRgb = 'E65100'; break;
    case 'POOR':  rgb = 'FFF3E0'; fgRgb = 'BF360C'; break;
    case 'BAD':   rgb = 'FFEBEE'; fgRgb = 'B71C1C'; break;
  }
  return {
    ...base,
    font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: fgRgb } },
    fill: { patternType: 'solid', fgColor: { rgb } },
  };
}

/** Helper: create styled cell */
function sc(v: any, s: any) {
  return { v: v === undefined || v === null ? '' : v, t: typeof v === 'number' ? 'n' : 's', s };
}

/** Helper: sanitize sheet name to obey Excel 31-char limit and remove invalid characters */
function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  let clean = name.replace(/[\\/?*:[\]]/g, '_').trim();
  if (clean.length > 28) clean = clean.slice(0, 28);
  if (!clean) clean = 'Peralatan';
  let finalName = clean;
  let counter = 1;
  while (usedNames.has(finalName.toLowerCase())) {
    finalName = `${clean.slice(0, 25)}_${counter++}`;
  }
  usedNames.add(finalName.toLowerCase());
  return finalName;
}

/** Helper: resolve display value for a result (handles dropdown labels) */
function resolveDisplayValue(
  result: { isNotApplicable: boolean; value: any } | undefined,
  paramId: string,
  criteriaMap: Map<string, Criteria | null>
): { val: string | number; isQual: boolean } {
  if (!result) return { val: '', isQual: false };
  if (result.isNotApplicable) return { val: 'N/A', isQual: true };
  if (result.value === null || result.value === undefined) return { val: '', isQual: false };

  const valNum = Number(result.value);
  const crit = criteriaMap.get(paramId) ?? null;
  let resolvedLabel: string | null = null;

  if (crit) {
    const opts = [
      { text: crit.goodValue, defaultIdx: 0 },
      { text: crit.fairValue, defaultIdx: 1 },
      { text: crit.poorValue, defaultIdx: 2 },
      { text: crit.badValue, defaultIdx: 3 },
    ];
    for (const opt of opts) {
      if (!opt.text) continue;
      const mapped = mapQualitativeValueToNumber(opt.text);
      if (mapped !== null && mapped === valNum) { resolvedLabel = opt.text; break; }
      if (mapped === null && valNum === opt.defaultIdx) { resolvedLabel = opt.text; break; }
    }
  }

  const isQual = resolvedLabel !== null;
  return { val: resolvedLabel !== null ? resolvedLabel : valNum, isQual };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'export:read');

    const { searchParams } = new URL(request.url);
    const sessionIdParam = searchParams.get('sessionId');
    const ubpId = searchParams.get('ubpId');
    const unitName = searchParams.get('unitName');
    const unitId = searchParams.get('unitId');
    const assetId = searchParams.get('assetId');
    const overallJudgement = searchParams.get('overallJudgement');
    const equipmentType = searchParams.get('equipmentType');
    const jenisAssetId = searchParams.get('jenisAssetId');
    const testYear = searchParams.get('testYear') || searchParams.get('year');

    const db = await getDb();
    const sessionRepo = db.getRepository(TestSession);
    const testTypeRepo = db.getRepository(TestType);
    const criteriaRepo = db.getRepository(Criteria);

    // ── 1. Fetch Sessions ─────────────────────────────────────────────────
    const queryBuilder = sessionRepo
      .createQueryBuilder('ts')
      .innerJoinAndSelect('ts.asset', 'asset')
      .innerJoinAndSelect('asset.unitPembangkit', 'up')
      .innerJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
      .leftJoinAndSelect('asset.testTypes', 'att')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'p')
      .leftJoinAndSelect('p.testType', 'tt');

    if (sessionIdParam && sessionIdParam !== 'ALL' && sessionIdParam !== '') {
      queryBuilder.andWhere('ts.id = :sessionIdParam', { sessionIdParam });
    } else {
      queryBuilder.andWhere('ts.status = :validatedStatus', { validatedStatus: 'VALIDATED' });
    }

    if (ubpId && ubpId !== 'ALL' && ubpId !== '')
      queryBuilder.andWhere('ubp.id = :ubpId', { ubpId });
    if (unitId && unitId !== 'ALL' && unitId !== '')
      queryBuilder.andWhere('up.id = :unitId', { unitId });
    if (unitName && unitName !== 'ALL' && unitName !== '')
      queryBuilder.andWhere('up.name = :unitName', { unitName });
    if (assetId && assetId !== 'ALL' && assetId !== '')
      queryBuilder.andWhere('asset.id = :assetId', { assetId });
    if (equipmentType && equipmentType !== 'ALL' && equipmentType !== '') {
      queryBuilder.andWhere(
        '(ja.name = :equipmentType OR ja.id = :equipmentType OR asset.jenis_asset_id = :equipmentType)',
        { equipmentType: equipmentType.trim() }
      );
    }
    if (jenisAssetId && jenisAssetId !== 'ALL' && jenisAssetId !== '') {
      queryBuilder.andWhere(
        '(ja.id = :jenisAssetId OR ja.name = :jenisAssetIdName OR asset.jenis_asset_id = :jenisAssetId)',
        { jenisAssetId, jenisAssetIdName: jenisAssetId.trim() }
      );
    }
    if (testYear && testYear !== 'ALL' && testYear !== '')
      queryBuilder.andWhere('ts.testYear = :testYear', { testYear: Number(testYear) });

    queryBuilder
      .orderBy('ts.testYear', 'DESC')
      .addOrderBy('ts.updatedAt', 'DESC')
      .addOrderBy('ubp.name', 'ASC')
      .addOrderBy('up.name', 'ASC')
      .addOrderBy('asset.name', 'ASC');

    const allSessions = await queryBuilder.getMany();

    let filteredSessions = allSessions;
    if (overallJudgement && overallJudgement !== 'ALL' && overallJudgement !== '') {
      filteredSessions = allSessions.filter((s) => {
        const js = s.testResults.map((r) => r.judgement as JudgementLabel);
        return aggregateAssetStatus(js) === overallJudgement;
      });
    }

    // Deduplicate sessions per asset + year + event
    const uniqueSessionMap = new Map<string, TestSession>();
    for (const s of filteredSessions) {
      const key = `${s.assetId}_${s.testYear}_${s.testEvent || 'default'}`;
      if (!uniqueSessionMap.has(key)) {
        uniqueSessionMap.set(key, s);
      }
    }
    filteredSessions = Array.from(uniqueSessionMap.values());

    // ── 2. Fetch all Test Types & Pre-fetch Criteria ─────────────────────
    const allTestTypes = await testTypeRepo.find({
      relations: ['parameters', 'jenisAsset', 'assets'],
      order: {
        orderIndex: 'ASC',
        parameters: { orderIndex: 'ASC' },
      },
    });

    const now = new Date();
    const criteriaMap = new Map<string, Criteria | null>();
    const allParamIds = Array.from(
      new Set(allTestTypes.flatMap((tt) => (tt.parameters || []).map((p) => p.id)))
    );
    for (const pid of allParamIds) {
      const crit = await criteriaRepo.createQueryBuilder('c')
        .where('c.parameter_id = :parameterId', { parameterId: pid })
        .andWhere('c.effective_from <= :now', { now })
        .andWhere('(c.effective_to IS NULL OR c.effective_to >= :now2)', { now2: now })
        .orderBy('c.effective_from', 'DESC')
        .getOne();
      criteriaMap.set(pid, crit ?? null);
    }

    // ── 3. Group Sessions by Jenis Asset Name (Each Equipment Type Gets Its Own Sheet) ──
    const sessionsByJenisMap = new Map<string, { id: string; name: string; sessions: TestSession[] }>();

    for (const s of filteredSessions) {
      const nameRaw = s.asset?.jenisAsset?.name || s.asset?.type || 'Peralatan';
      const jName = nameRaw.trim();
      const jKey = jName.toLowerCase();
      const jId = s.asset?.jenisAsset?.id || s.asset?.jenisAssetId || jKey;

      if (!sessionsByJenisMap.has(jKey)) {
        sessionsByJenisMap.set(jKey, { id: jId, name: jName, sessions: [] });
      }
      sessionsByJenisMap.get(jKey)!.sessions.push(s);
    }

    // Fallback if no sessions found
    if (sessionsByJenisMap.size === 0) {
      sessionsByJenisMap.set('empty', { id: 'EMPTY', name: 'Database Assessment', sessions: [] });
    }

    // ── 4. Create Workbook & Build Worksheets per Jenis Asset ────────────
    const wb = XLSXStyle.utils.book_new();
    const usedSheetNames = new Set<string>();

    for (const [jKey, group] of sessionsByJenisMap) {
      const groupName = group.name;
      const groupSessions = group.sessions;
      const groupJenisId = group.id;

      // Determine parameters specific to this Jenis Asset
      const groupTestTypeIds = new Set<string>();
      for (const s of groupSessions) {
        s.asset?.testTypes?.forEach((tt) => groupTestTypeIds.add(tt.id));
        s.testResults?.forEach((r) => {
          if (r.parameter?.testTypeId) groupTestTypeIds.add(r.parameter.testTypeId);
        });
      }

      const activeTestTypesForGroup = allTestTypes.filter((tt) => {
        const ttJenisId = tt.jenisAssetId || tt.jenisAsset?.id;
        const ttJenisName = (tt.jenisAsset?.name || '').trim().toLowerCase();

        // 1. If testType is explicitly assigned to a specific jenisAsset:
        if (ttJenisId || ttJenisName) {
          if (ttJenisId && ttJenisId === groupJenisId) return true;
          if (ttJenisName && ttJenisName === jKey) return true;
          // Explicitly assigned to a DIFFERENT jenisAsset -> exclude from this group
          return false;
        }

        // 2. If unassigned (shared/global testType), include only if mapped to an asset/result in this group
        if (groupTestTypeIds.has(tt.id)) return true;

        return false;
      });

      const groupParamCols: Parameter[] = [];
      for (const tt of activeTestTypesForGroup) {
        if (tt.parameters && tt.parameters.length > 0) {
          const sorted = [...tt.parameters].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          for (const p of sorted) {
            p.testType = tt;
            groupParamCols.push(p);
          }
        }
      }

      // Build worksheet for this group
      const titleText = `DATABASE ASSESSMENT ${groupName.toUpperCase()} — ${
        testYear && testYear !== 'ALL' ? `TAHUN ${testYear}` : 'SEMUA TAHUN'
      }   (Diekspor: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })})`;

      const META_HEADERS = [
        'No', 'Tahun Uji', 'UBP', 'Unit Pembangkit',
        'Tahun Pembuatan', 'Tipe Alat', 'Manufacture', 'Serial Number', 'Status',
      ];
      const META_COL_COUNT = META_HEADERS.length; // 9
      const TOTAL_COLS = META_COL_COUNT + groupParamCols.length;

      const ttGroups: { name: string; params: Parameter[] }[] = [];
      for (const p of groupParamCols) {
        const last = ttGroups[ttGroups.length - 1];
        if (!last || last.name !== p.testType.name) {
          ttGroups.push({ name: p.testType.name.toUpperCase(), params: [p] });
        } else {
          last.params.push(p);
        }
      }

      // Row 0: Title banner
      const row0: any[] = [sc(titleText, S_TITLE)];
      for (let c = 1; c < TOTAL_COLS; c++) row0.push(sc('', S_TITLE));

      // Row 1: Static headers + Test Type headers
      const row1: any[] = META_HEADERS.map((h) => sc(h, S_META_HDR));
      for (const grp of ttGroups) {
        row1.push(sc(grp.name, S_TT_HDR));
        for (let i = 1; i < grp.params.length; i++) row1.push(sc('', S_TT_HDR));
      }

      // Row 2: Parameter names
      const row2: any[] = META_HEADERS.map(() => sc('', S_META_HDR));
      for (const p of groupParamCols) row2.push(sc(p.name, S_PARAM_HDR));

      // Row 3: Units
      const row3: any[] = META_HEADERS.map(() => sc('', S_META_HDR));
      for (const p of groupParamCols) row3.push(sc(p.unit || '-', S_UNIT_HDR));

      // Data Rows
      const dataRows: any[][] = [];
      groupSessions.forEach((s, idx) => {
        const isOdd = idx % 2 === 1;
        const dStyle = isOdd ? S_DATA_ODD : S_DATA_EVEN;

        const allJudgements = s.testResults.map((r) => r.judgement as JudgementLabel | null);
        const overall = aggregateAssetStatus(allJudgements);

        const row: any[] = [
          sc(idx + 1,                                            dStyle),
          sc(s.testYear,                                          dStyle),
          sc(s.asset.unitPembangkit?.ubp?.name || '',            S_DATA_LEFT(isOdd)),
          sc(s.asset.unitPembangkit?.name || '',                 S_DATA_LEFT(isOdd)),
          sc(s.asset.mfgYear || '',                              dStyle),
          sc(s.asset.jenisAsset?.name || '',                     S_DATA_LEFT(isOdd)),
          sc(s.asset.manufacture || s.asset.vectorGroup || '',   S_DATA_LEFT(isOdd)),
          sc(s.asset.serialNumber || '',                         dStyle),
          sc(overall || '',                                       S_JUDGEMENT(overall, isOdd)),
        ];

        const resultMap = new Map(s.testResults.map((r) => [r.parameterId, r]));

        for (const p of groupParamCols) {
          const result = resultMap.get(p.id);
          const { val } = resolveDisplayValue(result, p.id, criteriaMap);
          const judge = result?.judgement || null;
          const cellStyle = judge ? S_JUDGEMENT(judge, isOdd) : dStyle;
          row.push(sc(val, cellStyle));
        }

        dataRows.push(row);
      });

      const aoa = [row0, row1, row2, row3, ...dataRows];
      const ws = XLSXStyle.utils.aoa_to_sheet(aoa);

      // Merges
      const merges: any[] = [];
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } });
      for (let c = 0; c < META_COL_COUNT; c++) {
        merges.push({ s: { r: 1, c }, e: { r: 3, c } });
      }

      let mc = META_COL_COUNT;
      for (const grp of ttGroups) {
        if (grp.params.length > 1) {
          merges.push({ s: { r: 1, c: mc }, e: { r: 1, c: mc + grp.params.length - 1 } });
        }
        mc += grp.params.length;
      }

      ws['!merges'] = merges;
      ws['!rows'] = [
        { hpt: 32 },
        { hpt: 40 },
        { hpt: 40 },
        { hpt: 20 },
        ...dataRows.map(() => ({ hpt: 18 })),
      ];

      const colWidths: any[] = [
        { wch: 5 },   // No
        { wch: 10 },  // Tahun Uji
        { wch: 26 },  // UBP
        { wch: 26 },  // Unit Pembangkit
        { wch: 14 },  // Tahun Pembuatan
        { wch: 16 },  // Tipe Alat
        { wch: 18 },  // Manufacture
        { wch: 22 },  // Serial Number
        { wch: 10 },  // Status
        ...groupParamCols.map((p) => ({ wch: Math.max(p.name.length + 2, 14) })),
      ];
      ws['!cols'] = colWidths;
      ws['!freeze'] = { xSplit: 2, ySplit: 4, topLeftCell: 'C5' };

      const safeSheetName = sanitizeSheetName(groupName, usedSheetNames);
      XLSXStyle.utils.book_append_sheet(wb, ws, safeSheetName);
    }

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // ── 6. Build Filename ──────────────────────────────────────────────────
    let filename: string;
    if (sessionIdParam && sessionIdParam !== 'ALL' && sessionIdParam !== '' && filteredSessions.length > 0) {
      const firstS = filteredSessions[0];
      const eq  = (firstS.asset?.jenisAsset?.name || 'ASSET').toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
      const ubp = (firstS.asset?.unitPembangkit?.ubp?.name || 'UBP').replace(/[^a-zA-Z0-9]/g, '_');
      const unit = (firstS.asset?.unitPembangkit?.name || '').replace(/[^a-zA-Z0-9]/g, '_');
      const aset = (firstS.asset?.name || 'Asset').replace(/[^a-zA-Z0-9]/g, '_');
      const yr   = firstS.testYear || '';
      const ev   = firstS.testEvent && firstS.testEvent !== 'default'
        ? `_${firstS.testEvent.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
      filename = `Database_Assessment_${eq}_${ubp}_${unit}_${aset}${ev}_${yr}.xlsx`;
    } else {
      let toolPart = 'SEMUA_PERALATAN';
      let ubpPart  = 'SEMUA_UBP';
      let unitPart = '';
      let yearPart = testYear && testYear !== 'ALL' ? `_${testYear}` : '';
      let asetPart = '';

      if (sessionsByJenisMap.size === 1) {
        toolPart = Array.from(sessionsByJenisMap.values())[0].name.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
      } else if (equipmentType && equipmentType !== 'ALL') {
        toolPart = equipmentType.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
      }

      if (filteredSessions.length > 0) {
        const firstS = filteredSessions[0];
        if (assetId && assetId !== 'ALL')    asetPart = `_${(firstS.asset?.name || 'Unit').replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (ubpId  && ubpId  !== 'ALL')      ubpPart  = (firstS.asset?.unitPembangkit?.ubp?.name || 'UBP').replace(/[^a-zA-Z0-9]/g, '_');
        if (unitName && unitName !== 'ALL')  unitPart = `_${unitName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }

      filename = `Database_Assessment_${toolPart}_${ubpPart}${unitPart}${asetPart}${yearPart}.xlsx`;
    }

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting assessment data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

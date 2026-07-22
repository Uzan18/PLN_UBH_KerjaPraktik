import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import * as xlsx from 'xlsx';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import type { JudgementLabel } from '@/types';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

const TEST_TYPE_ORDER = [
  'INSULATION RESISTANCE',
  'POLARITY INDEX',
  'TURN TO TURN RATIO',
  'WINDING RESISTANCE HV',
  'WINDING RESISTANCE LV',
  'SFRA HV OPEN',
  'SFRA HV SHORTED',
  'SFRA LV OPEN',
  'SFRA LV SHORTED',
  'EXC CURRENT',
  'TAN DELTA WINDING',
  'TAN DELTA BUSHING',
  'WATT LOSS BUSHING BUSHING',
  'GROUNDING RESISTANCE',
  'DIRANA MOISTURE',
  'DIRANA OIL CONDUCT',
  'ARRESTER GROUND',
  'ARRESTER IR',
  'ARRESTER WATT LOSS',
  'VISUAL INSPECTION',
  'OTI ',
  'WTI',
  'DGA',
  'OIL ANALYSIS',
  'RLA'
];

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'export:read');

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const ubpId = searchParams.get('ubpId');
    const unitId = searchParams.get('unitId');
    const assetId = searchParams.get('assetId');
    const testTypeId = searchParams.get('testTypeId');
    const equipmentType = searchParams.get('equipmentType');

    const connection = await getDb();
    const testSessionRepo = connection.getRepository(TestSession);

    // Build main query to fetch test sessions with all required relations
    const queryBuilder = testSessionRepo
      .createQueryBuilder('ts')
      .innerJoinAndSelect('ts.asset', 'asset')
      .innerJoinAndSelect('asset.unitPembangkit', 'up')
      .innerJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'p')
      .leftJoinAndSelect('p.testType', 'tt')
      .where('ts.status = :status', { status: 'VALIDATED' });

    if (year && year !== 'ALL') {
      queryBuilder.andWhere('ts.testYear = :year', { year: parseInt(year, 10) });
    }
    if (ubpId && ubpId !== 'ALL') {
      queryBuilder.andWhere('ubp.id = :ubpId', { ubpId });
    }
    if (unitId && unitId !== 'ALL') {
      queryBuilder.andWhere('up.id = :unitId', { unitId });
    }
    if (assetId && assetId !== 'ALL') {
      queryBuilder.andWhere('asset.id = :assetId', { assetId });
    }
    if (equipmentType && equipmentType !== 'ALL') {
      queryBuilder.andWhere('ja.name = :equipmentType', { equipmentType: equipmentType.trim() });
    }
    if (testTypeId && testTypeId !== 'ALL') {
      queryBuilder.andWhere('tt.id = :testTypeId', { testTypeId });
    }

    queryBuilder
      .orderBy('ts.testYear', 'DESC')
      .addOrderBy('ubp.name', 'ASC')
      .addOrderBy('up.name', 'ASC')
      .addOrderBy('asset.name', 'ASC');

    const sessions = await queryBuilder.getMany();

    // Group parameters by Test Type for dynamic 2-level master sheet
    const testTypeMap = new Map<string, { id: string; name: string; parameters: { id: string; name: string }[] }>();

    for (const s of sessions) {
      for (const tr of s.testResults) {
        if (!tr.parameter || !tr.parameter.testType) continue;
        const tt = tr.parameter.testType;
        if (testTypeId && testTypeId !== 'ALL' && tt.id !== testTypeId) continue;

        if (!testTypeMap.has(tt.id)) {
          testTypeMap.set(tt.id, {
            id: tt.id,
            name: tt.name,
            parameters: [],
          });
        }

        const ttGroup = testTypeMap.get(tt.id)!;
        if (!ttGroup.parameters.some((p) => p.id === tr.parameter.id)) {
          ttGroup.parameters.push({
            id: tr.parameter.id,
            name: tr.parameter.name,
          });
        }
      }
    }

    // Sort Test Types according to TEST_TYPE_ORDER
    const sortedTestTypeGroups = Array.from(testTypeMap.values()).sort((a, b) => {
      const nameA = (a.name || '').trim().toUpperCase();
      const nameB = (b.name || '').trim().toUpperCase();
      const idxA = TEST_TYPE_ORDER.indexOf(nameA);
      const idxB = TEST_TYPE_ORDER.indexOf(nameB);
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      return posA - posB;
    });

    // Create Excel workbook
    const wb = xlsx.utils.book_new();

    // --- SHEET 1: DATABASE ASSESSMENT MASTER (Matching official PLN format) ---
    const sheet1Rows: any[][] = [];
    const merges: xlsx.Range[] = [];

    const titleEquip = equipmentType && equipmentType !== 'ALL' ? equipmentType.toUpperCase() : 'ASSET';
    const titleText = `INPUT DATA ${titleEquip}`;

    // Static metadata headers
    const staticHeaders = [
      'No',
      'Tahun Pengujian',
      'UBP',
      'Unit Pembangkit',
      'Manufacturing Years',
      'Equipment',
      'Vector',
      'Serial Number',
    ];

    const row1: any[] = [titleText];
    const row2: any[] = [...staticHeaders];
    const row3: any[] = Array(staticHeaders.length).fill('');

    const paramColumns: { paramId: string; paramName: string; testTypeId: string }[] = [];

    let colIndex = staticHeaders.length;

    // Merge static headers (Rows 2 & 3)
    for (let c = 0; c < staticHeaders.length; c++) {
      merges.push({ s: { r: 1, c }, e: { r: 2, c } });
    }

    // Dynamic Test Type sub-columns
    for (const group of sortedTestTypeGroups) {
      const paramCount = group.parameters.length;
      if (paramCount === 0) continue;

      const startCol = colIndex;
      const endCol = startCol + paramCount - 1;

      // Row 2: Test Type Name
      row2[startCol] = group.name;
      for (let c = startCol + 1; c <= endCol; c++) {
        row2[c] = '';
      }

      if (paramCount > 1) {
        merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: endCol } });
      }

      // Row 3: Parameter Names
      for (let i = 0; i < paramCount; i++) {
        const param = group.parameters[i];
        row3[startCol + i] = param.name;
        paramColumns.push({
          paramId: param.id,
          paramName: param.name,
          testTypeId: group.id,
        });
      }

      colIndex = endCol + 1;
    }

    const totalCols = colIndex;
    for (let c = 1; c < totalCols; c++) {
      row1.push('');
    }
    // Merge Title Header across all columns
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

    sheet1Rows.push(row1);
    sheet1Rows.push(row2);
    sheet1Rows.push(row3);

    // Data Rows
    sessions.forEach((s, idx) => {
      let addInfo: Record<string, any> = {};
      if (s.additionalInfo) {
        try {
          addInfo = typeof s.additionalInfo === 'string' ? JSON.parse(s.additionalInfo) : s.additionalInfo;
        } catch (e) {}
      }

      const mfgYear = addInfo.mfgYear || s.asset?.mfgYear || '—';
      const vectorGroup = addInfo.vectorGroup || s.asset?.vectorGroup || '—';
      const serialNumber = addInfo.serialNumber || s.asset?.serialNumber || '—';
      const equipName = s.asset?.name || '—';

      const dataRow: any[] = [
        idx + 1,
        s.testYear,
        s.asset?.unitPembangkit?.ubp?.name || '—',
        s.asset?.unitPembangkit?.name || '—',
        mfgYear,
        equipName,
        vectorGroup,
        serialNumber,
      ];

      const resultMap = new Map<string, any>();
      for (const tr of s.testResults) {
        if (tr.parameterId) {
          resultMap.set(tr.parameterId, tr);
        }
      }

      for (const col of paramColumns) {
        const tr = resultMap.get(col.paramId);
        if (!tr || tr.isNotApplicable) {
          dataRow.push('N/A');
        } else if (tr.judgement) {
          dataRow.push(tr.judgement);
        } else if (tr.value !== null && tr.value !== undefined) {
          dataRow.push(tr.displayValue || tr.value);
        } else {
          dataRow.push('—');
        }
      }

      sheet1Rows.push(dataRow);
    });

    const ws1 = xlsx.utils.aoa_to_sheet(sheet1Rows);
    ws1['!merges'] = merges;

    // Set auto column widths
    const colWidths = Array(totalCols).fill(12);
    sheet1Rows.forEach((r) => {
      r.forEach((val, c) => {
        if (val) {
          const str = String(val);
          if (str.length + 3 > colWidths[c]) {
            colWidths[c] = Math.min(str.length + 3, 35);
          }
        }
      });
    });
    ws1['!cols'] = colWidths.map((w) => ({ wch: Math.max(w, 12) }));

    xlsx.utils.book_append_sheet(wb, ws1, `Data ${titleEquip}`);

    // --- SHEET 2: Ringkasan Status Per Jenis Pengujian ---
    const matrixRows = sessions.map((session, idx) => {
      const allJudgements = session.testResults.map((r) => r.judgement as JudgementLabel | null);
      const overallJudgement = aggregateAssetStatus(allJudgements);

      const row: Record<string, any> = {
        'No': idx + 1,
        'Tahun Uji': session.testYear,
        'UBP': session.asset.unitPembangkit?.ubp?.name || '—',
        'Unit Pembangkit': session.asset.unitPembangkit?.name || '—',
        'Nama Asset': session.asset.name || '—',
        'Serial Number': session.asset.serialNumber || '—',
        'Status Keseluruhan': overallJudgement || '—',
      };

      for (const group of sortedTestTypeGroups) {
        const results = session.testResults.filter((r) => r.parameter?.testTypeId === group.id);
        const judgements = results.map((r) => r.judgement as JudgementLabel | null);
        const aggregated = aggregateAssetStatus(judgements);
        row[group.name] = aggregated !== 'NA' ? aggregated : '—';
      }

      return row;
    });

    const ws2 = xlsx.utils.json_to_sheet(matrixRows);
    xlsx.utils.book_append_sheet(wb, ws2, 'Ringkasan Kondisi');

    // Write file to buffer
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    let filterSuffix = 'ALL';
    if (year && year !== 'ALL') filterSuffix = `Tahun_${year}`;
    if (equipmentType && equipmentType !== 'ALL') {
      const cleanEquip = equipmentType.replace(/[^a-zA-Z0-9]/g, '_');
      filterSuffix += `_${cleanEquip}`;
    }

    const filename = `Database_Assessment_${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunduh data excel', error: error.message },
      { status: 500 }
    );
  }
}

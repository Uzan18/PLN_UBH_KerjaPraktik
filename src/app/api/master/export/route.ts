import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Ubp } from '@/entities/Ubp';
import { UnitPembangkit } from '@/entities/UnitPembangkit';
import { JenisAsset } from '@/entities/JenisAsset';
import { Asset } from '@/entities/Asset';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import type { JudgementLabel } from '@/types';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'export:read'); // Allow any user role with export access to download

    const { searchParams } = new URL(request.url);
    const ubpId = searchParams.get('ubpId');
    const unitName = searchParams.get('unitName');
    const assetId = searchParams.get('assetId');
    const overallJudgement = searchParams.get('overallJudgement');
    const equipmentType = searchParams.get('equipmentType');
    const jenisAssetId = searchParams.get('jenisAssetId');
    const testYear = searchParams.get('testYear');

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);
    const paramRepo = db.getRepository(Parameter);
    const sessionRepo = db.getRepository(TestSession);

    // 1. Fetch all parameters ordered by testType and orderIndex
    // We want to reconstruct exactly the columns J to CV (columns 9 to 100).
    const parameters = await paramRepo.find({
      relations: ['testType'],
      order: {
        testType: { orderIndex: 'ASC' },
        orderIndex: 'ASC',
      },
    });

    // We can only put up to 92 parameters in J to CV (index 9 to 100)
    const paramCols = parameters.slice(0, 92);

    // 2. Fetch Sessions based on filters
    const queryBuilder = sessionRepo
      .createQueryBuilder('ts')
      .innerJoinAndSelect('ts.asset', 'asset')
      .innerJoinAndSelect('asset.unitPembangkit', 'up')
      .innerJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'p')
      .leftJoinAndSelect('p.testType', 'tt')
      .where('ts.status = :status', { status: 'VALIDATED' });

    if (ubpId && ubpId !== 'ALL' && ubpId !== '') {
      queryBuilder.andWhere('ubp.id = :ubpId', { ubpId });
    }

    if (unitName && unitName !== 'ALL' && unitName !== '') {
      queryBuilder.andWhere('up.name = :unitName', { unitName });
    }

    if (assetId && assetId !== 'ALL' && assetId !== '') {
      queryBuilder.andWhere('asset.id = :assetId', { assetId });
    }

    if (equipmentType && equipmentType !== 'ALL' && equipmentType !== '') {
      queryBuilder.andWhere('ja.name = :equipmentType', { equipmentType: equipmentType.trim() });
    }

    if (jenisAssetId && jenisAssetId !== 'ALL' && jenisAssetId !== '') {
      queryBuilder.andWhere('ja.id = :jenisAssetId', { jenisAssetId });
    }

    if (testYear && testYear !== 'ALL' && testYear !== '') {
      queryBuilder.andWhere('ts.testYear = :testYear', { testYear: Number(testYear) });
    }

    queryBuilder
      .orderBy('ts.testYear', 'DESC')
      .addOrderBy('ubp.name', 'ASC')
      .addOrderBy('up.name', 'ASC')
      .addOrderBy('asset.name', 'ASC');

    const allSessions = await queryBuilder.getMany();

    // In-memory filter by overallJudgement if specified
    let filteredSessions = allSessions;
    if (overallJudgement && overallJudgement !== 'ALL' && overallJudgement !== '') {
      filteredSessions = allSessions.filter((s) => {
        const judgements = s.testResults.map((r) => r.judgement as JudgementLabel);
        const overall = aggregateAssetStatus(judgements);
        return overall === overallJudgement;
      });
    }

    // 3. Construct Excel Workbook
    // Row layout array: we will have 10 header rows (index 0 to 9), and then data rows from index 10.
    const rows: any[][] = Array.from({ length: 10 }, () => []);

    // Reconstruct Rows 2, 3, 4 (indices 1, 2, 3) for standard metadata headers
    rows[1][0] = 'No';
    rows[1][1] = 'Tahun Uji';
    rows[1][2] = 'Nama UBP';
    rows[1][3] = 'Nama Aset';
    rows[1][4] = 'Tahun Pembuatan';
    rows[1][5] = 'Tipe Alat';
    rows[1][6] = 'Manufacture';
    rows[1][7] = 'Serial Number';
    rows[1][8] = '';

    rows[2][0] = '';
    rows[2][1] = '';
    rows[2][2] = '';
    rows[2][3] = '';
    rows[2][4] = '';
    rows[2][5] = '';
    rows[2][6] = '';
    rows[2][7] = '';
    rows[2][8] = '';

    rows[3][0] = '';
    rows[3][1] = '';
    rows[3][2] = '';
    rows[3][3] = '';
    rows[3][4] = '';
    rows[3][5] = '';
    rows[3][6] = '';
    rows[3][7] = '';
    rows[3][8] = '';

    const merges: any[] = [];

    // Vertical merges for standard headers columns A-I (indices 0 to 8)
    for (let c = 0; c <= 8; c++) {
      merges.push({
        s: { r: 1, c },
        e: { r: 3, c },
      });
    }

    // Horizontal merges for Test Types in Row 2 (index 1)
    let currentTTName = '';
    let startCol = -1;

    for (let k = 0; k < paramCols.length; k++) {
      const colIdx = 9 + k;
      const p = paramCols[k];
      const ttName = p.testType.name.toUpperCase();

      if (ttName !== currentTTName) {
        if (startCol !== -1 && colIdx - 1 > startCol) {
          merges.push({
            s: { r: 1, c: startCol },
            e: { r: 1, c: colIdx - 1 },
          });
        }
        currentTTName = ttName;
        startCol = colIdx;
        rows[1][colIdx] = ttName;
      } else {
        rows[1][colIdx] = '';
      }

      rows[2][colIdx] = p.name;
      rows[3][colIdx] = p.unit || '';
    }

    // Merge the last test type range
    if (startCol !== -1 && 9 + paramCols.length - 1 > startCol) {
      merges.push({
        s: { r: 1, c: startCol },
        e: { r: 1, c: 9 + paramCols.length - 1 },
      });
    }

    // Populate data rows starting from index 10
    let rowIdx = 10;
    for (const session of filteredSessions) {
      const rowData: any[] = [];
      rowData[0] = rowIdx - 9; // No
      rowData[1] = session.testYear;
      rowData[2] = session.asset.unitPembangkit?.ubp?.name || '';
      rowData[3] = session.asset.unitPembangkit?.name || '';
      rowData[4] = session.asset.mfgYear || '';
      rowData[5] = session.asset.jenisAsset?.name || 'Trafo';
      rowData[6] = session.asset.vectorGroup || '';
      rowData[7] = session.asset.serialNumber || '';
      rowData[8] = ''; // Empty column index 8

      // Populate measurements and scores
      for (let k = 0; k < paramCols.length; k++) {
        const colIdx = 9 + k;
        const p = paramCols[k];
        const result = session.testResults.find((r) => r.parameterId === p.id);

        if (result) {
          // Write value
          rowData[colIdx] = result.isNotApplicable
            ? 'N/A'
            : result.value !== null
            ? Number(result.value)
            : '';

          // Write score at scoreColIdx
          let scoreColIdx = -1;
          if (colIdx <= 83) {
            scoreColIdx = colIdx + 94;
          } else if (colIdx >= 85) {
            if (colIdx === 92 || colIdx === 93) {
              scoreColIdx = colIdx + 91;
            } else if (colIdx === 96) {
              scoreColIdx = 187;
            } else if (colIdx === 97) {
              scoreColIdx = 190;
            } else {
              scoreColIdx = colIdx + 93;
            }
          }

          if (scoreColIdx !== -1 && result.score !== null) {
            rowData[scoreColIdx] = Number(result.score);
          }
        } else {
          rowData[colIdx] = '';
        }
      }

      rows[rowIdx] = rowData;
      rowIdx++;
    }

    // Generate Sheet & Book
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply merges
    ws['!merges'] = merges;

    // Apply column widths
    const cols: any[] = [];
    cols[0] = { wch: 6 };   // No
    cols[1] = { wch: 12 };  // Tahun Uji
    cols[2] = { wch: 22 };  // Nama UBP
    cols[3] = { wch: 22 };  // Nama Asset
    cols[4] = { wch: 18 };  // Tahun Pembuatan
    cols[5] = { wch: 18 };  // Tipe Alat
    cols[6] = { wch: 15 };  // Vector Group
    cols[7] = { wch: 22 };  // Serial Number
    cols[8] = { wch: 4 };   // empty separator

    for (let k = 0; k < paramCols.length; k++) {
      cols[9 + k] = { wch: 18 }; // param values width
    }
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'PLAN MODEL');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Build short filename: Laporan_UBP_UnitPembangkit_Alat.xlsx
    let ubpPart = 'ALL';
    let unitPart = 'ALL';
    let toolPart = 'ALL';

    if (ubpId && ubpId !== 'ALL' && filteredSessions.length > 0) {
      ubpPart = (filteredSessions[0].asset.unitPembangkit?.ubp?.name || 'ALL').replace(/[^a-zA-Z0-9]/g, '_');
    }
    if (unitName && unitName !== 'ALL') {
      unitPart = unitName.replace(/[^a-zA-Z0-9]/g, '_');
    }
    if (equipmentType && equipmentType !== 'ALL') {
      toolPart = equipmentType.replace(/[^a-zA-Z0-9]/g, '_');
    }

    const filename = `Laporan_${ubpPart}_${unitPart}_${toolPart}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting data in import format:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

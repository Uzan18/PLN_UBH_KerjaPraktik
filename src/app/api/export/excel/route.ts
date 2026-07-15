import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
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
    // Auth + RBAC check (Critical fix: was completely unprotected)
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'export:read');

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const ubpId = searchParams.get('ubpId');
    const assetId = searchParams.get('assetId');
    const testTypeId = searchParams.get('testTypeId');
    const equipmentType = searchParams.get('equipmentType');

    const connection = await getDb();
    const testSessionRepo = connection.getRepository(TestSession);
    const testTypeRepo = connection.getRepository(TestType);

    // Fetch test types (filter by equipmentType if specified)
    let testTypes: TestType[] = [];
    if (equipmentType && equipmentType !== 'ALL') {
      const filteredTypes = await testTypeRepo.createQueryBuilder('tt')
        .innerJoin('tt.assets', 'asset')
        .where('asset.equipmentType = :equipmentType', { equipmentType: equipmentType.trim() })
        .getMany();

      const uniqueTypes = [];
      const seenIds = new Set<string>();
      for (const t of filteredTypes) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          uniqueTypes.push(t);
        }
      }
      testTypes = uniqueTypes;
    }

    if (testTypes.length === 0) {
      testTypes = await testTypeRepo.find({
        order: { orderIndex: 'ASC' },
      });
    }

    // Sort according to TEST_TYPE_ORDER
    testTypes = [...testTypes].sort((a, b) => {
      const nameA = (a.name || '').trim().toUpperCase();
      const nameB = (b.name || '').trim().toUpperCase();
      const idxA = TEST_TYPE_ORDER.indexOf(nameA);
      const idxB = TEST_TYPE_ORDER.indexOf(nameB);
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      return posA - posB;
    });

    // If filtered by specific test type / tool, restrict sheet 1 columns to just that test type
    if (testTypeId && testTypeId !== 'ALL') {
      testTypes = testTypes.filter((t) => t.id === testTypeId);
    }

    // Build main query to fetch test sessions with all required relations
    const queryBuilder = testSessionRepo
      .createQueryBuilder('ts')
      .innerJoinAndSelect('ts.asset', 'asset')
      .innerJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'p')
      .leftJoinAndSelect('p.testType', 'tt')
      .where('ts.status = :status', { status: 'VALIDATED' });

    // Filter by year
    if (year && year !== 'ALL') {
      queryBuilder.andWhere('ts.testYear = :year', { year: parseInt(year, 10) });
    }

    // Filter by UBP
    if (ubpId && ubpId !== 'ALL') {
      queryBuilder.andWhere('ubp.id = :ubpId', { ubpId });
    }

    // Filter by Asset / Unit
    if (assetId && assetId !== 'ALL') {
      queryBuilder.andWhere('asset.id = :assetId', { assetId });
    }

    // Filter by Equipment Type
    if (equipmentType && equipmentType !== 'ALL') {
      queryBuilder.andWhere('asset.equipmentType = :equipmentType', { equipmentType: equipmentType.trim() });
    }

    // Filter by Test Type / Tool
    if (testTypeId && testTypeId !== 'ALL') {
      queryBuilder.andWhere('tt.id = :testTypeId', { testTypeId });
    }

    // Sort by Year desc, UBP name asc, Asset name asc
    queryBuilder
      .orderBy('ts.testYear', 'DESC')
      .addOrderBy('ubp.name', 'ASC')
      .addOrderBy('asset.name', 'ASC');

    const sessions = await queryBuilder.getMany();

    // Create Excel workbook using SheetJS
    const wb = xlsx.utils.book_new();

    // --- SHEET 1: Matrix Summary ---
    const matrixRows = sessions.map((session, idx) => {
      const allScores = session.testResults.map((r) => r.score !== null && r.score !== undefined ? Number(r.score) : null);
      const allJudgements = session.testResults.map((r) => r.judgement as JudgementLabel | null);
      const overallJudgement = aggregateAssetStatus(allJudgements);

      const row: Record<string, any> = {
        'No': idx + 1,
        'Tahun Uji': session.testYear,
        'UBP': session.asset.ubp.name,
        'Nama Asset / Unit': session.asset.name,
        'Serial Number': session.asset.serialNumber || '—',
        'Overall Judgement': overallJudgement || '—',
      };

      // Add each test type's status as a column
      for (const tt of testTypes) {
        const results = session.testResults.filter((r) => r.parameter?.testTypeId === tt.id);
        const judgements = results.map((r) => r.judgement as JudgementLabel | null);
        const aggregated = aggregateAssetStatus(judgements);
        row[tt.name] = aggregated !== 'NA' ? aggregated : '—';
      }

      return row;
    });

    const ws1 = xlsx.utils.json_to_sheet(matrixRows);
    xlsx.utils.book_append_sheet(wb, ws1, 'Ringkasan Kondisi');

    // --- SHEET 2: Detailed Parameters ---
    const detailRows: any[] = [];
    let count = 1;

    for (const session of sessions) {
      for (const result of session.testResults) {
        // Double check testType filter if session contains multiple test results
        if (testTypeId && testTypeId !== 'ALL' && result.parameter?.testTypeId !== testTypeId) {
          continue;
        }

        const param = result.parameter;
        if (!param) continue;

        detailRows.push({
          'No': count++,
          'Tahun Uji': session.testYear,
          'UBP': session.asset.ubp.name,
          'Nama Asset / Unit': session.asset.name,
          'Jenis Pengujian / Alat': param.testType?.name || '—',
          'Parameter': param.name,
          'Nilai Uji': result.isNotApplicable ? 'N/A' : (result.value !== null ? Number(result.value) : '—'),
          'Satuan': param.unit || '—',
          'Kondisi (Judgement)': result.judgement || '—',
        });
      }
    }

    const ws2 = xlsx.utils.json_to_sheet(detailRows);
    xlsx.utils.book_append_sheet(wb, ws2, 'Detail Parameter');

    // Write file to buffer
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename based on filters
    let filterSuffix = 'ALL';
    if (year && year !== 'ALL') filterSuffix = `Tahun_${year}`;
    if (equipmentType && equipmentType !== 'ALL') {
      const cleanEquip = equipmentType.replace(/[^a-zA-Z0-9]/g, '_');
      filterSuffix += `_Tipe_${cleanEquip}`;
    }
    if (ubpId && ubpId !== 'ALL') {
      const ubpName = sessions[0]?.asset.ubp.name.replace(/[^a-zA-Z0-9]/g, '_') || ubpId;
      filterSuffix += `_UBP_${ubpName}`;
    }

    const filename = `Laporan_Assessment_Trafo_${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

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

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import type { JudgementLabel, MatrixRow, MatrixCell } from '@/types';

/**
 * GET /api/dashboard/matrix
 * Returns the Asset x TestType judgement matrix.
 * Only uses VALIDATED sessions (CLAUDE.md Rule #2).
 * Aggregation is worst-case (CLAUDE.md Rule #7).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'dashboard:read');

    const url = new URL(request.url);
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : undefined;
    const ubpId = url.searchParams.get('ubpId') || undefined;
    const assetId = url.searchParams.get('assetId') || undefined;

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);
    const assetRepo = db.getRepository(Asset);

    // Get all test types for headers
    const testTypes = await testTypeRepo.find({ order: { orderIndex: 'ASC' } });

    // Get assets with their validated sessions and results
    const assetQb = assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('asset.testSessions', 'ts', 'ts.status = :status', { status: 'VALIDATED' })
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.testType', 'tt')
      .orderBy('asset.name', 'ASC');

    if (ubpId) assetQb.andWhere('asset.ubp_id = :ubpId', { ubpId });
    if (assetId) assetQb.andWhere('asset.id = :assetId', { assetId });
    if (year) assetQb.andWhere('ts.test_year = :year', { year });

    const assets = await assetQb.getMany();

    // Build matrix rows
    const rows: MatrixRow[] = assets.map((asset) => {
      const testYear = asset.testSessions?.[0]?.testYear || year || 2024;

      const cells: MatrixCell[] = testTypes.map((tt) => {
        // Get all judgements for this test type across all validated sessions
        const judgements: (JudgementLabel | null)[] = [];
        for (const ts of asset.testSessions || []) {
          for (const result of ts.testResults || []) {
            if (result.parameter?.testTypeId === tt.id) {
              judgements.push(result.judgement as JudgementLabel | null);
            }
          }
        }

        // Worst-case aggregation (CLAUDE.md Rule #7)
        const aggregated = aggregateAssetStatus(judgements);

        return {
          testTypeId: tt.id,
          testTypeName: tt.name,
          judgement: aggregated,
        };
      });

      return {
        assetId: asset.id,
        assetName: asset.name,
        ubpName: asset.ubp?.name || '',
        equipmentType: asset.equipmentType,
        testYear,
        cells,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        testTypeHeaders: testTypes.map((tt) => tt.name),
        rows,
        totalUnits: assets.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

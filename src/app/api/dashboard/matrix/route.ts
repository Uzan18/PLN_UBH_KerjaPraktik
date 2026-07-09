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
    const sessionRepo = db.getRepository(TestSession);

    // Get all test types for headers
    const testTypes = await testTypeRepo.find({ order: { orderIndex: 'ASC' } });

    // Get validated test sessions with their assets, results, and parameters
    const sessionQb = sessionRepo.createQueryBuilder('ts')
      .leftJoinAndSelect('ts.asset', 'asset')
      .leftJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('asset.testTypes', 'att')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.testType', 'tt')
      .where('ts.status = :status', { status: 'VALIDATED' })
      .orderBy('ts.test_year', 'DESC')
      .addOrderBy('ts.createdAt', 'DESC');

    if (ubpId) sessionQb.andWhere('asset.ubp_id = :ubpId', { ubpId });
    if (assetId) sessionQb.andWhere('asset.id = :assetId', { assetId });
    if (year) sessionQb.andWhere('ts.test_year = :year', { year });

    const sessions = await sessionQb.getMany();

    // Build matrix rows
    const rows: MatrixRow[] = sessions.map((session) => {
      const asset = session.asset;
      const testYear = session.testYear;

      const cells: MatrixCell[] = testTypes.map((tt) => {
        // Get all judgements for this test type in this specific session
        const judgements: (JudgementLabel | null)[] = [];
        for (const result of session.testResults || []) {
          if (result.parameter?.testTypeId === tt.id) {
            judgements.push(result.judgement as JudgementLabel | null);
          }
        }

        // Check if this testType is configured for the asset
        const isConfigured = !asset.testTypes || asset.testTypes.length === 0 || asset.testTypes.some((ct) => ct.id === tt.id);
        const aggregated = isConfigured ? aggregateAssetStatus(judgements) : 'NA';

        return {
          testTypeId: tt.id,
          testTypeName: tt.name,
          judgement: aggregated,
        };
      });

      return {
        assetId: asset.id,
        sessionId: session.id,
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
        totalUnits: sessions.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

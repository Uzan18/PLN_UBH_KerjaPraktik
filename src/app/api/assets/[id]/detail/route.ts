import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus, calculateOverallHealthScore } from '@/lib/scoring/aggregateAssetStatus';
import type { JudgementLabel } from '@/types';

/**
 * GET /api/assets/[id]/detail
 * Returns asset info, overall health score, and status per test type.
 * Only uses VALIDATED sessions (CLAUDE.md Rule #2).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'asset:read');

    const { id } = await params;
    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const testTypeRepo = db.getRepository(TestType);

    // Get asset with latest validated session
    const asset = await assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('asset.testSessions', 'ts', 'ts.status = :status', { status: 'VALIDATED' })
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.testType', 'tt')
      .where('asset.id = :id', { id })
      .orderBy('ts.test_year', 'DESC')
      .getOne();

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Get all test types
    const testTypes = await testTypeRepo.find({
      relations: ['parameters'],
      order: {
        orderIndex: 'ASC',
        parameters: {
          orderIndex: 'ASC',
        },
      },
    });

    // Build status per test type from latest validated session
    const latestSession = asset.testSessions?.[0];
    const allScores: (number | null)[] = [];
    const allJudgements: (JudgementLabel | null)[] = [];

    const testTypeStatuses = testTypes.map((tt) => {
      const results = latestSession?.testResults?.filter(
        (r) => r.parameter?.testTypeId === tt.id
      ) || [];

      const judgements = results.map((r) => r.judgement as JudgementLabel | null);
      const scores = results.map((r) => r.score !== null && r.score !== undefined ? Number(r.score) : null);

      allScores.push(...scores);
      allJudgements.push(...judgements);

      const parameters = tt.parameters.map((param) => {
        const result = results.find((r) => r.parameterId === param.id);
        return {
          parameterId: param.id,
          parameterName: param.name,
          unit: param.unit,
          value: result?.value !== null && result?.value !== undefined ? Number(result.value) : null,
          isNotApplicable: result?.isNotApplicable || false,
          score: result?.score !== null && result?.score !== undefined ? Number(result.score) : null,
          judgement: (result?.judgement as JudgementLabel) || null,
        };
      });

      return {
        testTypeId: tt.id,
        testTypeName: tt.name,
        judgement: aggregateAssetStatus(judgements),
        parameters,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id,
        name: asset.name,
        equipmentType: asset.equipmentType,
        mfgYear: asset.mfgYear,
        vectorGroup: asset.vectorGroup,
        serialNumber: asset.serialNumber,
        ubpName: asset.ubp?.name || '',
        lastTestYear: latestSession?.testYear || null,
        overallScore: calculateOverallHealthScore(allScores),
        overallJudgement: aggregateAssetStatus(allJudgements),
        testTypeStatuses,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

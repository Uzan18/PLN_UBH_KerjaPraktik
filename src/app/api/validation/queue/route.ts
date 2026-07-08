import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * GET /api/validation/queue
 * Returns list of SUBMITTED sessions awaiting approval (QC only).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'test-session:approve');

    const db = await getDb();
    const sessionRepo = db.getRepository(TestSession);

    const sessions = await sessionRepo.createQueryBuilder('ts')
      .leftJoinAndSelect('ts.asset', 'asset')
      .leftJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('ts.createdBy', 'createdBy')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.testType', 'tt')
      .where('ts.status = :status', { status: 'SUBMITTED' })
      .orderBy('ts.created_at', 'ASC') // oldest first (FIFO)
      .getMany();

    // Group by test types for display
    const queue = sessions.map((s) => {
      const testTypeNames = [...new Set(
        (s.testResults || []).map((r) => r.parameter?.testType?.name).filter(Boolean)
      )];

      const createdByName = s.createdBy?.name || 'Unknown';
      const initials = createdByName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        sessionId: s.id,
        assetName: s.asset?.name || '',
        assetId: s.assetId,
        ubpName: s.asset?.ubp?.name || '',
        testTypeName: testTypeNames.join(', '),
        testYear: s.testYear,
        status: s.status,
        createdByName,
        createdByInitials: initials,
        submittedAt: s.updatedAt?.toISOString() || s.createdAt?.toISOString(),
        resultCount: s.testResults?.length || 0,
      };
    });

    return NextResponse.json({ success: true, data: queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestType } from '@/entities/TestType';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * GET /api/master/test-types
 * List all test types with their parameters.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:read');

    const db = await getDb();
    const now = new Date();

    const testTypes = await db.getRepository(TestType)
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.parameters', 'p')
      .leftJoinAndSelect('p.criteria', 'c',
        'c.effective_from <= :now AND (c.effective_to IS NULL OR c.effective_to >= :now2)',
        { now, now2: now }
      )
      .orderBy('tt.orderIndex', 'ASC')
      .addOrderBy('p.orderIndex', 'ASC')
      .addOrderBy('c.effective_from', 'DESC')
      .getMany();

    return NextResponse.json({ success: true, data: testTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

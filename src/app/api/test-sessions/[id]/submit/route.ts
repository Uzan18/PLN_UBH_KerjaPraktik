import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * POST /api/test-sessions/[id]/submit
 * Change session status from DRAFT → SUBMITTED.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'test-session:submit');

    const { id } = await params;
    const db = await getDb();
    const sessionRepo = db.getRepository(TestSession);
    const auditRepo = db.getRepository(AuditLog);

    const testSession = await sessionRepo.findOne({
      where: { id },
      relations: ['testResults'],
    });

    if (!testSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Only DRAFT sessions can be submitted
    if (testSession.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `Cannot submit session with status ${testSession.status}` },
        { status: 400 }
      );
    }

    // INPUT users can only submit their own sessions
    if (session.user.role === 'INPUT' && testSession.createdById !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Must have at least one result
    if (!testSession.testResults || testSession.testResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot submit session with no test results' },
        { status: 400 }
      );
    }

    const beforeData = { status: testSession.status };

    testSession.status = 'SUBMITTED';
    const updated = await sessionRepo.save(testSession);

    // Audit Log (CLAUDE.md Rule #5)
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'SUBMIT_TEST_SESSION',
      entity: 'TestSession',
      entityId: id,
      beforeData: JSON.stringify(beforeData),
      afterData: JSON.stringify({ status: 'SUBMITTED' }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

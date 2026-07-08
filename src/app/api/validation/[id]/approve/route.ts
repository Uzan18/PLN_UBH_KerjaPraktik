import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * POST /api/validation/[id]/approve
 * Approve a SUBMITTED session → VALIDATED.
 * Only QC role can perform this action.
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
    requirePermission(session.user.role, 'test-session:approve');

    const { id } = await params;
    const db = await getDb();
    const sessionRepo = db.getRepository(TestSession);
    const auditRepo = db.getRepository(AuditLog);

    const testSession = await sessionRepo.findOne({ where: { id } });

    if (!testSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (testSession.status !== 'SUBMITTED') {
      return NextResponse.json(
        { success: false, error: `Cannot approve session with status ${testSession.status}` },
        { status: 400 }
      );
    }

    const beforeData = { status: testSession.status };

    testSession.status = 'VALIDATED';
    testSession.validatedById = session.user.id;
    testSession.validatedAt = new Date();

    const updated = await sessionRepo.save(testSession);

    // Audit Log (CLAUDE.md Rule #5)
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'APPROVE_TEST_SESSION',
      entity: 'TestSession',
      entityId: id,
      beforeData: JSON.stringify(beforeData),
      afterData: JSON.stringify({ status: 'VALIDATED' }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

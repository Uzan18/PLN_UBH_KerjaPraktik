import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { AuditLog } from '@/entities/AuditLog';
import { Asset } from '@/entities/Asset';
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
    console.log('--- APPROVE API CALL ---');
    console.log('Session user:', session?.user);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'test-session:approve');

    const { id } = await params;
    const db = await getDb();
    console.log('DB Connection obtained. Target ID:', id);
    const sessionRepo = db.getRepository<TestSession>('TestSession');
    const auditRepo = db.getRepository<AuditLog>('AuditLog');
    const assetRepo = db.getRepository<Asset>('Asset');

    const testSession = await sessionRepo.findOne({ 
      where: { id },
      relations: ['asset']
    });

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

    // Update asset information if pending additional info exists
    if (testSession.additionalInfoPending && testSession.asset) {
      try {
        const info = JSON.parse(testSession.additionalInfoPending);
        const asset = testSession.asset;
        if (info.manufacture !== undefined) asset.manufacture = info.manufacture;
        if (info.type !== undefined) asset.type = info.type;
        if (info.serialNumber !== undefined) asset.serialNumber = info.serialNumber;
        if (info.mfgYear !== undefined) {
          asset.mfgYear = info.mfgYear ? parseInt(info.mfgYear) : null;
        }
        if (info.vectorGroup !== undefined) asset.vectorGroup = info.vectorGroup;
        if (info.coolingMethod !== undefined) asset.coolingMethod = info.coolingMethod;
        if (info.ratedPower !== undefined) asset.ratedPower = info.ratedPower;
        if (info.frequency !== undefined) asset.frequency = info.frequency;
        if (info.hvSide !== undefined) asset.hvSide = info.hvSide;
        if (info.hvRatedCurrent !== undefined) asset.hvRatedCurrent = info.hvRatedCurrent;
        if (info.lvSide !== undefined) asset.lvSide = info.lvSide;
        if (info.lvRatedCurrent !== undefined) asset.lvRatedCurrent = info.lvRatedCurrent;
        await assetRepo.save(asset);

        // Store the approved specs inside the test session permanently for historical reports
        testSession.additionalInfo = testSession.additionalInfoPending;
      } catch (err) {
        console.error('Failed to parse and apply pending additional info:', err);
      }
    }

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
    console.error('--- APPROVE API ERROR ---', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestSession } from '@/entities/TestSession';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * POST /api/test-sessions
 * Create a new test session (DRAFT status).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'test-session:create');

    const body = await request.json();
    const { assetId, testYear, testEvent, additionalInfo } = body;

    if (!assetId || !testYear) {
      return NextResponse.json(
        { success: false, error: 'assetId and testYear are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const assetRepo = db.getRepository<Asset>('Asset');
    const sessionRepo = db.getRepository<TestSession>('TestSession');
    const auditRepo = db.getRepository<AuditLog>('AuditLog');

    // Verify asset exists
    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const testSession = sessionRepo.create({
      assetId,
      testYear: parseInt(testYear),
      testEvent: testEvent ? String(testEvent).trim() : null,
      status: 'DRAFT',
      createdById: session.user.id,
      additionalInfoPending: additionalInfo ? JSON.stringify(additionalInfo) : null,
    });
    await sessionRepo.save(testSession);

    // Audit Log (CLAUDE.md Rule #5)
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE_TEST_SESSION',
      entity: 'TestSession',
      entityId: testSession.id,
      afterData: JSON.stringify(testSession),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: testSession }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * GET /api/test-sessions
 * List test sessions (for input user: own sessions, for admin/qc: all).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const assetId = url.searchParams.get('assetId') || undefined;
    const testYear = url.searchParams.get('testYear') ? parseInt(url.searchParams.get('testYear')!) : undefined;

    const db = await getDb();
    const sessionRepo = db.getRepository<TestSession>('TestSession');

    // If querying a specific asset and year, return matching session(s)
    if (assetId && testYear) {
      const qb = sessionRepo.createQueryBuilder('ts')
        .leftJoinAndSelect('ts.testResults', 'tr')
        .leftJoinAndSelect('tr.parameter', 'p')
        .leftJoinAndSelect('p.testType', 'tt')
        .leftJoinAndSelect('ts.asset', 'asset')
        .leftJoinAndSelect('asset.unitPembangkit', 'up')
        .leftJoinAndSelect('up.ubp', 'ubp')
        .leftJoinAndSelect('asset.jenisAsset', 'ja')
        .where('ts.asset_id = :assetId', { assetId })
        .andWhere('ts.test_year = :testYear', { testYear });
      
      const testEvent = url.searchParams.get('testEvent');
      if (testEvent !== null) {
        if (testEvent === '' || testEvent === 'default') {
          qb.andWhere('ts.test_event IS NULL');
        } else {
          qb.andWhere('ts.test_event = :testEvent', { testEvent: testEvent.trim() });
        }
        
        if (session.user.role === 'INPUT') {
          qb.andWhere('ts.created_by_id = :userId', { userId: session.user.id });
        }
        const singleSession = await qb.getOne();
        return NextResponse.json({ success: true, data: singleSession });
      } else {
        if (session.user.role === 'INPUT') {
          qb.andWhere('ts.created_by_id = :userId', { userId: session.user.id });
        }
        const sessions = await qb.getMany();
        return NextResponse.json({ success: true, data: sessions });
      }
    }

    const qb = sessionRepo.createQueryBuilder('ts')
      .leftJoinAndSelect('ts.asset', 'asset')
      .leftJoinAndSelect('asset.unitPembangkit', 'up')
      .leftJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
      .leftJoinAndSelect('ts.createdBy', 'createdBy')
      .orderBy('ts.created_at', 'DESC');

    if (status) qb.andWhere('ts.status = :status', { status });

    // INPUT users can only see their own sessions
    if (session.user.role === 'INPUT') {
      qb.andWhere('ts.created_by_id = :userId', { userId: session.user.id });
    }

    const sessions = await qb.getMany();

    // Map to safe response (avoid exposing password hashes etc.)
    const data = sessions.map((s) => ({
      ...s,
      createdBy: s.createdBy ? { name: s.createdBy.name } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

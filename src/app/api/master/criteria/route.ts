import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Parameter } from '@/entities/Parameter';
import { Criteria } from '@/entities/Criteria';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * GET /api/master/criteria?testTypeId=xxx
 * Get active criteria for a test type.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:read');

    const url = new URL(request.url);
    const testTypeId = url.searchParams.get('testTypeId');

    if (!testTypeId) {
      return NextResponse.json(
        { success: false, error: 'testTypeId query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const paramRepo = db.getRepository(Parameter);

    const now = new Date();

    const parameters = await paramRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.criteria', 'c',
        'c.effective_from <= :now AND (c.effective_to IS NULL OR c.effective_to >= :now2)',
        { now, now2: now }
      )
      .where('p.test_type_id = :testTypeId', { testTypeId })
      .orderBy('p.orderIndex', 'ASC')
      .addOrderBy('c.effective_from', 'DESC')
      .getMany();

    const rows = parameters.map((p) => {
      const c = p.criteria?.[0];
      return {
        parameterId: p.id,
        parameterName: p.name,
        unit: p.unit,
        goodValue: c?.goodValue ?? null,
        fairValue: c?.fairValue ?? null,
        poorValue: c?.poorValue ?? null,
        badValue: c?.badValue ?? null,
        criteriaId: c?.id ?? null,
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * PUT /api/master/criteria
 * Memperbarui kriteria parameter menggunakan sistem versi (versioned).
 * Membuat rekam Kriteria baru dengan tanggal berlaku (effectiveFrom) tanpa menimpa data lama.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { parameterId, goodValue, fairValue, poorValue, badValue } = body;

    if (!parameterId) {
      return NextResponse.json(
        { success: false, error: 'parameterId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const paramRepo = db.getRepository(Parameter);
    const criteriaRepo = db.getRepository(Criteria);
    const auditRepo = db.getRepository(AuditLog);

    // Verify parameter exists
    const parameter = await paramRepo.findOne({ where: { id: parameterId } });
    if (!parameter) {
      return NextResponse.json({ success: false, error: 'Parameter not found' }, { status: 404 });
    }

    // Close the current active criteria (set effectiveTo)
    const currentCriteria = await criteriaRepo.createQueryBuilder('c')
      .where('c.parameter_id = :parameterId', { parameterId })
      .andWhere('c.effective_to IS NULL')
      .orderBy('c.effective_from', 'DESC')
      .getOne();

    const now = new Date();

    if (currentCriteria) {
      currentCriteria.effectiveTo = now;
      await criteriaRepo.save(currentCriteria);
    }

    // Buat versi kriteria baru (versioning, bukan menimpa lama)
    const newCriteria = criteriaRepo.create({
      parameterId,
      goodValue: goodValue ?? null,
      fairValue: fairValue ?? null,
      poorValue: poorValue ?? null,
      badValue: badValue ?? null,
      effectiveFrom: now,
      createdBy: session.user.id,
    });
    await criteriaRepo.save(newCriteria);

    // Catat Audit Log pembaruan kriteria
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE_CRITERIA',
      entity: 'Criteria',
      entityId: newCriteria.id,
      beforeData: currentCriteria ? JSON.stringify({
        goodValue: currentCriteria.goodValue,
        fairValue: currentCriteria.fairValue,
        poorValue: currentCriteria.poorValue,
        badValue: currentCriteria.badValue,
      }) : null,
      afterData: JSON.stringify({
        goodValue: newCriteria.goodValue,
        fairValue: newCriteria.fairValue,
        poorValue: newCriteria.poorValue,
        badValue: newCriteria.badValue,
      }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: newCriteria });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

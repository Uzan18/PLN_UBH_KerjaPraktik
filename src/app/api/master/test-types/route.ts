import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { Criteria } from '@/entities/Criteria';
import { TestResult } from '@/entities/TestResult';
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

/**
 * PUT /api/master/test-types
 * Update a test type (e.g. standard field).
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { id, standard } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);

    const testType = await testTypeRepo.findOne({ where: { id } });
    if (!testType) {
      return NextResponse.json({ success: false, error: 'TestType not found' }, { status: 404 });
    }

    testType.standard = standard ?? null;
    await testTypeRepo.save(testType);

    return NextResponse.json({ success: true, data: testType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * POST /api/master/test-types
 * Create a new test type with parameters and their criteria.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { name, standard, parameters } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    if (!Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);
    const parameterRepo = db.getRepository(Parameter);
    const criteriaRepo = db.getRepository(Criteria);

    // Get max order index
    const maxOrderIndexResult = await testTypeRepo
      .createQueryBuilder('tt')
      .select('MAX(tt.orderIndex)', 'max')
      .getRawOne();
    const nextOrderIndex = (Number(maxOrderIndexResult?.max) || 0) + 1;

    // Create TestType
    const testType = testTypeRepo.create({
      name: name.trim(),
      standard: standard ? standard.trim() : null,
      orderIndex: nextOrderIndex,
    });
    await testTypeRepo.save(testType);

    // Create parameters and criteria
    for (let i = 0; i < parameters.length; i++) {
      const p = parameters[i];
      if (!p.name || p.name.trim() === '') {
        throw new Error('Parameter name is required');
      }

      const param = parameterRepo.create({
        testTypeId: testType.id,
        name: p.name.trim(),
        unit: p.unit ? p.unit.trim() : null,
        orderIndex: i + 1,
      });
      await parameterRepo.save(param);

      const criteria = criteriaRepo.create({
        parameterId: param.id,
        goodValue: p.goodValue ? p.goodValue.trim() : null,
        fairValue: p.fairValue ? p.fairValue.trim() : null,
        poorValue: p.poorValue ? p.poorValue.trim() : null,
        badValue: p.badValue ? p.badValue.trim() : null,
        createdBy: session.user.id,
      });
      await criteriaRepo.save(criteria);
    }

    return NextResponse.json({ success: true, data: testType }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/test-types
 * Delete a TestType and its parameters, criteria, and test results. Only accessible to ADMIN.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);
    const parameterRepo = db.getRepository(Parameter);
    const criteriaRepo = db.getRepository(Criteria);
    const resultRepo = db.getRepository(TestResult);

    const testType = await testTypeRepo.findOne({ where: { id }, relations: ['assets'] });
    if (!testType) {
      return NextResponse.json({ success: false, error: 'TestType not found' }, { status: 404 });
    }

    // Unlink ManyToMany assets relation first
    testType.assets = [];
    await testTypeRepo.save(testType);

    // Find and delete all parameters, criteria, and test results
    const params = await parameterRepo.find({ where: { testTypeId: id } });
    for (const p of params) {
      await resultRepo.delete({ parameterId: p.id });
      await criteriaRepo.delete({ parameterId: p.id });
      await parameterRepo.delete({ id: p.id });
    }

    // Delete testType
    await testTypeRepo.delete({ id });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

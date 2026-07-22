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
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:read');

    const url = new URL(request.url);
    const jenisAssetId = url.searchParams.get('jenisAssetId');

    const db = await getDb();
    const now = new Date();

    const query = db.getRepository(TestType)
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.parameters', 'p')
      .leftJoinAndSelect('p.criteria', 'c',
        'c.effective_from <= :now AND (c.effective_to IS NULL OR c.effective_to >= :now2)',
        { now, now2: now }
      );

    if (jenisAssetId) {
      query.where('tt.jenisAssetId = :jenisAssetId', { jenisAssetId });
    }

    const testTypes = await query
      .orderBy('tt.orderIndex', 'ASC')
      .addOrderBy('tt.createdAt', 'ASC')
      .addOrderBy('tt.id', 'ASC')
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
 * Update a test type (name, standard, orderIndex, and parameters/criteria).
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { id, name, standard, orderIndex, parameters } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const db = await getDb();
    const testTypeRepo = db.getRepository(TestType);

    const testType = await testTypeRepo.findOne({ where: { id } });
    if (!testType) {
      return NextResponse.json({ success: false, error: 'TestType not found' }, { status: 404 });
    }

    if (name) testType.name = name.trim();
    testType.standard = standard ? standard.trim() : null;
    if (orderIndex !== undefined) testType.orderIndex = Number(orderIndex);
    await testTypeRepo.save(testType);

    if (Array.isArray(parameters)) {
      const parameterRepo = db.getRepository(Parameter);
      const criteriaRepo = db.getRepository(Criteria);
      const resultRepo = db.getRepository(TestResult);

      const dbParams = await parameterRepo.find({ where: { testTypeId: id } });
      const payloadParamIds = parameters.map((p) => p.id).filter(Boolean);

      // 1. Delete parameters not in payload
      for (const dbP of dbParams) {
        if (!payloadParamIds.includes(dbP.id)) {
          await resultRepo.delete({ parameterId: dbP.id });
          await criteriaRepo.delete({ parameterId: dbP.id });
          await parameterRepo.delete({ id: dbP.id });
        }
      }

      // 2. Insert or update parameters
      for (let i = 0; i < parameters.length; i++) {
        const p = parameters[i];
        if (!p.name || p.name.trim() === '') continue;

        let param;
        if (p.id) {
          param = await parameterRepo.findOne({ where: { id: p.id } });
        }

        if (param) {
          param.name = p.name.trim();
          param.unit = p.unit ? p.unit.trim() : null;
          param.orderIndex = i + 1;
          await parameterRepo.save(param);
        } else {
          param = parameterRepo.create({
            testTypeId: id,
            name: p.name.trim(),
            unit: p.unit ? p.unit.trim() : null,
            orderIndex: i + 1,
          });
          await parameterRepo.save(param);
        }

        // Update or create criteria
        const activeCriteria = await criteriaRepo.findOne({
          where: { parameterId: param.id },
          order: { effectiveFrom: 'DESC' },
        });

        if (activeCriteria) {
          activeCriteria.goodValue = p.goodValue ? String(p.goodValue).trim() : null;
          activeCriteria.fairValue = p.fairValue ? String(p.fairValue).trim() : null;
          activeCriteria.poorValue = p.poorValue ? String(p.poorValue).trim() : null;
          activeCriteria.badValue = p.badValue ? String(p.badValue).trim() : null;
          await criteriaRepo.save(activeCriteria);
        } else {
          const criteria = criteriaRepo.create({
            parameterId: param.id,
            goodValue: p.goodValue ? String(p.goodValue).trim() : null,
            fairValue: p.fairValue ? String(p.fairValue).trim() : null,
            poorValue: p.poorValue ? String(p.poorValue).trim() : null,
            badValue: p.badValue ? String(p.badValue).trim() : null,
            createdBy: session.user.id,
          });
          await criteriaRepo.save(criteria);
        }
      }
    }

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
    const { name, standard, parameters, jenisAssetId } = body;

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
      jenisAssetId: jenisAssetId || null,
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

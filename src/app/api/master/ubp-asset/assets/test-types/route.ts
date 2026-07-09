import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets/test-types
 * Update applicable test types for an Asset. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { assetId, testTypeIds } = body;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'assetId is required' }, { status: 400 });
    }

    if (!Array.isArray(testTypeIds)) {
      return NextResponse.json({ success: false, error: 'testTypeIds must be an array' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const testTypeRepo = db.getRepository(TestType);
    const auditRepo = db.getRepository(AuditLog);

    // Fetch asset with its current test types relation
    const asset = await assetRepo.findOne({
      where: { id: assetId },
      relations: ['testTypes'],
    });

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Capture old state for audit logging
    const oldTestTypeNames = asset.testTypes?.map((t) => t.name) || [];

    // Find requested test types
    let selectedTestTypes: TestType[] = [];
    if (testTypeIds.length > 0) {
      selectedTestTypes = await testTypeRepo.find({
        where: { id: In(testTypeIds) },
      });
    }

    // Update relationship
    asset.testTypes = selectedTestTypes;
    await assetRepo.save(asset);

    const newTestTypeNames = selectedTestTypes.map((t) => t.name);

    // Create Audit Log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'AssetTestType',
      entityId: asset.id,
      beforeData: JSON.stringify({ assetName: asset.name, testTypes: oldTestTypeNames }),
      afterData: JSON.stringify({ assetName: asset.name, testTypes: newTestTypeNames }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: newTestTypeNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

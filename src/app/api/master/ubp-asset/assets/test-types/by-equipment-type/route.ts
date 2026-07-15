import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets/test-types/by-equipment-type
 * Update applicable test types for all assets of a specific equipmentType. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { equipmentType, testTypeIds } = body;

    if (!equipmentType) {
      return NextResponse.json({ success: false, error: 'equipmentType is required' }, { status: 400 });
    }

    if (!Array.isArray(testTypeIds)) {
      return NextResponse.json({ success: false, error: 'testTypeIds must be an array' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const testTypeRepo = db.getRepository(TestType);
    const auditRepo = db.getRepository(AuditLog);

    // Find all assets of this equipmentType
    const assets = await assetRepo.find({
      where: { equipmentType: equipmentType.trim() },
      relations: ['testTypes'],
    });

    // Find requested test types
    let selectedTestTypes: TestType[] = [];
    if (testTypeIds.length > 0) {
      selectedTestTypes = await testTypeRepo.find({
        where: { id: In(testTypeIds) },
      });
    }

    // Update relationship for all assets of this equipmentType
    for (const asset of assets) {
      asset.testTypes = selectedTestTypes;
      await assetRepo.save(asset);
    }

    const testTypeNames = selectedTestTypes.map((t) => t.name);

    // Create Audit Log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'EquipmentTypeTestType',
      entityId: equipmentType.trim(),
      beforeData: JSON.stringify({ equipmentType: equipmentType.trim(), assetCount: assets.length }),
      afterData: JSON.stringify({ equipmentType: equipmentType.trim(), testTypes: testTypeNames }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: testTypeNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

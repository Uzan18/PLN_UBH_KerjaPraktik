import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { JenisAsset } from '@/entities/JenisAsset';
import { TestType } from '@/entities/TestType';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets/test-types/by-equipment-type
 * Update applicable test types for all assets of a specific jenisAssetId. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { jenisAssetId, testTypeIds, infoFields } = body;

    if (!jenisAssetId) {
      return NextResponse.json({ success: false, error: 'jenisAssetId is required' }, { status: 400 });
    }

    if (!Array.isArray(testTypeIds)) {
      return NextResponse.json({ success: false, error: 'testTypeIds must be an array' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const jenisRepo = db.getRepository(JenisAsset);
    const testTypeRepo = db.getRepository(TestType);
    const auditRepo = db.getRepository(AuditLog);

    // Verify Jenis Asset exists
    const jenis = await jenisRepo.findOne({ where: { id: jenisAssetId } });
    if (!jenis) {
      return NextResponse.json({ success: false, error: 'Jenis Asset not found' }, { status: 404 });
    }

    // Save infoFields to JenisAsset
    if (infoFields !== undefined) {
      if (Array.isArray(infoFields)) {
        jenis.infoFields = JSON.stringify(infoFields);
      } else {
        jenis.infoFields = null;
      }
      await jenisRepo.save(jenis);
    }

    // Find all assets of this jenisAssetId
    const assets = await assetRepo.find({
      where: { jenisAssetId },
      relations: ['testTypes'],
    });

    // Find requested test types
    let selectedTestTypes: TestType[] = [];
    if (testTypeIds.length > 0) {
      selectedTestTypes = await testTypeRepo.find({
        where: { id: In(testTypeIds) },
      });
    }

    // Update relationship for all assets of this jenisAssetId
    for (const asset of assets) {
      asset.testTypes = selectedTestTypes;
      await assetRepo.save(asset);
    }

    const testTypeNames = selectedTestTypes.map((t) => t.name);

    // Create Audit Log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'JenisAssetTestType',
      entityId: jenisAssetId,
      beforeData: JSON.stringify({ jenisAsset: jenis.name, assetCount: assets.length }),
      afterData: JSON.stringify({ jenisAsset: jenis.name, testTypes: testTypeNames }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: testTypeNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

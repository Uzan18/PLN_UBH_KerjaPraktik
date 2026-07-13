import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { Ubp } from '@/entities/Ubp';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { IsNull, In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets
 * Create a new Asset under a UBP. Only accessible to ADMIN.
 * Also auto-creates a child ReportDirectory under the UBP's root directory
 * for the unit pembangkit (asset name), if it doesn't exist yet.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ubpId, equipmentType, mfgYear, vectorGroup, serialNumber, testTypeIds } = body;
    let { name } = body;

    if (!ubpId) {
      return NextResponse.json({ success: false, error: 'ubpId is required' }, { status: 400 });
    }
    if (!equipmentType || equipmentType.trim() === '') {
      return NextResponse.json({ success: false, error: 'Equipment Type is required' }, { status: 400 });
    }
    if (!name || name.trim() === '') {
      name = equipmentType.trim();
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const ubpRepo = db.getRepository(Ubp);
    const dirRepo = db.getRepository(ReportDirectory);
    const auditRepo = db.getRepository(AuditLog);
    const testTypeRepo = db.getRepository(TestType);

    // Verify UBP exists
    const ubp = await ubpRepo.findOne({ where: { id: ubpId } });
    if (!ubp) {
      return NextResponse.json({ success: false, error: 'UBP not found' }, { status: 404 });
    }

    // Find an existing asset with the same equipmentType to copy its testTypes configuration
    const existingAssetWithSameType = await assetRepo.findOne({
      where: { equipmentType: equipmentType.trim() },
      relations: ['testTypes'],
    });

    let initialTestTypes: TestType[] = [];
    if (existingAssetWithSameType) {
      initialTestTypes = existingAssetWithSameType.testTypes;
    } else if (Array.isArray(testTypeIds) && testTypeIds.length > 0) {
      initialTestTypes = await testTypeRepo.find({
        where: { id: In(testTypeIds) }
      });
    }

    const asset = assetRepo.create({
      name: name.trim(),
      ubpId,
      equipmentType: equipmentType.trim(),
      mfgYear: mfgYear ? parseInt(mfgYear) : null,
      vectorGroup: vectorGroup ? vectorGroup.trim() : null,
      serialNumber: serialNumber ? serialNumber.trim() : null,
      testTypes: initialTestTypes,
    });
    await assetRepo.save(asset);

    // Auto-create child ReportDirectory for this unit pembangkit
    // Find the root-level ReportDirectory matching the UBP name
    const rootDir = await dirRepo.findOne({
      where: { name: ubp.name, parentId: IsNull() },
    });
    if (rootDir) {
      // Check if a child directory with this asset name already exists
      const existingChild = await dirRepo.findOne({
        where: { name: name.trim(), parentId: rootDir.id },
      });
      if (!existingChild) {
        const childDir = dirRepo.create({
          name: name.trim(),
          parentId: rootDir.id,
        });
        await dirRepo.save(childDir);
      }
    }

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Asset',
      entityId: asset.id,
      beforeData: null,
      afterData: JSON.stringify({ name: asset.name, ubp: ubp.name, equipmentType: asset.equipmentType }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/ubp-asset/assets
 * Delete an Asset and cascade delete its test sessions and results. Only accessible to ADMIN.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const equipmentType = url.searchParams.get('equipmentType');

    if (!id && !equipmentType) {
      return NextResponse.json({ success: false, error: 'ID or equipmentType is required' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const sessionRepo = db.getRepository(TestSession);
    const resultRepo = db.getRepository(TestResult);
    const auditRepo = db.getRepository(AuditLog);

    if (id) {
      const asset = await assetRepo.findOne({ where: { id }, relations: ['ubp', 'testTypes'] });
      if (!asset) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }

      // Cascade delete manually
      const testSessions = await sessionRepo.find({ where: { assetId: id } });
      for (const s of testSessions) {
        await resultRepo.delete({ testSessionId: s.id });
        await sessionRepo.delete({ id: s.id });
      }

      // Unlink ManyToMany testTypes relation first
      asset.testTypes = [];
      await assetRepo.save(asset);

      await assetRepo.delete({ id });

      // Audit log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Asset',
        entityId: id,
        beforeData: JSON.stringify({ name: asset.name, equipmentType: asset.equipmentType }),
        afterData: null,
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true, data: { id } });
    } else if (equipmentType) {
      // Find all assets of this equipmentType
      const assets = await assetRepo.find({ where: { equipmentType: equipmentType.trim() }, relations: ['testTypes'] });
      
      for (const asset of assets) {
        const testSessions = await sessionRepo.find({ where: { assetId: asset.id } });
        for (const s of testSessions) {
          await resultRepo.delete({ testSessionId: s.id });
          await sessionRepo.delete({ id: s.id });
        }
        
        // Unlink ManyToMany testTypes relation first
        asset.testTypes = [];
        await assetRepo.save(asset);

        await assetRepo.delete({ id: asset.id });
      }

      // Audit log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'EquipmentType',
        entityId: equipmentType.trim(),
        beforeData: JSON.stringify({ equipmentType: equipmentType.trim(), assetCount: assets.length }),
        afterData: null,
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true, data: { equipmentType: equipmentType.trim(), deletedAssetCount: assets.length } });
    }

    return NextResponse.json({ success: false, error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

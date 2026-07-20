import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { UnitPembangkit } from '@/entities/UnitPembangkit';
import { JenisAsset } from '@/entities/JenisAsset';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { IsNull, In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets
 * Create a new Asset under a Unit Pembangkit. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const {
      unitPembangkitId,
      name,
      jenisAssetId,
      mfgYear,
      vectorGroup,
      serialNumber,
      testTypeIds,
      type,
      manufacture,
      coolingMethod,
      ratedPower,
      frequency,
      hvSide,
      hvRatedCurrent,
      lvSide,
      lvRatedCurrent,
      customMetadata,
    } = body;

    if (!unitPembangkitId) {
      return NextResponse.json({ success: false, error: 'unitPembangkitId is required' }, { status: 400 });
    }
    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Asset name is required' }, { status: 400 });
    }
    if (!jenisAssetId) {
      return NextResponse.json({ success: false, error: 'jenisAssetId is required' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const unitRepo = db.getRepository(UnitPembangkit);
    const jenisRepo = db.getRepository(JenisAsset);
    const auditRepo = db.getRepository(AuditLog);
    const testTypeRepo = db.getRepository(TestType);

    // Verify Unit Pembangkit exists
    const unit = await unitRepo.findOne({ where: { id: unitPembangkitId }, relations: ['ubp'] });
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit Pembangkit not found' }, { status: 404 });
    }

    // Verify Jenis Asset exists
    const jenis = await jenisRepo.findOne({ where: { id: jenisAssetId } });
    if (!jenis) {
      return NextResponse.json({ success: false, error: 'Jenis Asset not found' }, { status: 404 });
    }

    // Find an existing asset with the same jenisAssetId to copy its testTypes configuration
    const existingAssetWithSameType = await assetRepo.findOne({
      where: { jenisAssetId },
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
      unitPembangkitId,
      jenisAssetId,
      mfgYear: mfgYear ? parseInt(mfgYear) : null,
      vectorGroup: vectorGroup ? vectorGroup.trim() : null,
      serialNumber: serialNumber ? serialNumber.trim() : null,
      type: type ? type.trim() : null,
      manufacture: manufacture ? manufacture.trim() : null,
      coolingMethod: coolingMethod ? coolingMethod.trim() : null,
      ratedPower: ratedPower ? ratedPower.trim() : null,
      frequency: frequency ? frequency.trim() : null,
      hvSide: hvSide ? hvSide.trim() : null,
      hvRatedCurrent: hvRatedCurrent ? hvRatedCurrent.trim() : null,
      lvSide: lvSide ? lvSide.trim() : null,
      lvRatedCurrent: lvRatedCurrent ? lvRatedCurrent.trim() : null,
      customMetadata: customMetadata ? (typeof customMetadata === 'string' ? customMetadata : JSON.stringify(customMetadata)) : null,
      testTypes: initialTestTypes,
    });
    await assetRepo.save(asset);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Asset',
      entityId: asset.id,
      beforeData: null,
      afterData: JSON.stringify({ name: asset.name, unit: unit.name, ubp: unit.ubp.name, jenis: jenis.name }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/master/ubp-asset/assets
 * Update an existing Asset. Only accessible to ADMIN.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const {
      id,
      name,
      jenisAssetId,
      mfgYear,
      vectorGroup,
      serialNumber,
      type,
      manufacture,
      coolingMethod,
      ratedPower,
      frequency,
      hvSide,
      hvRatedCurrent,
      lvSide,
      lvRatedCurrent,
      customMetadata,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }
    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Asset name is required' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const jenisRepo = db.getRepository(JenisAsset);
    const auditRepo = db.getRepository(AuditLog);

    const asset = await assetRepo.findOne({
      where: { id },
      relations: ['unitPembangkit', 'unitPembangkit.ubp', 'jenisAsset'],
    });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Verify Jenis Asset if changed
    if (jenisAssetId && jenisAssetId !== asset.jenisAssetId) {
      const jenis = await jenisRepo.findOne({ where: { id: jenisAssetId } });
      if (!jenis) {
        return NextResponse.json({ success: false, error: 'Jenis Asset not found' }, { status: 404 });
      }
      asset.jenisAssetId = jenisAssetId;
    }

    const beforeData = JSON.stringify(asset);

    asset.name = name.trim();
    asset.mfgYear = mfgYear ? parseInt(mfgYear) : null;
    asset.vectorGroup = vectorGroup ? vectorGroup.trim() : null;
    asset.serialNumber = serialNumber ? serialNumber.trim() : null;
    asset.type = type ? type.trim() : null;
    asset.manufacture = manufacture ? manufacture.trim() : null;
    asset.coolingMethod = coolingMethod ? coolingMethod.trim() : null;
    asset.ratedPower = ratedPower ? ratedPower.trim() : null;
    asset.frequency = frequency ? frequency.trim() : null;
    asset.hvSide = hvSide ? hvSide.trim() : null;
    asset.hvRatedCurrent = hvRatedCurrent ? hvRatedCurrent.trim() : null;
    asset.lvSide = lvSide ? lvSide.trim() : null;
    asset.lvRatedCurrent = lvRatedCurrent ? lvRatedCurrent.trim() : null;
    asset.customMetadata = customMetadata ? (typeof customMetadata === 'string' ? customMetadata : JSON.stringify(customMetadata)) : null;

    await assetRepo.save(asset);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Asset',
      entityId: asset.id,
      beforeData,
      afterData: JSON.stringify(asset),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: asset });
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
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const jenisAssetId = url.searchParams.get('jenisAssetId');

    if (!id && !jenisAssetId) {
      return NextResponse.json({ success: false, error: 'ID or jenisAssetId is required' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const sessionRepo = db.getRepository(TestSession);
    const resultRepo = db.getRepository(TestResult);
    const auditRepo = db.getRepository(AuditLog);

    if (id) {
      const asset = await assetRepo.findOne({
        where: { id },
        relations: ['unitPembangkit', 'unitPembangkit.ubp', 'jenisAsset', 'testTypes']
      });
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
        beforeData: JSON.stringify({ name: asset.name, unit: asset.unitPembangkit?.name, jenis: asset.jenisAsset?.name }),
        afterData: null,
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true, data: { id } });
    } else if (jenisAssetId) {
      // Find all assets of this jenisAssetId
      const assets = await assetRepo.find({ where: { jenisAssetId }, relations: ['testTypes'] });

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

      // Also delete the JenisAsset record itself
      const jenisRepo = db.getRepository(JenisAsset);
      await jenisRepo.delete({ id: jenisAssetId });

      // Audit log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'JenisAsset',
        entityId: jenisAssetId,
        beforeData: JSON.stringify({ jenisAssetId, assetCount: assets.length }),
        afterData: null,
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true, data: { jenisAssetId, deletedAssetCount: assets.length } });
    }

    return NextResponse.json({ success: false, error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

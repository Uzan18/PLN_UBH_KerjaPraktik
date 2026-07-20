import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { UnitPembangkit } from '@/entities/UnitPembangkit';
import { Ubp } from '@/entities/Ubp';
import { Asset } from '@/entities/Asset';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { ReportFile } from '@/entities/ReportFile';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/master/ubp-asset/units
 * Create a new Unit Pembangkit under a UBP. Only accessible to ADMIN.
 * Also auto-creates a child ReportDirectory under the UBP's root directory.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { ubpId, name } = body;

    if (!ubpId) {
      return NextResponse.json({ success: false, error: 'ubpId is required' }, { status: 400 });
    }
    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Unit name is required' }, { status: 400 });
    }

    const db = await getDb();
    const unitRepo = db.getRepository(UnitPembangkit);
    const ubpRepo = db.getRepository(Ubp);
    const dirRepo = db.getRepository(ReportDirectory);
    const auditRepo = db.getRepository(AuditLog);

    // Verify UBP exists
    const ubp = await ubpRepo.findOne({ where: { id: ubpId } });
    if (!ubp) {
      return NextResponse.json({ success: false, error: 'UBP not found' }, { status: 404 });
    }

    // Check if name already exists under this UBP
    const existing = await unitRepo.findOne({
      where: { name: name.trim(), ubpId }
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Unit name already exists under this UBP' }, { status: 400 });
    }

    const unit = unitRepo.create({
      name: name.trim(),
      ubpId,
    });
    await unitRepo.save(unit);

    // Auto-create child ReportDirectory for this unit pembangkit
    const rootDir = await dirRepo.findOne({
      where: { name: ubp.name, parentId: IsNull() },
    });
    if (rootDir) {
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
      entity: 'UnitPembangkit',
      entityId: unit.id,
      beforeData: null,
      afterData: JSON.stringify({ name: unit.name, ubp: ubp.name }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/ubp-asset/units
 * Delete a Unit Pembangkit and cascade delete its assets, test sessions, results,
 * and matching ReportDirectory. Only accessible to ADMIN.
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
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const unitRepo = db.getRepository(UnitPembangkit);
    const assetRepo = db.getRepository(Asset);
    const sessionRepo = db.getRepository(TestSession);
    const resultRepo = db.getRepository(TestResult);
    const dirRepo = db.getRepository(ReportDirectory);
    const fileRepo = db.getRepository(ReportFile);
    const auditRepo = db.getRepository(AuditLog);

    const unit = await unitRepo.findOne({ where: { id }, relations: ['ubp', 'assets'] });
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Cascade delete assets
    if (unit.assets && unit.assets.length > 0) {
      for (const asset of unit.assets) {
        const fullAsset = await assetRepo.findOne({ where: { id: asset.id }, relations: ['testTypes'] });
        if (fullAsset) {
          fullAsset.testTypes = [];
          await assetRepo.save(fullAsset);
        }

        const testSessions = await sessionRepo.find({ where: { assetId: asset.id } });
        for (const s of testSessions) {
          await resultRepo.delete({ testSessionId: s.id });
          await sessionRepo.delete({ id: s.id });
        }
        await assetRepo.delete({ id: asset.id });
      }
    }

    // Cascade delete matching ReportDirectory
    const rootDir = await dirRepo.findOne({
      where: { name: unit.ubp.name, parentId: IsNull() },
    });
    if (rootDir) {
      const matchingDir = await dirRepo.findOne({
        where: { name: unit.name, parentId: rootDir.id },
      });
      if (matchingDir) {
        await deleteDirectoryRecursive(matchingDir.id, dirRepo, fileRepo);
      }
    }

    await unitRepo.delete({ id });

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'UnitPembangkit',
      entityId: id,
      beforeData: JSON.stringify({ name: unit.name, ubp: unit.ubp.name }),
      afterData: null,
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/master/ubp-asset/units
 * Update a Unit Pembangkit name. Only accessible to ADMIN.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'ID and name are required' }, { status: 400 });
    }

    const db = await getDb();
    const unitRepo = db.getRepository(UnitPembangkit);
    const dirRepo = db.getRepository(ReportDirectory);
    const auditRepo = db.getRepository(AuditLog);

    const unit = await unitRepo.findOne({ where: { id }, relations: ['ubp'] });
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Check if new name already exists under the same UBP
    const existing = await unitRepo.findOne({ where: { name: name.trim(), ubpId: unit.ubpId } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ success: false, error: 'Unit name already exists under this UBP' }, { status: 400 });
    }

    const oldName = unit.name;
    unit.name = name.trim();
    await unitRepo.save(unit);

    // Also update matching child ReportDirectory name
    const rootDir = await dirRepo.findOne({
      where: { name: unit.ubp.name, parentId: IsNull() },
    });
    if (rootDir) {
      const matchingDir = await dirRepo.findOne({
        where: { name: oldName, parentId: rootDir.id },
      });
      if (matchingDir) {
        matchingDir.name = name.trim();
        await dirRepo.save(matchingDir);
      }
    }

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'UnitPembangkit',
      entityId: id,
      beforeData: JSON.stringify({ name: oldName, ubp: unit.ubp.name }),
      afterData: JSON.stringify({ name: unit.name, ubp: unit.ubp.name }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Helper to recursively delete a ReportDirectory and its files
 */
async function deleteDirectoryRecursive(
  dirId: string,
  dirRepo: import('typeorm').Repository<ReportDirectory>,
  fileRepo: import('typeorm').Repository<ReportFile>,
) {
  const files = await fileRepo.find({ where: { directoryId: dirId } });
  for (const file of files) {
    const absolutePath = path.join(process.cwd(), 'public', file.filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.error(`Failed to delete file: ${absolutePath}`, e);
      }
    }
    await fileRepo.delete(file.id);
  }

  const subDirs = await dirRepo.find({ where: { parentId: dirId } });
  for (const sub of subDirs) {
    await deleteDirectoryRecursive(sub.id, dirRepo, fileRepo);
  }

  await dirRepo.delete(dirId);
}

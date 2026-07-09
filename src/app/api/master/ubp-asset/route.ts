import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Ubp } from '@/entities/Ubp';
import { Asset } from '@/entities/Asset';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { ReportFile } from '@/entities/ReportFile';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/master/ubp-asset
 * List all UBPs with their assets.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const ubps = await db.getRepository(Ubp).find({
      relations: ['assets', 'assets.testTypes'],
      order: { name: 'ASC' },
    });

    // Sort assets within each UBP
    for (const ubp of ubps) {
      if (ubp.assets) {
        ubp.assets.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return NextResponse.json({ success: true, data: ubps });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/master/ubp-asset
 * Create a new UBP. Only accessible to ADMIN.
 * Also auto-creates a root-level ReportDirectory with the same name.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const ubpRepo = db.getRepository(Ubp);
    const dirRepo = db.getRepository(ReportDirectory);
    const auditRepo = db.getRepository(AuditLog);

    // Check if name already exists
    const existing = await ubpRepo.findOne({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'UBP name already exists' }, { status: 400 });
    }

    const ubp = ubpRepo.create({ name: name.trim() });
    await ubpRepo.save(ubp);

    // Auto-create root-level ReportDirectory for this UBP
    const reportDir = dirRepo.create({
      name: name.trim(),
      parentId: null,
    });
    await dirRepo.save(reportDir);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Ubp',
      entityId: ubp.id,
      beforeData: null,
      afterData: JSON.stringify({ name: ubp.name }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: ubp }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/ubp-asset
 * Delete a UBP and cascade delete its assets, test sessions, and matching ReportDirectory.
 * Only accessible to ADMIN.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const ubpRepo = db.getRepository(Ubp);
    const assetRepo = db.getRepository(Asset);
    const sessionRepo = db.getRepository(TestSession);
    const resultRepo = db.getRepository(TestResult);
    const dirRepo = db.getRepository(ReportDirectory);
    const fileRepo = db.getRepository(ReportFile);
    const auditRepo = db.getRepository(AuditLog);

    const ubp = await ubpRepo.findOne({ where: { id }, relations: ['assets'] });
    if (!ubp) {
      return NextResponse.json({ success: false, error: 'UBP not found' }, { status: 404 });
    }

    // Cascade delete manually to ensure data integrity in SQLite / other db types
    if (ubp.assets && ubp.assets.length > 0) {
      for (const asset of ubp.assets) {
        const testSessions = await sessionRepo.find({ where: { assetId: asset.id } });
        for (const s of testSessions) {
          await resultRepo.delete({ testSessionId: s.id });
          await sessionRepo.delete({ id: s.id });
        }
        await assetRepo.delete({ id: asset.id });
      }
    }

    // Also cascade delete matching root-level ReportDirectory
    const matchingDir = await dirRepo.findOne({
      where: { name: ubp.name, parentId: IsNull() },
    });
    if (matchingDir) {
      await deleteDirectoryRecursive(matchingDir.id, dirRepo, fileRepo);
    }

    await ubpRepo.delete({ id });

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'Ubp',
      entityId: id,
      beforeData: JSON.stringify({ name: ubp.name }),
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
 * Helper to recursively delete a ReportDirectory and its children/files from disk and DB.
 */
async function deleteDirectoryRecursive(
  dirId: string,
  dirRepo: import('typeorm').Repository<ReportDirectory>,
  fileRepo: import('typeorm').Repository<ReportFile>,
) {
  // Delete all files in this directory from disk
  const files = await fileRepo.find({ where: { directoryId: dirId } });
  for (const file of files) {
    const absolutePath = path.join(process.cwd(), 'public', file.filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.error(`Failed to delete file from disk: ${absolutePath}`, e);
      }
    }
    await fileRepo.delete(file.id);
  }

  // Find subdirectories and delete them recursively
  const subDirs = await dirRepo.find({ where: { parentId: dirId } });
  for (const sub of subDirs) {
    await deleteDirectoryRecursive(sub.id, dirRepo, fileRepo);
  }

  // Delete this directory record
  await dirRepo.delete(dirId);
}

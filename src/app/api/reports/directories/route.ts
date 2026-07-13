import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { ReportFile } from '@/entities/ReportFile';
import { AuditLog } from '@/entities/AuditLog';
import { Ubp } from '@/entities/Ubp';
import { Asset } from '@/entities/Asset';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/reports/directories?parentId=xxx
 * Lists all subdirectories and files inside the parent directory.
 * If parentId is not provided, lists root directories.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'report:read');

    const url = new URL(request.url);
    let parentId = url.searchParams.get('parentId');
    if (parentId === 'null' || parentId === '') parentId = null;

    const db = await getDb();
    const dirRepo = db.getRepository(ReportDirectory);
    const fileRepo = db.getRepository(ReportFile);
    const ubpRepo = db.getRepository(Ubp);
    const assetRepo = db.getRepository(Asset);

    // Dynamic Synchronization of UBPs and Assets into ReportDirectory structure
    if (parentId === null) {
      // Sync root level directories with UBP table
      const ubps = await ubpRepo.find();
      const rootDirs = await dirRepo.find({ where: { parentId: IsNull() } });

      // Group rootDirs by trimmed name
      const dirMap = new Map<string, ReportDirectory[]>();
      for (const d of rootDirs) {
        const name = d.name.trim();
        if (!dirMap.has(name)) {
          dirMap.set(name, []);
        }
        dirMap.get(name)!.push(d);
      }

      // Create missing or deduplicate existing UBP folders
      const ubpNames = new Set(ubps.map((u) => u.name.trim()));
      for (const ubp of ubps) {
        const uName = ubp.name.trim();
        const dirs = dirMap.get(uName) || [];

        if (dirs.length === 0) {
          const newDir = dirRepo.create({ name: ubp.name, parentId: null });
          await dirRepo.save(newDir);
        } else if (dirs.length > 1) {
          // Deduplicate: keep the first one, delete others recursively
          for (let i = 1; i < dirs.length; i++) {
            await deleteDirectoryRecursive(dirs[i].id, dirRepo, fileRepo);
          }
        }
      }

      // Remove orphaned UBP folders
      for (const [name, dirs] of dirMap.entries()) {
        if (!ubpNames.has(name)) {
          for (const d of dirs) {
            await deleteDirectoryRecursive(d.id, dirRepo, fileRepo);
          }
        }
      }
    } else {
      // Sync Level 2 directories with Asset table (if parent directory represents a UBP)
      const currentDir = await dirRepo.findOne({ where: { id: parentId } });
      if (currentDir && currentDir.parentId === null) {
        const ubp = await ubpRepo.findOne({ where: { name: currentDir.name } });
        if (ubp) {
          const assets = await assetRepo.find({ where: { ubpId: ubp.id } });
          const subDirs = await dirRepo.find({ where: { parentId } });

          // Group subDirs by trimmed name
          const subDirMap = new Map<string, ReportDirectory[]>();
          for (const d of subDirs) {
            const name = d.name.trim();
            if (!subDirMap.has(name)) {
              subDirMap.set(name, []);
            }
            subDirMap.get(name)!.push(d);
          }

          // Process unique unit names from assets
          const assetUnitNames = new Set(assets.map((a) => a.name.trim()));

          // Create missing or deduplicate existing Unit Pembangkit folders
          for (const unitName of assetUnitNames) {
            const dirs = subDirMap.get(unitName) || [];
            if (dirs.length === 0) {
              const newDir = dirRepo.create({ name: unitName, parentId });
              await dirRepo.save(newDir);
            } else if (dirs.length > 1) {
              // Deduplicate: keep the first one, delete others recursively
              for (let i = 1; i < dirs.length; i++) {
                await deleteDirectoryRecursive(dirs[i].id, dirRepo, fileRepo);
              }
            }
          }

          // Remove orphaned Unit Pembangkit folders
          for (const [name, dirs] of subDirMap.entries()) {
            if (!assetUnitNames.has(name)) {
              for (const d of dirs) {
                await deleteDirectoryRecursive(d.id, dirRepo, fileRepo);
              }
            }
          }
        }
      }
    }

    // Fetch current directory info and ancestors to build breadcrumbs
    let currentDir = null;
    let parentDir = null;
    const pathTrail: { id: string | null; name: string }[] = [{ id: null, name: 'Laporan' }];

    if (parentId) {
      currentDir = await dirRepo.findOne({ where: { id: parentId } });
      if (currentDir) {
        if (currentDir.parentId) {
          parentDir = await dirRepo.findOne({ where: { id: currentDir.parentId } });
        }
        
        // Traverse upwards to construct breadcrumbs trail
        const ancestors: { id: string; name: string }[] = [];
        let current = currentDir;
        while (current) {
          ancestors.unshift({ id: current.id, name: current.name });
          if (current.parentId) {
            const nextParent = await dirRepo.findOne({ where: { id: current.parentId } });
            current = nextParent!;
          } else {
            break;
          }
        }
        pathTrail.push(...ancestors);
      }
    }

    // Fetch subdirectories
    const qbDirs = dirRepo.createQueryBuilder('dir')
      .orderBy('dir.name', 'ASC');
    
    if (parentId) {
      qbDirs.where('dir.parentId = :parentId', { parentId });
    } else {
      qbDirs.where('dir.parentId IS NULL');
    }
    const dirsList = await qbDirs.getMany();

    // Fetch files inside the current directory
    let filesList: ReportFile[] = [];
    if (parentId) {
      filesList = await fileRepo.find({
        where: { directoryId: parentId },
        relations: ['uploadedBy'],
        order: { createdAt: 'DESC' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        currentDir,
        parentDir,
        pathTrail,
        subDirectories: dirsList,
        files: filesList,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/reports/directories
 * Creates a new directory (sub-folder inside a unit pembangkit).
 * ADMIN only.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'report:manage-folders');

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Nama folder tidak boleh kosong' }, { status: 400 });
    }

    const db = await getDb();
    const dirRepo = db.getRepository(ReportDirectory);
    const auditRepo = db.getRepository(AuditLog);

    const newDir = dirRepo.create({
      name: name.trim(),
      parentId: parentId || null,
    });
    await dirRepo.save(newDir);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'ReportDirectory',
      entityId: newDir.id,
      beforeData: null,
      afterData: JSON.stringify({ name: newDir.name, parentId: newDir.parentId }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: newDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/directories?id=xxx
 * Deletes a directory and recursively deletes all its subfolders and files.
 * ADMIN only.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'report:manage-folders');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID folder diperlukan' }, { status: 400 });
    }

    const db = await getDb();
    const dirRepo = db.getRepository(ReportDirectory);
    const fileRepo = db.getRepository(ReportFile);
    const auditRepo = db.getRepository(AuditLog);

    // Fetch the directory
    const dir = await dirRepo.findOne({ where: { id } });
    if (!dir) {
      return NextResponse.json({ success: false, error: 'Folder tidak ditemukan' }, { status: 404 });
    }

    const dirName = dir.name;

    await deleteDirectoryRecursive(id, dirRepo, fileRepo);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'ReportDirectory',
      entityId: id,
      beforeData: JSON.stringify({ name: dirName }),
      afterData: null,
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, message: 'Folder berhasil dihapus' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Helper to recursively find and delete files/folders from disk and DB.
 */
async function deleteDirectoryRecursive(
  dirId: string,
  dirRepo: import('typeorm').Repository<ReportDirectory>,
  fileRepo: import('typeorm').Repository<ReportFile>
) {
  // Find all files in this directory and delete them from disk
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

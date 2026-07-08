import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { ReportFile } from '@/entities/ReportFile';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * POST /api/reports/files
 * Uploads a file inside a specific directory.
 * Petugas, QC, and Admin only.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'report:upload');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const directoryId = formData.get('directoryId') as string | null;

    if (!file || !directoryId) {
      return NextResponse.json({ success: false, error: 'File dan ID folder diperlukan' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique file path
    const fileId = crypto.randomUUID();
    const fileExt = path.extname(file.name);
    const relativePath = `/uploads/reports/${fileId}${fileExt}`;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absolutePath, buffer);

    const db = await getDb();
    const fileRepo = db.getRepository(ReportFile);
    const auditRepo = db.getRepository(AuditLog);

    // Save report file metadata
    const reportFile = fileRepo.create({
      name: file.name,
      filePath: relativePath,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      directoryId: directoryId,
      uploadedById: session.user.id,
    });
    await fileRepo.save(reportFile);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPLOAD',
      entity: 'ReportFile',
      entityId: reportFile.id,
      beforeData: null,
      afterData: JSON.stringify({ name: file.name, size: file.size }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: reportFile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/files?id=xxx
 * Deletes a file.
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
      return NextResponse.json({ success: false, error: 'ID file diperlukan' }, { status: 400 });
    }

    const db = await getDb();
    const fileRepo = db.getRepository(ReportFile);
    const auditRepo = db.getRepository(AuditLog);

    const file = await fileRepo.findOne({ where: { id } });
    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 404 });
    }

    // Delete file from disk
    const absolutePath = path.join(process.cwd(), 'public', file.filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.error(`Failed to delete file from disk: ${absolutePath}`, e);
      }
    }

    // Delete record from DB
    await fileRepo.delete(id);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'ReportFile',
      entityId: id,
      beforeData: JSON.stringify({ name: file.name }),
      afterData: null,
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, message: 'File berhasil dihapus' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ReportFile } from '@/entities/ReportFile';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/reports/files/[id]/download
 * Securely downloads a report file.
 * Returns the file with original name as attachment.
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    requirePermission(session.user.role, 'report:read');

    const { id } = await props.params;

    const db = await getDb();
    const fileRepo = db.getRepository(ReportFile);

    const file = await fileRepo.findOne({ where: { id } });
    if (!file) {
      return new Response('File tidak ditemukan', { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), 'public', file.filePath);
    if (!fs.existsSync(absolutePath)) {
      return new Response('File fisik tidak ditemukan di server', { status: 404 });
    }

    // Read file stream
    const fileStream = fs.createReadStream(absolutePath);
    
    // Set headers for download
    const headers = new Headers();
    headers.set('Content-Type', file.mimeType || 'application/octet-stream');
    headers.set('Content-Length', file.fileSize.toString());
    // Safe filename encoding
    const encodedFilename = encodeURIComponent(file.name).replace(/['()]/g, escape);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);

    // Return stream response (using ReadableStream)
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(message, { status: message.startsWith('Forbidden') ? 403 : 500 });
  }
}

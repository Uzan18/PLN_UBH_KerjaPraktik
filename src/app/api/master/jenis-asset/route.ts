import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { JenisAsset } from '@/entities/JenisAsset';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { AuditLog } from '@/entities/AuditLog';

/**
 * GET /api/master/jenis-asset
 * List all Jenis Asset. Accessible to authenticated users.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const jenisList = await db.getRepository(JenisAsset).find({
      order: { name: 'ASC' },
    });

    return NextResponse.json({ success: true, data: jenisList });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/master/jenis-asset
 * Create a new Jenis Asset. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { name, category } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const cleanCategory = (category || 'Trafo').trim();

    const db = await getDb();
    const jenisRepo = db.getRepository(JenisAsset);
    const auditRepo = db.getRepository(AuditLog);

    // Check if name already exists under the same category
    const existing = await jenisRepo.findOne({
      where: { name: name.trim(), category: cleanCategory }
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Jenis Asset already exists under this category' }, { status: 400 });
    }

    const defaultGeneralInfoFields = JSON.stringify(['manufacture', 'serialNumber', 'mfgYear']);
    const jenis = jenisRepo.create({
      name: name.trim(),
      category: cleanCategory,
      infoFields: defaultGeneralInfoFields,
    });
    await jenisRepo.save(jenis);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'JenisAsset',
      entityId: jenis.id,
      beforeData: null,
      afterData: JSON.stringify({ name: jenis.name, category: jenis.category }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: jenis }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/master/jenis-asset
 * Update an existing Jenis Asset. Only accessible to ADMIN.
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

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const jenisRepo = db.getRepository(JenisAsset);
    const auditRepo = db.getRepository(AuditLog);

    const jenis = await jenisRepo.findOne({ where: { id } });
    if (!jenis) {
      return NextResponse.json({ success: false, error: 'Jenis Asset not found' }, { status: 404 });
    }

    const newName = name.trim();
    const oldName = jenis.name;

    // Check if another asset type has the same name in the same category
    const existing = await jenisRepo.findOne({
      where: { name: newName, category: jenis.category }
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ success: false, error: 'Jenis Asset already exists under this category' }, { status: 400 });
    }

    jenis.name = newName;
    await jenisRepo.save(jenis);

    // Audit log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'JenisAsset',
      entityId: jenis.id,
      beforeData: JSON.stringify({ name: oldName, category: jenis.category }),
      afterData: JSON.stringify({ name: jenis.name, category: jenis.category }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: jenis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

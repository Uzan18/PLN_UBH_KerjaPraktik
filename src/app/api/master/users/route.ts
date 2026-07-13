import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { TestSession } from '@/entities/TestSession';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { hash } from 'bcryptjs';

/**
 * GET /api/master/users
 * List all users. Only accessible to ADMIN.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'user:read');

    const db = await getDb();
    const userRepo = db.getRepository(User);

    const users = await userRepo.find({
      select: ['id', 'name', 'email', 'role', 'allowedUbpIds', 'isActive', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' }
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/master/users
 * Create a new user. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'user:write');

    const body = await request.json();
    const { name, email, password, role, allowedUbpIds, isActive } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    const db = await getDb();
    const userRepo = db.getRepository(User);
    const auditRepo = db.getRepository(AuditLog);

    // Check if email already exists
    const existing = await userRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Email ${email} sudah terdaftar.` }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    const user = userRepo.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      allowedUbpIds: allowedUbpIds || null,
      isActive: isActive === undefined ? true : !!isActive,
    });

    await userRepo.save(user);

    // Log audit
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      beforeData: null,
      afterData: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/master/users
 * Update an existing user. Only accessible to ADMIN.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'user:write');

    const body = await request.json();
    const { id, name, email, password, role, allowedUbpIds, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const userRepo = db.getRepository(User);
    const auditRepo = db.getRepository(AuditLog);

    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const beforeData = JSON.stringify({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, allowedUbpIds: user.allowedUbpIds });

    if (name) user.name = name.trim();
    if (email) {
      const emailTrimmed = email.trim().toLowerCase();
      if (emailTrimmed !== user.email) {
        // Check uniqueness
        const existing = await userRepo.findOne({ where: { email: emailTrimmed } });
        if (existing) {
          return NextResponse.json({ success: false, error: `Email ${email} sudah terdaftar oleh pengguna lain.` }, { status: 400 });
        }
        user.email = emailTrimmed;
      }
    }
    if (password) {
      user.passwordHash = await hash(password, 10);
    }
    if (role) user.role = role;
    if (allowedUbpIds !== undefined) user.allowedUbpIds = allowedUbpIds || null;
    if (isActive !== undefined) user.isActive = !!isActive;

    await userRepo.save(user);

    // Log audit
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      beforeData,
      afterData: JSON.stringify({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, allowedUbpIds: user.allowedUbpIds }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/users
 * Delete a user. Only accessible to ADMIN.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'user:write');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const userRepo = db.getRepository(User);
    const auditRepo = db.getRepository(AuditLog);

    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' }, { status: 400 });
    }

    // Check if user has created or validated test sessions
    const sessionRepo = db.getRepository(TestSession);
    const hasSessions = await sessionRepo.findOne({
      where: [
        { createdById: id },
        { validatedById: id }
      ]
    });
    if (hasSessions) {
      return NextResponse.json({
        success: false,
        error: 'Pengguna ini tidak dapat dihapus karena telah berkontribusi dalam riwayat pengujian. Silakan nonaktifkan status akun saja.'
      }, { status: 400 });
    }

    await userRepo.delete({ id });

    // Log audit
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      beforeData: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
      afterData: null,
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

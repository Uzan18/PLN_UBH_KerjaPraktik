import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { TestSession, TestSessionStatus } from '../../../../src/entities/TestSession.entity';
import { permissions } from '../../../lib/auth/rbac';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = permissions[session.user.role as keyof typeof permissions];
  if (!userPermissions.canCreate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const newSession = AppDataSource.getRepository(TestSession).create({
    assetId: body.assetId,
    testTypeId: body.testTypeId,
    testYear: body.testYear,
    status: TestSessionStatus.DRAFT,
    createdById: session.user.id
  });

  const savedSession = await AppDataSource.getRepository(TestSession).save(newSession);

  // Todo Audit Log
  return NextResponse.json(savedSession, { status: 201 });
}
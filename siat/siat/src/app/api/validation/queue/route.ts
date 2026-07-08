import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { TestSession } from '../../../../src/entities/TestSession.entity';
import { permissions } from '../../../lib/auth/rbac';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = permissions[session.user.role as keyof typeof permissions];
  if (!userPermissions.canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const sessions = await AppDataSource.getRepository(TestSession).find({
    where: { status: 'SUBMITTED' },
    relations: ['asset', 'testType', 'createdBy']
  });

  return NextResponse.json(sessions);
}
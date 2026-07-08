import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../../db';
import { TestSession, TestSessionStatus } from '../../../../../src/entities/TestSession.entity';
import { AuditLog } from '../../../../../src/entities/AuditLog.entity';
import { permissions } from '../../../../lib/auth/rbac';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = permissions[session.user.role as keyof typeof permissions];
  if (!userPermissions.canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { reason } = await req.json();
  if (!reason || reason.length < 10) return NextResponse.json({ error: 'Reject reason is required and must be at least 10 characters' }, { status: 400 });

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const testSession = await AppDataSource.getRepository(TestSession).findOneBy({ id: parseInt(params.id) });
  if (!testSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (testSession.status !== TestSessionStatus.SUBMITTED) return NextResponse.json({ error: 'Session must be SUBMITTED to be rejected' }, { status: 400 });

  const oldData = JSON.stringify({ status: testSession.status });
  
  testSession.status = TestSessionStatus.REJECTED;
  await AppDataSource.getRepository(TestSession).save(testSession);

  await AppDataSource.getRepository(AuditLog).save({
    userId: session.user.id,
    action: 'REJECT',
    tableName: 'TEST_SESSION',
    recordId: testSession.id,
    oldData,
    newData: JSON.stringify({ status: TestSessionStatus.REJECTED }),
    reason
  });

  return NextResponse.json({ message: 'Session rejected' });
}
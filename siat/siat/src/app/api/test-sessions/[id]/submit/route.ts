import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../../db';
import { TestSession, TestSessionStatus } from '../../../../../src/entities/TestSession.entity';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const testSession = await AppDataSource.getRepository(TestSession).findOneBy({ id: parseInt(params.id) });
  if (!testSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (testSession.status !== TestSessionStatus.DRAFT) return NextResponse.json({ error: 'Only DRAFT sessions can be submitted' }, { status: 400 });

  testSession.status = TestSessionStatus.SUBMITTED;
  await AppDataSource.getRepository(TestSession).save(testSession);

  return NextResponse.json({ message: 'Session submitted for validation' });
}
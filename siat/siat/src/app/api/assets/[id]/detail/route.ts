import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../../db';
import { Asset } from '../../../../../src/entities/Asset.entity';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const asset = await AppDataSource.getRepository(Asset).findOne({
    where: { id: parseInt(params.id) },
    relations: ['ubp', 'testSessions', 'testSessions.testType', 'testSessions.testResults']
  });

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(asset);
}
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { Asset } from '../../../../src/entities/Asset.entity';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const ubp = url.searchParams.get('ubp');
  const equipment = url.searchParams.get('equipment');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const query = AppDataSource.getRepository(Asset).createQueryBuilder('asset')
    .leftJoinAndSelect('asset.testSessions', 'session', 'session.status = :status', { status: 'VALIDATED' })
    .leftJoinAndSelect('session.testType', 'testType')
    .leftJoinAndSelect('session.testResults', 'results')
    .take(limit)
    .skip((page - 1) * limit);

  if (ubp) query.andWhere('asset.ubpId = :ubp', { ubp });
  if (equipment) query.andWhere('asset.equipmentType = :equipment', { equipment });
  if (year) query.andWhere('session.testYear = :year', { year });

  const [assets, total] = await query.getManyAndCount();

  // Basic map mock for UI
  const matrix = assets.map(asset => {
    return {
      id: asset.id,
      name: asset.name,
      equipmentType: asset.equipmentType,
      testCount: asset.testSessions?.length || 0,
      sessions: asset.testSessions
    };
  });

  return NextResponse.json({
    data: matrix,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
}
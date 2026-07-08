import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { Asset } from '../../../../src/entities/Asset.entity';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const equipment = url.searchParams.get('equipment');
  const ubp = url.searchParams.get('ubp');

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  
  const query = AppDataSource.getRepository(Asset).createQueryBuilder('asset');

  if (equipment) query.andWhere('asset.equipmentType = :equipment', { equipment });
  if (ubp) query.andWhere('asset.ubpId = :ubp', { ubp });

  const assets = await query.getMany();
  return NextResponse.json(assets);
}
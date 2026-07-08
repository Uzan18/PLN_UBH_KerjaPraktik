import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { EquipmentTestType } from '../../../../src/entities/EquipmentTestType.entity';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const equipmentType = url.searchParams.get('equipmentType');

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const query = AppDataSource.getRepository(EquipmentTestType).createQueryBuilder('ett')
    .leftJoinAndSelect('ett.testType', 'testType');

  if (equipmentType) {
    query.where('ett.equipmentType = :equipmentType', { equipmentType });
  }

  const mappings = await query.getMany();
  return NextResponse.json(mappings);
}
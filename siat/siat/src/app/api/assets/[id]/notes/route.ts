import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../../db';
import { Asset } from '../../../../../src/entities/Asset.entity';
import { AuditLog } from '../../../../../src/entities/AuditLog.entity';
import { permissions } from '../../../../lib/auth/rbac';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = permissions[session.user.role as keyof typeof permissions];
  if (!userPermissions.canEditAssetNotes) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { notes } = await req.json();
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const asset = await AppDataSource.getRepository(Asset).findOneBy({ id: parseInt(params.id) });
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const oldData = JSON.stringify({ notes: asset.notes });
  asset.notes = notes;
  await AppDataSource.getRepository(Asset).save(asset);

  await AppDataSource.getRepository(AuditLog).save({
    userId: session.user.id,
    action: 'UPDATE',
    tableName: 'ASSET',
    recordId: asset.id,
    oldData,
    newData: JSON.stringify({ notes }),
    reason: 'Updated asset notes'
  });

  return NextResponse.json(asset);
}
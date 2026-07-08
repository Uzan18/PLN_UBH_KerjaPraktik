import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { Asset } from '../../../../src/entities/Asset.entity';
import * as ExcelJS from 'exceljs';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const assetId = url.searchParams.get('assetId');

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const query = AppDataSource.getRepository(Asset).createQueryBuilder('asset')
    .leftJoinAndSelect('asset.testSessions', 'session', 'session.status = :status', { status: 'VALIDATED' })
    .leftJoinAndSelect('session.testType', 'testType')
    .leftJoinAndSelect('session.testResults', 'results')
    .leftJoinAndSelect('results.parameter', 'parameter')
    .leftJoinAndSelect('parameter.criteriaList', 'criteria');

  if (assetId) query.andWhere('asset.id = :assetId', { assetId });
  if (year) query.andWhere('session.testYear = :year', { year });

  const assets = await query.getMany();

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  const detailSheet = workbook.addWorksheet('Detail');
  
  summarySheet.addRow(['Asset Name', 'Equipment Type', 'Test Count']);
  detailSheet.addRow(['Asset', 'Test Type', 'Parameter', 'Value', 'Judgement', 'Basis']);

  assets.forEach(asset => {
    summarySheet.addRow([asset.name, asset.equipmentType, asset.testSessions.length]);
    asset.testSessions.forEach(session => {
        session.testResults.forEach(res => {
            detailSheet.addRow([
                asset.name,
                session.testType.name,
                res.parameter.name,
                res.value,
                res.judgement,
                res.parameter.criteriaList[0]?.judgementBasis || '-'
            ]);
        });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="export.xlsx"'
    }
  });
}
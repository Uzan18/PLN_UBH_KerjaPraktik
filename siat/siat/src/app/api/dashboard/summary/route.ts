import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../db';
import { TestSession } from '../../../../src/entities/TestSession.entity';
import { Asset } from '../../../../src/entities/Asset.entity';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const totalAssets = await AppDataSource.getRepository(Asset).count();
  
  const validatedSessions = await AppDataSource.getRepository(TestSession).find({
    where: { status: 'VALIDATED' },
    relations: ['testResults']
  });

  let goodCount = 0;
  let fairPoorCount = 0;
  let badCount = 0;

  validatedSessions.forEach(ts => {
    // Determine overall worst judgement per session here, mock data logic for now
    const worst = ts.testResults.reduce((acc, curr) => {
      const severities = { 'BAD': 4, 'POOR': 3, 'FAIR': 2, 'GOOD': 1 };
      return severities[curr.judgement] > severities[acc] ? curr.judgement : acc;
    }, 'GOOD');

    if (worst === 'GOOD') goodCount++;
    else if (worst === 'FAIR' || worst === 'POOR') fairPoorCount++;
    else if (worst === 'BAD') badCount++;
  });

  return NextResponse.json({
    totalAssets,
    statusCounts: {
      good: goodCount,
      fairPoor: fairPoorCount,
      bad: badCount
    }
  });
}
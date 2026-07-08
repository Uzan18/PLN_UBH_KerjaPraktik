import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth.config';
import { AppDataSource } from '../../../../../db';
import { TestSession, TestSessionStatus } from '../../../../../src/entities/TestSession.entity';
import { TestResult } from '../../../../../src/entities/TestResult.entity';
import { Criteria } from '../../../../../src/entities/Criteria.entity';
import { determineJudgement } from '../../../../lib/scoring/calculateScore';
import { Parameter } from '../../../../../src/entities/Parameter.entity';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const results = body.results; // [{ parameterId, value }]

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const testSession = await AppDataSource.getRepository(TestSession).findOneBy({ id: parseInt(params.id) });
  if (!testSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (testSession.status !== TestSessionStatus.DRAFT) return NextResponse.json({ error: 'Session is not in DRAFT status' }, { status: 400 });

  const testResultRepo = AppDataSource.getRepository(TestResult);
  
  for (const res of results) {
    const parameter = await AppDataSource.getRepository(Parameter).findOneBy({ id: res.parameterId });
    if(!parameter) continue;
    
    // Find active criteria
    const criteria = await AppDataSource.getRepository(Criteria).createQueryBuilder('c')
        .where('c.parameterId = :pid', { pid: res.parameterId })
        .andWhere('c.effectiveFrom <= :now', { now: new Date() })
        .andWhere('(c.effectiveTo IS NULL OR c.effectiveTo > :now)', { now: new Date() })
        .getOne();
    
    let judgement = 'NO_DATA';
    if(criteria) {
        judgement = determineJudgement(res.value, criteria, parameter.comparisonDirection);
    }
    
    const existingResult = await testResultRepo.findOneBy({ testSessionId: testSession.id, parameterId: res.parameterId });
    if(existingResult) {
        existingResult.value = res.value;
        existingResult.judgement = judgement as any;
        await testResultRepo.save(existingResult);
    } else {
        await testResultRepo.save({
            testSessionId: testSession.id,
            parameterId: res.parameterId,
            value: res.value,
            score: res.value, // Just matching the requirement for score, though determineJudgement uses value
            judgement: judgement
        });
    }
  }

  return NextResponse.json({ message: 'Results saved' });
}
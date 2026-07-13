import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { Criteria } from '@/entities/Criteria';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { canModifySession } from '@/lib/auth/rbac';
import { calculateScore, mapQualitativeValueToNumber } from '@/lib/scoring/calculateScore';
import { determineJudgement } from '@/lib/scoring/determineJudgement';
import type { JudgementLabel } from '@/types';
import { LessThanOrEqual, IsNull, MoreThanOrEqual } from 'typeorm';

/**
 * PUT /api/test-sessions/[id]/results
 * Save/update parameter values for a test session.
 * 
 * CRITICAL (CLAUDE.md Rule #1): Score and judgement are ALWAYS calculated
 * server-side. Client only sends value + parameterId.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const sessionRepo = db.getRepository<TestSession>('TestSession');
    const resultRepo = db.getRepository<TestResult>('TestResult');
    const criteriaRepo = db.getRepository<Criteria>('Criteria');
    const auditRepo = db.getRepository<AuditLog>('AuditLog');

    // Get the test session
    const testSession = await sessionRepo.findOne({ where: { id } });

    if (!testSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check ownership and status
    if (!canModifySession(session.user.role, session.user.id, testSession.createdById, testSession.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify this session' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { results, additionalInfo } = body as {
      results?: Array<{
        parameterId: string;
        value: number | null;
        isNotApplicable: boolean;
      }>;
      additionalInfo?: any;
    };

    if ((!results || !Array.isArray(results)) && additionalInfo === undefined) {
      return NextResponse.json(
        { success: false, error: 'results array or additionalInfo is required' },
        { status: 400 }
      );
    }

    // Save additionalInfo if provided
    if (additionalInfo !== undefined) {
      testSession.additionalInfoPending = additionalInfo ? JSON.stringify(additionalInfo) : null;
    }

    // Reset status to DRAFT and clear reject reason if currently REJECTED
    if (testSession.status === 'REJECTED') {
      testSession.status = 'DRAFT';
      testSession.rejectReason = null;
    }

    await sessionRepo.save(testSession);

    const savedResults = [];
    if (results && Array.isArray(results)) {
      const now = new Date();

      for (const r of results) {
      // Get criteria for this parameter (CLAUDE.md Rule #6 - versioned)
      const criteria = await criteriaRepo.createQueryBuilder('c')
        .where('c.parameter_id = :parameterId', { parameterId: r.parameterId })
        .andWhere('c.effective_from <= :now', { now })
        .andWhere('(c.effective_to IS NULL OR c.effective_to >= :now2)', { now2: now })
        .orderBy('c.effective_from', 'DESC')
        .getOne();

      // Server-side score calculation (CLAUDE.md Rule #1)
      const score = calculateScore(
        r.value,
        r.isNotApplicable,
        criteria?.goodValue ?? null,
        criteria?.fairValue ?? null,
        criteria?.poorValue ?? null,
        criteria?.badValue ?? null,
      );
      const judgement = determineJudgement(score);

      // Upsert the result
      const existing = await resultRepo.findOne({
        where: {
          testSessionId: id,
          parameterId: r.parameterId,
        },
      });

      let result;
      if (existing) {
        existing.value = r.value;
        existing.isNotApplicable = r.isNotApplicable;
        existing.score = score;
        existing.judgement = judgement as JudgementLabel;
        result = await resultRepo.save(existing);
      } else {
        const newResult = resultRepo.create({
          testSessionId: id,
          parameterId: r.parameterId,
          value: r.value,
          isNotApplicable: r.isNotApplicable,
          score,
          judgement: judgement as JudgementLabel,
        });
        result = await resultRepo.save(newResult);
      }

      savedResults.push(result);
    }
    }

    // Audit Log (CLAUDE.md Rule #5)
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE_TEST_RESULTS',
      entity: 'TestResult',
      entityId: id,
      afterData: JSON.stringify({ resultCount: savedResults.length }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: savedResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * GET /api/test-sessions/[id]/results
 * Get all results for a specific test session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const sessionRepo = db.getRepository<TestSession>('TestSession');
    const resultRepo = db.getRepository<TestResult>('TestResult');

    // Get the test session
    const testSession = await sessionRepo.findOne({ where: { id } });

    if (!testSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Role-based visibility check: INPUT users can only see their own sessions
    if (session.user.role === 'INPUT' && testSession.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch results with parameter and testType relations
    const results = await resultRepo.find({
      where: { testSessionId: id },
      relations: ['parameter', 'parameter.testType'],
      order: {
        parameter: {
          orderIndex: 'ASC',
          name: 'ASC'
        }
      }
    });

    const criteriaRepo = db.getRepository(Criteria);
    const now = testSession.createdAt || new Date();
    const mappedResults = [];

    for (const r of results) {
      const criteria = await criteriaRepo.createQueryBuilder('c')
        .where('c.parameter_id = :parameterId', { parameterId: r.parameterId })
        .andWhere('c.effective_from <= :now', { now })
        .andWhere('(c.effective_to IS NULL OR c.effective_to >= :now2)', { now2: now })
        .orderBy('c.effective_from', 'DESC')
        .getOne();

      const valNum = r.value !== null && r.value !== undefined ? Number(r.value) : null;
      let displayValue = valNum !== null ? String(valNum) : '—';
      
      if (r.isNotApplicable) {
        displayValue = 'N/A';
      } else if (valNum !== null && criteria) {
        const labelOptions = [criteria.goodValue, criteria.fairValue, criteria.poorValue, criteria.badValue]
          .filter(Boolean)
          .map((v) => String(v).trim());
          
        for (const opt of labelOptions) {
          const mapped = mapQualitativeValueToNumber(opt);
          if (mapped !== null && mapped === valNum) {
            displayValue = opt;
            break;
          }
        }
      }

      mappedResults.push({
        ...r,
        displayValue,
      });
    }

    return NextResponse.json({ success: true, data: mappedResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


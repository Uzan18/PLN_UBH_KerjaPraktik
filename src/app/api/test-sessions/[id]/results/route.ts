import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { Criteria } from '@/entities/Criteria';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { canModifySession } from '@/lib/auth/rbac';
import { calculateScore } from '@/lib/scoring/calculateScore';
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
    const sessionRepo = db.getRepository(TestSession);
    const resultRepo = db.getRepository(TestResult);
    const criteriaRepo = db.getRepository(Criteria);
    const auditRepo = db.getRepository(AuditLog);

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
    const { results } = body as {
      results: Array<{
        parameterId: string;
        value: number | null;
        isNotApplicable: boolean;
      }>;
    };

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { success: false, error: 'results array is required' },
        { status: 400 }
      );
    }

    const savedResults = [];
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

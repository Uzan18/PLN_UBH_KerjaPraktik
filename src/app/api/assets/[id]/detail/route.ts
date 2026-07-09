import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import type { JudgementLabel } from '@/types';

interface TestResultWithParam {
  isNotApplicable: boolean;
  score: number | null;
  parameter?: {
    name?: string;
    testType?: {
      name?: string;
    };
  };
}

function getMechanismScoreForSession(session: TestSession, mechanism: string): number | null {
  const results = (session.testResults as TestResultWithParam[]) || [];
  const scores: number[] = [];

  for (const r of results) {
    if (r.isNotApplicable || r.score === null || r.score === undefined) continue;

    const ttName = r.parameter?.testType?.name?.toUpperCase() || '';
    const pName = r.parameter?.name?.toUpperCase() || '';

    let match = false;
    switch (mechanism) {
      case 'Bushing-Electrical defect':
        match = ttName.includes('TAN DELTA BUSHING') || ttName.includes('WATT LOSS BUSHING');
        break;
      case 'Bushing-Mechanical defect':
        match = ttName.includes('VISUAL INSPECTION') && (pName.includes('BUSHING DEFECT') || pName.includes('CONTAMINANT'));
        break;
      case 'Deformation':
        match = ttName.includes('SFRA HV OPEN') || ttName.includes('SFRA HV SHORTED') || ttName.includes('SFRA LV OPEN') || ttName.includes('SFRA LV SHORTED');
        break;
      case 'Winding & Connection':
        match = ttName.includes('TURN TO TURN RATIO') || ttName.includes('WINDING RESISTANCE');
        break;
      case 'Core defect':
        match = ttName.includes('EXC CURRENT');
        break;
      case 'Dielectric Problem':
        match = ttName.includes('INSULATION RESISTANCE') || ttName.includes('TAN DELTA WINDING') || ttName.includes('DIRANA MOISTURE');
        break;
      case 'Oil Problem':
        match = (ttName.includes('OIL ANALYSIS') && (pName.includes('STATUS') || pName.includes('BDV'))) || ttName.includes('DIRANA OIL CONDUCT') || ttName.includes('OIL CONDUCTIVITY');
        break;
      case 'Leakage':
        match = ttName.includes('VISUAL INSPECTION') && (pName.includes('BUSHING LEAKAGE') || pName.includes('BODY & RADIATOR LEAKAGE') || pName.includes('BODY & RADIATOR'));
        break;
      case 'Thermal Problem':
        match = (ttName.includes('DGA') && (pName.includes('STATUS') || pName.includes('DAMAGE MECHANISME') || pName.includes('DAMAGE'))) || (ttName.includes('OIL ANALYSIS') && pName.includes('STATUS'));
        break;
      case 'OTI/WTI Problem':
        match = ttName.includes('OTI') || ttName.includes('WTI');
        break;
      case 'Grounding Problem':
        match = ttName.includes('GROUNDING RESISTANCE');
        break;
      case 'Breating system':
        match = ttName.includes('VISUAL INSPECTION') && (pName.includes('SILICA GEL') || pName.includes('SILICA GEL PUDAR'));
        break;
      case 'LA Problem':
        match = ttName.includes('ARRESTER');
        break;
    }

    if (match) {
      scores.push(Number(r.score));
    }
  }

  if (scores.length === 0) return null;
  return Math.min(...scores);
}

/**
 * GET /api/assets/[id]/detail
 * Returns asset info, overall health score, and status per test type.
 * Only uses VALIDATED sessions (CLAUDE.md Rule #2).
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
    requirePermission(session.user.role, 'asset:read');

    const { id } = await params;
    const url = new URL(request.url);
    const queryYear = url.searchParams.get('year') || undefined;
    const querySessionId = url.searchParams.get('sessionId') || undefined;

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const testTypeRepo = db.getRepository(TestType);

    // Get asset with all validated sessions
    const asset = await assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.ubp', 'ubp')
      .leftJoinAndSelect('asset.testSessions', 'ts', 'ts.status = :status', { status: 'VALIDATED' })
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.testType', 'tt')
      .where('asset.id = :id', { id })
      .orderBy('ts.test_year', 'DESC')
      .getOne();

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Determine which session to look at (defaults to latest validated session)
    let selectedSession = asset.testSessions?.[0];
    if (querySessionId) {
      selectedSession = asset.testSessions?.find(s => s.id === querySessionId) || selectedSession;
    } else if (queryYear) {
      selectedSession = asset.testSessions?.find(s => String(s.testYear) === queryYear) || selectedSession;
    }

    // Merge specifications of the selected session if available (for historical correctness)
    const specInfo = {
      manufacture: asset.manufacture,
      type: asset.type,
      serialNumber: asset.serialNumber,
      mfgYear: asset.mfgYear,
      vectorGroup: asset.vectorGroup,
      coolingMethod: asset.coolingMethod,
      ratedPower: asset.ratedPower,
      frequency: asset.frequency,
      hvSide: asset.hvSide,
      hvRatedCurrent: asset.hvRatedCurrent,
      lvSide: asset.lvSide,
      lvRatedCurrent: asset.lvRatedCurrent,
    };

    if (selectedSession?.additionalInfo) {
      try {
        const approved = JSON.parse(selectedSession.additionalInfo);
        Object.entries(approved).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            if (k === 'mfgYear') {
              specInfo.mfgYear = v ? Number(v) : null;
            } else {
              (specInfo as any)[k] = String(v);
            }
          }
        });
      } catch (err) {
        console.error('Failed to parse approved additional info for asset detail:', err);
      }
    }

    // Get all test types
    const testTypes = await testTypeRepo.find({
      relations: ['parameters'],
      order: {
        orderIndex: 'ASC',
        parameters: {
          orderIndex: 'ASC',
        },
      },
    });

    // Build status per test type from selected validated session
    const allScores: (number | null)[] = [];
    const allJudgements: (JudgementLabel | null)[] = [];

    const testTypeStatuses = testTypes.map((tt) => {
      const results = selectedSession?.testResults?.filter(
        (r) => r.parameter?.testTypeId === tt.id
      ) || [];

      const judgements = results.map((r) => r.judgement as JudgementLabel | null);
      const scores = results.map((r) => r.score !== null && r.score !== undefined ? Number(r.score) : null);

      allScores.push(...scores);
      allJudgements.push(...judgements);

      const parameters = tt.parameters.map((param) => {
        const result = results.find((r) => r.parameterId === param.id);
        return {
          parameterId: param.id,
          parameterName: param.name,
          unit: param.unit,
          value: result?.value !== null && result?.value !== undefined ? Number(result.value) : null,
          isNotApplicable: result?.isNotApplicable || false,
          score: result?.score !== null && result?.score !== undefined ? Number(result.score) : null,
          judgement: (result?.judgement as JudgementLabel) || null,
        };
      });

      return {
        testTypeId: tt.id,
        testTypeName: tt.name,
        judgement: aggregateAssetStatus(judgements),
        parameters,
      };
    });

    // Dynamic Damage Mechanism aggregation for this asset and selected session
    const mechanisms = [
      'Deformation',
      'Dielectric Problem',
      'OTI/WTI Problem',
      'Leakage',
      'LA Problem',
      'Core defect',
      'Bushing-Electrical defect',
      'Oil Problem',
      'Grounding Problem',
      'Bushing-Mechanical defect',
      'Winding & Connection',
      'Thermal Problem',
      'Breating system',
    ];

    const damageMechanisms = selectedSession
      ? mechanisms.map((m) => {
          const score = getMechanismScoreForSession(selectedSession, m);
          return { name: m, score };
        })
      : [];

    // Deduplicate sessions by year (keep latest per year, already sorted DESC)
    const seenYears = new Set<number>();
    const uniqueSessions = (asset.testSessions || []).filter(s => {
      if (seenYears.has(s.testYear)) return false;
      seenYears.add(s.testYear);
      return true;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id,
        name: asset.name,
        equipmentType: asset.equipmentType,
        ...specInfo,
        ubpName: asset.ubp?.name || '',
        lastTestYear: selectedSession?.testYear || null,
        overallJudgement: aggregateAssetStatus(allJudgements),
        testTypeStatuses,
        damageMechanisms,
        selectedSessionId: selectedSession?.id || null,
        selectedTestYear: selectedSession?.testYear || null,
        latestSessionId: asset.testSessions?.[0]?.id || null,
        availableSessions: uniqueSessions.map(s => ({ id: s.id, year: s.testYear })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

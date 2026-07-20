import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { UnitPembangkit } from '@/entities/UnitPembangkit';
import { JenisAsset } from '@/entities/JenisAsset';
import { TestType } from '@/entities/TestType';
import { TestSession } from '@/entities/TestSession';
import { Criteria } from '@/entities/Criteria';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';
import { mapQualitativeValueToNumber } from '@/lib/scoring/calculateScore';
import type { JudgementLabel } from '@/types';

const TEST_TYPE_ORDER = [
  'INSULATION RESISTANCE',
  'POLARITY INDEX',
  'TURN TO TURN RATIO',
  'WINDING RESISTANCE HV',
  'WINDING RESISTANCE LV',
  'SFRA HV OPEN',
  'SFRA HV SHORTED',
  'SFRA LV OPEN',
  'SFRA LV SHORTED',
  'EXC CURRENT',
  'TAN DELTA WINDING',
  'TAN DELTA BUSHING',
  'WATT LOSS BUSHING BUSHING',
  'GROUNDING RESISTANCE',
  'DIRANA MOISTURE',
  'DIRANA OIL CONDUCT',
  'ARRESTER GROUND',
  'ARRESTER IR',
  'ARRESTER WATT LOSS',
  'VISUAL INSPECTION',
  'OTI ',
  'WTI',
  'DGA',
  'OIL ANALYSIS',
  'RLA'
];

interface TestResultWithParam {
  isNotApplicable: boolean;
  score: number | null;
  parameter?: {
    name?: string;
    damageMechanisms?: string | null;
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

    const damageMechs = r.parameter?.damageMechanisms
      ? r.parameter.damageMechanisms.split(',').map((m) => m.trim().toUpperCase())
      : [];

    if (damageMechs.includes(mechanism.toUpperCase())) {
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
      .leftJoinAndSelect('asset.unitPembangkit', 'up')
      .leftJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
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

    const criteriaRepo = db.getRepository(Criteria);
    const now = selectedSession?.createdAt || new Date();

    const testTypeStatuses = [];
    for (const tt of testTypes) {
      const results = selectedSession?.testResults?.filter(
        (r) => r.parameter?.testTypeId === tt.id
      ) || [];

      const judgements = results.map((r) => r.judgement as JudgementLabel | null);
      const scores = results.map((r) => r.score !== null && r.score !== undefined ? Number(r.score) : null);

      allScores.push(...scores);
      allJudgements.push(...judgements);

      const parameters = [];
      for (const param of tt.parameters) {
        const result = results.find((r) => r.parameterId === param.id);
        const valNum = result?.value !== null && result?.value !== undefined ? Number(result.value) : null;
        let displayValue = valNum !== null ? String(valNum) : '—';

        if (result?.isNotApplicable) {
          displayValue = 'N/A';
        } else if (valNum !== null) {
          const criteria = await criteriaRepo.createQueryBuilder('c')
            .where('c.parameter_id = :parameterId', { parameterId: param.id })
            .andWhere('c.effective_from <= :now', { now })
            .andWhere('(c.effective_to IS NULL OR c.effective_to >= :now2)', { now2: now })
            .orderBy('c.effective_from', 'DESC')
            .getOne();

          if (criteria) {
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
        }

        parameters.push({
          parameterId: param.id,
          parameterName: param.name,
          unit: param.unit,
          value: valNum,
          displayValue,
          isNotApplicable: result?.isNotApplicable || false,
          score: result?.score !== null && result?.score !== undefined ? Number(result.score) : null,
          judgement: (result?.judgement as JudgementLabel) || null,
        });
      }

      testTypeStatuses.push({
        testTypeId: tt.id,
        testTypeName: tt.name,
        standard: tt.standard,
        judgement: aggregateAssetStatus(judgements),
        parameters,
      });
    }

    // Dynamic Damage Mechanism aggregation for this asset and selected session
    let mechanisms: string[] = [];
    try {
      const mechanismsRes = await db.query(`SELECT name FROM damage_mechanism ORDER BY name ASC`);
      mechanisms = mechanismsRes.map((r: any) => r.NAME || r.name);
    } catch (e) {
      mechanisms = [
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
    }

    const damageMechanisms = selectedSession
      ? mechanisms.map((m) => {
          const score = getMechanismScoreForSession(selectedSession, m);
          return { name: m, score };
        })
      : [];

    // Deduplicate sessions by year and event (already sorted DESC)
    const seenSessionKeys = new Set<string>();
    const uniqueSessions = (asset.testSessions || []).filter(s => {
      const key = `${s.testYear}-${s.testEvent || 'default'}`;
      if (seenSessionKeys.has(key)) return false;
      seenSessionKeys.add(key);
      return true;
    });

    // Sort testTypeStatuses according to TEST_TYPE_ORDER
    const sortedTestTypeStatuses = [...testTypeStatuses].sort((a, b) => {
      const nameA = (a.testTypeName || '').trim().toUpperCase();
      const nameB = (b.testTypeName || '').trim().toUpperCase();
      const idxA = TEST_TYPE_ORDER.indexOf(nameA);
      const idxB = TEST_TYPE_ORDER.indexOf(nameB);
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      return posA - posB;
    });

    // Calculate 3-year test types status counts trend
    const distinctYears = Array.from(new Set((asset.testSessions || []).map((s) => s.testYear)))
      .sort((a, b) => b - a); // Descending order
    const last3Years = distinctYears.slice(0, 3); // Take latest 3 years

    const trendData = last3Years.map((y) => {
      let good = 0;
      let fair = 0;
      let poor = 0;
      let bad = 0;

      const yearSession = (asset.testSessions || []).find((s) => s.testYear === y);
      if (yearSession) {
        // Group testResults by testType
        const testTypeJudgements: Record<string, (JudgementLabel | null)[]> = {};
        for (const r of yearSession.testResults || []) {
          const testTypeId = r.parameter?.testTypeId;
          if (testTypeId) {
            if (!testTypeJudgements[testTypeId]) {
              testTypeJudgements[testTypeId] = [];
            }
            testTypeJudgements[testTypeId].push(r.judgement as JudgementLabel | null);
          }
        }

        // Aggregate for each testType
        for (const ttId in testTypeJudgements) {
          const overall = aggregateAssetStatus(testTypeJudgements[ttId]);
          if (overall === 'GOOD') good++;
          else if (overall === 'FAIR') fair++;
          else if (overall === 'POOR') poor++;
          else if (overall === 'BAD') bad++;
        }
      }

      return {
        year: String(y),
        GOOD: good,
        FAIR: fair,
        POOR: poor,
        BAD: bad,
      };
    });

    // Sort ascending by year for chart representation (e.g. 2024 -> 2025 -> 2026)
    trendData.sort((a, b) => a.year.localeCompare(b.year));

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id,
        name: asset.name,
        unitName: asset.unitPembangkit?.name || '',
        equipmentType: asset.jenisAsset?.name || '',
        infoFields: asset.jenisAsset?.infoFields || null,
        customMetadata: asset.customMetadata || null,
        ...specInfo,
        ubpName: asset.unitPembangkit?.ubp?.name || '',
        lastTestYear: selectedSession?.testYear || null,
        overallJudgement: aggregateAssetStatus(allJudgements),
        testTypeStatuses: sortedTestTypeStatuses,
        damageMechanisms,
        selectedSessionId: selectedSession?.id || null,
        selectedTestYear: selectedSession?.testYear || null,
        selectedSessionEvent: selectedSession?.testEvent || null,
        latestSessionId: asset.testSessions?.[0]?.id || null,
        availableSessions: uniqueSessions.map(s => ({
          id: s.id,
          year: s.testYear,
          event: s.testEvent || null
        })),
        trend: trendData,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

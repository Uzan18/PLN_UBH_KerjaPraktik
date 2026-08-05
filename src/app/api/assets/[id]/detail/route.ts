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
import { mapQualitativeValueToNumber, isQuantitativeThreshold } from '@/lib/scoring/calculateScore';
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
    damageMechanisms?: Array<{ name: string }> | null;
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

    const damageMechs = (r.parameter?.damageMechanisms ?? [])
      .map((dm: { name: string }) => dm.name.toUpperCase());

    if (damageMechs.includes(mechanism.toUpperCase())) {
      scores.push(Number(r.score));
    }
  }

  if (scores.length === 0) return null;
  return Math.min(...scores);
}

/**
 * GET /api/assets/[id]/detail
 * Mengembalikan informasi detail aset, status kesehatan peralatan, dan riwayat per jenis pengujian.
 * Hanya memperhitungkan sesi pengujian berstatus VALIDATED.
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

    // Get asset with all validated sessions and mapped test types
    const asset = await assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.unitPembangkit', 'up')
      .leftJoinAndSelect('up.ubp', 'ubp')
      .leftJoinAndSelect('asset.jenisAsset', 'ja')
      .leftJoinAndSelect('asset.testTypes', 'att')
      .leftJoinAndSelect('asset.testSessions', 'ts', 'ts.status = :status', { status: 'VALIDATED' })
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'param')
      .leftJoinAndSelect('param.damageMechanisms', 'pdm')
      .leftJoinAndSelect('param.testType', 'tt')
      .where('asset.id = :id', { id })
      .orderBy('ts.test_year', 'DESC')
      .getOne();

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Ensure damageMechanisms on parameters are populated even if TypeORM join is empty
    try {
      const pdmMappings = await db.query(
        `SELECT parameter_id, damage_mechanism_name FROM parameter_damage_mechanism`
      );
      const pdmMap: Record<string, Array<{ name: string }>> = {};
      for (const r of pdmMappings) {
        const pid: string = r.PARAMETER_ID ?? r.parameter_id;
        const mname: string = r.DAMAGE_MECHANISM_NAME ?? r.damage_mechanism_name;
        if (pid && mname) {
          if (!pdmMap[pid]) pdmMap[pid] = [];
          pdmMap[pid].push({ name: mname });
        }
      }

      for (const s of asset.testSessions || []) {
        for (const tr of s.testResults || []) {
          if (tr.parameter) {
            if (pdmMap[tr.parameter.id] && pdmMap[tr.parameter.id].length > 0) {
              tr.parameter.damageMechanisms = pdmMap[tr.parameter.id] as any;
            } else if (!tr.parameter.damageMechanisms) {
              tr.parameter.damageMechanisms = [];
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load raw parameter_damage_mechanism mappings in asset detail:', e);
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
    const allTestTypes = await testTypeRepo.find({
      relations: ['parameters'],
      order: {
        orderIndex: 'ASC',
        parameters: {
          orderIndex: 'ASC',
        },
      },
    });

    // Collect test type IDs that are mapped to this asset/jenisAsset or have results in selectedSession
    const mappedTestTypeIds = new Set<string>();

    if (asset.testTypes && asset.testTypes.length > 0) {
      asset.testTypes.forEach((t) => mappedTestTypeIds.add(t.id));
    }

    if (asset.jenisAssetId) {
      allTestTypes.forEach((tt) => {
        if (tt.jenisAssetId === asset.jenisAssetId) {
          mappedTestTypeIds.add(tt.id);
        }
      });
    }

    const sessionTestTypeIds = new Set<string>();
    selectedSession?.testResults?.forEach((r) => {
      if (r.parameter?.testTypeId) {
        sessionTestTypeIds.add(r.parameter.testTypeId);
      }
    });

    const testTypes = allTestTypes.filter((tt) => {
      if (mappedTestTypeIds.size > 0) {
        return mappedTestTypeIds.has(tt.id) || sessionTestTypeIds.has(tt.id);
      }
      return sessionTestTypeIds.has(tt.id);
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
            let matchedOpt = null;
            const isQualText = (opt: string | null) => opt && !isQuantitativeThreshold(opt);
            
            if (criteria.goodValue && (mapQualitativeValueToNumber(criteria.goodValue) === valNum || (isQualText(criteria.goodValue) && mapQualitativeValueToNumber(criteria.goodValue) === null && valNum === 0))) {
              matchedOpt = criteria.goodValue;
            } else if (criteria.fairValue && (mapQualitativeValueToNumber(criteria.fairValue) === valNum || (isQualText(criteria.fairValue) && mapQualitativeValueToNumber(criteria.fairValue) === null && valNum === 1))) {
              matchedOpt = criteria.fairValue;
            } else if (criteria.poorValue && (mapQualitativeValueToNumber(criteria.poorValue) === valNum || (isQualText(criteria.poorValue) && mapQualitativeValueToNumber(criteria.poorValue) === null && valNum === 2))) {
              matchedOpt = criteria.poorValue;
            } else if (criteria.badValue && (mapQualitativeValueToNumber(criteria.badValue) === valNum || (isQualText(criteria.badValue) && mapQualitativeValueToNumber(criteria.badValue) === null && valNum === 3))) {
              matchedOpt = criteria.badValue;
            }
            
            if (matchedOpt !== null) {
              displayValue = matchedOpt;
            } else {
              const labelOptions = [criteria.goodValue, criteria.fairValue, criteria.poorValue, criteria.badValue]
                .filter((v): v is string => Boolean(v && isQualText(v)))
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
      mechanisms = [];
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

    // 1. Calculate 5-year test types status counts trend
    const distinctYears = Array.from(new Set((asset.testSessions || []).map((s) => s.testYear)))
      .sort((a, b) => b - a); // Descending order
    const last5Years = distinctYears.slice(0, 5); // Take latest 5 years

    const trendData = last5Years.map((y) => {
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
    trendData.sort((a, b) => a.year.localeCompare(b.year));

    // 2. Calculate 5-latest-sessions test types status counts trend
    const latest5Sessions = (uniqueSessions || []).slice(0, 5); // Take latest 5 unique sessions

    const trendSessionsData = latest5Sessions.map((sess) => {
      let good = 0;
      let fair = 0;
      let poor = 0;
      let bad = 0;

      const testTypeJudgements: Record<string, (JudgementLabel | null)[]> = {};
      for (const r of sess.testResults || []) {
        const testTypeId = r.parameter?.testTypeId;
        if (testTypeId) {
          if (!testTypeJudgements[testTypeId]) {
            testTypeJudgements[testTypeId] = [];
          }
          testTypeJudgements[testTypeId].push(r.judgement as JudgementLabel | null);
        }
      }

      for (const ttId in testTypeJudgements) {
        const overall = aggregateAssetStatus(testTypeJudgements[ttId]);
        if (overall === 'GOOD') good++;
        else if (overall === 'FAIR') fair++;
        else if (overall === 'POOR') poor++;
        else if (overall === 'BAD') bad++;
      }

      const eventName = sess.testEvent && sess.testEvent !== 'default' ? sess.testEvent : `Tahun ${sess.testYear}`;

      return {
        id: sess.id,
        year: String(sess.testYear),
        event: sess.testEvent || null,
        label: eventName,
        GOOD: good,
        FAIR: fair,
        POOR: poor,
        BAD: bad,
      };
    });
    // Reverse so latest is on the right chronologically
    trendSessionsData.reverse();

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
        allSessions: (uniqueSessions || []).map((s) => ({
          id: s.id,
          testYear: s.testYear,
          testEvent: s.testEvent || null,
          createdAt: s.createdAt,
          testResults: (s.testResults || []).map((r) => ({
            parameterId: r.parameter?.id || r.parameterId,
            value: r.value,
            displayValue: (r as any).displayValue,
            isNotApplicable: r.isNotApplicable,
            judgement: r.judgement,
            parameter: {
              id: r.parameter?.id,
              name: r.parameter?.name,
              unit: r.parameter?.unit,
              testTypeId: r.parameter?.testTypeId,
            },
          })),
        })),
        trend: trendData,
        trendSessions: trendSessionsData,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

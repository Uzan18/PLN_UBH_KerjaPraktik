import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { ReportFile } from '@/entities/ReportFile';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { aggregateAssetStatus } from '@/lib/scoring/aggregateAssetStatus';


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
 * GET /api/dashboard/summary
 * Returns KPI cards data: total assets, total records, judgement distribution.
 * Only counts VALIDATED sessions (CLAUDE.md Rule #2).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'dashboard:read');

    const url = new URL(request.url);
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : undefined;
    const ubpId = url.searchParams.get('ubpId') || undefined;
    const assetId = url.searchParams.get('assetId') || undefined;
    const equipmentType = url.searchParams.get('equipmentType') || undefined;

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const sessionRepo = db.getRepository(TestSession);

    // Total assets
    const assetQb = assetRepo.createQueryBuilder('asset');
    if (ubpId) assetQb.where('asset.ubp_id = :ubpId', { ubpId });
    if (assetId) assetQb.andWhere('asset.id = :assetId', { assetId });
    if (equipmentType) assetQb.andWhere('asset.equipmentType = :equipmentType', { equipmentType: equipmentType.trim() });
    const totalAssets = await assetQb.getCount();

    // Get validated sessions with results and asset relationship loaded
    const sessQb = sessionRepo.createQueryBuilder('ts')
      .leftJoinAndSelect('ts.testResults', 'tr')
      .leftJoinAndSelect('tr.parameter', 'p')
      .leftJoinAndSelect('p.testType', 'tt')
      .leftJoinAndSelect('ts.asset', 'asset')
      .where('ts.status = :status', { status: 'VALIDATED' });

    if (year) sessQb.andWhere('ts.test_year = :year', { year });
    if (ubpId) {
      sessQb.andWhere('asset.ubp_id = :ubpId', { ubpId });
    }
    if (assetId) {
      sessQb.andWhere('ts.asset_id = :assetId', { assetId });
    }
    if (equipmentType) {
      sessQb.andWhere('asset.equipmentType = :equipmentType', { equipmentType: equipmentType.trim() });
    }

    const validatedSessions = await sessQb.getMany();
    const totalRecords = validatedSessions.length;

    // Count judgements across all validated sessions (each session counts as 1 overall condition)
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;
    let badCount = 0;

    for (const s of validatedSessions) {
      const judgements = s.testResults.map(r => r.judgement);
      const overallJudgement = aggregateAssetStatus(judgements);
      switch (overallJudgement) {
        case 'GOOD': goodCount++; break;
        case 'FAIR': fairCount++; break;
        case 'POOR': poorCount++; break;
        case 'BAD': badCount++; break;
      }
    }

    // Dynamic Damage Mechanism aggregation
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

    const damageMechanisms = mechanisms.map((m) => {
      let count = 0;
      const affectedAssets: Array<{ id: string; name: string }> = [];

      for (const s of validatedSessions) {
        const score = getMechanismScoreForSession(s, m);
        if (score !== null && score <= 4) {
          count++;
          if (s.asset) {
            // Avoid duplicates in affected assets list
            if (!affectedAssets.some((a) => a.id === s.asset.id)) {
              affectedAssets.push({
                id: s.asset.id,
                name: s.asset.name,
              });
            }
          }
        }
      }
      const percentage = totalRecords > 0 ? parseFloat(((count / totalRecords) * 100).toFixed(1)) : 0;
      return {
        name: m,
        count,
        percentage,
        affectedAssets,
      };
    });

    // Sort descending by count
    damageMechanisms.sort((a, b) => b.count - a.count);

    // Fetch unique years from database test sessions
    const yearsResult = await sessionRepo.createQueryBuilder('ts')
      .select('DISTINCT ts.test_year', 'year')
      .where('ts.status = :status', { status: 'VALIDATED' })
      .orderBy('ts.test_year', 'DESC')
      .getRawMany();
    const availableYears = yearsResult.map((r: { year: number }) => String(r.year));

    // Fetch latest 5 uploaded report files
    const fileRepo = db.getRepository(ReportFile);
    const recentReports = await fileRepo.find({
      relations: ['uploadedBy', 'directory'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const recentReportsData = recentReports.map((file) => ({
      id: file.id,
      name: file.name,
      filePath: file.filePath,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy?.name || 'Sistem',
      directoryName: file.directory?.name || 'Root',
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalAssets,
        totalRecords,
        goodCount,
        fairCount,
        poorCount,
        badCount,
        damageMechanisms,
        availableYears,
        recentReports: recentReportsData,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

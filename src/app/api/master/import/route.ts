import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Ubp } from '@/entities/Ubp';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { Criteria } from '@/entities/Criteria';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { ReportFile } from '@/entities/ReportFile';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { calculateScore, mapQualitativeValueToNumber } from '@/lib/scoring/calculateScore';
import { determineJudgement } from '@/lib/scoring/determineJudgement';
import * as XLSX from 'xlsx';

// Standard Criteria Lookup Helper
function lookupCriteria(testType: string, param: string): { good: string | null; fair: string | null; poor: string | null; bad: string | null } {
  const tt = testType.toUpperCase();
  const p = param.toUpperCase();

  if (tt.includes('INSULATION RESISTANCE')) {
    return { good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5' };
  }
  if (tt.includes('POLARITY INDEX') || tt.includes('POLARITION INDEX')) {
    return { good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0' };
  }
  if (tt.includes('TURN TO TURN RATIO')) {
    return { good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' };
  }
  if (tt.includes('WINDING RESISTANCE')) {
    if (p.includes('DEV') || p.includes('DEVIASI')) {
      return { good: '<= 2', fair: '2.01 - 3', poor: '3.01 - 5', bad: '> 5' };
    }
    return { good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' };
  }
  if (tt.includes('SFRA')) {
    // Qualitative check
    return { good: 'Normal winding', fair: 'Slight Deformation', poor: 'Obvious Deformation', bad: 'Severe Deformation' };
  }
  if (tt.includes('EXC CURRENT')) {
    if (p.includes('DEV') || p.includes('DEVIASI')) {
      return { good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' };
    }
    return { good: '<= 50', fair: '51 - 100', poor: '101 - 200', bad: '> 200' };
  }
  if (tt.includes('TAN DELTA WINDING')) {
    return { good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' };
  }
  if (tt.includes('TAN DELTA BUSHING')) {
    return { good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0' };
  }
  if (tt.includes('WATT LOSS BUSHING')) {
    return { good: '<= 200', fair: '201 - 500', poor: '501 - 1000', bad: '> 1000' };
  }
  if (tt.includes('GROUNDING RESISTANCE') || tt.includes('ARRESTER GROUND')) {
    return { good: '<= 1', fair: '1.01 - 5', poor: '5.01 - 10', bad: '> 10' };
  }
  if (tt.includes('DIRANA MOISTURE')) {
    return { good: '<= 2', fair: '2.01 - 3', poor: '3.01 - 4', bad: '> 4' };
  }
  if (tt.includes('DIRANA OIL CONDUCT') || tt.includes('OIL CONDUCTIVITY')) {
    return { good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 25', bad: '> 25' };
  }
  if (tt.includes('ARRESTER IR')) {
    return { good: '>= 1000', fair: '500 - 999', poor: '100 - 499', bad: '< 100' };
  }
  if (tt.includes('ARRESTER WATT LOSS')) {
    return { good: '<= 0.5', fair: '0.51 - 1', poor: '1.01 - 2', bad: '> 2' };
  }
  if (tt.includes('VISUAL INSPECTION') || tt.includes('VISUAL')) {
    return { good: 'TIDAK ADA', fair: null, poor: null, bad: 'ADA' };
  }
  if (tt.includes('OTI') || tt.includes('WTI')) {
    return { good: 'GOOD', fair: 'FAIR', poor: 'POOR', bad: 'BAD' };
  }

  return { good: null, fair: null, poor: null, bad: null };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    requirePermission(session.user.role, 'master-data:write');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File Excel diperlukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['PLAN MODEL'];

    if (!sheet) {
      return NextResponse.json({ 
        success: false, 
        error: 'Format Excel tidak valid. Sheet "PLAN MODEL" tidak ditemukan.' 
      }, { status: 400 });
    }

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 11) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sheet "PLAN MODEL" kosong atau baris data terlalu sedikit.' 
      }, { status: 400 });
    }

    const db = await getDb();

    // Perform DB Clean Slate and Import in a single transaction
    const importResult = await db.transaction(async (transactionManager) => {
      console.log('🧹 Purging ALL operational and master-data tables...');
      
      // 1. Delete operational tables
      await transactionManager.createQueryBuilder().delete().from(ReportFile).execute();
      await transactionManager.createQueryBuilder().delete().from(ReportDirectory).execute();
      await transactionManager.createQueryBuilder().delete().from(TestResult).execute();
      await transactionManager.createQueryBuilder().delete().from(TestSession).execute();
      await transactionManager.createQueryBuilder().delete().from(Asset).execute();
      await transactionManager.createQueryBuilder().delete().from(Ubp).execute();

      // 2. Delete test type parameter master-data tables
      await transactionManager.createQueryBuilder().delete().from(Criteria).execute();
      await transactionManager.createQueryBuilder().delete().from(Parameter).execute();
      await transactionManager.createQueryBuilder().delete().from(TestType).execute();
      
      console.log('📦 Discovering and creating TestTypes and Parameters exactly matching the sheet columns...');

      const testTypeMap = new Map<string, TestType>();
      const parameterMap = new Map<string, Parameter>();
      const criteriaListToSave: Criteria[] = [];

      const row2 = rows[1]; // main test type header row (Excel Row 2)
      const row3 = rows[2]; // parameter header row (Excel Row 3)
      const row4 = rows[3]; // unit header row (Excel Row 4)

      let currentTestTypeHeader = '';
      let testTypeOrder = 1;

      // Scan value columns (index 9 to 100)
      for (let colIdx = 9; colIdx <= 100; colIdx++) {
        const h2 = row2[colIdx];
        const h3 = row3[colIdx];
        const h4 = row4[colIdx];

        if (h2) {
          currentTestTypeHeader = String(h2).trim().toUpperCase();
        }

        if (!currentTestTypeHeader || !h3) {
          continue;
        }

        const paramName = String(h3).trim();
        const unitName = h4 ? String(h4).trim() : null;

        // Resolve TestType
        let testTypeObj = testTypeMap.get(currentTestTypeHeader);
        if (!testTypeObj) {
          testTypeObj = transactionManager.create(TestType, {
            name: currentTestTypeHeader,
            orderIndex: testTypeOrder++,
          });
          await transactionManager.save(TestType, testTypeObj);
          testTypeMap.set(currentTestTypeHeader, testTypeObj);
        }

        // Resolve Parameter
        const paramKey = `${testTypeObj.id}||${paramName.toLowerCase()}`;
        let paramObj = parameterMap.get(paramKey);
        if (!paramObj) {
          const currentParamsCount = Array.from(parameterMap.values()).filter(
            (p) => p.testTypeId === testTypeObj!.id
          ).length;

          paramObj = transactionManager.create(Parameter, {
            testTypeId: testTypeObj.id,
            name: paramName,
            unit: unitName,
            orderIndex: currentParamsCount + 1,
          });
          await transactionManager.save(Parameter, paramObj);
          parameterMap.set(paramKey, paramObj);

          // Build Criteria for this parameter
          const bounds = lookupCriteria(currentTestTypeHeader, paramName);
          const criteriaObj = transactionManager.create(Criteria, {
            parameterId: paramObj.id,
            goodValue: bounds.good,
            fairValue: bounds.fair,
            poorValue: bounds.poor,
            badValue: bounds.bad,
            createdBy: session.user.id,
          });
          criteriaListToSave.push(criteriaObj);
        }
      }

      // Save all criteria
      if (criteriaListToSave.length > 0) {
        await transactionManager.save(Criteria, criteriaListToSave);
      }

      console.log(`📦 Recreated ${testTypeMap.size} TestTypes and ${parameterMap.size} Parameters.`);

      const ubpCache = new Map<string, Ubp>();
      const assetCache = new Map<string, Asset>();
      const sessionCache = new Map<string, TestSession>();

      let resultRecordCount = 0;
      let skippedRows = 0;

      // Loop starting from row 11 (index 10) to import real measurements
      for (let i = 10; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const testYearVal = row[1];
        const ubpNameVal = row[2];
        const assetNameVal = row[3];
        const mfgYearVal = row[4];
        const equipmentTypeVal = row[5] || 'Main Trafo';
        const vectorGroupVal = row[6];
        const serialNumberVal = row[7];

        if (!testYearVal || !ubpNameVal || !assetNameVal) {
          skippedRows++;
          continue;
        }

        const testYear = parseInt(testYearVal);
        const ubpName = String(ubpNameVal).trim();
        const assetName = String(assetNameVal).trim();

        // 1. Resolve UBP
        let ubpObj = ubpCache.get(ubpName);
        if (!ubpObj) {
          ubpObj = transactionManager.create(Ubp, { name: ubpName });
          await transactionManager.save(Ubp, ubpObj);
          ubpCache.set(ubpName, ubpObj);
        }

        // 2. Resolve Asset
        const assetKey = `${ubpName}||${assetName}`;
        let assetObj = assetCache.get(assetKey);
        if (!assetObj) {
          assetObj = transactionManager.create(Asset, {
            ubpId: ubpObj.id,
            name: assetName,
            equipmentType: String(equipmentTypeVal).trim(),
            mfgYear: mfgYearVal ? parseInt(mfgYearVal) : null,
            vectorGroup: vectorGroupVal ? String(vectorGroupVal).trim() : null,
            serialNumber: serialNumberVal ? String(serialNumberVal).trim() : null,
          });
          await transactionManager.save(Asset, assetObj);
          assetCache.set(assetKey, assetObj);
        }

        // 3. Resolve Test Session
        const sessionKey = `${assetKey}||${testYear}`;
        let sessionObj = sessionCache.get(sessionKey);
        if (!sessionObj) {
          sessionObj = transactionManager.create(TestSession, {
            assetId: assetObj.id,
            testYear: testYear,
            status: 'VALIDATED',
            createdById: session.user.id,
            validatedById: session.user.id,
            validatedAt: new Date(),
          });
          await transactionManager.save(TestSession, sessionObj);
          sessionCache.set(sessionKey, sessionObj);
        }

        // 4. Map columns index 9 to 100 into TestResult
        let ttHeader = '';
        for (let colIdx = 9; colIdx <= 100; colIdx++) {
          const h2 = row2[colIdx];
          const h3 = row3[colIdx];

          if (h2) {
            ttHeader = String(h2).trim().toUpperCase();
          }

          if (!ttHeader || !h3) {
            continue;
          }

          const paramName = String(h3).trim();

          const testTypeObj = testTypeMap.get(ttHeader);
          if (!testTypeObj) continue;

          const paramKey = `${testTypeObj.id}||${paramName.toLowerCase()}`;
          const paramObj = parameterMap.get(paramKey);
          if (!paramObj) continue;

          const rawValue = row[colIdx];
          
          // Calculate score column index dynamically based on offset blocks
          let scoreColIdx = -1;
          if (colIdx <= 83) {
            scoreColIdx = colIdx + 94;
          } else if (colIdx >= 85) {
            if (colIdx === 92 || colIdx === 93) {
              scoreColIdx = colIdx + 91; // maps to OTI/WTI score columns
            } else if (colIdx === 96) {
              scoreColIdx = 187; // maps to OIL ANALYSIS status score
            } else if (colIdx === 97) {
              scoreColIdx = 190; // maps to BDV score
            } else {
              scoreColIdx = colIdx + 93;
            }
          }
          
          const rawScore = scoreColIdx !== -1 ? row[scoreColIdx] : null;

          let isNotApplicable = false;
          let numericValue: number | null = null;
          let score: number | null = null;

          // Resolve Value
          const rawStr = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : '';
          const cleanRaw = rawStr.toUpperCase();

          if (rawValue === null || rawValue === undefined || cleanRaw === 'NA' || cleanRaw === 'N/A' || cleanRaw === '') {
            isNotApplicable = true;
          } else {
            const qualMapped = mapQualitativeValueToNumber(rawStr);
            if (qualMapped !== null) {
              numericValue = qualMapped;
              isNotApplicable = false;
            } else {
              numericValue = parseFloat(rawStr.replace(/,/g, ''));
              if (isNaN(numericValue)) {
                numericValue = null;
                isNotApplicable = true;
              }
            }
          }

          // Resolve Score
          if (!isNotApplicable) {
            if (rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== '' && String(rawScore).trim().toUpperCase() !== 'NA' && String(rawScore).trim().toUpperCase() !== 'N/A') {
              const parsedScore = parseInt(String(rawScore));
              if (!isNaN(parsedScore) && [1, 2, 4, 5].includes(parsedScore)) {
                score = parsedScore;
              }
            }

            // Fallback: calculate using criteria
            if (score === null) {
              const bounds = lookupCriteria(ttHeader, paramName);
              score = calculateScore(
                numericValue,
                false,
                bounds.good,
                bounds.fair,
                bounds.poor,
                bounds.bad
              );
            }
          }

          const judgement = determineJudgement(score);

          // Save Result
          const testResult = transactionManager.create(TestResult, {
            testSessionId: sessionObj.id,
            parameterId: paramObj.id,
            value: numericValue,
            isNotApplicable: isNotApplicable,
            score: score,
            judgement: judgement,
          });
          await transactionManager.save(TestResult, testResult);

          resultRecordCount++;
        }
      }

      console.log('📂 Re-creating report directories structure...');
      for (const [ubpName, ubpObj] of ubpCache.entries()) {
        const rootFolder = transactionManager.create(ReportDirectory, {
          name: ubpName,
          parentId: null,
        });
        await transactionManager.save(ReportDirectory, rootFolder);

        const ubpAssets = Array.from(assetCache.values()).filter((a) => a.ubpId === ubpObj.id);
        const uniqueUnitNames = new Set(ubpAssets.map((a) => a.name.trim()));
        for (const unitName of uniqueUnitNames) {
          const assetFolder = transactionManager.create(ReportDirectory, {
            name: unitName,
            parentId: rootFolder.id,
          });
          await transactionManager.save(ReportDirectory, assetFolder);
        }
      }

      return {
        testTypesCount: testTypeMap.size,
        parametersCount: parameterMap.size,
        ubpsCount: ubpCache.size,
        assetsCount: assetCache.size,
        sessionsCount: sessionCache.size,
        resultsCount: resultRecordCount,
        skippedRows,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Data berhasil diimpor.',
      data: importResult
    });

  } catch (error) {
    console.error('Import Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

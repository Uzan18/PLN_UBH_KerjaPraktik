import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';
import {
  Ubp,
  Asset,
  TestType,
  Parameter,
  Criteria,
  TestSession,
  TestResult,
  User,
  AuditLog,
  ReportDirectory,
  ReportFile,
} from '../entities';
import { hash } from 'bcryptjs';

/**
 * Seed script for SIAT database (TypeORM + Oracle).
 *
 * Run with: npm run seed
 */
async function main() {
  console.log('🌱 Seeding SIAT database (Oracle)...');

  // Initialize connection
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Synchronize database schema (create tables if they do not exist)
  console.log('  Synchronizing database schema...');
  await AppDataSource.synchronize();

  const userRepo = AppDataSource.getRepository(User);
  const ubpRepo = AppDataSource.getRepository(Ubp);
  const assetRepo = AppDataSource.getRepository(Asset);
  const testTypeRepo = AppDataSource.getRepository(TestType);
  const paramRepo = AppDataSource.getRepository(Parameter);
  const criteriaRepo = AppDataSource.getRepository(Criteria);
  const sessionRepo = AppDataSource.getRepository(TestSession);
  const resultRepo = AppDataSource.getRepository(TestResult);

  // ==============================
  // 1. USERS
  // ==============================
  const adminPassword = await hash('admin123', 12);
  const inputPassword = await hash('input123', 12);
  const viewerPassword = await hash('viewer123', 12);
  const qcPassword = await hash('qc123', 12);

  async function upsertUser(email: string, data: Partial<User>) {
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      user = userRepo.create({ email, ...data } as User);
      await userRepo.save(user);
    }
    return user;
  }

  const adminUser = await upsertUser('admin@plnip.co.id', {
    name: 'Admin Utama',
    passwordHash: adminPassword,
    role: 'ADMIN',
    allowedUbpIds: null,
  });

  const inputUser = await upsertUser('budi.santoso@plnip.co.id', {
    name: 'Budi Santoso',
    passwordHash: inputPassword,
    role: 'INPUT',
    allowedUbpIds: null,
  });

  const viewerUser = await upsertUser('viewer@plnip.co.id', {
    name: 'Ahmad Rizal',
    passwordHash: viewerPassword,
    role: 'VIEWER',
    allowedUbpIds: null,
  });

  const qcUser = await upsertUser('qc@plnip.co.id', {
    name: 'Siti Nurhaliza',
    passwordHash: qcPassword,
    role: 'QC',
    allowedUbpIds: null,
  });

  console.log('  ✅ Users seeded');

  // ==============================
  // 2. UBPs (Unit Bisnis Pembangkitan)
  // ==============================
  async function upsertUbp(name: string) {
    let ubp = await ubpRepo.findOne({ where: { name } });
    if (!ubp) {
      ubp = ubpRepo.create({ name });
      await ubpRepo.save(ubp);
    }
    return ubp;
  }

  const ubps = await Promise.all([
    upsertUbp('UBP Suralaya'),
    upsertUbp('UBP Lontar'),
    upsertUbp('UBP Grati'),
    upsertUbp('UBP Paiton'),
    upsertUbp('UBP Cirata'),
  ]);

  console.log('  ✅ UBPs seeded');

  // ==============================
  // 3. ASSETS
  // ==============================
  const assetsData = [
    { ubpIdx: 0, name: 'PLTU Banten Suralaya Unit 4', equipmentType: 'Main Trafo', mfgYear: 2009, vectorGroup: 'YNd11', serialNumber: '20093S13' },
    { ubpIdx: 0, name: 'PLTU Banten Suralaya Unit 5', equipmentType: 'Main Trafo', mfgYear: 2010, vectorGroup: 'YNd11', serialNumber: '20103S14' },
    { ubpIdx: 0, name: 'PLTU Banten Suralaya Unit 4 Arrester', equipmentType: 'Arrester', mfgYear: 2009, vectorGroup: null, serialNumber: 'ARR-04-A' },
    { ubpIdx: 1, name: 'PLTU Lontar Unit 1', equipmentType: 'Main Trafo', mfgYear: 2011, vectorGroup: 'YNd11', serialNumber: 'LT-01-MT' },
    { ubpIdx: 1, name: 'PLTU Lontar Unit 2', equipmentType: 'Main Trafo', mfgYear: 2012, vectorGroup: 'YNd11', serialNumber: 'LT-02-MT' },
    { ubpIdx: 2, name: 'PLTG Grati Unit 1', equipmentType: 'Main Trafo', mfgYear: 2005, vectorGroup: 'Dyn11', serialNumber: 'GR-01-MT' },
    { ubpIdx: 2, name: 'PLTG Grati Unit 2', equipmentType: 'Main Trafo', mfgYear: 2006, vectorGroup: 'Dyn11', serialNumber: 'GR-02-MT' },
    { ubpIdx: 3, name: 'PLTU Paiton Unit 9', equipmentType: 'Main Trafo', mfgYear: 2013, vectorGroup: 'YNd11', serialNumber: 'PT-09-MT' },
    { ubpIdx: 4, name: 'PLTA Cirata Unit 3', equipmentType: 'Main Trafo', mfgYear: 2000, vectorGroup: 'YNd11', serialNumber: 'CR-03-MT' },
    { ubpIdx: 4, name: 'PLTA Cirata Unit 4', equipmentType: 'Main Trafo', mfgYear: 2001, vectorGroup: 'YNd11', serialNumber: 'CR-04-MT' },
  ];

  const assets: Asset[] = [];
  for (const a of assetsData) {
    const asset = assetRepo.create({
      ubpId: ubps[a.ubpIdx].id,
      name: a.name,
      equipmentType: a.equipmentType,
      mfgYear: a.mfgYear,
      vectorGroup: a.vectorGroup,
      serialNumber: a.serialNumber,
    });
    await assetRepo.save(asset);
    assets.push(asset);
  }

  console.log('  ✅ Assets seeded');

  // ==============================
  // 4. TEST TYPES & PARAMETERS
  // ==============================
  interface ParamDef {
    name: string;
    unit: string | null;
    good: string | null;
    fair: string | null;
    poor: string | null;
    bad: string | null;
  }

  interface TestTypeDef {
    name: string;
    params: ParamDef[];
  }

  const testTypesData: TestTypeDef[] = [
    {
      name: 'Insulation Resistance',
      params: [
        { name: 'HV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5' },
        { name: 'LV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5' },
        { name: 'HV-LV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5' },
      ],
    },
    {
      name: 'Polarity Index',
      params: [
        { name: 'HV', unit: null, good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0' },
        { name: 'LV', unit: null, good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0' },
        { name: 'HV-LV', unit: null, good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0' },
      ],
    },
    {
      name: 'Turn to Turn Ratio',
      params: [
        { name: 'R-STG 1', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
        { name: 'R-STG 2', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
        { name: 'R-STG 3', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
      ],
    },
    {
      name: 'Winding Resistance HV',
      params: [
        { name: 'R-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
        { name: 'S-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
        { name: 'T-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
      ],
    },
    {
      name: 'Winding Resistance LV',
      params: [
        { name: 'R-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
        { name: 'S-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
        { name: 'T-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20' },
      ],
    },
    {
      name: 'Excitation Current',
      params: [
        { name: 'HV', unit: 'mA', good: '<= 50', fair: '51 - 100', poor: '101 - 200', bad: '> 200' },
      ],
    },
    {
      name: 'SFRA Open HV',
      params: [
        { name: 'R-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'S-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'T-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
      ],
    },
    {
      name: 'SFRA Open LV',
      params: [
        { name: 'R-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'S-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'T-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
      ],
    },
    {
      name: 'SFRA Shorted HV',
      params: [
        { name: 'R-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'S-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
      ],
    },
    {
      name: 'SFRA Shorted LV',
      params: [
        { name: 'R-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
        { name: 'S-Phase', unit: 'dB', good: '>= -5', fair: '-5.01 - -10', poor: '-10.01 - -20', bad: '< -20' },
      ],
    },
    {
      name: 'Tan Delta Winding',
      params: [
        { name: 'HV', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
        { name: 'LV', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
        { name: 'HV-LV', unit: '%', good: '<= 0.5', fair: '0.51 - 1.0', poor: '1.01 - 2.0', bad: '> 2.0' },
      ],
    },
    {
      name: 'Tan Delta Bushing',
      params: [
        { name: 'H1', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0' },
        { name: 'H2', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0' },
        { name: 'H3', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0' },
      ],
    },
    {
      name: 'Watt Loss Bushing',
      params: [
        { name: 'H1', unit: 'mW', good: '<= 200', fair: '201 - 500', poor: '501 - 1000', bad: '> 1000' },
        { name: 'H2', unit: 'mW', good: '<= 200', fair: '201 - 500', poor: '501 - 1000', bad: '> 1000' },
        { name: 'H3', unit: 'mW', good: '<= 200', fair: '201 - 500', poor: '501 - 1000', bad: '> 1000' },
      ],
    },
    {
      name: 'Grounding Resistance',
      params: [
        { name: 'Grounding', unit: 'Ohm', good: '<= 1', fair: '1.01 - 5', poor: '5.01 - 10', bad: '> 10' },
      ],
    },
    {
      name: 'Dirana Moisture',
      params: [
        { name: 'Moisture', unit: '%', good: '<= 2', fair: '2.01 - 3', poor: '3.01 - 4', bad: '> 4' },
      ],
    },
    {
      name: 'Oil Conductivity',
      params: [
        { name: 'Conductivity', unit: 'pS/m', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 25', bad: '> 25' },
      ],
    },
    {
      name: 'Arrester Grounding',
      params: [
        { name: 'Grounding', unit: 'Ohm', good: '<= 1', fair: '1.01 - 5', poor: '5.01 - 10', bad: '> 10' },
      ],
    },
    {
      name: 'Arrester Insulation Resistance',
      params: [
        { name: 'IR', unit: 'MΩ', good: '>= 1000', fair: '500 - 999', poor: '100 - 499', bad: '< 100' },
      ],
    },
    {
      name: 'Arrester Leakage Current',
      params: [
        { name: 'Total', unit: 'mA', good: '<= 1', fair: '1.01 - 2', poor: '2.01 - 5', bad: '> 5' },
        { name: 'Resistive', unit: 'mA', good: '<= 0.5', fair: '0.51 - 1', poor: '1.01 - 2', bad: '> 2' },
      ],
    },
    {
      name: 'Arrester Watt Loss',
      params: [
        { name: 'Watt Loss', unit: 'W', good: '<= 0.5', fair: '0.51 - 1', poor: '1.01 - 2', bad: '> 2' },
      ],
    },
  ];

  const testTypes: TestType[] = [];
  const allParams: Array<{ testTypeIdx: number; param: ParamDef; paramId: string }> = [];

  for (let i = 0; i < testTypesData.length; i++) {
    const ttData = testTypesData[i];

    // Upsert TestType
    let testType = await testTypeRepo.findOne({ where: { name: ttData.name } });
    if (!testType) {
      testType = testTypeRepo.create({ name: ttData.name });
      await testTypeRepo.save(testType);
    }
    testTypes.push(testType);

    for (const paramDef of ttData.params) {
      // Upsert Parameter
      let param = await paramRepo.findOne({
        where: { testTypeId: testType.id, name: paramDef.name },
      });
      if (!param) {
        param = paramRepo.create({
          testTypeId: testType.id,
          name: paramDef.name,
          unit: paramDef.unit,
        });
        await paramRepo.save(param);
      }

      // Create Criteria for this parameter
      const criteria = criteriaRepo.create({
        parameterId: param.id,
        goodValue: paramDef.good,
        fairValue: paramDef.fair,
        poorValue: paramDef.poor,
        badValue: paramDef.bad,
        createdBy: adminUser.id,
      });
      await criteriaRepo.save(criteria);

      allParams.push({ testTypeIdx: i, param: paramDef, paramId: param.id });
    }
  }

  console.log('  ✅ TestTypes, Parameters & Criteria seeded');

  // ==============================
  // 5. SAMPLE TEST SESSIONS & RESULTS
  // ==============================
  const { calculateScore } = await import('../lib/scoring/calculateScore');
  const { determineJudgement } = await import('../lib/scoring/determineJudgement');

  const sampleValues: Record<string, number[]> = {
    'Insulation Resistance': [15.2, 12.45, 18.1],
    'Polarity Index': [2.5, 1.82, 1.58],
    'Turn to Turn Ratio': [0.3, 0.4, 0.2],
    'Winding Resistance HV': [3.2, 3.5, 3.1],
    'Tan Delta Winding': [0.35, 0.42, 0.38],
    'Tan Delta Bushing': [0.45, 0.3, 0.55],
  };

  const selectedTestTypeNames = Object.keys(sampleValues);

  for (let assetIdx = 0; assetIdx < Math.min(5, assets.length); assetIdx++) {
    const asset = assets[assetIdx];

    const session = sessionRepo.create({
      assetId: asset.id,
      testYear: 2024,
      status: 'VALIDATED',
      createdById: inputUser.id,
      validatedById: qcUser.id,  // QC validates, not Admin
      validatedAt: new Date(),
    });
    await sessionRepo.save(session);

    for (const ttName of selectedTestTypeNames) {
      const testType = testTypes.find((tt) => tt.name === ttName);
      if (!testType) continue;

      const ttParams = allParams.filter((p) => p.testTypeIdx === testTypes.indexOf(testType));
      const values = sampleValues[ttName];

      for (let pi = 0; pi < ttParams.length; pi++) {
        const paramInfo = ttParams[pi];
        const baseValue = values[pi] ?? values[0];
        const variance = (assetIdx * 0.1 - 0.2) * baseValue;
        const value = Math.max(0, baseValue + variance);

        const score = calculateScore(
          value,
          false,
          paramInfo.param.good,
          paramInfo.param.fair,
          paramInfo.param.poor,
          paramInfo.param.bad,
        );
        const judgement = determineJudgement(score);

        const result = resultRepo.create({
          testSessionId: session.id,
          parameterId: paramInfo.paramId,
          value: value,
          isNotApplicable: false,
          score: score,
          judgement: judgement as any,
        });
        await resultRepo.save(result);
      }
    }
  }

  console.log('  ✅ Sample TestSessions & TestResults seeded');

  // ==============================
  // 6. REPORT DIRECTORIES & FILES
  // ==============================
  console.log('  Seeding report directories and mock files...');
  const reportDirRepo = AppDataSource.getRepository(ReportDirectory);
  const reportFileRepo = AppDataSource.getRepository(ReportFile);

  // Clear existing
  await reportFileRepo.createQueryBuilder().delete().execute();
  await reportDirRepo.createQueryBuilder().delete().execute();

  // Ensure uploads directory exists
  const fs = await import('fs');
  const path = await import('path');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Write a mock pdf file to disk
  const mockFilePath = path.join(uploadsDir, 'mock_monthly_report_suralaya.pdf');
  fs.writeFileSync(mockFilePath, 'SIAT MOCK REPORT PDF CONTENT - UBP SURALAYA MONTHLY ASSESSMENT');

  for (const ubp of ubps) {
    // Create root UBP folder
    const ubpFolder = reportDirRepo.create({
      name: ubp.name,
      parentId: null,
    });
    await reportDirRepo.save(ubpFolder);

    // Get assets (Unit Pembangkit) belonging to this UBP
    const ubpAssets = assets.filter((a) => a.ubpId === ubp.id);

    for (const asset of ubpAssets) {
      // Create Unit Pembangkit folder under the UBP folder
      const assetFolder = reportDirRepo.create({
        name: asset.name,
        parentId: ubpFolder.id,
      });
      await reportDirRepo.save(assetFolder);

      // If UBP Suralaya and Asset is Unit 4, add a mock file directly under the Asset folder
      if (ubp.name === 'UBP Suralaya' && asset.name.includes('Unit 4') && !asset.name.includes('Arrester')) {
        const mockFile = reportFileRepo.create({
          name: 'Laporan Bulanan Suralaya Unit 4 - 2024.pdf',
          filePath: '/uploads/reports/mock_monthly_report_suralaya.pdf',
          fileSize: 63, // size of the text written above
          mimeType: 'application/pdf',
          directoryId: assetFolder.id,
          uploadedById: adminUser.id,
        });
        await reportFileRepo.save(mockFile);
      }
    }
  }
  console.log('  ✅ Report directories and files seeded');

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('  Admin:  admin@plnip.co.id / admin123');
  console.log('  Input:  budi.santoso@plnip.co.id / input123');
  console.log('  QC:     qc@plnip.co.id / qc123');
  console.log('  Viewer: viewer@plnip.co.id / viewer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

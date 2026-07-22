import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';
import {
  Ubp,
  UnitPembangkit,
  JenisAsset,
  Asset,
  TestType,
  Parameter,
  Criteria,
  TestSession,
  TestResult,
  User,
} from '../entities';
import { hash } from 'bcryptjs';
import { calculateScore } from '../lib/scoring/calculateScore';
import { determineJudgement } from '../lib/scoring/determineJudgement';
import type { JudgementLabel } from '../types';

/**
 * Testing Seed script for user testing & demo.
 * Seeds EVERYTHING including Users, UBPs, Units, Assets, Test Types, Criteria, Damage Mechanisms,
 * and realistic multi-year Test Sessions & Results (2023 - 2026) to display rich trend charts and dashboard metrics.
 *
 * Run with: npm run seed:testing
 */
async function main() {
  console.log('🌱 Seeding database (Testing / Demo Setup with Charts Data)...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  console.log('  Preparing database (Raw SQL Clean)...');
  const tables = [
    'report_file',
    'report_directory',
    'audit_log',
    'test_result',
    'test_session',
    'asset',
    'unit_pembangkit',
    'jenis_asset',
    'ubp',
    'criteria',
    'parameter',
    'test_type',
    'app_user',
    'siat_user',
  ];

  try {
    await AppDataSource.query('UPDATE "report_directory" SET "parent_id" = NULL');
  } catch (e) {}

  for (const table of tables) {
    try {
      await AppDataSource.query(`DELETE FROM "${table}"`);
    } catch (e) {}
  }

  console.log('  Synchronizing database schema...');
  await AppDataSource.synchronize();
  console.log('  ✅ Database schema synchronized');

  const userRepo = AppDataSource.getRepository(User);
  const ubpRepo = AppDataSource.getRepository(Ubp);
  const unitRepo = AppDataSource.getRepository(UnitPembangkit);
  const jenisRepo = AppDataSource.getRepository(JenisAsset);
  const assetRepo = AppDataSource.getRepository(Asset);
  const testTypeRepo = AppDataSource.getRepository(TestType);
  const paramRepo = AppDataSource.getRepository(Parameter);
  const criteriaRepo = AppDataSource.getRepository(Criteria);
  const sessionRepo = AppDataSource.getRepository(TestSession);
  const resultRepo = AppDataSource.getRepository(TestResult);

  // 1. USERS
  const adminPassword = await hash('admin123', 12);
  const inputPassword = await hash('input123', 12);
  const viewerPassword = await hash('viewer123', 12);
  const validatorPassword = await hash('validator123', 12);

  const adminUser = await userRepo.save(
    userRepo.create({
      email: 'admin@pln.co.id',
      name: 'Admin Utama',
      passwordHash: adminPassword,
      role: 'ADMIN',
      allowedUbpIds: null,
    })
  );

  const inputUser = await userRepo.save(
    userRepo.create({
      email: 'input@pln.co.id',
      name: 'Operator Input',
      passwordHash: inputPassword,
      role: 'INPUT',
      allowedUbpIds: null,
    })
  );

  await userRepo.save(
    userRepo.create({
      email: 'validator@pln.co.id',
      name: 'QC Validator',
      passwordHash: validatorPassword,
      role: 'QC',
      allowedUbpIds: null,
    })
  );

  await userRepo.save(
    userRepo.create({
      email: 'viewer@pln.co.id',
      name: 'Ahmad Rizal (Viewer)',
      passwordHash: viewerPassword,
      role: 'VIEWER',
      allowedUbpIds: null,
    })
  );

  console.log('  ✅ Users seeded');

  // 2. UBPs & UNITS
  const unitMappings = [
    { ubp: 'UBP SURALAYA', units: ['PLTU Suralaya Unit 1', 'PLTU Suralaya Unit 2', 'PLTU Suralaya Unit 3', 'PLTU Suralaya Unit 4'] },
    { ubp: 'UBP BALI', units: ['PLTG Pesanggaran Unit 1', 'PLTG Pesanggaran Unit 2', 'PLTG Gilimanuk Unit 1'] },
    { ubp: 'UBP CILEGON', units: ['PLTGU Cilegon Blok 1'] },
    { ubp: 'UBP BARRU', units: ['PLTU Barru Unit 1', 'PLTU Barru Unit 2'] },
    { ubp: 'UBP PRIOK', units: ['PLTGU Priok Blok 1', 'PLTGU Priok Blok 2', 'PLTGU Priok Blok 3'] },
    { ubp: 'UBP KAMOJANG', units: ['PLTP Kamojang Unit 1', 'PLTP Kamojang Unit 2', 'PLTP Darajat Unit 1'] },
    { ubp: 'UBP BANTEN 3 LONTAR', units: ['PLTU Lontar Unit 1', 'PLTU Lontar Unit 2', 'PLTU Lontar Unit 3'] },
    { ubp: 'UBP SAGULING', units: ['PLTA Saguling Unit 1', 'PLTA Saguling Unit 2', 'PLTA Saguling Unit 3'] },
  ];

  const unitsCreated: UnitPembangkit[] = [];

  for (const mapping of unitMappings) {
    let ubpObj = await ubpRepo.findOne({ where: { name: mapping.ubp } });
    if (!ubpObj) {
      ubpObj = ubpRepo.create({ name: mapping.ubp });
      await ubpRepo.save(ubpObj);
    }

    for (const uName of mapping.units) {
      let unitObj = await unitRepo.findOne({ where: { name: uName, ubpId: ubpObj.id } });
      if (!unitObj) {
        unitObj = unitRepo.create({ name: uName, ubpId: ubpObj.id });
        await unitRepo.save(unitObj);
      }
      unitsCreated.push(unitObj);
    }
  }

  console.log('  ✅ UBPs & Unit Pembangkit seeded');

  // 3. JENIS ASSET & ASSETS
  const jaTrafo = await jenisRepo.save(jenisRepo.create({ category: 'Trafo', name: 'Trafo' }));
  const jaGen = await jenisRepo.save(jenisRepo.create({ category: 'Generator', name: 'Generator' }));
  const jaTurbin = await jenisRepo.save(jenisRepo.create({ category: 'Turbin', name: 'Turbin' }));

  // Create Assets for Units
  const assetsCreated: Asset[] = [];
  const targetUnits = unitsCreated.slice(0, 8); // Seed assets for first 8 units

  for (let i = 0; i < targetUnits.length; i++) {
    const unit = targetUnits[i];
    const trafoAsset = await assetRepo.save(
      assetRepo.create({
        name: `Trafo Utama ${unit.name}`,
        unitPembangkitId: unit.id,
        jenisAssetId: jaTrafo.id,
        manufacture: 'PAUWELS / ABB',
        serialNumber: `TR-SN-${1000 + i}`,
        mfgYear: 2015,
        type: 'POWER TRANSFORMER',
        vectorGroup: 'YNd11',
        coolingMethod: 'ONAN/ONAF',
      })
    );
    assetsCreated.push(trafoAsset);

    if (i < 4) {
      const genAsset = await assetRepo.save(
        assetRepo.create({
          name: `Generator ${unit.name}`,
          unitPembangkitId: unit.id,
          jenisAssetId: jaGen.id,
          manufacture: 'SIEMENS',
          serialNumber: `GEN-SN-${2000 + i}`,
          mfgYear: 2016,
          type: 'SYNCHRONOUS GENERATOR',
        })
      );
      assetsCreated.push(genAsset);
    }
  }

  console.log(`  ✅ ${assetsCreated.length} Sample Assets created`);

  // 4. TEST TYPES, PARAMETERS & CRITERIA
  const testTypesDefs = [
    {
      name: 'Insulation Resistance',
      params: [
        { name: 'HV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5', mech: 'Dielectric Problem' },
        { name: 'LV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5', mech: 'Dielectric Problem' },
        { name: 'HV-LV', unit: 'G Ohm', good: '>= 2', fair: '1.0 - 1.99', poor: '0.5 - 0.99', bad: '< 0.5', mech: 'Dielectric Problem' },
      ],
    },
    {
      name: 'Polarity Index',
      params: [
        { name: 'HV', unit: null, good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0', mech: 'Dielectric Problem' },
        { name: 'LV', unit: null, good: '>= 2', fair: '1.25 - 1.99', poor: '1.0 - 1.24', bad: '< 1.0', mech: 'Dielectric Problem' },
      ],
    },
    {
      name: 'Tan Delta Bushing',
      params: [
        { name: 'H1', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0', mech: 'Bushing-Electrical defect' },
        { name: 'H2', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0', mech: 'Bushing-Electrical defect' },
        { name: 'H3', unit: '%', good: '<= 0.5', fair: '0.51 - 0.7', poor: '0.71 - 1.0', bad: '> 1.0', mech: 'Bushing-Electrical defect' },
      ],
    },
    {
      name: 'Winding Resistance HV',
      params: [
        { name: 'R-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20', mech: 'Winding & Connection' },
        { name: 'S-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20', mech: 'Winding & Connection' },
        { name: 'T-Phase', unit: 'mΩ', good: '<= 5', fair: '5.01 - 10', poor: '10.01 - 20', bad: '> 20', mech: 'Winding & Connection' },
      ],
    },
    {
      name: 'Grounding Resistance',
      params: [
        { name: 'Grounding', unit: 'Ohm', good: '<= 1', fair: '1.01 - 5', poor: '5.01 - 10', bad: '> 10', mech: 'Grounding Problem' },
      ],
    },
    {
      name: 'Dirana Moisture',
      params: [
        { name: 'Moisture', unit: '%', good: '<= 2', fair: '2.01 - 3', poor: '3.01 - 4', bad: '> 4', mech: 'Dielectric Problem' },
      ],
    },
  ];

  const createdTestTypes: TestType[] = [];
  const createdParamsMap: Record<string, Parameter[]> = {};

  for (let order = 0; order < testTypesDefs.length; order++) {
    const ttDef = testTypesDefs[order];
    const tt = await testTypeRepo.save(
      testTypeRepo.create({
        name: ttDef.name,
        orderIndex: order + 1,
      })
    );
    createdTestTypes.push(tt);

    const paramsInType: Parameter[] = [];
    for (let pOrder = 0; pOrder < ttDef.params.length; pOrder++) {
      const pDef = ttDef.params[pOrder];
      const param = await paramRepo.save(
        paramRepo.create({
          testTypeId: tt.id,
          name: pDef.name,
          unit: pDef.unit,
          damageMechanisms: pDef.mech,
          orderIndex: pOrder + 1,
        })
      );

      await criteriaRepo.save(
        criteriaRepo.create({
          parameterId: param.id,
          goodValue: pDef.good,
          fairValue: pDef.fair,
          poorValue: pDef.poor,
          badValue: pDef.bad,
          createdBy: adminUser.id,
        })
      );

      paramsInType.push(param);
    }
    createdParamsMap[tt.id] = paramsInType;
  }

  // Associate testTypes to assets
  for (const asset of assetsCreated) {
    asset.testTypes = createdTestTypes;
    await assetRepo.save(asset);
  }

  console.log('  ✅ Test Types, Parameters, Criteria & Asset Mappings created');

  // 5. SEED MULTI-YEAR TEST SESSIONS & RESULTS (2023 - 2026) FOR CHARTS
  console.log('  📊 Generating Multi-Year Test Sessions & Trend Data (2023 - 2026)...');

  const years = [2023, 2024, 2025, 2026];
  const events = [null, 'RLA', 'MOH', 'OH'];

  let totalSessionsCreated = 0;
  let totalResultsCreated = 0;

  for (const asset of assetsCreated) {
    for (let yIdx = 0; yIdx < years.length; yIdx++) {
      const year = years[yIdx];
      const event = events[yIdx % events.length];

      // Session status: older years VALIDATED/SUBMITTED, current year DRAFT or VALIDATED
      const status = year < 2026 ? 'VALIDATED' : yIdx % 2 === 0 ? 'VALIDATED' : 'DRAFT';

      const session = await sessionRepo.save(
        sessionRepo.create({
          assetId: asset.id,
          testYear: year,
          testEvent: event,
          status,
          createdById: inputUser.id,
        })
      );
      totalSessionsCreated++;

      // Create test results for parameters with realistic values
      for (const tt of createdTestTypes) {
        const params = createdParamsMap[tt.id] || [];

        for (const p of params) {
          const criteria = await criteriaRepo.findOne({ where: { parameterId: p.id } });
          let val: number | null = null;

          // Generate realistic values for trend lines
          if (tt.name === 'Insulation Resistance') {
            // IR value over years: 3.5 -> 2.8 -> 1.8 -> 0.8 G Ohm (mild degradation trend)
            val = yIdx === 0 ? 3.5 : yIdx === 1 ? 2.8 : yIdx === 2 ? 1.6 : 0.8;
          } else if (tt.name === 'Polarity Index') {
            val = yIdx === 0 ? 2.4 : yIdx === 1 ? 2.1 : yIdx === 2 ? 1.7 : 1.3;
          } else if (tt.name === 'Tan Delta Bushing') {
            // Tan delta over years: 0.35% -> 0.42% -> 0.58% -> 0.78% (increasing trend)
            val = yIdx === 0 ? 0.35 : yIdx === 1 ? 0.42 : yIdx === 2 ? 0.58 : 0.78;
          } else if (tt.name === 'Winding Resistance HV') {
            val = 4.2 + (yIdx * 0.4);
          } else if (tt.name === 'Grounding Resistance') {
            val = yIdx === 3 ? 1.8 : 0.6;
          } else if (tt.name === 'Dirana Moisture') {
            val = 1.2 + (yIdx * 0.5);
          }

          const score = calculateScore(
            val,
            false,
            criteria?.goodValue ?? null,
            criteria?.fairValue ?? null,
            criteria?.poorValue ?? null,
            criteria?.badValue ?? null
          );
          const judgement = determineJudgement(score);

          await resultRepo.save(
            resultRepo.create({
              testSessionId: session.id,
              parameterId: p.id,
              value: val,
              isNotApplicable: false,
              score,
              judgement: judgement as JudgementLabel,
            })
          );
          totalResultsCreated++;
        }
      }
    }
  }

  console.log(`  ✅ ${totalSessionsCreated} Test Sessions & ${totalResultsCreated} Results seeded successfully across 2023-2026`);

  console.log('');
  console.log('🎉 Testing & Demo Seeding complete!');
  console.log(`📈 Generated trend charts & dashboard metrics for ${assetsCreated.length} Assets.`);
  console.log('📋 Login credentials:');
  console.log('  Admin:     admin@pln.co.id / admin123');
  console.log('  Input:     input@pln.co.id / input123');
  console.log('  Validator: validator@pln.co.id / validator123');
  console.log('  Viewer:    viewer@pln.co.id / viewer123');
}

main()
  .catch((e) => {
    console.error('❌ Testing Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

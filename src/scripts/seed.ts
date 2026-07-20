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
  AuditLog,
  ReportDirectory,
  ReportFile,
} from '../entities';
import { hash } from 'bcryptjs';

/**
 * Seed script for database (TypeORM + Oracle).
 * Only seeds UBPs, Unit Pembangkit, 20 Test Types, and Damage Mechanisms.
 * Does NOT seed assets, test sessions, or results.
 *
 * Run with: npm run seed
 */
async function main() {
  console.log('🌱 Seeding database (Oracle) - Clean Slate...');

  // Initialize connection
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  console.log('  Preparing database for synchronization (Raw SQL Clean)...');
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
    'siat_user'
  ];

  // 1. Break self-referencing hierarchy in report_directory
  try {
    await AppDataSource.query('UPDATE "report_directory" SET "parent_id" = NULL');
  } catch (e) {}

  // 2. Delete all records from tables in dependency order
  for (const table of tables) {
    try {
      await AppDataSource.query(`DELETE FROM "${table}"`);
      console.log(`    Deleted all records from ${table}`);
    } catch (e) {
      // Ignore if table does not exist yet
    }
  }

  // 3. Drop old siat_user if it exists to avoid conflicts
  try {
    await AppDataSource.query('DROP TABLE "siat_user" CASCADE CONSTRAINTS');
    console.log('    Dropped old siat_user table');
  } catch (e) {}

  // Synchronize database schema (create/modify tables)
  console.log('  Synchronizing database schema...');
  await AppDataSource.synchronize();
  console.log('  ✅ Database schema synchronized');

  const userRepo = AppDataSource.getRepository(User);
  const ubpRepo = AppDataSource.getRepository(Ubp);
  const unitRepo = AppDataSource.getRepository(UnitPembangkit);
  const jenisRepo = AppDataSource.getRepository(JenisAsset);
  const testTypeRepo = AppDataSource.getRepository(TestType);
  const paramRepo = AppDataSource.getRepository(Parameter);
  const criteriaRepo = AppDataSource.getRepository(Criteria);

  // ==============================
  // 1. USERS
  // ==============================
  const adminPassword = await hash('admin123', 12);
  const inputPassword = await hash('input123', 12);
  const viewerPassword = await hash('viewer123', 12);
  const validatorPassword = await hash('validator123', 12);

  async function upsertUser(email: string, data: Partial<User>) {
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      user = userRepo.create({ email, ...data } as User);
      await userRepo.save(user);
    }
    return user;
  }

  const adminUser = await upsertUser('admin@pln.co.id', {
    name: 'Admin Utama',
    passwordHash: adminPassword,
    role: 'ADMIN',
    allowedUbpIds: null,
  });

  await upsertUser('input@pln.co.id', {
    name: 'Input',
    passwordHash: inputPassword,
    role: 'INPUT',
    allowedUbpIds: null,
  });

  await upsertUser('viewer@pln.co.id', {
    name: 'Ahmad Rizal',
    passwordHash: viewerPassword,
    role: 'VIEWER',
    allowedUbpIds: null,
  });

  await upsertUser('validator@pln.co.id', {
    name: 'Validator',
    passwordHash: validatorPassword,
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

  const ubpNames = [
    'UBP SURALAYA',
    'UBP BALI',
    'UBP CILEGON',
    'UBP BARRU',
    'UBP PRIOK',
    'UBP KAMOJANG',
    'UBP BANTEN 3 LONTAR',
    'UBP SAGULING',
    'UBP HOLTEKAMP',
    'UBP MAHAKAM',
    'UBP JAMBI',
    'UBP KEPULAUAN RIAU',
    'UBP TELLO',
    'UBP BARITO',
    'UBP BENGKULU',
    'UBP PANGKALAN SUSU',
    'UBP SEMARANG',
    'UBP BANTEN 1 SURALAYA',
    'UBP ASAM ASAM',
    'UBP OMBILIN',
    'UBP MRICA',
    'UBP SINGKAWANG',
    'UBP PAPUA MALUKU',
    'UBP BANTEN 2 LABUAN',
    'UBP JAWA TENGAH 2 ADIPALA',
    'UBP BUKIT TINGGI',
    'UBP TELUK SIRIH',
    'UBP JATIGEDE',
    'UBP PEMELIHARAAN',
    'UBP BERAU',
    'UBP LABUHAN ANGIN',
    'UBP SANGGAU',
    'UBP JERANJANG',
    'UBP SINTANG',
    'UBP KERAMASAN',
    'UBP GRATI',
    'UBP PELABUHAN RATU',
  ];

  const ubpsMap: Record<string, Ubp> = {};
  for (const name of ubpNames) {
    ubpsMap[name] = await upsertUbp(name);
  }

  console.log('  ✅ UBPs seeded');

  // ==============================
  // 3. UNIT PEMBANGKIT
  // ==============================
  const unitMappings = [
    { ubp: 'UBP SURALAYA', units: ['PLTU Suralaya Unit 1', 'PLTU Suralaya Unit 2', 'PLTU Suralaya Unit 3', 'PLTU Suralaya Unit 4'] },
    { ubp: 'UBP BALI', units: ['PLTG Pesanggaran Unit 1', 'PLTG Pesanggaran Unit 2', 'PLTG Gilimanuk Unit 1'] },
    { ubp: 'UBP CILEGON', units: ['PLTGU Cilegon Blok 1'] },
    { ubp: 'UBP BARRU', units: ['PLTU Barru Unit 1', 'PLTU Barru Unit 2'] },
    { ubp: 'UBP PRIOK', units: ['PLTGU Priok Blok 1', 'PLTGU Priok Blok 2', 'PLTGU Priok Blok 3'] },
    { ubp: 'UBP KAMOJANG', units: ['PLTP Kamojang Unit 1', 'PLTP Kamojang Unit 2', 'PLTP Darajat Unit 1'] },
    { ubp: 'UBP BANTEN 3 LONTAR', units: ['PLTU Lontar Unit 1', 'PLTU Lontar Unit 2', 'PLTU Lontar Unit 3'] },
    { ubp: 'UBP SAGULING', units: ['PLTA Saguling Unit 1', 'PLTA Saguling Unit 2', 'PLTA Saguling Unit 3'] },
    { ubp: 'UBP HOLTEKAMP', units: ['PLTU Holtekamp Unit 1'] },
    { ubp: 'UBP MAHAKAM', units: ['PLTG Mahakam Unit 1', 'PLTG Mahakam Unit 2'] },
    { ubp: 'UBP JAMBI', units: ['PLTD Jambi Unit 1'] },
    { ubp: 'UBP KEPULAUAN RIAU', units: ['PLTU Kepulauan Riau Unit 1'] },
    { ubp: 'UBP TELLO', units: ['PLTD Tello Unit 1', 'PLTU Tello Unit 1'] },
    { ubp: 'UBP BARITO', units: ['PLTD Barito Unit 1'] },
    { ubp: 'UBP BENGKULU', units: ['PLTA Musi Unit 1', 'PLTA Musi Unit 2'] },
    { ubp: 'UBP PANGKALAN SUSU', units: ['PLTU Pangkalan Susu Unit 1', 'PLTU Pangkalan Susu Unit 2'] },
    { ubp: 'UBP SEMARANG', units: ['PLTGU Tambak Lorok Blok 1', 'PLTGU Tambak Lorok Blok 2'] },
    { ubp: 'UBP BANTEN 1 SURALAYA', units: ['PLTU Banten 1 Suralaya Unit 1'] },
    { ubp: 'UBP ASAM ASAM', units: ['PLTU Asam-Asam Unit 1', 'PLTU Asam-Asam Unit 2'] },
    { ubp: 'UBP OMBILIN', units: ['PLTU Ombilin Unit 1', 'PLTU Ombilin Unit 2'] },
    { ubp: 'UBP MRICA', units: ['PLTA Mrica Unit 1', 'PLTA Mrica Unit 2'] },
    { ubp: 'UBP SINGKAWANG', units: ['PLTU Singkawang Unit 1'] },
    { ubp: 'UBP PAPUA MALUKU', units: ['PLTD Papua Unit 1'] },
    { ubp: 'UBP BANTEN 2 LABUAN', units: ['PLTU Labuan Unit 1', 'PLTU Labuan Unit 2'] },
    { ubp: 'UBP JAWA TENGAH 2 ADIPALA', units: ['PLTU Adipala Unit 1'] },
    { ubp: 'UBP BUKIT TINGGI', units: ['PLTA Maninjau Unit 1', 'PLTA Maninjau Unit 2', 'PLTA Singkarak Unit 1'] },
    { ubp: 'UBP TELUK SIRIH', units: ['PLTU Teluk Sirih Unit 1'] },
    { ubp: 'UBP JATIGEDE', units: ['PLTA Jatigede Unit 1'] },
    { ubp: 'UBP PEMELIHARAAN', units: ['Workshop Pemeliharaan Pusat'] },
    { ubp: 'UBP BERAU', units: ['PLTU Berau Unit 1'] },
    { ubp: 'UBP LABUHAN ANGIN', units: ['PLTU Labuhan Angin Unit 1'] },
    { ubp: 'UBP SANGGAU', units: ['PLTU Sanggau Unit 1'] },
    { ubp: 'UBP JERANJANG', units: ['PLTU Jeranjang Unit 1', 'PLTU Jeranjang Unit 2'] },
    { ubp: 'UBP SINTANG', units: ['PLTU Sintang Unit 1'] },
    { ubp: 'UBP KERAMASAN', units: ['PLTG Keramasan Unit 1'] },
    { ubp: 'UBP GRATI', units: ['PLTGU Grati Blok 1', 'PLTGU Grati Blok 2'] },
    { ubp: 'UBP PELABUHAN RATU', units: ['PLTU Pelabuhan Ratu Unit 1', 'PLTU Pelabuhan Ratu Unit 2'] },
  ];

  for (const mapping of unitMappings) {
    const ubpObj = ubpsMap[mapping.ubp];
    if (!ubpObj) continue;

    for (const uName of mapping.units) {
      let unitObj = await unitRepo.findOne({ where: { name: uName, ubpId: ubpObj.id } });
      if (!unitObj) {
        unitObj = unitRepo.create({ name: uName, ubpId: ubpObj.id });
        await unitRepo.save(unitObj);
      }
    }
  }

  console.log('  ✅ Unit Pembangkit seeded');

  // Seed default JenisAsset values
  async function upsertJenisAsset(category: string, name: string) {
    let ja = await jenisRepo.findOne({ where: { category, name } });
    if (!ja) {
      ja = jenisRepo.create({ category, name });
      await jenisRepo.save(ja);
    }
    return ja;
  }

  await upsertJenisAsset('Trafo', 'Trafo');
  await upsertJenisAsset('Generator', 'Generator');
  await upsertJenisAsset('Turbin', 'Turbin');
  console.log('  ✅ Jenis Asset seeded');

  // ==============================
  // 4. TEST TYPES, PARAMETERS, CRITERIA & DAMAGE MECHANISMS
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

  for (let i = 0; i < testTypesData.length; i++) {
    const ttData = testTypesData[i];

    // Upsert TestType
    let testType = await testTypeRepo.findOne({ where: { name: ttData.name } });
    if (!testType) {
      testType = testTypeRepo.create({ name: ttData.name });
      await testTypeRepo.save(testType);
    }

    const ttNameUpper = testType.name.toUpperCase().trim();

    for (const paramDef of ttData.params) {
      const pNameUpper = paramDef.name.toUpperCase().trim();
      const mechs: string[] = [];

      // Determine damage mechanisms
      if (ttNameUpper.includes('TAN DELTA BUSHING') || ttNameUpper.includes('WATT LOSS BUSHING')) {
        mechs.push('Bushing-Electrical defect');
      }
      if (ttNameUpper.includes('VISUAL INSPECTION') && (pNameUpper.includes('BUSHING DEFECT') || pNameUpper.includes('CONTAMINANT'))) {
        mechs.push('Bushing-Mechanical defect');
      }
      if (ttNameUpper.includes('SFRA')) {
        mechs.push('Deformation');
      }
      if (ttNameUpper.includes('TURN TO TURN RATIO') || ttNameUpper.includes('WINDING RESISTANCE')) {
        mechs.push('Winding & Connection');
      }
      if (ttNameUpper.includes('EXC CURRENT') || ttNameUpper.includes('EXCITATION CURRENT')) {
        mechs.push('Core defect');
      }
      if (ttNameUpper.includes('INSULATION RESISTANCE') || ttNameUpper.includes('TAN DELTA WINDING') || ttNameUpper.includes('DIRANA MOISTURE')) {
        mechs.push('Dielectric Problem');
      }
      if (
        (ttNameUpper.includes('OIL ANALYSIS') && (pNameUpper.includes('STATUS') || pNameUpper.includes('BDV'))) || 
        ttNameUpper.includes('DIRANA OIL CONDUCT') || 
        ttNameUpper.includes('OIL CONDUCTIVITY')
      ) {
        mechs.push('Oil Problem');
      }
      if (
        ttNameUpper.includes('VISUAL INSPECTION') && 
        (pNameUpper.includes('BUSHING LEAKAGE') || pNameUpper.includes('BODY & RADIATOR LEAKAGE') || pNameUpper.includes('BODY & RADIATOR'))
      ) {
        mechs.push('Leakage');
      }
      if (
        (ttNameUpper.includes('DGA') && (pNameUpper.includes('STATUS') || pNameUpper.includes('DAMAGE MECHANISME') || pNameUpper.includes('DAMAGE'))) || 
        (ttNameUpper.includes('OIL ANALYSIS') && pNameUpper.includes('STATUS'))
      ) {
        mechs.push('Thermal Problem');
      }
      if (ttNameUpper.includes('OTI') || ttNameUpper.includes('WTI')) {
        mechs.push('OTI/WTI Problem');
      }
      if (ttNameUpper.includes('GROUNDING RESISTANCE')) {
        mechs.push('Grounding Problem');
      }
      if (
        ttNameUpper.includes('VISUAL INSPECTION') && 
        (pNameUpper.includes('SILICA GEL') || pNameUpper.includes('SILICA GEL PUDAR'))
      ) {
        mechs.push('Breating system');
      }
      if (ttNameUpper.includes('ARRESTER')) {
        mechs.push('LA Problem');
      }

      const damageMechanisms = mechs.length > 0 ? mechs.join(',') : null;

      // Upsert Parameter
      let param = await paramRepo.findOne({
        where: { testTypeId: testType.id, name: paramDef.name },
      });
      if (!param) {
        param = paramRepo.create({
          testTypeId: testType.id,
          name: paramDef.name,
          unit: paramDef.unit,
          damageMechanisms: damageMechanisms,
        });
      } else {
        param.damageMechanisms = damageMechanisms;
      }
      await paramRepo.save(param);

      // Create Criteria for this parameter
      let criteria = await criteriaRepo.findOne({
        where: { parameterId: param.id },
      });
      if (!criteria) {
        criteria = criteriaRepo.create({
          parameterId: param.id,
          goodValue: paramDef.good,
          fairValue: paramDef.fair,
          poorValue: paramDef.poor,
          badValue: paramDef.bad,
          createdBy: adminUser.id,
        });
        await criteriaRepo.save(criteria);
      }
    }
  }

  console.log('  ✅ TestTypes, Parameters, Criteria & Damage Mechanisms seeded');

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('  Admin:     admin@pln.co.id / admin123');
  console.log('  Input:     input@pln.co.id / input123');
  console.log('  Validator: validator@pln.co.id / validator123');
  console.log('  Viewer:    viewer@pln.co.id / viewer123');
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

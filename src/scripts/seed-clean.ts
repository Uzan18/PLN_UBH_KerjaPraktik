import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';
import {
  Ubp,
  UnitPembangkit,
  JenisAsset,
  User,
} from '../entities';
import { hash } from 'bcryptjs';

/**
 * Clean Seed script for production / fresh setup.
 * Seeds ONLY: UBPs, Unit Pembangkit, default JenisAsset, and default Users.
 * Does NOT seed Test Types, Parameters, Criteria, Damage Mechanisms, Assets, or Test Sessions.
 *
 * Run with: npm run seed:clean
 */
async function main() {
  console.log('🌱 Seeding database (Clean Setup)...');

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
    'siat_user',
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

  await upsertUser('admin@pln.co.id', {
    name: 'Admin Utama',
    passwordHash: adminPassword,
    role: 'ADMIN',
    allowedUbpIds: null,
  });

  await upsertUser('input@pln.co.id', {
    name: 'Operator Input',
    passwordHash: inputPassword,
    role: 'INPUT',
    allowedUbpIds: null,
  });

  await upsertUser('validator@pln.co.id', {
    name: 'QC Validator',
    passwordHash: validatorPassword,
    role: 'QC',
    allowedUbpIds: null,
  });

  await upsertUser('viewer@pln.co.id', {
    name: 'Ahmad Rizal (Viewer)',
    passwordHash: viewerPassword,
    role: 'VIEWER',
    allowedUbpIds: null,
  });

  console.log('  ✅ Users seeded (admin@pln.co.id, input@pln.co.id, validator@pln.co.id, viewer@pln.co.id)');

  // ==============================
  // 2. UBPs & UNIT PEMBANGKIT
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
    }
  }

  console.log('  ✅ UBPs & Unit Pembangkit seeded');

  console.log('  ✅ Clean Seed complete! (Jenis Asset, Test Types, Assets are completely empty)');

  console.log('');
  console.log('🎉 Clean Seeding complete!');
  console.log('📋 Login credentials:');
  console.log('  Admin:     admin@pln.co.id / admin123');
  console.log('  Input:     input@pln.co.id / input123');
  console.log('  Validator: validator@pln.co.id / validator123');
  console.log('  Viewer:    viewer@pln.co.id / viewer123');
}

main()
  .catch((e) => {
    console.error('❌ Clean Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

import { AppDataSource } from '../db';
import { Ubp } from './entities/Ubp.entity';
import { User, Role } from './entities/User.entity';
import { Asset } from './entities/Asset.entity';
import { TestType } from './entities/TestType.entity';
import { Parameter } from './entities/Parameter.entity';
import { Criteria } from './entities/Criteria.entity';
import { EquipmentTestType } from './entities/EquipmentTestType.entity';
import { DamageMechanism } from './entities/DamageMechanism.entity';
import { DamageMechanismTestType } from './entities/DamageMechanismTestType.entity';
import * as bcrypt from 'bcryptjs';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected');

  // Seed UBP
  const ubp1 = await AppDataSource.getRepository(Ubp).save({ name: 'UBP Suralaya', description: 'UBP Suralaya' });
  const ubp2 = await AppDataSource.getRepository(Ubp).save({ name: 'UBP Paiton', description: 'UBP Paiton' });

  // Seed Users
  const passwordHash = await bcrypt.hash('password123', 10);
  await AppDataSource.getRepository(User).save([
    { email: 'viewer@pln.co.id', name: 'Viewer', passwordHash, role: Role.VIEWER },
    { email: 'input@pln.co.id', name: 'Input', passwordHash, role: Role.INPUT },
    { email: 'qc@pln.co.id', name: 'QC', passwordHash, role: Role.QC },
    { email: 'admin@pln.co.id', name: 'Admin', passwordHash, role: Role.ADMIN },
  ]);

  // Seed TestTypes
  const testTypesData = [
    { name: 'Insulation Resistance', isActive: 1 },
    { name: 'Polarity Index', isActive: 1 },
    { name: 'Turn to Turn Ratio', isActive: 1 },
    { name: 'Winding Resistance HV', isActive: 1 },
    { name: 'Winding Resistance LV', isActive: 1 },
    { name: 'Excitation Current', isActive: 1 },
    { name: 'SFRA (HV)', isActive: 1 },
    { name: 'SFRA (LV)', isActive: 1 },
    { name: 'SFRA (Open)', isActive: 1 },
    { name: 'SFRA (Shorted)', isActive: 1 },
    { name: 'Tan Delta Winding', isActive: 1 },
    { name: 'Tan Delta Bushing', isActive: 1 },
    { name: 'Watt Loss Bushing', isActive: 1 },
    { name: 'Grounding Resistance', isActive: 1 },
    { name: 'Dirana Moisture', isActive: 1 },
    { name: 'Dirana Oil Conduct', isActive: 1 },
    { name: 'Arrester Ground', isActive: 1 },
    { name: 'Arrester IR', isActive: 1 },
    { name: 'Arrester Watt Loss', isActive: 1 },
    // Inactive ones
    { name: 'Visual Inspection', isActive: 0 },
    { name: 'DGA', isActive: 0 },
    { name: 'Oil Analysis', isActive: 0 },
    { name: 'RLA', isActive: 0 },
  ];
  
  const testTypes = await Promise.all(testTypesData.map(tt => AppDataSource.getRepository(TestType).save(tt)));

  // Equipment Mapping
  const mainTrafoTTs = testTypes.slice(0, 15);
  const arresterTTs = [testTypes.find(t => t.name === 'Arrester Ground'), testTypes.find(t => t.name === 'Arrester IR'), testTypes.find(t => t.name === 'Arrester Watt Loss'), testTypes.find(t => t.name === 'Grounding Resistance')];
  
  for (const tt of mainTrafoTTs) {
    if(tt) await AppDataSource.getRepository(EquipmentTestType).save({ equipmentType: 'Main Trafo', testType: tt });
  }
  for (const tt of arresterTTs) {
    if(tt) await AppDataSource.getRepository(EquipmentTestType).save({ equipmentType: 'Arrester', testType: tt });
  }

  // Seed Assets
  for (let i = 1; i <= 5; i++) {
    await AppDataSource.getRepository(Asset).save({ name: `Trafo ${i}`, equipmentType: 'Main Trafo', ubp: ubp1 });
  }
  for (let i = 1; i <= 5; i++) {
    await AppDataSource.getRepository(Asset).save({ name: `Arrester ${i}`, equipmentType: 'Arrester', ubp: ubp2 });
  }

  // Seed Damage Mechanisms
  const dms = [
    'Dielectric Breakdown', 'Thermal Degradation', 'Mechanical Fault', 
    'Contamination', 'Moisture Ingress', 'Oxidation', 'Aging', 
    'Overheating', 'Partial Discharge', 'Bushing Failure', 
    'Core Fault', 'Winding Deformation', 'Cooling System Failure'
  ];

  const savedDms = await Promise.all(dms.map(dm => AppDataSource.getRepository(DamageMechanism).save({ name: dm })));

  // Mapping DM to TT
  if(savedDms[0] && testTypes[0]) {
    await AppDataSource.getRepository(DamageMechanismTestType).save({ damageMechanism: savedDms[0], testType: testTypes[0] });
  }

  // Seed Parameter and Criteria Example
  const param = await AppDataSource.getRepository(Parameter).save({ testType: testTypes[0], name: 'IR Value', comparisonDirection: 'MIN' });
  await AppDataSource.getRepository(Criteria).save({ parameter: param, good: 100, fair: 50, poor: 20, judgementBasis: 'Berdasarkan standar IEEE untuk trafo daya', effectiveFrom: new Date() });

  console.log('Seed completed');
  process.exit(0);
}

seed().catch(console.error);
import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';
import { Parameter } from '../entities/Parameter';

async function main() {
  console.log('🌱 Starting Damage Mechanisms seeding...');
  
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // We explicitly run synchronize to make sure the database has the new column!
  console.log('  Synchronizing database schema...');
  await AppDataSource.synchronize();

  const paramRepo = AppDataSource.getRepository(Parameter);
  const params = await paramRepo.find({ relations: ['testType'] });
  
  console.log(`  Found ${params.length} parameters. Checking mappings...`);
  let updatedCount = 0;

  for (const p of params) {
    const ttName = (p.testType?.name || '').toUpperCase().trim();
    const pName = (p.name || '').toUpperCase().trim();
    const mechs: string[] = [];

    if (ttName.includes('TAN DELTA BUSHING') || ttName.includes('WATT LOSS BUSHING')) {
      mechs.push('Bushing-Electrical defect');
    }
    if (ttName.includes('VISUAL INSPECTION') && (pName.includes('BUSHING DEFECT') || pName.includes('CONTAMINANT'))) {
      mechs.push('Bushing-Mechanical defect');
    }
    if (ttName.includes('SFRA')) {
      // SFRA Open HV, SFRA Open LV, SFRA Shorted HV, SFRA Shorted LV, etc.
      mechs.push('Deformation');
    }
    if (ttName.includes('TURN TO TURN RATIO') || ttName.includes('WINDING RESISTANCE')) {
      mechs.push('Winding & Connection');
    }
    if (ttName.includes('EXC CURRENT') || ttName.includes('EXCITATION CURRENT')) {
      mechs.push('Core defect');
    }
    if (ttName.includes('INSULATION RESISTANCE') || ttName.includes('TAN DELTA WINDING') || ttName.includes('DIRANA MOISTURE')) {
      mechs.push('Dielectric Problem');
    }
    if (
      (ttName.includes('OIL ANALYSIS') && (pName.includes('STATUS') || pName.includes('BDV'))) || 
      ttName.includes('DIRANA OIL CONDUCT') || 
      ttName.includes('OIL CONDUCTIVITY')
    ) {
      mechs.push('Oil Problem');
    }
    if (
      ttName.includes('VISUAL INSPECTION') && 
      (pName.includes('BUSHING LEAKAGE') || pName.includes('BODY & RADIATOR LEAKAGE') || pName.includes('BODY & RADIATOR'))
    ) {
      mechs.push('Leakage');
    }
    if (
      (ttName.includes('DGA') && (pName.includes('STATUS') || pName.includes('DAMAGE MECHANISME') || pName.includes('DAMAGE'))) || 
      (ttName.includes('OIL ANALYSIS') && pName.includes('STATUS'))
    ) {
      mechs.push('Thermal Problem');
    }
    if (ttName.includes('OTI') || ttName.includes('WTI')) {
      mechs.push('OTI/WTI Problem');
    }
    if (ttName.includes('GROUNDING RESISTANCE')) {
      mechs.push('Grounding Problem');
    }
    if (
      ttName.includes('VISUAL INSPECTION') && 
      (pName.includes('SILICA GEL') || pName.includes('SILICA GEL PUDAR'))
    ) {
      mechs.push('Breating system');
    }
    if (ttName.includes('ARRESTER')) {
      mechs.push('LA Problem');
    }

    if (mechs.length > 0) {
      const mechString = mechs.join(',');
      if (p.damageMechanisms !== mechString) {
        p.damageMechanisms = mechString;
        await paramRepo.save(p);
        console.log(`    Mapped [${p.testType?.name}] - ${p.name} -> "${mechString}"`);
        updatedCount++;
      }
    }
  }

  console.log(`  Seeding finished. Updated ${updatedCount} parameters.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error seeding damage mechanisms:', err);
  process.exit(1);
});

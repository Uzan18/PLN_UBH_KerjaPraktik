import 'reflect-metadata';
import { getDb } from '../lib/db';
import { TestSession } from '../entities/TestSession';
import { Asset } from '../entities/Asset';
import { AuditLog } from '../entities/AuditLog';

async function main() {
  try {
    console.log('Connecting to database...');
    const db = await getDb();
    console.log('Database connected.');

    const sessionRepo = db.getRepository(TestSession);
    const assetRepo = db.getRepository(Asset);
    const auditRepo = db.getRepository(AuditLog);

    // Find a SUBMITTED session
    let session = await sessionRepo.findOne({
      where: { status: 'SUBMITTED' },
      relations: ['asset']
    });

    if (!session) {
      console.log('No SUBMITTED session found. Finding any DRAFT session to mark as SUBMITTED...');
      const draft = await sessionRepo.findOne({
        where: { status: 'DRAFT' },
        relations: ['asset']
      });

      if (!draft) {
        console.log('No DRAFT or SUBMITTED session found!');
        return;
      }

      draft.status = 'SUBMITTED';
      draft.additionalInfoPending = JSON.stringify({
        manufacture: 'Toshiba Test',
        type: 'Type X',
        serialNumber: 'SN-TEST-123',
        mfgYear: '2020',
        vectorGroup: 'YNd5',
        coolingMethod: 'ONAN'
      });
      session = await sessionRepo.save(draft);
      console.log(`Using mock-submitted session ID: ${session.id}`);
    } else {
      console.log(`Using existing SUBMITTED session ID: ${session.id}`);
    }

    const beforeData = { status: session.status };

    // 1. Update asset specs
    if (session.additionalInfoPending && session.asset) {
      console.log('Parsing and applying additionalInfoPending...');
      const info = JSON.parse(session.additionalInfoPending);
      const asset = session.asset;
      if (info.manufacture !== undefined) asset.manufacture = info.manufacture;
      if (info.type !== undefined) asset.type = info.type;
      if (info.serialNumber !== undefined) asset.serialNumber = info.serialNumber;
      if (info.mfgYear !== undefined) {
        asset.mfgYear = info.mfgYear ? parseInt(info.mfgYear) : null;
      }
      if (info.vectorGroup !== undefined) asset.vectorGroup = info.vectorGroup;
      if (info.coolingMethod !== undefined) asset.coolingMethod = info.coolingMethod;
      if (info.ratedPower !== undefined) asset.ratedPower = info.ratedPower;
      if (info.frequency !== undefined) asset.frequency = info.frequency;
      if (info.hvSide !== undefined) asset.hvSide = info.hvSide;
      if (info.hvRatedCurrent !== undefined) asset.hvRatedCurrent = info.hvRatedCurrent;
      if (info.lvSide !== undefined) asset.lvSide = info.lvSide;
      if (info.lvRatedCurrent !== undefined) asset.lvRatedCurrent = info.lvRatedCurrent;
      
      console.log('Saving updated Asset spec...');
      await assetRepo.save(asset);
      console.log('Asset specs saved.');

      session.additionalInfo = session.additionalInfoPending;
    }

    session.status = 'VALIDATED';
    session.validatedById = 'd9f6d737-641f-4df3-9503-70b5fb93dd8d'; // Real QC User ID
    session.validatedAt = new Date();

    console.log('Saving TestSession with status VALIDATED...');
    const updated = await sessionRepo.save(session);
    console.log('TestSession saved.');

    // 2. Audit log
    console.log('Saving AuditLog...');
    const auditLog = auditRepo.create({
      userId: 'd9f6d737-641f-4df3-9503-70b5fb93dd8d', // Real QC User ID
      action: 'APPROVE_TEST_SESSION',
      entity: 'TestSession',
      entityId: session.id,
      beforeData: JSON.stringify(beforeData),
      afterData: JSON.stringify({ status: 'VALIDATED' }),
    });
    await auditRepo.save(auditLog);
    console.log('AuditLog saved successfully.');

    console.log('--- APPROVAL REAL USER SIMULATION SUCCEEDED ---');
  } catch (err) {
    console.error('--- APPROVAL REAL USER SIMULATION FAILED ---');
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

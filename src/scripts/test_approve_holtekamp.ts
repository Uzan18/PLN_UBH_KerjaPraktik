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

    const sessionId = '68f662b5-7221-4e36-be15-2e681d517a9a';
    const qcUserId = 'd9f6d737-641f-4df3-9503-70b5fb93dd8d'; // Real QC User ID

    console.log(`Fetching session ID ${sessionId}...`);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['asset']
    });

    if (!session) {
      console.error(`Session ID ${sessionId} not found in database!`);
      return;
    }

    console.log(`Session found: status = ${session.status}, asset = ${session.asset?.name}`);
    console.log(`Pending specifications: ${session.additionalInfoPending}`);

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
        // Safe integer parse to prevent NaN errors
        const parsedYear = info.mfgYear ? parseInt(info.mfgYear) : null;
        asset.mfgYear = isNaN(parsedYear as number) ? null : parsedYear;
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
    session.validatedById = qcUserId;
    session.validatedAt = new Date();

    console.log('Saving TestSession with status VALIDATED...');
    const updated = await sessionRepo.save(session);
    console.log('TestSession saved successfully.');

    // 2. Audit log
    console.log('Saving AuditLog...');
    const auditLog = auditRepo.create({
      userId: qcUserId,
      action: 'APPROVE_TEST_SESSION',
      entity: 'TestSession',
      entityId: session.id,
      beforeData: JSON.stringify(beforeData),
      afterData: JSON.stringify({ status: 'VALIDATED' }),
    });
    await auditRepo.save(auditLog);
    console.log('AuditLog saved successfully.');

    console.log('--- TARGETED APPROVAL SUCCEEDED ---');
  } catch (err) {
    console.error('--- TARGETED APPROVAL FAILED ---');
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

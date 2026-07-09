import 'reflect-metadata';
import { getDb } from '../lib/db';
import { TestSession } from '../entities/TestSession';
import { Asset } from '../entities/Asset';
import { User } from '../entities/User';

async function main() {
  try {
    const db = await getDb();
    const sessionRepo = db.getRepository(TestSession);
    const assetRepo = db.getRepository(Asset);
    const userRepo = db.getRepository(User);

    console.log('Fetching a target asset and input user...');
    const asset = await assetRepo.findOne({ where: {} });
    const inputUser = await userRepo.findOne({ where: {} });

    if (!asset || !inputUser) {
      console.error('Asset or input user not found.');
      return;
    }

    console.log(`Creating new SUBMITTED session for asset: ${asset.name}...`);
    const session = sessionRepo.create({
      assetId: asset.id,
      testYear: 2026,
      status: 'SUBMITTED',
      createdById: inputUser.id,
      additionalInfoPending: JSON.stringify({
        manufacture: 'Toshiba',
        type: 'SPFZ',
        serialNumber: 'SN-SURALAYA-999',
        mfgYear: '2015',
        vectorGroup: 'YNd11',
        coolingMethod: 'ONAN',
        ratedPower: '300 MVA',
        frequency: '50 Hz',
        hvSide: '150 kV',
        hvRatedCurrent: '1154 A',
        lvSide: '20 kV',
        lvRatedCurrent: '8660 A'
      }),
    });

    await sessionRepo.save(session);
    console.log(`Successfully created SUBMITTED session ID: ${session.id}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

import 'reflect-metadata';
import { getDb } from '../lib/db';
import { TestSession } from '../entities/TestSession';

async function main() {
  try {
    const db = await getDb();
    const repo = db.getRepository(TestSession);
    const sessions = await repo.find({
      where: { status: 'SUBMITTED' },
      relations: ['asset']
    });

    console.log(`Found ${sessions.length} SUBMITTED sessions:`);
    sessions.forEach((s) => {
      console.log(`\nSession ID: ${s.id}`);
      console.log(`Asset Name: ${s.asset?.name} (ID: ${s.assetId})`);
      console.log(`Pending Info: ${s.additionalInfoPending}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

import 'reflect-metadata';
import { getDb } from '../lib/db';
import { TestSession } from '../entities/TestSession';

async function main() {
  try {
    const db = await getDb();
    const repo = db.getRepository(TestSession);
    const sessions = await repo.find({
      where: { status: 'VALIDATED' },
      relations: ['asset']
    });

    console.log(`Found ${sessions.length} VALIDATED sessions:`);
    sessions.forEach((s) => {
      console.log(`- Session ID: ${s.id}, Asset: ${s.asset?.name}, Validated By User ID: ${s.validatedById}, Validated At: ${s.validatedAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

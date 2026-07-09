import 'reflect-metadata';
import { getDb } from '../lib/db';
import { TestSession } from '../entities/TestSession';

async function main() {
  try {
    console.log('Connecting to database...');
    const db = await getDb();
    console.log('Database connected.');

    const repo = db.getRepository(TestSession);
    
    // Check if table metadata contains additional_info
    const columns = db.getMetadata(TestSession).columns;
    console.log('TestSession Entity Columns:');
    columns.forEach(col => {
      console.log(`- ${col.propertyName} (column: ${col.databaseName})`);
    });

    console.log('Fetching first validated session...');
    const session = await repo.findOne({ where: { status: 'VALIDATED' } });
    if (!session) {
      console.log('No validated session found. Fetching any session...');
      const anySession = await repo.findOne({ where: {} });
      if (!anySession) {
        console.log('No session found in DB!');
        return;
      }
      console.log(`Found session ID: ${anySession.id}, status: ${anySession.status}`);
      // Test update
      anySession.additionalInfo = JSON.stringify({ test: "val" });
      await repo.save(anySession);
      console.log('Successfully saved additionalInfo on session!');
    } else {
      console.log(`Found validated session ID: ${session.id}`);
      session.additionalInfo = JSON.stringify({ test: "val" });
      await repo.save(session);
      console.log('Successfully saved additionalInfo on session!');
    }
  } catch (err) {
    console.error('DATABASE TEST FAILED:', err);
  } finally {
    process.exit(0);
  }
}

main();

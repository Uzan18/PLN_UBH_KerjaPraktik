import 'reflect-metadata';
import { getDb } from '../lib/db';
import { AuditLog } from '../entities/AuditLog';
import { TestSession } from '../entities/TestSession';

async function main() {
  try {
    const db = await getDb();
    const auditRepo = db.getRepository(AuditLog);
    const sessionRepo = db.getRepository(TestSession);

    console.log('--- RECENT AUDIT LOGS ---');
    const logs = await auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 10
    });
    logs.forEach(log => {
      console.log(`[${log.createdAt.toISOString()}] User: ${log.userId}, Action: ${log.action}, Entity: ${log.entity}, ID: ${log.entityId}`);
    });

    console.log('\n--- RECENT VALIDATED SESSIONS ---');
    const sessions = await sessionRepo.find({
      where: { status: 'VALIDATED' },
      order: { validatedAt: 'DESC' },
      take: 5
    });
    sessions.forEach(s => {
      console.log(`Session: ${s.id}, ValidatedBy: ${s.validatedById}, ValidatedAt: ${s.validatedAt?.toISOString()}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

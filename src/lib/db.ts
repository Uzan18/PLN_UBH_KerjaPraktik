import 'reflect-metadata';
import { AppDataSource } from '@/lib/data-source';

/**
 * Database connection manager for TypeORM + Oracle.
 *
 * Provides a lazy-initialized, singleton DataSource that is safe for
 * Next.js hot-reloading in development and efficient in production.
 *
 * Usage in API routes:
 *   import { getDb } from '@/lib/db';
 *   const db = await getDb();
 *   const repo = db.getRepository(User);
 */

const globalForDb = globalThis as unknown as {
  dbInitPromise: Promise<typeof AppDataSource> | null;
};

/**
 * Get the initialized TypeORM DataSource.
 * Initializes on first call; subsequent calls return the same instance.
 */
export async function getDb(): Promise<typeof AppDataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!globalForDb.dbInitPromise) {
    globalForDb.dbInitPromise = AppDataSource.initialize()
      .then((ds) => {
        console.log('✅ TypeORM DataSource initialized (Oracle)');
        return ds;
      })
      .catch((err) => {
        console.error('❌ TypeORM DataSource initialization failed:', err);
        globalForDb.dbInitPromise = null;
        throw err;
      });
  }

  return globalForDb.dbInitPromise;
}

export default getDb;

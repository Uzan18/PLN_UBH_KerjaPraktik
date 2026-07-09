import 'reflect-metadata';
import { AppDataSource } from '@/lib/data-source';
import { DataSource } from 'typeorm';

/**
 * Database connection manager for TypeORM + Oracle.
 *
 * Provides a hot-reload aware, singleton DataSource that is safe for
 * Next.js hot-reloading in development and efficient in production.
 */

const globalForDb = globalThis as unknown as {
  initializedDataSource: DataSource | null;
  dbInitPromise: Promise<DataSource> | null;
};

/**
 * Get the initialized TypeORM DataSource.
 * Detects Next.js hot-reloads, destroying the old connection pool
 * and initializing the new instance to avoid class mismatch errors.
 */
export async function getDb(): Promise<DataSource> {
  // If we have an initialized data source, check if it's the current one (no hot-reload)
  if (globalForDb.initializedDataSource) {
    // If it's the exact same instance as the imported AppDataSource, and it's initialized, reuse it
    if (globalForDb.initializedDataSource === AppDataSource && AppDataSource.isInitialized) {
      return AppDataSource;
    }
    
    // If it's a different instance (hot-reload occurred), we must destroy the old one first
    console.log('🔄 Hot-reload detected. Re-initializing TypeORM DataSource...');
    try {
      if (globalForDb.initializedDataSource.isInitialized) {
        await globalForDb.initializedDataSource.destroy();
        console.log('✅ Old TypeORM DataSource destroyed.');
      }
    } catch (err) {
      console.error('⚠️ Failed to destroy old DataSource:', err);
    }
    globalForDb.initializedDataSource = null;
    globalForDb.dbInitPromise = null;
  }

  if (!globalForDb.dbInitPromise) {
    globalForDb.dbInitPromise = AppDataSource.initialize()
      .then((ds) => {
        console.log('✅ TypeORM DataSource initialized (Oracle)');
        globalForDb.initializedDataSource = ds;
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

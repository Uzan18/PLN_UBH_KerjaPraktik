import 'reflect-metadata';
import { AppDataSource } from '@/lib/data-source';
import { DataSource } from 'typeorm';

/**
 * Database connection manager for TypeORM + Oracle.
 * Maintains a persistent singleton DataSource on globalThis across Next.js dev hot-reloads.
 */

const globalForDb = globalThis as unknown as {
  dataSource: DataSource | null;
  initPromise: Promise<DataSource> | null;
};

export async function getDb(): Promise<DataSource> {
  // 1. Reuse existing initialized DataSource if active
  if (globalForDb.dataSource?.isInitialized) {
    return globalForDb.dataSource;
  }

  // 2. Initialize once if not already initializing
  if (!globalForDb.initPromise) {
    globalForDb.initPromise = (async () => {
      let ds: DataSource;
      if (AppDataSource.isInitialized) {
        ds = AppDataSource;
      } else {
        ds = await AppDataSource.initialize();
        console.log('✅ TypeORM DataSource initialized (Oracle)');
      }

      // ─────────────────────────────────────────────────────────────────
      // Patch getMetadata on DataSource.
      // Next.js bundles each API route separately, so entity class objects
      // imported by a route differ from those registered in AppDataSource.
      // Patching getMetadata ensures ALL TypeORM calls (getRepository,
      // .find({ relations: [...] }), QueryBuilder, etc.) can always resolve
      // entity metadata by class name or table name.
      // ─────────────────────────────────────────────────────────────────
      const originalGetMetadata = ds.getMetadata.bind(ds);
      (ds as any).getMetadata = function (target: unknown): unknown {
        try {
          return originalGetMetadata(target as never);
        } catch (err: unknown) {
          const searchName =
            typeof target === 'function'
              ? (target as { name: string }).name
              : typeof target === 'string'
              ? target
              : String(target);

          if (searchName) {
            const match = ds.entityMetadatas.find(
              (m) =>
                m.name === searchName ||
                m.name.toLowerCase() === searchName.toLowerCase() ||
                m.tableName.toLowerCase() === searchName.toLowerCase()
            );
            if (match) {
              return match;
            }
          }
          throw err;
        }
      };

      globalForDb.dataSource = ds;
      return ds;
    })().catch((err) => {
      console.error('❌ TypeORM DataSource initialization failed:', err);
      globalForDb.initPromise = null;
      globalForDb.dataSource = null;
      throw err;
    });
  }

  return globalForDb.initPromise;
}

export default getDb;

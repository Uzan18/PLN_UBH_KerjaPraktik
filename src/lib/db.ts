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
  metadataPatchApplied: boolean;
};

/**
 * Patch getMetadata so TypeORM can always resolve entity classes by name.
 *
 * Next.js bundles each API route separately, meaning the entity class
 * object imported in a route chunk differs from the one registered in
 * AppDataSource.  By searching by class name / table name as a fallback,
 * we avoid spurious "No metadata for X was found" errors.
 *
 * We patch THREE places so no code path can bypass the fallback:
 *   1. The DataSource instance (ds.getMetadata)
 *   2. The EntityManager instance (ds.manager.getMetadata) — used by getRepository()
 *   3. DataSource.prototype — safety net for any future indirect calls
 *
 * Each patch is idempotent via __metadataPatchApplied flag on the object.
 */
function makeFallbackGetMetadata(
  original: (target: unknown) => unknown,
  getMetadatas: () => { name: string; tableName: string; target: unknown }[]
): (target: unknown) => unknown {
  return function patchedGetMetadata(target: unknown): unknown {
    try {
      return original(target);
    } catch (_err: unknown) {
      const searchName =
        typeof target === 'function'
          ? (target as { name: string }).name
          : typeof target === 'string'
          ? target
          : String(target);

      if (searchName) {
        const metadatas = getMetadatas();
        const match = metadatas.find(
          (m) =>
            m.name === searchName ||
            m.name.toLowerCase() === searchName.toLowerCase() ||
            m.tableName?.toLowerCase() === searchName.toLowerCase()
        );
        if (match) return match;
      }
      throw _err;
    }
  };
}

function patchObj(obj: any, getMetadatas: () => any[]): void {
  if (!obj || obj.__metadataPatchApplied) return;
  obj.__metadataPatchApplied = true;
  const original = obj.getMetadata.bind(obj);
  obj.getMetadata = makeFallbackGetMetadata(original, getMetadatas);
}

function ensureMetadataPatch(ds: DataSource): void {
  const getMetas = () => ds.entityMetadatas as any[];

  // 1. Patch DataSource instance
  patchObj(ds, getMetas);

  // 2. Patch EntityManager instance — getRepository() goes through this
  if (ds.manager && !(ds.manager as any).__metadataPatchApplied) {
    patchObj(ds.manager as any, getMetas);
  }

  // 3. Patch DataSource prototype — safety net; only once per prototype object
  const proto = Object.getPrototypeOf(ds);
  if (proto && !proto.__metadataPatchApplied && typeof proto.getMetadata === 'function') {
    patchObj(proto, getMetas);
  }
}


export async function getDb(): Promise<DataSource> {
  // 1. Reuse existing initialized DataSource if active — always ensure patch
  if (globalForDb.dataSource?.isInitialized) {
    ensureMetadataPatch(globalForDb.dataSource);
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

      ensureMetadataPatch(ds);

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

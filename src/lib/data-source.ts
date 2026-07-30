import 'reflect-metadata';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';

// Robust env loader for Node.js scripts (.env and .env.local)
const envFiles = ['.env.local', '.env'];
envFiles.forEach((file) => {
  try {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const index = trimmed.indexOf('=');
          if (index > 0) {
            const key = trimmed.substring(0, index).trim();
            let val = trimmed.substring(index + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (key) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (e) {
    // Ignore manual load errors
  }
});
import { Ubp } from '@/entities/Ubp';
import { UnitPembangkit } from '@/entities/UnitPembangkit';
import { JenisAsset } from '@/entities/JenisAsset';
import { Asset } from '@/entities/Asset';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { DamageMechanism } from '@/entities/DamageMechanism';
import { Criteria } from '@/entities/Criteria';
import { TestSession } from '@/entities/TestSession';
import { TestResult } from '@/entities/TestResult';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { ReportDirectory } from '@/entities/ReportDirectory';
import { ReportFile } from '@/entities/ReportFile';

/**
 * TypeORM DataSource configuration for Oracle Database.
 *
 * Connection parameters are read from environment variables:
 * - ORACLE_HOST
 * - ORACLE_PORT
 * - ORACLE_SID (or ORACLE_SERVICE_NAME)
 * - ORACLE_USER
 * - ORACLE_PASSWORD
 *
 * For development, use Oracle XE in Docker.
 */
const globalForDataSource = globalThis as unknown as {
  appDataSource: DataSource | null;
};

// [SEC-02] Validate required env vars at startup — no hardcoded fallback credentials
const oracleUser = process.env.ORACLE_USER;
const oraclePassword = process.env.ORACLE_PASSWORD;

if (!oracleUser || !oraclePassword) {
  throw new Error(
    '[data-source] ORACLE_USER dan ORACLE_PASSWORD harus di-set di environment variables. ' +
    'Salin .env.example ke .env dan isi dengan nilai yang sesuai.'
  );
}

export const AppDataSource = globalForDataSource.appDataSource || new DataSource({
  type: 'oracle',
  host: process.env.ORACLE_HOST || 'localhost',
  port: parseInt(process.env.ORACLE_PORT || '1521'),
  serviceName: process.env.ORACLE_SERVICE_NAME || process.env.ORACLE_SID || 'XEPDB1',
  username: oracleUser,
  password: oraclePassword,
  entities: [
    Ubp,
    UnitPembangkit,
    JenisAsset,
    Asset,
    TestType,
    Parameter,
    DamageMechanism,
    Criteria,
    TestSession,
    TestResult,
    User,
    AuditLog,
    ReportDirectory,
    ReportFile,
  ],
  synchronize: false, // Disabled in production (schema is managed via sync-db.ts script)
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  // Oracle-specific options
  extra: {
    // Connection pool settings
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
  },
});

globalForDataSource.appDataSource = AppDataSource;


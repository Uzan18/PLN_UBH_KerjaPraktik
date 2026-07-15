import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';

async function main() {
  console.log('🔄 Synchronizing DB schema...');
  await AppDataSource.initialize();
  await AppDataSource.synchronize();
  console.log('✅ DB Schema synchronized successfully.');
  await AppDataSource.destroy();
}

main().catch(console.error);

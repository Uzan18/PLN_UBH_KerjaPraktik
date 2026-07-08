import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'oracle',
  host: process.env.ORACLE_HOST,
  port: Number(process.env.ORACLE_PORT) || 1521,
  serviceName: process.env.ORACLE_SERVICE,
  username: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  synchronize: false, // JANGAN true di production
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],
});

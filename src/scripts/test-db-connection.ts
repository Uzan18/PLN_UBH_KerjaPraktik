import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';

async function testConnection() {
  console.log('📡 Starting Database Connection Diagnosis...');
  console.log('---------------------------------------------');
  console.log(`Host:         ${process.env.ORACLE_HOST || 'localhost (default)'}`);
  console.log(`Port:         ${process.env.ORACLE_PORT || '1521 (default)'}`);
  console.log(`SID (env):    ${process.env.ORACLE_SID || 'not set'}`);
  console.log(`Service (env):${process.env.ORACLE_SERVICE_NAME || 'not set'}`);
  console.log(`User (env):   ${process.env.ORACLE_USER || 'not set'}`);
  console.log('---------------------------------------------');

  // Resolve what TypeORM will actually use
  const resolvedHost = process.env.ORACLE_HOST || 'localhost';
  const resolvedPort = parseInt(process.env.ORACLE_PORT || '1521');
  const resolvedService = process.env.ORACLE_SERVICE_NAME || process.env.ORACLE_SID || 'XEPDB1';
  const resolvedUser = process.env.ORACLE_USER || 'db_admin';

  console.log('Attempting connection to Oracle with resolved settings:');
  console.log(`👉 Host:         ${resolvedHost}`);
  console.log(`👉 Port:         ${resolvedPort}`);
  console.log(`👉 ServiceName:  ${resolvedService}`);
  console.log(`👉 Username:     ${resolvedUser}`);
  console.log('---------------------------------------------');

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Success! Successfully connected to Oracle Database.');

    // Run a simple query to see database info
    const dbInfo = await AppDataSource.query("SELECT sys_context('USERENV', 'DB_NAME') as db_name, sys_context('USERENV', 'SESSION_USER') as session_user FROM dual");
    console.log('Database Info:', dbInfo);

    await AppDataSource.destroy();
  } catch (err: any) {
    console.error('❌ Connection Failed!');
    console.error('Error Details:', err);

    if (err.message && err.message.includes('ORA-01017')) {
      console.log('\n💡 DIAGNOSIS FOR ORA-01017 (Logon Denied):');
      console.log('1. Check if the username and password are correct.');
      console.log(`2. If your SQL Developer is connecting to "XEPDB1" (Pluggable Database) but your env has ORACLE_SID=XE (Container Database), the user "${resolvedUser}" might not exist in the Container Database.`);
      console.log('   -> Try setting ORACLE_SID=XEPDB1 or ORACLE_SERVICE_NAME=XEPDB1 in your .env file.');
    }
  }
}

testConnection();

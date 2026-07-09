import 'reflect-metadata';
import { getDb } from '../lib/db';

async function main() {
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT "id", "name", "role" FROM "siat_user"`
    );
    console.log('Registered Users:', result);

    const cols = await db.query(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME 
       FROM ALL_CONS_COLUMNS 
       WHERE CONSTRAINT_NAME = 'FK_4a4e0ecd4a598201c2dc4852d7c'`
    );
    console.log('Constraint columns:', cols);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();

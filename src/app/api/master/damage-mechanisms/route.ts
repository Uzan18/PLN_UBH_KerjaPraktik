import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * Helper to ensure damage_mechanism table exists and is seeded in Oracle DB
 */
async function ensureDamageMechanismTable(db: any) {
  // Create table if it doesn't exist
  await db.query(`
    BEGIN
      EXECUTE IMMEDIATE 'CREATE TABLE damage_mechanism (name VARCHAR2(100) PRIMARY KEY)';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -955 THEN
          RAISE;
        END IF;
    END;
  `);

  // Check if empty, if so, insert default mechanisms
  const countRes = await db.query(`SELECT COUNT(*) as cnt FROM damage_mechanism`);
  const count = countRes[0]?.CNT || countRes[0]?.cnt || 0;
  if (count === 0) {
    const DEFAULT_MECHS = [
      'Deformation',
      'Dielectric Problem',
      'OTI/WTI Problem',
      'Leakage',
      'LA Problem',
      'Core defect',
      'Bushing-Electrical defect',
      'Oil Problem',
      'Grounding Problem',
      'Bushing-Mechanical defect',
      'Winding & Connection',
      'Thermal Problem',
      'Breating system',
    ];
    for (const m of DEFAULT_MECHS) {
      await db.query(`INSERT INTO damage_mechanism (name) VALUES (:name)`, [m]);
    }
  }
}

/**
 * GET /api/master/damage-mechanisms
 * Returns the list of damage mechanisms and all parameters grouped by test type.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:read');

    const db = await getDb();
    await ensureDamageMechanismTable(db);

    // Fetch dynamic damage mechanisms
    const mechanismsRes = await db.query(`SELECT name FROM damage_mechanism ORDER BY name ASC`);
    const mechanisms = mechanismsRes.map((r: any) => r.NAME || r.name);
    
    // Fetch all test types and their parameters
    const testTypes = await db.getRepository<TestType>('TestType')
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.parameters', 'p')
      .orderBy('tt.orderIndex', 'ASC')
      .addOrderBy('p.orderIndex', 'ASC')
      .getMany();

    return NextResponse.json({
      success: true,
      data: {
        mechanisms: mechanisms,
        testTypes: testTypes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * POST /api/master/damage-mechanisms
 * Supports:
 * 1. CRUD actions on Damage Mechanisms (create, update, delete)
 * 2. Parameter mapping updates for a mechanism
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { action, name, oldName, newName, mechanism, parameterIds } = body;

    const db = await getDb();
    await ensureDamageMechanismTable(db);

    const auditRepo = db.getRepository<AuditLog>('AuditLog');
    const paramRepo = db.getRepository<Parameter>('Parameter');

    // ACTION: create
    if (action === 'create') {
      if (!name || name.trim() === '') {
        return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
      }
      const trimmedName = name.trim();
      
      // Insert into table
      await db.query(`INSERT INTO damage_mechanism (name) VALUES (:name)`, [trimmedName]);

      // Audit Log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'CREATE',
        entity: 'DamageMechanism',
        entityId: trimmedName,
        afterData: JSON.stringify({ name: trimmedName }),
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true, data: { name: trimmedName } });
    }

    // ACTION: update (rename)
    if (action === 'update') {
      if (!oldName || !newName || newName.trim() === '') {
        return NextResponse.json({ success: false, error: 'Old name and new name are required' }, { status: 400 });
      }
      const trimmedNewName = newName.trim();

      // Update table name
      await db.query(
        `UPDATE damage_mechanism SET name = :newName WHERE name = :oldName`,
        [trimmedNewName, oldName]
      );

      // Update all parameters mapping
      const allParams = await paramRepo.find();
      const updatedParams: Parameter[] = [];
      for (const p of allParams) {
        if (p.damageMechanisms) {
          const list = p.damageMechanisms.split(',').map((m) => m.trim());
          if (list.includes(oldName)) {
            const updatedList = list.map((m) => (m === oldName ? trimmedNewName : m));
            p.damageMechanisms = updatedList.join(',');
            updatedParams.push(p);
          }
        }
      }
      if (updatedParams.length > 0) {
        await paramRepo.save(updatedParams);
      }

      // Audit Log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'DamageMechanism',
        entityId: oldName,
        beforeData: JSON.stringify({ name: oldName }),
        afterData: JSON.stringify({ name: trimmedNewName }),
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true });
    }

    // ACTION: delete
    if (action === 'delete') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      }

      // Delete from table
      await db.query(`DELETE FROM damage_mechanism WHERE name = :name`, [name]);

      // Remove from all parameters mapping
      const allParams = await paramRepo.find();
      const updatedParams: Parameter[] = [];
      for (const p of allParams) {
        if (p.damageMechanisms) {
          const list = p.damageMechanisms.split(',').map((m) => m.trim());
          if (list.includes(name)) {
            const updatedList = list.filter((m) => m !== name);
            p.damageMechanisms = updatedList.length > 0 ? updatedList.join(',') : null;
            updatedParams.push(p);
          }
        }
      }
      if (updatedParams.length > 0) {
        await paramRepo.save(updatedParams);
      }

      // Audit Log
      const auditLog = auditRepo.create({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'DamageMechanism',
        entityId: name,
        beforeData: JSON.stringify({ name }),
      });
      await auditRepo.save(auditLog);

      return NextResponse.json({ success: true });
    }

    // ACTION: save mapping (default behaviour if no CRUD action specified)
    if (!mechanism) {
      return NextResponse.json({ success: false, error: 'Mechanism is required' }, { status: 400 });
    }

    if (!Array.isArray(parameterIds)) {
      return NextResponse.json({ success: false, error: 'parameterIds must be an array' }, { status: 400 });
    }

    // Fetch all parameters to update their mappings
    const allParams = await paramRepo.find({ relations: ['testType'] });
    const updatedParams: Parameter[] = [];
    const addedParamNames: string[] = [];
    const removedParamNames: string[] = [];

    for (const p of allParams) {
      const currentMechs = p.damageMechanisms
        ? p.damageMechanisms.split(',').map((m) => m.trim())
        : [];
      
      const shouldHave = parameterIds.includes(p.id);
      const has = currentMechs.includes(mechanism);

      let changed = false;
      let newMechs = [...currentMechs];

      if (shouldHave && !has) {
        newMechs.push(mechanism);
        addedParamNames.push(`[${p.testType?.name || 'Unknown'}] - ${p.name}`);
        changed = true;
      } else if (!shouldHave && has) {
        newMechs = newMechs.filter((m) => m !== mechanism);
        removedParamNames.push(`[${p.testType?.name || 'Unknown'}] - ${p.name}`);
        changed = true;
      }

      if (changed) {
        p.damageMechanisms = newMechs.length > 0 ? newMechs.join(',') : null;
        updatedParams.push(p);
      }
    }

    // Save changes in batch/transaction
    if (updatedParams.length > 0) {
      await paramRepo.save(updatedParams);
    }

    // Create Audit Log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'DamageMechanismMapping',
      entityId: mechanism,
      beforeData: JSON.stringify({ mechanism, removed: removedParamNames }),
      afterData: JSON.stringify({ mechanism, added: addedParamNames }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({
      success: true,
      data: {
        addedCount: addedParamNames.length,
        removedCount: removedParamNames.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

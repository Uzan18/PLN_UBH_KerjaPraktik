import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { TestType } from '@/entities/TestType';
import { Parameter } from '@/entities/Parameter';
import { DamageMechanism } from '@/entities/DamageMechanism';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-error';

/**
 * Ensure the damage_mechanism table and parameter_damage_mechanism junction table exist.
 * Both are created manually (synchronize: false), so we guard with DDL-if-not-exists.
 */
async function ensureTables(db: Awaited<ReturnType<typeof getDb>>) {
  // Master lookup table
  await db.query(`
    BEGIN
      EXECUTE IMMEDIATE 'CREATE TABLE damage_mechanism (name VARCHAR2(100) PRIMARY KEY)';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -955 THEN RAISE; END IF;
    END;
  `);

  // Junction table
  await db.query(`
    BEGIN
      EXECUTE IMMEDIATE '
        CREATE TABLE parameter_damage_mechanism (
          parameter_id VARCHAR2(36) NOT NULL,
          damage_mechanism_name VARCHAR2(100) NOT NULL,
          CONSTRAINT pk_pdm PRIMARY KEY (parameter_id, damage_mechanism_name)
        )
      ';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -955 THEN RAISE; END IF;
    END;
  `);
}

/**
 * GET /api/master/damage-mechanisms
 * Returns all damage mechanisms and all test types with their parameters
 * (each parameter includes its mapped damageMechanisms as an array of strings).
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:read');

    const db = await getDb();
    await ensureTables(db);

    // Fetch all mechanism names
    const mechanismsRes = await db.query(`SELECT name FROM damage_mechanism ORDER BY name ASC`);
    const mechanisms: string[] = mechanismsRes.map((r: Record<string, string>) => r.NAME ?? r.name);

    // Fetch all test types → parameters → damageMechanisms (via junction table)
    const testTypes = await db
      .getRepository(TestType)
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.parameters', 'p')
      .leftJoinAndSelect('p.damageMechanisms', 'dm')
      .orderBy('tt.orderIndex', 'ASC')
      .addOrderBy('p.orderIndex', 'ASC')
      .getMany();

    return NextResponse.json({ success: true, data: { mechanisms, testTypes } });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/master/damage-mechanisms
 * Supports:
 *   action=create   — add new mechanism to lookup table
 *   action=update   — rename mechanism (cascades to junction rows via ON DELETE CASCADE + re-insert)
 *   action=delete   — remove mechanism (junction rows cascade-deleted)
 *   (no action)     — save parameter mapping for a given mechanism
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
    await ensureTables(db);

    const auditRepo = db.getRepository(AuditLog);

    // ── ACTION: create ────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!name?.trim()) {
        return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
      }
      const trimmedName = name.trim();
      await db.query(`INSERT INTO damage_mechanism (name) VALUES (:name)`, [trimmedName]);

      await auditRepo.save(auditRepo.create({
        userId: session.user.id,
        action: 'CREATE',
        entity: 'DamageMechanism',
        entityId: trimmedName,
        afterData: JSON.stringify({ name: trimmedName }),
      }));

      return NextResponse.json({ success: true, data: { name: trimmedName } });
    }

    // ── ACTION: update (rename) ───────────────────────────────────────────────
    if (action === 'update') {
      if (!oldName || !newName?.trim()) {
        return NextResponse.json({ success: false, error: 'oldName and newName are required' }, { status: 400 });
      }
      const trimmedNewName = newName.trim();

      // ON DELETE CASCADE handles junction rows — but we need to keep existing mappings.
      // Strategy: rename in place (junction FK also updates via UPDATE CASCADE if supported,
      // otherwise re-create junction rows manually).
      // Oracle does not support ON UPDATE CASCADE — so:
      //  1. Read current junction rows for oldName
      //  2. Insert new rows for newName
      //  3. Update damage_mechanism name
      //  4. Delete old junction rows (or they cascade — depends on FK direction)
      // Safest: rename lookup first, junction FK references the new name automatically if we UPDATE.
      // Actually since we have FK pdm_mech → damage_mechanism(name), we update damage_mechanism first
      // then junction rows still point to old name. We need to update junction rows too.

      // Step 1: get all impacted junction rows
      const junctionRows = await db.query(
        `SELECT parameter_id FROM parameter_damage_mechanism WHERE damage_mechanism_name = :oldName`,
        [oldName]
      );

      // Step 2: delete old junction rows
      await db.query(
        `DELETE FROM parameter_damage_mechanism WHERE damage_mechanism_name = :oldName`,
        [oldName]
      );

      // Step 3: rename the mechanism
      await db.query(
        `UPDATE damage_mechanism SET name = :newName WHERE name = :oldName`,
        [trimmedNewName, oldName]
      );

      // Step 4: re-insert junction rows with new name
      for (const row of junctionRows) {
        const parameterId: string = row.PARAMETER_ID ?? row.parameter_id;
        await db.query(
          `INSERT INTO parameter_damage_mechanism (parameter_id, damage_mechanism_name) VALUES (:pid, :mname)`,
          [parameterId, trimmedNewName]
        );
      }

      await auditRepo.save(auditRepo.create({
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'DamageMechanism',
        entityId: oldName,
        beforeData: JSON.stringify({ name: oldName }),
        afterData: JSON.stringify({ name: trimmedNewName }),
      }));

      return NextResponse.json({ success: true });
    }

    // ── ACTION: delete ────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      }
      // Junction rows deleted by ON DELETE CASCADE
      await db.query(`DELETE FROM damage_mechanism WHERE name = :name`, [name]);

      await auditRepo.save(auditRepo.create({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'DamageMechanism',
        entityId: name,
        beforeData: JSON.stringify({ name }),
      }));

      return NextResponse.json({ success: true });
    }

    // ── ACTION: save mapping (default) ────────────────────────────────────────
    if (!mechanism) {
      return NextResponse.json({ success: false, error: 'Mechanism is required' }, { status: 400 });
    }
    if (!Array.isArray(parameterIds)) {
      return NextResponse.json({ success: false, error: 'parameterIds must be an array' }, { status: 400 });
    }

    // Get current mapped parameter IDs for this mechanism
    const currentRows = await db.query(
      `SELECT parameter_id FROM parameter_damage_mechanism WHERE damage_mechanism_name = :mech`,
      [mechanism]
    );
    const currentIds = new Set<string>(
      currentRows.map((r: Record<string, string>) => r.PARAMETER_ID ?? r.parameter_id)
    );
    const targetIds = new Set<string>(parameterIds as string[]);

    const toAdd = [...targetIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !targetIds.has(id));

    // Insert new mappings
    for (const pid of toAdd) {
      await db.query(
        `INSERT INTO parameter_damage_mechanism (parameter_id, damage_mechanism_name) VALUES (:pid, :mname)`,
        [pid, mechanism]
      );
    }
    // Remove stale mappings
    for (const pid of toRemove) {
      await db.query(
        `DELETE FROM parameter_damage_mechanism WHERE parameter_id = :pid AND damage_mechanism_name = :mname`,
        [pid, mechanism]
      );
    }

    // Resolve parameter names for audit log
    const paramRepo = db.getRepository(Parameter);
    const allParams = toAdd.length > 0 || toRemove.length > 0
      ? await paramRepo.find({ relations: ['testType'] })
      : [];
    const nameOf = (id: string) => {
      const p = allParams.find((x) => x.id === id);
      return p ? `[${p.testType?.name ?? 'Unknown'}] - ${p.name}` : id;
    };

    await auditRepo.save(auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'DamageMechanismMapping',
      entityId: mechanism,
      beforeData: JSON.stringify({ mechanism, removed: toRemove.map(nameOf) }),
      afterData: JSON.stringify({ mechanism, added: toAdd.map(nameOf) }),
    }));

    return NextResponse.json({ success: true, data: { addedCount: toAdd.length, removedCount: toRemove.length } });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';

/**
 * GET /api/audit-logs?page=1&limit=20&action=&entity=&search=
 * Lists audit logs with pagination, filters, and user info.
 * ADMIN only.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'audit-log:read');

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')));
    const actionFilter = url.searchParams.get('action') || '';
    const entityFilter = url.searchParams.get('entity') || '';
    const searchQuery = url.searchParams.get('search') || '';

    const db = await getDb();
    const auditRepo = db.getRepository(AuditLog);
    const userRepo = db.getRepository(User);

    const qb = auditRepo.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actionFilter) {
      qb.andWhere('log.action = :action', { action: actionFilter });
    }
    if (entityFilter) {
      qb.andWhere('log.entity = :entity', { entity: entityFilter });
    }

    const [logs, total] = await qb.getManyAndCount();

    // Get unique user IDs and fetch user names in bulk
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = userIds.length > 0
      ? await userRepo.createQueryBuilder('u')
          .select(['u.id', 'u.name', 'u.role'])
          .whereInIds(userIds)
          .getMany()
      : [];

    const userMap = new Map(users.map((u) => [u.id, { name: u.name, role: u.role }]));

    // Map logs with user info
    let enrichedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: userMap.get(log.userId)?.name || 'Sistem',
      userRole: userMap.get(log.userId)?.role || 'SYSTEM',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      beforeData: log.beforeData,
      afterData: log.afterData,
      createdAt: log.createdAt,
    }));

    // Apply search filter on userName (client-side since it's a join)
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      enrichedLogs = enrichedLogs.filter((log) =>
        log.userName.toLowerCase().includes(lowerSearch) ||
        log.action.toLowerCase().includes(lowerSearch) ||
        log.entity.toLowerCase().includes(lowerSearch)
      );
    }

    // Get distinct actions and entities for filter dropdowns
    const distinctActions = await auditRepo.createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .getRawMany();
    const distinctEntities = await auditRepo.createQueryBuilder('log')
      .select('DISTINCT log.entity', 'entity')
      .getRawMany();

    return NextResponse.json({
      success: true,
      data: {
        logs: enrichedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          actions: distinctActions.map((r: { action: string }) => r.action),
          entities: distinctEntities.map((r: { entity: string }) => r.entity),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

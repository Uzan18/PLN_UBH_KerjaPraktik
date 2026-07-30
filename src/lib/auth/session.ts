import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

import type { UserRole } from '@/types';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';

/**
 * Augmented session types.
 * Extends NextAuth session to include user role and id.
 */
export interface AppSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Get the current server-side session with specific user fields.
 * Use this in API route handlers and server components.
 */
export async function getServerSession(): Promise<AppSession | null> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  // Double check user exists and is active in DB to prevent stale session issues
  try {
    const db = await getDb();
    const userRepo = db.getRepository<User>('User');
    const user = await userRepo.findOne({
      where: { email: session.user.email || '' }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Always attach fresh DB user properties (id, name, role) to the session object
    (session.user as any).id = user.id;
    (session.user as any).name = user.name;
    (session.user as any).role = user.role;
  } catch (err) {
    // [SEC-07] Fail-secure: if DB is unreachable, deny access rather than
    // returning a potentially stale/invalid session. This prevents deactivated
    // users from retaining access if the DB verification cannot be completed.
    console.error('[Session] Failed to verify user existence in database — denying access:', err);
    return null;
  }

  return session as unknown as AppSession;
}

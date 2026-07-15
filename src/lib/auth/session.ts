import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
  } catch (err) {
    console.error('[Session] Failed to verify user existence in database:', err);
  }

  return session as unknown as AppSession;
}

/**
 * Get the current session or throw 401 if not authenticated.
 * Convenience helper for API route handlers.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

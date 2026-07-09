import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { UserRole } from '@/types';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';

/**
 * Augmented session types for SIAT.
 * Extends NextAuth session to include user role and id.
 */
export interface SiatSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Get the current server-side session with SIAT-specific user fields.
 * Use this in API route handlers and server components.
 */
export async function getServerSession(): Promise<SiatSession | null> {
  const session = await nextAuthGetServerSession(authOptions);
  if (!session?.user) return null;

  const userId = (session.user as { id?: string }).id;
  if (!userId) return null;

  // Verify that the user ID exists in the database to prevent stale session errors (e.g. after database reseeding)
  try {
    const db = await getDb();
    const userRepo = db.getRepository<User>('User');
    const userExists = await userRepo.findOne({ where: { id: userId } });
    if (!userExists) {
      console.warn(`[Session] Stale session detected: user ID ${userId} not found in database. Expiring session.`);
      return null;
    }
  } catch (err) {
    console.error('[Session] Failed to verify user existence in database:', err);
  }

  return session as unknown as SiatSession;
}

/**
 * Get the current session or throw 401 if not authenticated.
 * Convenience helper for API route handlers.
 */
export async function requireSession(): Promise<SiatSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

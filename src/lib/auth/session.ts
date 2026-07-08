import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { UserRole } from '@/types';

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

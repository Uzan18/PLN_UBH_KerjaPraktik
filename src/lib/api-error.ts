/**
 * [SEC-05] Centralized API Error Handler
 *
 * Prevents internal error details (DB queries, stack traces, table names)
 * from leaking to the client. Logs full details server-side only.
 *
 * Usage in route handlers:
 *   } catch (error) {
 *     return handleApiError(error);
 *   }
 */

import { NextResponse } from 'next/server';

/**
 * Operational errors that are safe to surface to the client.
 * These are expected, user-facing errors (auth, validation, not found).
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// Safe prefixes that indicate operational (non-sensitive) error messages
const SAFE_ERROR_PREFIXES = [
  'Unauthorized',
  'Forbidden',
  'Authentication required',
  'Email dan password',
  'Akun tidak',
  'Password',
  'ID ',
  'Nama ',
  'File ',
  'Folder ',
  'Asset ',
  'User ',
  'Pengguna ',
  'Session ',
];

/**
 * Determine whether an error message is safe to send to the client.
 * Only short, predefined operational messages are considered safe.
 */
function isSafeMessage(message: string): boolean {
  return SAFE_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix));
}

/**
 * Centralized API error handler.
 * - AppError instances → use their message and statusCode directly
 * - Known operational messages → pass through with appropriate HTTP status
 * - Everything else → log server-side, return generic 500 to client
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  // AppError: explicit operational error, always safe to surface
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    const msg = error.message;

    // Map known auth/permission messages to correct HTTP codes
    if (msg === 'Unauthorized' || msg === 'Authentication required') {
      return NextResponse.json({ success: false, error: msg }, { status: 401 });
    }
    if (msg.startsWith('Forbidden') || msg === 'Forbidden') {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }

    // Safe operational messages (validation, not-found, business rules)
    if (isSafeMessage(msg)) {
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    // Unexpected / internal error — log full detail server-side only
    console.error(`[API Error]${context ? ` [${context}]` : ''}`, error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server. Silakan coba lagi.' },
      { status: 500 }
    );
  }

  // Non-Error thrown value
  console.error(`[API Error]${context ? ` [${context}]` : ''} Unknown error:`, error);
  return NextResponse.json(
    { success: false, error: 'Terjadi kesalahan pada server. Silakan coba lagi.' },
    { status: 500 }
  );
}

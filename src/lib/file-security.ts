/**
 * [SEC-04, SEC-08] File Security Utilities
 *
 * Provides path traversal prevention and file type validation
 * for all file upload and delete operations.
 */

import * as path from 'path';

// ─── Allowed file types ───────────────────────────────────────────────────────

/** Whitelist of allowed file extensions for report uploads */
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.ppt',
  '.pptx',
  '.txt',
]);

/**
 * Allowed MIME types mapped to their expected extensions.
 * Used as a secondary check — note that client-provided MIME types can be
 * spoofed, so extension validation is the primary guard.
 */
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.ms-powerpoint', // ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'application/octet-stream', // fallback — extension check is primary
]);

// ─── Path Traversal Prevention ────────────────────────────────────────────────

/**
 * The canonical absolute base directory where uploaded report files must reside.
 * Any path outside this directory will be rejected.
 */
export function getUploadsBaseDir(): string {
  return path.resolve(process.cwd(), 'public', 'uploads', 'reports');
}

/**
 * [SEC-04] Validates that a given absolute file path is safely within
 * the uploads base directory. Prevents path traversal attacks.
 *
 * @param absolutePath - The resolved absolute path to validate
 * @throws Error if the path is outside the uploads directory
 */
export function validateFilePath(absolutePath: string): void {
  const uploadsBase = getUploadsBaseDir();
  const resolvedPath = path.resolve(absolutePath);

  if (!resolvedPath.startsWith(uploadsBase + path.sep) && resolvedPath !== uploadsBase) {
    throw new Error(`[file-security] Akses path ditolak: path berada di luar direktori uploads yang diizinkan.`);
  }
}

// ─── File Type Validation ─────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * [SEC-08] Validates a file's extension and MIME type against the whitelist.
 *
 * Note: `file.type` (MIME) is client-provided and can be spoofed.
 * Extension validation is the primary check. For production systems handling
 * sensitive files, add magic-byte inspection using a library like `file-type`.
 *
 * @param fileName - Original file name (used to extract extension)
 * @param mimeType - MIME type reported by the client
 */
export function validateFileType(fileName: string, mimeType: string): FileValidationResult {
  const ext = path.extname(fileName).toLowerCase();

  if (!ext) {
    return { valid: false, error: 'File harus memiliki ekstensi.' };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const allowedList = Array.from(ALLOWED_EXTENSIONS).join(', ');
    return {
      valid: false,
      error: `Tipe file '${ext}' tidak diizinkan. Ekstensi yang diizinkan: ${allowedList}`,
    };
  }

  // Secondary MIME type check (not primary since it can be spoofed)
  // We allow 'application/octet-stream' as a generic fallback for any valid extension
  if (mimeType && mimeType !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Tipe MIME '${mimeType}' tidak diizinkan untuk file ini.`,
    };
  }

  return { valid: true };
}

/** Maximum allowed file size: 100 MB */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Validates file size against the maximum allowed limit.
 */
export function validateFileSize(sizeBytes: number): FileValidationResult {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `Ukuran file melebihi batas maksimum ${maxMB}MB.`,
    };
  }
  return { valid: true };
}

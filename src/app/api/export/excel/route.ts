export const dynamic = 'force-dynamic';
import { GET as masterExportGET } from '@/app/api/master/export/route';

/**
 * GET /api/export/excel
 * Delegates directly to master export handler (/api/master/export)
 * to ensure all Excel export calls throughout the application use the
 * professional xlsx-js-style formatting, status colors, and per-equipment type tabs.
 */
export async function GET(request: Request) {
  return masterExportGET(request);
}

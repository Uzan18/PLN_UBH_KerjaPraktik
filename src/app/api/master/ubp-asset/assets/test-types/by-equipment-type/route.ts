import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDb } from '@/lib/db';
import { Asset } from '@/entities/Asset';
import { JenisAsset } from '@/entities/JenisAsset';
import { TestType } from '@/entities/TestType';
import { AuditLog } from '@/entities/AuditLog';
import { getServerSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { In } from 'typeorm';

/**
 * POST /api/master/ubp-asset/assets/test-types/by-equipment-type
 * Update applicable test types for all assets of a specific jenisAssetId. Only accessible to ADMIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(session.user.role, 'master-data:write');

    const body = await request.json();
    const { jenisAssetId, testTypeIds, infoFields } = body;

    if (!jenisAssetId) {
      return NextResponse.json({ success: false, error: 'jenisAssetId is required' }, { status: 400 });
    }

    if (!Array.isArray(testTypeIds)) {
      return NextResponse.json({ success: false, error: 'testTypeIds must be an array' }, { status: 400 });
    }

    const db = await getDb();
    const assetRepo = db.getRepository(Asset);
    const jenisRepo = db.getRepository(JenisAsset);
    const testTypeRepo = db.getRepository(TestType);
    const auditRepo = db.getRepository(AuditLog);

    // Verify Jenis Asset exists (try by id or by name)
    let jenis = await jenisRepo.findOne({ where: { id: jenisAssetId } });
    if (!jenis) {
      jenis = await jenisRepo.findOne({ where: { name: jenisAssetId } });
    }
    if (!jenis) {
      return NextResponse.json({ success: false, error: `Jenis Asset "${jenisAssetId}" tidak ditemukan` }, { status: 404 });
    }

    const targetJenisId = jenis.id;

    // Save infoFields to JenisAsset
    if (infoFields !== undefined) {
      if (Array.isArray(infoFields)) {
        const normalizeKey = (k: string) => {
          const lower = k.trim().toLowerCase();
          if (['mfgyear', 'year of manufacturing', 'year of manufacture', 'tahun buat'].includes(lower)) return 'mfgYear';
          if (['serialnumber', 'serial number', 'no seri'].includes(lower)) return 'serialNumber';
          if (['vectorgroup', 'vector group', 'vector grup'].includes(lower)) return 'vectorGroup';
          return k.trim();
        };

        const deduplicated: any[] = [];
        const seen = new Set<string>();

        infoFields.forEach((item) => {
          const rawKey = typeof item === 'string' ? item : item?.key || '';
          const rawLabel = typeof item === 'object' && item?.label ? item.label : rawKey;
          const norm = normalizeKey(rawKey);
          if (norm && !seen.has(norm.toLowerCase())) {
            seen.add(norm.toLowerCase());
            if (typeof item === 'string') {
              deduplicated.push({ key: norm, label: rawLabel });
            } else {
              deduplicated.push({ ...item, key: norm, label: rawLabel });
            }
          }
        });

        jenis.infoFields = JSON.stringify(deduplicated);
      } else {
        jenis.infoFields = null;
      }
      await jenisRepo.save(jenis);
    }

    // 1. Unlink test types previously assigned to targetJenisId that are no longer in testTypeIds
    const previouslyLinked = await testTypeRepo.find({
      where: { jenisAssetId: targetJenisId },
    });
    for (const tt of previouslyLinked) {
      if (!testTypeIds.includes(tt.id)) {
        tt.jenisAssetId = null;
        await testTypeRepo.save(tt);
      }
    }

    // 2. Find requested test types and link targetJenisId
    let selectedTestTypes: TestType[] = [];
    if (testTypeIds.length > 0) {
      selectedTestTypes = await testTypeRepo.find({
        where: { id: In(testTypeIds) },
      });
      for (const tt of selectedTestTypes) {
        if (tt.jenisAssetId !== targetJenisId) {
          tt.jenisAssetId = targetJenisId;
          await testTypeRepo.save(tt);
        }
      }
    }

    // 3. Find all assets of this jenisAssetId and update relationship
    const assets = await assetRepo.find({
      where: { jenisAssetId: targetJenisId },
      relations: ['testTypes'],
    });

    for (const asset of assets) {
      asset.testTypes = selectedTestTypes;
      await assetRepo.save(asset);
    }

    const testTypeNames = selectedTestTypes.map((t) => t.name);

    // Create Audit Log
    const auditLog = auditRepo.create({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'JenisAssetTestType',
      entityId: targetJenisId,
      beforeData: JSON.stringify({ jenisAsset: jenis.name, assetCount: assets.length }),
      afterData: JSON.stringify({ jenisAsset: jenis.name, testTypes: testTypeNames }),
    });
    await auditRepo.save(auditLog);

    return NextResponse.json({ success: true, data: testTypeNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

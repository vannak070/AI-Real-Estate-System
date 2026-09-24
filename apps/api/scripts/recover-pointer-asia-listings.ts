/**
 * Recovery script (2026-09-21): recreates the 592 Pointer Asia listings that
 * were wiped from Postgres by a DB reset. Same logic as
 * seed-pointer-asia-listings.ts, except the cover photo for each listing is
 * copied from the surviving orphaned upload folder (captured, in the
 * dataset's own creation order, into _recovered-pointer-folders.json BEFORE
 * any new projects were created) instead of the now-deleted
 * pointer-asia-images/ staging directory. record[i] <-> folder[i] — both
 * are in the same original scrape/seed order, verified by matching mtimes
 * and a visual spot check on record 0 before this script was written.
 *
 * ADDITIVE, like the original — run once against a DB that doesn't already
 * have these 592 projects (this reseed run started from the ERA-only 77).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type PropertyType, type PropertyCategory, type ListingBadge } from '@prisma/client';

const db = new PrismaClient();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(SCRIPT_DIR, '../uploads');

interface SourceRecord {
  name: string;
  location: string;
  city: string;
  category: PropertyCategory;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  listPrice: number;
  image: string;
  sourceHref: string;
  badges: string[];
}

function mapBadge(badges: string[]): ListingBadge {
  const lower = badges.map((b) => b.toLowerCase());
  if (lower.includes('best offer')) return 'BEST_OFFER';
  if (lower.includes('featured') || lower.includes('premium')) return 'EXCLUSIVE';
  return 'NONE';
}

async function main() {
  const records: SourceRecord[] = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'pointer-asia-seed-data.json'), 'utf-8'));
  const oldFolders: string[] = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, '_recovered-pointer-folders.json'), 'utf-8'));

  if (records.length !== oldFolders.length) {
    throw new Error(`Mismatch: ${records.length} records vs ${oldFolders.length} recovered folders — refusing to guess.`);
  }
  console.log(`Recovering ${records.length} Pointer Asia listings with their original photos...`);

  const comboKey = (bed: number, bath: number) => `pt-${bed}-${bath}`;
  const combos = new Map<string, { bedrooms: number; bathrooms: number; areaSqm: number }>();
  for (const r of records) {
    if (r.bedrooms == null || r.bathrooms == null) continue;
    const key = comboKey(r.bedrooms, r.bathrooms);
    if (!combos.has(key)) combos.set(key, { bedrooms: r.bedrooms, bathrooms: r.bathrooms, areaSqm: r.areaSqm ?? 60 });
  }
  for (const [key, spec] of combos) {
    await db.unitType.upsert({
      where: { id: key },
      create: { id: key, name: spec.bedrooms === 0 ? 'Studio' : `${spec.bedrooms} Bed / ${spec.bathrooms} Bath`, bedrooms: spec.bedrooms, bathrooms: spec.bathrooms, areaSqm: spec.areaSqm },
      update: {},
    });
  }
  console.log(`Unit type catalog: ${combos.size} distinct bed/bath combos ready.`);

  let created = 0;
  let imagesAttached = 0;
  let missingImage = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i] as SourceRecord;
    const oldFolder = oldFolders[i] as string;

    const project = await db.project.create({
      data: {
        isPublished: true,
        name: r.name,
        location: r.location,
        city: r.city,
        status: 'SELLING',
        category: r.category,
        propertyType: r.propertyType,
        coverColor: r.category === 'RENT' ? '#8B0A1C' : '#001F5B',
        badge: mapBadge(r.badges),
      },
    });

    const unitTypeId = r.bedrooms != null && r.bathrooms != null ? comboKey(r.bedrooms, r.bathrooms) : undefined;
    await db.unit.create({
      data: {
        projectId: project.id,
        unitTypeId,
        code: 'U-001',
        areaSqm: r.areaSqm ?? undefined,
        listPrice: r.listPrice,
        status: 'AVAILABLE',
      },
    });

    const srcFile = path.join(UPLOADS_ROOT, 'projects', oldFolder, 'cover.jpg');
    if (fs.existsSync(srcFile)) {
      const destDir = path.join(UPLOADS_ROOT, 'projects', project.id);
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, 'cover.jpg');
      fs.copyFileSync(srcFile, destFile);
      await db.project.update({
        where: { id: project.id },
        data: { imageUrls: [`/uploads/projects/${project.id}/cover.jpg`] },
      });
      imagesAttached += 1;
    } else {
      missingImage += 1;
    }

    created += 1;
    if (created % 100 === 0) console.log(`  ...${created}/${records.length}`);
  }

  const totalProjects = await db.project.count();
  console.log('Done:', { created, imagesAttached, missingImage, totalProjectsInDb: totalProjects });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

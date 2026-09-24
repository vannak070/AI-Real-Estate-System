/**
 * One-off seed: adds real listings scraped from pointerasia.com (a separate,
 * competing Cambodian brokerage — NOT ERA Cambodia) to Inventory, on top of
 * the existing ERA Cambodia reseed. This is ADDITIVE — nothing is deleted
 * here, unlike reseed-inventory-real-data.ts.
 *
 * Source: pointerasia.com's 7 public listing category pages (25% of each
 * category's total, ~600 listings), scraped via a Python script (see
 * /tmp/pointer-scrape at scrape time — not checked in) that:
 *   1. Parsed each listing card's real title/location/bed/bath/area/price
 *      directly from the page (robots.txt allows crawling these paths).
 *   2. Downloaded each listing's real cover photo from its Cloudflare Images
 *      CDN URL (imagedelivery.net — not the disallowed /_next/ path).
 * Structured data is kept in this directory's `pointer-asia-seed-data.json`
 * (small, ~260KB — kept as a record of exactly what was seeded). The raw
 * downloaded photos (`pointer-asia-images/`, ~144MB) were copied into
 * apps/api/uploads/ by this script and then deleted from here — this
 * script is a one-off, already-run record, not meant to be re-run (its
 * image source no longer exists on disk).
 *
 * No fabricated specs: every bedroom/bathroom/area/price value here is what
 * the source page actually displayed. A handful of per-m² land/office
 * listings with no disclosed area were already dropped during normalization
 * (see normalize.py) rather than guessing a lot size to multiply against.
 *
 * UnitType catalog: reused/created by (bedrooms, bathrooms) pair, not per
 * listing — 592 near-unique listings would otherwise explode the shared
 * "Manage unit types" catalog into hundreds of one-off rows. Each real
 * Unit still carries its own exact scraped `areaSqm`/`listPrice` regardless
 * of the UnitType's own reference area.
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
  image: string; // relative path under pointer-asia-images/
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
  const records: SourceRecord[] = JSON.parse(
    fs.readFileSync(path.join(SCRIPT_DIR, 'pointer-asia-seed-data.json'), 'utf-8'),
  );
  console.log(`Seeding ${records.length} Pointer Asia listings...`);

  // Reuse/create UnitType catalog entries by (bedrooms, bathrooms) only —
  // each Unit still stores its own real areaSqm/listPrice independently.
  const comboKey = (bed: number, bath: number) => `pt-${bed}-${bath}`;
  const combos = new Map<string, { bedrooms: number; bathrooms: number; areaSqm: number }>();
  for (const r of records) {
    if (r.bedrooms == null || r.bathrooms == null) continue;
    const key = comboKey(r.bedrooms, r.bathrooms);
    if (!combos.has(key)) {
      combos.set(key, { bedrooms: r.bedrooms, bathrooms: r.bathrooms, areaSqm: r.areaSqm ?? 60 });
    }
  }
  for (const [key, spec] of combos) {
    await db.unitType.upsert({
      where: { id: key },
      create: {
        id: key,
        name: spec.bedrooms === 0 ? 'Studio' : `${spec.bedrooms} Bed / ${spec.bathrooms} Bath`,
        bedrooms: spec.bedrooms,
        bathrooms: spec.bathrooms,
        areaSqm: spec.areaSqm,
      },
      update: {},
    });
  }
  console.log(`Unit type catalog: ${combos.size} distinct bed/bath combos ready.`);

  let created = 0;
  for (const r of records) {
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

    const srcImage = path.join(SCRIPT_DIR, 'pointer-asia-images', r.image.replace(/^images\//, ''));
    if (fs.existsSync(srcImage)) {
      const destDir = path.join(UPLOADS_ROOT, 'projects', project.id);
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, 'cover.jpg');
      fs.copyFileSync(srcImage, destFile);
      await db.project.update({
        where: { id: project.id },
        data: { imageUrls: [`/uploads/projects/${project.id}/cover.jpg`] },
      });
    }

    created += 1;
    if (created % 100 === 0) console.log(`  ...${created}/${records.length}`);
  }

  const totalProjects = await db.project.count();
  console.log('Done:', { projectsCreated: created, totalProjectsInDb: totalProjects });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

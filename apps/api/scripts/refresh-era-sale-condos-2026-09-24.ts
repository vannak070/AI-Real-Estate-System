/**
 * User-requested refresh (2026-09-24): re-scrape eracambodia.com/projects and replace ONLY the
 * ERA-sourced SALE/CONDO projects it originally produced — not the whole Inventory. Explicitly
 * scoped this way after confirming with the user: "delete the existing Project" would otherwise
 * also wipe the 592 Pointer Asia listings (a different source, not covered by this scrape, with
 * no recovery trail this time — see memory-bank/progress.md's "Incidents worth remembering").
 *
 * The 47 names below are exactly SALE_CONDOS from reseed-inventory-real-data.ts — the full set
 * this system ever seeded from eracambodia.com/projects. 45 of them are still live on the site
 * today (scraped into era-projects-rescrape-2026-09-24.json, including a real image URL per
 * project); 2 ("The Bridge - Soho Units", "Olympia City") were already known to have no real
 * scrape source (progress.md: "hand-added, no scrape record") and aren't live either — deleted,
 * not recreated, since the goal is to mirror what ERA's site actually lists today.
 *
 * Per the user's explicit instruction, Sales/CRM data is intentionally left untouched — any
 * seeded demo Reservation/Quotation/Contract pointing at an old unit id here becomes a dangling
 * reference, the same accepted tradeoff documented in reseed-inventory-real-data.ts.
 *
 * Run: cd apps/api && pnpm exec tsx scripts/refresh-era-sale-condos-2026-09-24.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type PropertyType } from '@prisma/client';

const db = new PrismaClient();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(SCRIPT_DIR, '../uploads');

interface ScrapedProject {
  href: string;
  imgSrc: string;
  name: string;
  location: string;
  price: number;
}

// The exact 47 names this system ever seeded from eracambodia.com/projects (SALE_CONDOS in
// reseed-inventory-real-data.ts) — the delete target, regardless of whether each still has a
// live match in this re-scrape.
const ALL_EVER_SEEDED_NAMES = [
  'Time Square 10 - Ocean View', 'Time Square 9 - BKK1', 'Time Square 8', 'J Tower 3', 'Le Condé BKK1',
  'Urban Village Phase 2', 'Norea Square Condominium', 'Le Condé 2 - BKK1', 'Time Square 11', 'G.A.T.O Tower',
  'Picasso Sky Gemme', 'Kingston Royale', 'Odom Living', 'Odom Tower', 'LZ Sea View Premium',
  'Borey Rith Luxury Toul Sangke', 'UC88 Wyndham Garden', 'Time Square 7', 'Time Square 6', 'Time Square 5',
  'La Vista One', 'Anata Residence', 'R&F City', 'R&F City - Miro', 'Residence H Sensok', 'Morgan Enmaison',
  'Time Square 3', 'Diamond Bay Garden', 'Norea Cove Residence', 'City View', 'Wealth Mansion', 'Vue Aston',
  'Agile Sky Residence', 'Piccasso City Garden', 'Mekong View Tower 1', 'TK Star', 'One Park', 'Royal Platinum',
  'Orkidé The Royal Condominium', 'The Pearl Of Kep', 'Star Bay', 'Platinum Coast', 'Bakong Village',
  'Rose Apple Square', "D'Seaview", 'The Bridge - Soho Units', 'Olympia City',
];

function parseLocation(raw: string): { location: string; city: string } {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { location: raw, city: raw };
  const city = parts[parts.length - 1] as string;
  const location = parts.length > 1 ? parts.slice(0, -1).join(', ') : city;
  return { location, city };
}

async function downloadImage(url: string, projectId: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const extFromUrl = path.extname(new URL(url).pathname).toLowerCase();
    const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(extFromUrl) ? extFromUrl : '.jpg';
    const destDir = path.join(UPLOADS_ROOT, 'projects', projectId);
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, `0${ext}`);
    fs.writeFileSync(destPath, buf);
    return `/uploads/projects/${projectId}/0${ext}`;
  } catch (err) {
    console.error(`  ! image download failed for ${projectId}: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const scraped: ScrapedProject[] = JSON.parse(
    fs.readFileSync(path.join(SCRIPT_DIR, 'era-projects-rescrape-2026-09-24.json'), 'utf-8'),
  );
  console.log(`Loaded ${scraped.length} live-scraped projects from eracambodia.com/projects.`);

  // Capture existing developer/tenure/etc before deleting, so a still-live project keeps its
  // previously-disclosed facts (this re-scrape only refreshes name/location/price/image — it
  // doesn't re-visit each detail page for developer/tenure/floors/unit-count).
  const existing = await db.project.findMany({
    where: { name: { in: ALL_EVER_SEEDED_NAMES, mode: 'insensitive' } },
    select: { id: true, name: true, developer: true, tenure: true, totalFloors: true, disclosedUnitCount: true, handoverDate: true },
  });
  const priorByLowerName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));
  console.log(`Matched ${existing.length} existing rows to delete (expected 47).`);

  const targetIds = existing.map((p) => p.id);
  console.log('Deleting units, blocks, and price lists for these projects...');
  await db.unit.deleteMany({ where: { projectId: { in: targetIds } } });
  await db.block.deleteMany({ where: { projectId: { in: targetIds } } });
  await db.priceList.deleteMany({ where: { projectId: { in: targetIds } } });
  console.log('Deleting the 47 projects...');
  await db.project.deleteMany({ where: { id: { in: targetIds } } });

  let created = 0;
  let imagesAttached = 0;
  for (const s of scraped) {
    const prior = priorByLowerName.get(s.name.toLowerCase());
    const { location, city } = parseLocation(s.location);
    const propertyType: PropertyType = /borey/i.test(s.name) ? 'BOREY' : 'CONDO';

    const project = await db.project.create({
      data: {
        isPublished: true,
        isDevelopment: true,
        name: s.name,
        location,
        city,
        status: 'SELLING',
        category: 'SALE',
        propertyType,
        coverColor: '#001F5B',
        developer: prior?.developer,
        tenure: prior?.tenure,
        totalFloors: prior?.totalFloors,
        disclosedUnitCount: prior?.disclosedUnitCount,
        handoverDate: prior?.handoverDate,
      },
    });
    created += 1;

    const imageUrl = await downloadImage(s.imgSrc, project.id);
    if (imageUrl) {
      await db.project.update({ where: { id: project.id }, data: { imageUrls: [imageUrl] } });
      imagesAttached += 1;
    }

    await db.unit.create({
      data: { projectId: project.id, code: 'U-001', listPrice: s.price, status: 'AVAILABLE' },
    });
  }

  const deletedNotReplaced = ALL_EVER_SEEDED_NAMES.filter(
    (n) => !scraped.some((s) => s.name.toLowerCase() === n.toLowerCase()),
  );

  console.log('Done:', {
    deletedProjects: targetIds.length,
    createdProjects: created,
    imagesAttached,
    deletedNotReplaced,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

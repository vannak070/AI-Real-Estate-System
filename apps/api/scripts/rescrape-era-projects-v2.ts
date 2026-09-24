/**
 * Second correction pass on the 45 ERA Cambodia SALE/CONDO listings from
 * eracambodia.com/projects. The first pass added real per-unit-type data
 * but: (a) landed them in the wrong bucket — "Sales" — when they're genuine
 * multi-unit developer projects, not individual listings, and (b) had no
 * images and discarded real disclosed facts (developer/tenure/floor count/
 * total unit count) the schema had no field for.
 *
 * This pass:
 *   - Deletes and fully recreates all 45 (this script is idempotent to run
 *     again — matches by name against the same 45-project scrape).
 *   - Populates the new Project.developer/tenure/totalFloors/
 *     disclosedUnitCount fields instead of discarding that data.
 *   - Attaches real images (2 per project, scraped from each project's own
 *     detail page — see era-projects-image-manifest.json for which). These
 *     are genuine assets from the source (often 3D unit-layout renders
 *     rather than exterior photos, since the source pages don't reliably
 *     lead with one) — not stock photos, not fabricated. The raw staged
 *     copies (era-projects-images/, ~35MB) were deleted after this script
 *     copied them into apps/api/uploads/ — re-running this script needs a
 *     fresh scrape to repopulate that directory first.
 *   - Bucket placement (Projects vs Sales/Rent) is NOT set here — it's
 *     computed live in the admin UI from each project's real unit count
 *     (see ProjectsPage.tsx's `membership` predicates), so seeding real
 *     multi-unit data is sufficient on its own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type PropertyType } from '@prisma/client';

const db = new PrismaClient();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(SCRIPT_DIR, '../uploads');

interface UnitTypeRow {
  label: string;
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  price?: number;
}

interface DetailRecord {
  href: string;
  name: string;
  type?: string;
  location?: string;
  developer?: string;
  tenure?: string;
  completion?: string;
  totalFloor?: string;
  totalUnit?: string;
  totalBuilding?: string;
  startingPrice?: string;
  unitTypes: UnitTypeRow[];
}

interface ImageManifestEntry {
  href: string;
  name: string;
  images: string[];
}

function parsePrice(raw?: string): number | null {
  if (!raw) return null;
  const s = raw.replace(/\$/g, '').replace(/,/g, '').trim();
  if (/^\d+(\.\d+)?M$/i.test(s)) return Math.round(parseFloat(s) * 1_000_000);
  if (/^\d+(\.\d+)?K$/i.test(s)) return Math.round(parseFloat(s) * 1_000);
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseLocation(raw: string | undefined): { location: string; city: string } {
  if (!raw) return { location: 'Cambodia', city: 'Cambodia' };
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const filtered = parts.filter((p) => p.toLowerCase() !== 'cambodia');
  if (filtered.length === 0) return { location: raw, city: raw };
  const city = filtered[filtered.length - 1] as string;
  const location = filtered.length > 1 ? filtered.slice(0, -1).join(', ') : city;
  return { location, city };
}

function parseHandover(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const m = /Q([1-4])-(\d{4})/i.exec(raw);
  if (!m) return undefined;
  const quarterStartMonth = { '1': 0, '2': 3, '3': 6, '4': 9 }[m[1] as string] as number;
  return new Date(Date.UTC(Number(m[2]), quarterStartMonth, 1));
}

function parseIntFrom(raw?: string): number | undefined {
  if (!raw) return undefined;
  const m = /(\d[\d,]*)/.exec(raw);
  return m ? parseInt((m[1] as string).replace(/,/g, ''), 10) : undefined;
}

async function resolveUnitType(bedrooms: number, bathrooms: number, areaSqm: number): Promise<string> {
  const existing = await db.unitType.findFirst({ where: { bedrooms, bathrooms } });
  if (existing) return existing.id;
  const created = await db.unitType.create({
    data: {
      id: `era2-${bedrooms}-${bathrooms}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      name: bedrooms === 0 ? 'Studio' : `${bedrooms} Bed / ${bathrooms} Bath`,
      bedrooms,
      bathrooms,
      areaSqm,
    },
  });
  return created.id;
}

async function main() {
  const records: DetailRecord[] = JSON.parse(
    fs.readFileSync(path.join(SCRIPT_DIR, 'era-projects-detail.json'), 'utf-8'),
  );
  const imageManifest: ImageManifestEntry[] = JSON.parse(
    fs.readFileSync(path.join(SCRIPT_DIR, 'era-projects-image-manifest.json'), 'utf-8'),
  );
  const imagesByHref = new Map(imageManifest.map((m) => [m.href, m.images]));
  console.log(`Loaded ${records.length} scraped project detail records.`);

  const existingSaleCondos = await db.project.findMany({
    where: { category: 'SALE', propertyType: { in: ['CONDO', 'BOREY'] } },
    select: { id: true, name: true },
  });
  const existingByLowerName = new Map(existingSaleCondos.map((p) => [p.name.toLowerCase(), p.id]));

  let replaced = 0;
  let createdFresh = 0;
  let totalUnitsCreated = 0;
  let totalImagesAttached = 0;

  for (const rec of records) {
    const matchId = existingByLowerName.get(rec.name.toLowerCase());
    if (matchId) {
      await db.unit.deleteMany({ where: { projectId: matchId } });
      await db.project.delete({ where: { id: matchId } });
      replaced += 1;
    } else {
      createdFresh += 1;
    }

    const { location, city } = parseLocation(rec.location);
    const propertyType: PropertyType = /borey/i.test(rec.name) ? 'BOREY' : 'CONDO';
    const handoverDate = parseHandover(rec.completion);

    const project = await db.project.create({
      data: {
        isPublished: true,
        isDevelopment: true,
        name: rec.name,
        location,
        city,
        status: 'SELLING',
        category: 'SALE',
        propertyType,
        handoverDate,
        coverColor: '#001F5B',
        developer: rec.developer,
        tenure: rec.tenure,
        totalFloors: parseIntFrom(rec.totalFloor),
        disclosedUnitCount: parseIntFrom(rec.totalUnit),
      },
    });

    // Attach real images scraped from this project's own detail page.
    const localImages = imagesByHref.get(rec.href) ?? [];
    if (localImages.length > 0) {
      const destDir = path.join(UPLOADS_ROOT, 'projects', project.id);
      fs.mkdirSync(destDir, { recursive: true });
      const urls: string[] = [];
      for (const localName of localImages) {
        const srcPath = path.join(SCRIPT_DIR, 'era-projects-images', localName);
        if (!fs.existsSync(srcPath)) continue;
        const ext = path.extname(localName) || '.jpg';
        const destName = `${urls.length}${ext}`;
        fs.copyFileSync(srcPath, path.join(destDir, destName));
        urls.push(`/uploads/projects/${project.id}/${destName}`);
      }
      if (urls.length > 0) {
        await db.project.update({ where: { id: project.id }, data: { imageUrls: urls } });
        totalImagesAttached += urls.length;
      }
    }

    const validUnitTypes = rec.unitTypes.filter((u) => u.price != null);
    if (validUnitTypes.length === 0) {
      const price = parsePrice(rec.startingPrice);
      if (price != null) {
        await db.unit.create({
          data: { projectId: project.id, code: 'U-001', listPrice: price, status: 'AVAILABLE' },
        });
        totalUnitsCreated += 1;
      }
    } else {
      let seq = 1;
      for (const u of validUnitTypes) {
        const areaSqm = u.areaMin != null && u.areaMax != null ? (u.areaMin + u.areaMax) / 2 : (u.areaMin ?? undefined);
        let unitTypeId: string | undefined;
        if (u.bedrooms != null && u.bathrooms != null) {
          unitTypeId = await resolveUnitType(u.bedrooms, u.bathrooms, areaSqm ?? 50);
        }
        await db.unit.create({
          data: {
            projectId: project.id,
            unitTypeId,
            code: `U-${String(seq).padStart(3, '0')}`,
            areaSqm,
            listPrice: Math.round(u.price as number),
            status: 'AVAILABLE',
          },
        });
        seq += 1;
        totalUnitsCreated += 1;
      }
    }
  }

  console.log('Done:', { replaced, createdFresh, totalUnitsCreated, totalImagesAttached, totalProjects: records.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

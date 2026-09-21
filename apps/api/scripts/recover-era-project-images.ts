/**
 * Recovery script (2026-09-21): the real 637-project scraped dataset was
 * wiped from Postgres by a DB reset, but the actual downloaded photo files
 * under apps/api/uploads/projects/<old-id>/ survived untouched (a reset
 * only touches the database, never the filesystem). reseed-inventory-real-
 * data.ts has already recreated the 45 real ERA sale/condo projects (plus
 * 2 extra hand-added ones with no photo source: "The Bridge - Soho Units",
 * "Olympia City") under FRESH ids. This script re-links each fresh project
 * to its original 2 real images by matching project name against
 * era-projects-detail.json (order-correlated with the sorted, orphaned
 * upload folders captured in _recovered-era-folders.json BEFORE the reseed
 * ran) — no re-scraping needed, the images already exist on disk.
 *
 * One-off; safe to re-run (idempotent: overwrites imageUrls with the same
 * recovered set each time).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(SCRIPT_DIR, '../uploads');

interface DetailRecord {
  href: string;
  name: string;
  developer?: string;
  tenure?: string;
  totalFloor?: string;
  totalUnit?: string;
}

function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Fuzzy fallback only — collapses runs of the same letter (picasso/piccasso -> picaso). */
function fuzzy(s: string): string {
  return s.replace(/(.)\1+/g, '$1');
}

function parseIntFrom(raw?: string): number | undefined {
  if (!raw) return undefined;
  const m = /(\d[\d,]*)/.exec(raw);
  return m ? parseInt((m[1] as string).replace(/,/g, ''), 10) : undefined;
}

async function main() {
  const detail: DetailRecord[] = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'era-projects-detail.json'), 'utf-8'));
  const oldFolders: string[] = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, '_recovered-era-folders.json'), 'utf-8'));

  if (detail.length !== oldFolders.length) {
    throw new Error(`Mismatch: ${detail.length} detail records vs ${oldFolders.length} recovered folders — refusing to guess.`);
  }

  const candidates = await db.project.findMany({
    where: { category: 'SALE', propertyType: { in: ['CONDO', 'BOREY'] } },
    select: { id: true, name: true },
  });
  const unmatched = new Set(candidates.map((c) => c.id));

  let matched = 0;
  let imagesAttached = 0;
  const report: { detailName: string; dbName: string | null; method: string }[] = [];

  for (let i = 0; i < detail.length; i++) {
    const rec = detail[i] as DetailRecord;
    const oldFolder = oldFolders[i] as string;
    const normRec = normalize(rec.name);

    let hit = candidates.find((c) => unmatched.has(c.id) && normalize(c.name) === normRec);
    let method = 'exact';
    if (!hit) {
      hit = candidates.find((c) => {
        if (!unmatched.has(c.id)) return false;
        const n = normalize(c.name);
        return n.includes(normRec) || normRec.includes(n);
      });
      method = 'contains';
    }
    if (!hit) {
      const fuzzyRec = fuzzy(normRec);
      hit = candidates.find((c) => unmatched.has(c.id) && fuzzy(normalize(c.name)) === fuzzyRec);
      method = 'fuzzy';
    }

    if (!hit) {
      report.push({ detailName: rec.name, dbName: null, method: 'NO MATCH' });
      continue;
    }

    unmatched.delete(hit.id);
    matched += 1;
    report.push({ detailName: rec.name, dbName: hit.name, method });

    // Copy the 2 recovered images from the old orphaned folder into the new project's folder.
    const srcDir = path.join(UPLOADS_ROOT, 'projects', oldFolder);
    const destDir = path.join(UPLOADS_ROOT, 'projects', hit.id);
    fs.mkdirSync(destDir, { recursive: true });
    const urls: string[] = [];
    for (const fname of fs.readdirSync(srcDir).sort()) {
      fs.copyFileSync(path.join(srcDir, fname), path.join(destDir, fname));
      urls.push(`/uploads/projects/${hit.id}/${fname}`);
    }

    await db.project.update({
      where: { id: hit.id },
      data: {
        imageUrls: urls,
        developer: rec.developer,
        tenure: rec.tenure,
        totalFloors: parseIntFrom(rec.totalFloor),
        disclosedUnitCount: parseIntFrom(rec.totalUnit),
      },
    });
    imagesAttached += urls.length;
  }

  console.log('--- Match report ---');
  for (const r of report) {
    console.log(`[${r.method.padEnd(8)}] "${r.detailName}" -> ${r.dbName ?? '(none)'}`);
  }
  console.log('--- Unmatched DB projects (no photo source found) ---');
  for (const id of unmatched) {
    console.log(' -', candidates.find((c) => c.id === id)?.name);
  }
  console.log('Done:', { totalDetailRecords: detail.length, matched, imagesAttached, unmatchedDbProjects: unmatched.size });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

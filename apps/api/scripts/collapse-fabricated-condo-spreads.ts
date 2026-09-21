/**
 * One-off correction: the ERA Cambodia reseed (reseed-inventory-real-data.ts)
 * fabricated a spread of 3-6 near-identical units per SALE/CONDO project to
 * give each card some texture, since the source site only ever disclosed a
 * single project-level "starting price" — no real per-unit breakdown. Once
 * the bed/bath/area card display shipped, this became visibly fake: 6
 * "units" all showing the exact same 1 bed / 1 bath / 52 m² with only the
 * price incremented.
 *
 * Fix: every SALE/CONDO project is, by construction, either one of these 45
 * fabricated multi-unit spreads, or one of the 592 real Pointer Asia
 * listings (which are already exactly 1 unit each, since each Pointer
 * listing IS one specific real property). So "propertyType=CONDO,
 * category=SALE, unit count > 1" unambiguously identifies the fabricated
 * ones. For each, keep only the cheapest unit (the original disclosed
 * starting price) and delete the rest — collapsing back to the one real
 * data point the source actually gave us, instead of a fabricated spread.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const projects = await db.project.findMany({
    where: { propertyType: 'CONDO', category: 'SALE' },
    include: { units: { orderBy: { listPrice: 'asc' } } },
  });

  const affected = projects.filter((p) => p.units.length > 1);
  console.log(`Found ${affected.length} SALE/CONDO projects with fabricated multi-unit spreads.`);

  let deleted = 0;
  for (const p of affected) {
    const [keep, ...rest] = p.units;
    if (!keep || rest.length === 0) continue;
    await db.unit.deleteMany({ where: { id: { in: rest.map((u) => u.id) } } });
    deleted += rest.length;
  }

  console.log(`Done: collapsed ${affected.length} projects, deleted ${deleted} fabricated units.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

/**
 * Sample seed data for Block and PriceList — both models have had full CRUD
 * (admin UI + API) since Phase 1/2, but zero rows existed for any of the 637
 * real projects. Unlike the Inventory base data (projects/units), there is no
 * external source to scrape a per-sqm pricing formula or a block/tower layout
 * from — this is inherently illustrative "sample" data, not a claim that ERA
 * discloses these figures. Idempotent: skips any project that already has a
 * PriceList/Block (so re-running after a manual edit won't clobber it).
 *
 * Price list: one active "Standard Price List" per project. Its `psf` (price
 * per sqm) is derived from that project's own real seeded units when they
 * have both listPrice and areaSqm — grounded in real data, not invented —
 * falling back to a flat per-propertyType default only when no unit in the
 * project discloses an area (e.g. LAND, priced per lot).
 *
 * Blocks: one block per project by default ("Block A"), or two ("Block A"/
 * "Block B") for a real multi-unit high-rise (totalFloors > 20 and more than
 * 8 seeded unit rows) — every existing Unit row is then distributed
 * round-robin across that project's new blocks so the Units table's "Block"
 * column is populated, not left blank.
 */
import { PrismaClient, type PropertyType } from '@prisma/client';

const db = new PrismaClient();

const FALLBACK_PSF: Record<PropertyType, number> = {
  CONDO: 2200,
  COMMERCIAL: 1800,
  SHOPHOUSE: 1200,
  TOWNHOUSE: 900,
  VILLA: 1000,
  BOREY: 800,
  HOUSE: 800,
  LAND: 150,
};

// Floor/view premiums only make sense for stacked, multi-floor property types.
const HAS_FLOOR_PREMIUM = new Set<PropertyType>(['CONDO', 'COMMERCIAL', 'SHOPHOUSE']);
const HAS_VIEW_PREMIUM = new Set<PropertyType>(['CONDO', 'COMMERCIAL']);

async function main() {
  const projects = await db.project.findMany({
    include: { units: true, blocks: true, priceLists: true },
  });

  let priceListsCreated = 0;
  let blocksCreated = 0;
  let unitsAssigned = 0;
  let skippedPriceLists = 0;
  let skippedBlocks = 0;

  for (const project of projects) {
    if (project.priceLists.length === 0) {
      const withArea = project.units.filter((u) => u.areaSqm != null && u.areaSqm > 0);
      const psf =
        withArea.length > 0
          ? Math.round(withArea.reduce((sum, u) => sum + u.listPrice / (u.areaSqm as number), 0) / withArea.length)
          : FALLBACK_PSF[project.propertyType];

      await db.priceList.create({
        data: {
          projectId: project.id,
          name: 'Standard Price List',
          version: 1,
          effectiveFrom: new Date(),
          active: true,
          psf,
          floorPremiumPct: HAS_FLOOR_PREMIUM.has(project.propertyType) ? 0.005 : 0,
          viewPremiumUsd: HAS_VIEW_PREMIUM.has(project.propertyType) ? 3000 : 0,
        },
      });
      priceListsCreated++;
    } else {
      skippedPriceLists++;
    }

    if (project.blocks.length === 0) {
      const totalFloors = project.totalFloors ?? 1;
      const numBlocks = totalFloors > 20 && project.units.length > 8 ? 2 : 1;
      const floorsPerBlock = Math.max(1, Math.round(totalFloors / numBlocks));
      const names = numBlocks === 1 ? ['Block A'] : ['Block A', 'Block B'];

      const createdBlocks = [];
      for (const name of names) {
        const b = await db.block.create({ data: { projectId: project.id, name, floors: floorsPerBlock } });
        createdBlocks.push(b);
        blocksCreated++;
      }

      for (const [i, unit] of project.units.entries()) {
        const targetBlock = createdBlocks[i % createdBlocks.length]!;
        await db.unit.update({ where: { id: unit.id }, data: { blockId: targetBlock.id } });
        unitsAssigned++;
      }
    } else {
      skippedBlocks++;
    }
  }

  console.log('Done:', {
    projects: projects.length,
    priceListsCreated,
    skippedPriceLists,
    blocksCreated,
    skippedBlocks,
    unitsAssigned,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

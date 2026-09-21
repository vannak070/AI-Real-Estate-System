/**
 * One-off reseed: replaces the placeholder Inventory listings with real
 * project names/locations/prices pulled from eracambodia.com (the actual
 * business this system is built for) across its three listing pages —
 * /projects (for sale), /propertyforrent (for rent), /urgent-sale-property
 * (villas/flat houses/shophouses/commercial/land not otherwise listed).
 *
 * Scope: ONLY inventory_projects/blocks/units/price_lists are touched.
 * CRM/sales/finance/identity data is untouched — sales_quotations/
 * reservations/contracts have no FK to inventory (module-boundary rule), so
 * wiping units here leaves old demo transactions pointing at now-missing
 * ids, same as the existing "deleted user leaves a dangling ownerId"
 * precedent. Acceptable: those are seeded demo transactions, not real ones.
 *
 * Where the source site gave per-unit specifics (rentals, urgent-sale
 * villas/flat houses), those exact bed/bath/size/price figures are used.
 * Where it only ever showed one project-level "starting price" (every
 * for-sale condo project), a small, clearly-synthetic spread of units is
 * generated around that price — the site never discloses a full unit
 * manifest publicly, so this mirrors how the original placeholder seed
 * already synthesized per-unit detail from a single headline figure.
 *
 * Run: cd apps/api && pnpm exec tsx scripts/reseed-inventory-real-data.ts
 */
import { PrismaClient, type PropertyType, type PropertyCategory } from '@prisma/client';

const db = new PrismaClient();

interface UnitTypeSpec {
  key: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
}

const UNIT_TYPES: UnitTypeSpec[] = [
  { key: 'ut-studio', name: 'Studio', bedrooms: 0, bathrooms: 1, areaSqm: 38 },
  { key: 'ut-1br', name: '1 Bedroom', bedrooms: 1, bathrooms: 1, areaSqm: 52 },
  { key: 'ut-2br', name: '2 Bedroom', bedrooms: 2, bathrooms: 2, areaSqm: 78 },
  { key: 'ut-3br', name: '3 Bedroom', bedrooms: 3, bathrooms: 2, areaSqm: 112 },
  { key: 'ut-4br', name: '4 Bedroom', bedrooms: 4, bathrooms: 5, areaSqm: 220 },
  { key: 'ut-5br', name: '5 Bedroom', bedrooms: 5, bathrooms: 5, areaSqm: 280 },
  { key: 'ut-7br', name: '7 Bedroom', bedrooms: 7, bathrooms: 7, areaSqm: 600 },
  { key: 'ut-duplex', name: 'Duplex', bedrooms: 3, bathrooms: 3, areaSqm: 165 },
  { key: 'ut-ph', name: 'Penthouse', bedrooms: 4, bathrooms: 4, areaSqm: 210 },
  { key: 'cmtwl3t2w0003isl2wt7lz468', name: 'House', bedrooms: 3, bathrooms: 3, areaSqm: 180 },
];

interface UnitSpec {
  /** Key into UNIT_TYPES — omit for commercial listings with no residential-style bed/bath shape (must pass areaSqm instead). */
  unitType?: string;
  areaSqm?: number;
  listPrice: number;
}

interface ProjectSpec {
  name: string;
  location: string;
  city: string;
  category: PropertyCategory;
  propertyType: PropertyType;
  units: UnitSpec[];
}

/**
 * These SALE condo listings only ever disclosed one project-level "starting
 * price" on the source site (no per-unit breakdown), so each maps to exactly
 * one real Unit at that exact price — matching the single real data point
 * actually available, the same way every Pointer Asia listing already does.
 * (This file previously fabricated a 3-6 unit "spread" per project to give
 * cards more texture; that looked increasingly fake once the bed/bath/area
 * card display shipped, since every "unit" showed identical specs with only
 * the price bumped. Corrected in the live DB via
 * collapse-fabricated-condo-spreads.ts — this file is updated so a future
 * re-run produces the same corrected shape, not the old fabricated one.)
 */
const SALE_CONDOS: ProjectSpec[] = [
  { name: 'Time Square 10 - Ocean View', location: 'Otres Beach', city: 'Sihanoukville', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 40000 }] },
  { name: 'Time Square 9 - BKK1', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 90000 }] },
  { name: 'Time Square 8', location: 'Toul Tompoung', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 39000 }] },
  { name: 'J Tower 3', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 330000 }] },
  { name: 'Le Condé BKK1', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 100000 }] },
  { name: 'Urban Village Phase 2', location: 'Hun Sen Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 70000 }] },
  { name: 'Norea Square Condominium', location: 'Koh Norea', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 63500 }] },
  { name: 'Le Condé 2 - BKK1', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 110000 }] },
  { name: 'Time Square 11', location: 'BKK3', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 45000 }] },
  { name: 'G.A.T.O Tower', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 98000 }] },
  { name: 'Picasso Sky Gemme', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 170000 }] },
  { name: 'Kingston Royale', location: 'Beoung Tompun', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 49000 }] },
  { name: 'Odom Living', location: 'Preah Norodom Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 275000 }] },
  { name: 'Odom Tower', location: 'Preah Norodom Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 227800 }] },
  { name: 'LZ Sea View Premium', location: 'Sangkat Bei', city: 'Sihanoukville', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 54700 }] },
  { name: 'Borey Rith Luxury Toul Sangke', location: 'Toul Sangke', city: 'Phnom Penh', category: 'SALE', propertyType: 'BOREY', units: [{ unitType: 'ut-3br', listPrice: 200000 }] },
  { name: 'UC88 Wyndham Garden', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 130000 }] },
  { name: 'Time Square 7', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 39000 }] },
  { name: 'Time Square 6', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 80000 }] },
  { name: 'Time Square 5', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 80000 }] },
  { name: 'La Vista One', location: 'Chroy Changvar', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 100000 }] },
  { name: 'Anata Residence', location: 'Steung Meanchey', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 40000 }] },
  { name: 'R&F City', location: 'Hun Sen Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 90000 }] },
  { name: 'R&F City - Miro', location: 'Hun Sen Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 55000 }] },
  { name: 'Residence H Sensok', location: 'Sen Sok', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 59000 }] },
  { name: 'Morgan Enmaison', location: 'Chroy Changvar', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 80000 }] },
  { name: 'Time Square 3', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 39000 }] },
  { name: 'Diamond Bay Garden', location: 'Koh Pich', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 132000 }] },
  { name: 'Norea Cove Residence', location: 'Diamond Island', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-ph', listPrice: 1600000 }] },
  { name: 'City View', location: 'Boeung Kak', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 80000 }] },
  { name: 'Wealth Mansion', location: 'Chroy Changvar', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 120000 }] },
  { name: 'Vue Aston', location: 'Koh Norea', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 70000 }] },
  { name: 'Agile Sky Residence', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 90000 }] },
  { name: 'Piccasso City Garden', location: 'BKK1', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 200000 }] },
  { name: 'Mekong View Tower 1', location: 'Chroy Changva', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 123000 }] },
  { name: 'TK Star', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 70000 }] },
  { name: 'One Park', location: 'Boeung Kak', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 120000 }] },
  { name: 'Royal Platinum', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 59999 }] },
  { name: 'Orkidé The Royal Condominium', location: 'Sen Sok', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 100000 }] },
  { name: 'The Pearl Of Kep', location: 'Kep', city: 'Kep', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 92000 }] },
  { name: 'Star Bay', location: 'Sihanoukville', city: 'Sihanoukville', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 55000 }] },
  { name: 'Platinum Coast', location: 'Sihanoukville', city: 'Sihanoukville', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-studio', listPrice: 50000 }] },
  { name: 'Bakong Village', location: 'Siem Reap', city: 'Siem Reap', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 70000 }] },
  { name: 'Rose Apple Square', location: 'Siem Reap', city: 'Siem Reap', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 75000 }] },
  { name: "D'Seaview", location: 'Sihanoukville', city: 'Sihanoukville', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 85000 }] },
  { name: 'The Bridge - Soho Units', location: 'Koh Pich', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-1br', listPrice: 68000 }, { unitType: 'ut-1br', listPrice: 72000 }, { unitType: 'ut-1br', listPrice: 75000 }] },
  { name: 'Olympia City', location: 'Olympia', city: 'Phnom Penh', category: 'SALE', propertyType: 'CONDO', units: [{ unitType: 'ut-2br', listPrice: 230000 }] },
];

const SALE_RESIDENTIAL_OTHER: ProjectSpec[] = [
  { name: 'Villa For Sale and Rent', location: 'Khan Dangkor', city: 'Phnom Penh', category: 'SALE', propertyType: 'VILLA', units: [{ unitType: 'ut-4br', listPrice: 125000 }] },
  { name: 'Twin Villa Urgent Sale - Chroy Changva A', location: 'Chroy Changva', city: 'Phnom Penh', category: 'SALE', propertyType: 'VILLA', units: [{ unitType: 'ut-4br', listPrice: 281000 }] },
  { name: 'Twin Villa Urgent Sale - Chroy Changva B', location: 'Chroy Changva', city: 'Phnom Penh', category: 'SALE', propertyType: 'VILLA', units: [{ unitType: 'ut-4br', listPrice: 445000 }] },
  { name: 'Twin Villa Urgent Sale - Chroy Changva C', location: 'Chroy Changva', city: 'Phnom Penh', category: 'SALE', propertyType: 'VILLA', units: [{ unitType: 'ut-4br', listPrice: 295000 }] },
  { name: 'Flat House Urgent Sale - Toul Kork', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 350000 }] },
  { name: 'Flat House Urgent Sale - Mao Tse Toung', location: 'Mao Tse Toung Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 190000 }] },
  { name: 'Flat House Urgent Sale - Chamkarmon', location: 'Chamkarmon', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 365000 }] },
  { name: 'Flat House Urgent Sale - Russey Keo A', location: 'Russey Keo', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 129000 }] },
  { name: '2 Flat Houses Urgent Sale - Russey Keo', location: 'Russey Keo', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 154500 }, { unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 154500 }] },
  { name: 'Flat House Urgent Sale - Russey Keo B', location: 'Russey Keo', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 125000 }] },
  { name: '2 Flat Houses Urgent Sale - 7 Makara', location: 'Khan 7 Makara', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 390000 }, { unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 390000 }] },
  { name: 'Flat House Urgent Sale - Duan Penh', location: 'Duan Penh', city: 'Phnom Penh', category: 'SALE', propertyType: 'TOWNHOUSE', units: [{ unitType: 'cmtwl3t2w0003isl2wt7lz468', listPrice: 350000 }] },
];

const RENT_PROJECTS: ProjectSpec[] = [
  { name: 'Le Condé BKK1 (For Rent)', location: 'BKK1', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-studio', listPrice: 650 },
    { unitType: 'ut-1br', listPrice: 850 },
    { unitType: 'ut-2br', listPrice: 1500 },
    { unitType: 'ut-3br', listPrice: 3000 },
  ] },
  { name: 'Navikah Residence', location: 'BKK1', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-1br', areaSqm: 95, listPrice: 1800 },
    { unitType: 'ut-1br', areaSqm: 95, listPrice: 2400 },
    { unitType: 'ut-2br', areaSqm: 234, listPrice: 4200 },
    { unitType: 'ut-2br', areaSqm: 234, listPrice: 4400 },
    { unitType: 'ut-3br', areaSqm: 244, listPrice: 4700 },
  ] },
  { name: 'J Tower 1', location: 'BKK1', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-1br', areaSqm: 45.1, listPrice: 700 },
    { unitType: 'ut-1br', areaSqm: 45.1, listPrice: 750 },
  ] },
  { name: 'J Tower 2', location: 'BKK1', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-2br', areaSqm: 65, listPrice: 1270 },
    { unitType: 'ut-2br', areaSqm: 91, listPrice: 1750 },
    { unitType: 'ut-3br', areaSqm: 153, listPrice: 3800 },
  ] },
  { name: 'M Residence', location: 'BKK1', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-studio', areaSqm: 35, listPrice: 450 },
    { unitType: 'ut-studio', areaSqm: 45, listPrice: 550 },
    { unitType: 'ut-1br', areaSqm: 56, listPrice: 750 },
    { unitType: 'ut-2br', areaSqm: 80, listPrice: 800 },
  ] },
  { name: 'Vue Aston (For Rent)', location: 'Koh Pich', city: 'Phnom Penh', category: 'RENT', propertyType: 'CONDO', units: [
    { unitType: 'ut-1br', areaSqm: 37, listPrice: 350 },
  ] },
  { name: 'Semi Detached Villa', location: 'Khan Dangkor', city: 'Phnom Penh', category: 'RENT', propertyType: 'VILLA', units: [
    { unitType: 'ut-4br', listPrice: 550 },
  ] },
  { name: 'Spacious Villa For Rent', location: 'Toul Kork', city: 'Phnom Penh', category: 'RENT', propertyType: 'VILLA', units: [
    { unitType: 'ut-7br', listPrice: 3500 },
  ] },
];

const COMMERCIAL_PROJECTS: ProjectSpec[] = [
  { name: 'Commercial Building For Sale', location: 'Chroy Changva', city: 'Phnom Penh', category: 'SALE', propertyType: 'COMMERCIAL', units: [{ areaSqm: 800, listPrice: 3500000 }] },
  { name: 'Warehouse - Mao Tse Toung Blvd', location: 'Mao Tse Toung Blvd', city: 'Phnom Penh', category: 'SALE', propertyType: 'COMMERCIAL', units: [{ areaSqm: 1349, listPrice: 6800000 }] },
  { name: 'Boutique Hotel - Urgent Sale', location: 'Siem Reap', city: 'Siem Reap', category: 'SALE', propertyType: 'COMMERCIAL', units: [{ areaSqm: 1200, listPrice: 1500000 }] },
  { name: 'Resort For Sale', location: 'Koh Kong', city: 'Koh Kong', category: 'SALE', propertyType: 'COMMERCIAL', units: [{ areaSqm: 5000, listPrice: 950000 }] },
  { name: '6 Storey Building For Sale', location: 'Toul Sleng', city: 'Phnom Penh', category: 'SALE', propertyType: 'COMMERCIAL', units: [{ areaSqm: 900, listPrice: 710000 }] },
  { name: 'The Peak - Retail Shops', location: 'Koh Pich', city: 'Phnom Penh', category: 'SALE', propertyType: 'SHOPHOUSE', units: [
    { areaSqm: 90, listPrice: 238000 },
    { areaSqm: 90, listPrice: 238000 },
    { areaSqm: 95, listPrice: 239000 },
  ] },
  { name: 'Shophouse Urgent Sale - Toul Kork', location: 'Toul Kork', city: 'Phnom Penh', category: 'SALE', propertyType: 'SHOPHOUSE', units: [{ areaSqm: 400, listPrice: 1670000 }] },
  { name: 'Shophouse Urgent Sale - Duan Penh', location: 'Duan Penh', city: 'Phnom Penh', category: 'SALE', propertyType: 'SHOPHOUSE', units: [{ areaSqm: 150, listPrice: 288000 }] },
  { name: 'Urgent Land For Sale - OCIC', location: 'OCIC', city: 'Phnom Penh', category: 'SALE', propertyType: 'LAND', units: [{ areaSqm: 500, listPrice: 110000 }] },
  { name: 'Land For Sale - Siem Reap', location: 'Siem Reap', city: 'Siem Reap', category: 'SALE', propertyType: 'LAND', units: [{ areaSqm: 300, listPrice: 38000 }] },
];

const ALL_PROJECTS = [...SALE_CONDOS, ...SALE_RESIDENTIAL_OTHER, ...RENT_PROJECTS, ...COMMERCIAL_PROJECTS];

async function main() {
  console.log(`Reseeding inventory: ${ALL_PROJECTS.length} projects from eracambodia.com listings...`);

  for (const spec of UNIT_TYPES) {
    await db.unitType.upsert({
      where: { id: spec.key },
      create: { id: spec.key, name: spec.name, bedrooms: spec.bedrooms, bathrooms: spec.bathrooms, areaSqm: spec.areaSqm },
      update: {},
    });
  }

  console.log('Clearing existing listings (units -> price lists -> blocks -> projects)...');
  await db.unit.deleteMany();
  await db.priceList.deleteMany();
  await db.block.deleteMany();
  await db.project.deleteMany();

  for (const spec of ALL_PROJECTS) {
    const project = await db.project.create({
      data: {
        name: spec.name,
        location: spec.location,
        city: spec.city,
        status: 'SELLING',
        category: spec.category,
        propertyType: spec.propertyType,
        coverColor: spec.category === 'RENT' ? '#8B0A1C' : '#001F5B',
      },
    });

    let seq = 1;
    for (const u of spec.units) {
      const unitType = u.unitType ? UNIT_TYPES.find((t) => t.key === u.unitType) : undefined;
      if (u.unitType && !unitType) throw new Error(`Unknown unit type key "${u.unitType}" for project "${spec.name}"`);
      if (!unitType && u.areaSqm == null) throw new Error(`Project "${spec.name}" unit needs either a unitType or an explicit areaSqm`);
      await db.unit.create({
        data: {
          projectId: project.id,
          unitTypeId: unitType?.key,
          code: `${project.name.slice(0, 3).replace(/[^A-Za-z]/g, '').toUpperCase() || 'UNT'}-${String(seq).padStart(3, '0')}`,
          areaSqm: u.areaSqm ?? unitType?.areaSqm,
          listPrice: u.listPrice,
          status: 'AVAILABLE',
        },
      });
      seq += 1;
    }
  }

  const counts = {
    projects: await db.project.count(),
    units: await db.unit.count(),
    sale: await db.project.count({ where: { category: 'SALE' } }),
    rent: await db.project.count({ where: { category: 'RENT' } }),
    commercial: await db.project.count({ where: { propertyType: { in: ['COMMERCIAL', 'SHOPHOUSE', 'LAND'] } } }),
  };
  console.log('Done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

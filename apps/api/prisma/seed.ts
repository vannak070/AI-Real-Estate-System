import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { erpSeed } from '@era/mock-data/erp';
import { DEFAULT_ROLES } from '@era/contracts';

/**
 * Loads the exact same data the static back office demos with, so dev/staging
 * matches what's been shown. Wipes and reloads (children first) — this is a
 * dev seed, not a migration; re-run it anytime with `pnpm --filter @era/api db:seed`.
 *
 * A few fields don't exist on the real tables (deliberately — see
 * ARCHITECTURE.md's "don't store derived counts" rule) or are named
 * differently (Reservation/SalesContract use `agentId`, mock-data calls the
 * same concept `ownerId`); this file is where that reconciliation happens.
 *
 * SAFETY GUARD (added 2026-09-21, after this exact wipe destroyed a real
 * 637-project scraped Inventory dataset with no warning — see memory-bank/
 * progress.md's "Incidents worth remembering"): `reset()` unconditionally
 * deletes nearly every table. Before running it, `assertSafeToReset()`
 * checks whether `Project` currently holds any row this seed didn't itself
 * create (i.e. any id outside `erpSeed.projects`' own ids) — that's real or
 * otherwise-non-demo data, and this script refuses to touch it. Pass
 * `--force` (or `SEED_FORCE=1`) to override when a wipe is genuinely
 * intended.
 */

const db = new PrismaClient();
const DEV_PASSWORD = 'ChangeMe123!';
const FORCE = process.argv.includes('--force') || process.env.SEED_FORCE === '1';

async function assertSafeToReset() {
  if (FORCE) return;

  const demoProjectIds = new Set(erpSeed.projects.map((p) => p.id));
  const existing = await db.project.findMany({ select: { id: true, name: true } });
  const foreign = existing.filter((p) => !demoProjectIds.has(p.id));

  if (foreign.length > 0) {
    console.error(
      [
        '',
        `REFUSING TO SEED: found ${foreign.length} Project row(s) that aren't part of this`,
        "demo dataset (id not in erpSeed.projects) — this looks like real or otherwise",
        'important data, not the placeholder set this script is meant to reset.',
        '',
        `Example: "${foreign[0]?.name}" (id ${foreign[0]?.id}).`,
        '',
        'This exact mistake already destroyed a real 637-project scraped Inventory',
        'dataset once (see memory-bank/progress.md). If you\'re SURE you want to wipe',
        'the current Inventory (and every other table this script resets) and replace',
        'it with the small demo/mock dataset, re-run with --force:',
        '',
        '  pnpm --filter @era/api db:seed -- --force',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

const date = (s: string) => new Date(s);
const dateOrNull = (s: string | null) => (s ? new Date(s) : null);

async function reset() {
  await db.$transaction([
    db.contractMilestone.deleteMany(),
    db.receipt.deleteMany(),
    db.payment.deleteMany(),
    db.invoice.deleteMany(),
    db.commission.deleteMany(),
    db.salesContract.deleteMany(),
    db.reservation.deleteMany(),
    db.quotation.deleteMany(),
    db.paymentPlanTemplate.deleteMany(),
    db.activity.deleteMany(),
    db.lead.deleteMany(),
    db.contact.deleteMany(),
    db.unit.deleteMany(),
    db.priceList.deleteMany(),
    db.block.deleteMany(),
    db.unitType.deleteMany(),
    db.project.deleteMany(),
    db.approvalRequest.deleteMany(),
    db.documentFile.deleteMany(),
    db.notification.deleteMany(),
    db.channel.deleteMany(),
    db.campaign.deleteMany(),
    db.numberSequence.deleteMany(),
    db.taxRate.deleteMany(),
    db.companyProfile.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
    db.team.deleteMany(),
    db.role.deleteMany(),
  ]);
}

async function main() {
  await assertSafeToReset();
  await reset();

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  await db.role.createMany({
    data: DEFAULT_ROLES.map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      capabilities: r.capabilities,
      isSystem: r.isSystem,
    })),
  });
  const roles = await db.role.findMany();
  const roleIdByKey = new Map(roles.map((r) => [r.key, r.id]));

  await db.team.createMany({ data: erpSeed.teams });

  await db.user.createMany({
    data: erpSeed.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      roleId: roleIdByKey.get(u.role)!,
      teamId: u.teamId,
      avatarColor: u.avatarColor,
      target: u.target ?? null,
      active: u.active,
      passwordHash,
    })),
  });

  await db.contact.createMany({
    data: erpSeed.contacts.map((c) => ({ ...c, createdAt: date(c.createdAt) })),
  });

  await db.lead.createMany({
    data: erpSeed.leads.map(({ lastActivityAt, ...l }) => ({
      ...l,
      createdAt: date(l.createdAt),
      updatedAt: date(lastActivityAt),
    })),
  });

  await db.activity.createMany({
    data: erpSeed.activities.map((a) => ({
      ...a,
      dueAt: dateOrNull(a.dueAt),
      createdAt: date(a.createdAt),
    })),
  });

  await db.project.createMany({
    data: erpSeed.projects.map(({ totalUnits: _totalUnits, ...p }) => ({
      ...p,
      isPublished: true,
      isDevelopment: true,
      handoverDate: date(p.handoverDate),
    })),
  });
  await db.block.createMany({ data: erpSeed.blocks });
  await db.unitType.createMany({ data: erpSeed.unitTypes });
  await db.priceList.createMany({
    data: erpSeed.priceLists.map((p) => ({ ...p, effectiveFrom: date(p.effectiveFrom) })),
  });
  await db.unit.createMany({
    data: erpSeed.units.map((u) => ({ ...u, holdExpiresAt: dateOrNull(u.holdExpiresAt) })),
  });

  await db.paymentPlanTemplate.createMany({
    data: erpSeed.paymentPlans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      installments: p.installments as unknown as Prisma.InputJsonValue,
    })),
  });

  await db.quotation.createMany({
    data: erpSeed.quotations.map((q) => ({
      ...q,
      validUntil: dateOrNull(q.validUntil),
      createdAt: date(q.createdAt),
    })),
  });

  await db.reservation.createMany({
    data: erpSeed.reservations.map(({ ownerId, ...r }) => ({
      ...r,
      agentId: ownerId,
      expiresAt: dateOrNull(r.expiresAt),
      createdAt: date(r.createdAt),
      updatedAt: date(r.createdAt),
    })),
  });

  await db.salesContract.createMany({
    data: erpSeed.contracts.map(({ ownerId, ...c }) => ({
      ...c,
      agentId: ownerId,
      signedAt: dateOrNull(c.signedAt),
      createdAt: date(c.createdAt),
    })),
  });

  await db.contractMilestone.createMany({
    data: erpSeed.milestones.map((m) => ({
      ...m,
      dueDate: dateOrNull(m.dueDate),
      completedAt: dateOrNull(m.completedAt),
    })),
  });

  await db.invoice.createMany({
    data: erpSeed.invoices.map((i) => ({
      ...i,
      dueDate: date(i.dueDate),
      issuedAt: dateOrNull(i.issuedAt),
      createdAt: date(i.issuedAt ?? i.dueDate),
    })),
  });
  await db.payment.createMany({
    data: erpSeed.payments.map((p) => ({ ...p, receivedAt: date(p.receivedAt) })),
  });
  await db.receipt.createMany({
    data: erpSeed.receipts.map((r) => ({ ...r, issuedAt: date(r.issuedAt) })),
  });
  await db.commission.createMany({
    data: erpSeed.commissions.map((c) => ({ ...c, paidAt: dateOrNull(c.paidAt) })),
  });

  await db.approvalRequest.createMany({
    data: erpSeed.approvals.map((a) => ({
      ...a,
      decidedAt: dateOrNull(a.decidedAt),
      createdAt: date(a.createdAt),
    })),
  });
  await db.documentFile.createMany({
    data: erpSeed.documents.map((d) => ({ ...d, uploadedAt: date(d.uploadedAt) })),
  });
  await db.notification.createMany({
    data: erpSeed.notifications.map(({ entityType, entityId, ...n }) => ({
      ...n,
      entityType,
      entityId,
      userId: null, // broadcast — mock-data's feed has no per-user targeting yet
      createdAt: date(n.createdAt),
    })),
  });

  await db.channel.createMany({
    data: erpSeed.channels.map(({ leads30d: _leads30d, ...c }) => c), // derived, not stored
  });
  await db.campaign.createMany({
    data: erpSeed.campaigns.map(({ leads: _leads, deals: _deals, revenue: _revenue, ...c }) => ({
      ...c,
      startDate: dateOrNull(c.startDate),
      endDate: dateOrNull(c.endDate),
    })),
  });

  await db.companyProfile.create({ data: { id: 'default', ...erpSeed.company } });
  await db.numberSequence.createMany({ data: erpSeed.sequences });
  await db.taxRate.createMany({ data: erpSeed.taxRates });

  console.log(
    JSON.stringify({
      seeded: true,
      devLogin: { email: erpSeed.users[0]?.email, password: DEV_PASSWORD },
      counts: {
        users: erpSeed.users.length,
        contacts: erpSeed.contacts.length,
        leads: erpSeed.leads.length,
        units: erpSeed.units.length,
        contracts: erpSeed.contracts.length,
        invoices: erpSeed.invoices.length,
        payments: erpSeed.payments.length,
      },
    }),
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });

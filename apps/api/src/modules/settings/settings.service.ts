import type { ModuleContext } from '../../platform/module.js';

interface SequenceRow {
  issued: number;
  prefix: string;
  padding: number;
}

const COMPANY_ID = 'default';

export function createSettingsService({ db }: ModuleContext) {
  return {
    /**
     * Atomically issues the next formatted document number for the sequence
     * whose `prefix` is `prefix` (e.g. "RSV", "SPA", "INV"). One
     * `UPDATE ... RETURNING` statement — Postgres's row lock on the sequence row
     * serializes concurrent callers, so this is safe without an explicit
     * transaction.
     */
    async nextNumber(prefix: string) {
      const rows = await db.$queryRaw<SequenceRow[]>`
        UPDATE settings_number_sequences
        SET "nextNumber" = "nextNumber" + 1
        WHERE prefix = ${prefix}
        RETURNING "nextNumber" - 1 AS issued, prefix, padding
      `;
      const row = rows[0];
      if (!row) {
        throw new Error(
          `No NumberSequence configured for prefix "${prefix}" — add one to settings_number_sequences (see prisma/seed.ts).`,
        );
      }
      const year = new Date().getUTCFullYear();
      return `${row.prefix}-${year}-${String(row.issued).padStart(row.padding, '0')}`;
    },

    /* ── Company profile (singleton) ── */

    getCompany() {
      return db.companyProfile.findUnique({ where: { id: COMPANY_ID } });
    },

    updateCompany(
      input: Partial<{
        name: string;
        legalName: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        taxId: string | null;
        currency: string;
        timezone: string;
        locale: string;
      }>,
    ) {
      return db.companyProfile.update({ where: { id: COMPANY_ID }, data: input });
    },

    /* ── Read-only reference data ── */

    listTaxRates() {
      return db.taxRate.findMany({ orderBy: { isDefault: 'desc' } });
    },

    listSequences() {
      return db.numberSequence.findMany({ orderBy: { doc: 'asc' } });
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;

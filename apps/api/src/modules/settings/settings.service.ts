import type { ModuleContext } from '../../platform/module.js';
import { deleteImage, saveImage } from '../../platform/uploads.js';

interface SequenceRow {
  issued: number;
  prefix: string;
  padding: number;
}

const COMPANY_ID = 'default';
const ABOUT_ID = 'default';

export function createSettingsService({ db }: ModuleContext) {
  /** Row is created lazily on first read/write — no seed migration needed for the singleton to exist. */
  async function getAboutContent() {
    const row = await db.aboutPageContent.findUnique({ where: { id: ABOUT_ID } });
    return row ?? db.aboutPageContent.create({ data: { id: ABOUT_ID } });
  }

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

    /* ── About page content (CMS for apps/client's About page — Contact tab stays static) ── */

    getAboutContent,

    updateAboutContent(
      input: Partial<{
        pageTitle: string;
        subtitle: string | null;
        paragraph1: string | null;
        paragraph2: string | null;
        mission: string | null;
        values: string[];
        statProjects: string | null;
        statLeads: string | null;
        statAccuracy: string | null;
        statTeamSize: string | null;
      }>,
    ) {
      return db.aboutPageContent.upsert({ where: { id: ABOUT_ID }, create: { id: ABOUT_ID, ...input }, update: input });
    },

    listMilestones() {
      return db.aboutMilestone.findMany({ orderBy: { order: 'asc' } });
    },

    createMilestone(input: { year: string; title: string; description: string; order?: number }) {
      return db.aboutMilestone.create({ data: input });
    },

    updateMilestone(id: string, input: Partial<{ year: string; title: string; description: string; order: number }>) {
      return db.aboutMilestone.update({ where: { id }, data: input });
    },

    deleteMilestone(id: string) {
      return db.aboutMilestone.delete({ where: { id } });
    },

    listTeamMembers() {
      return db.aboutTeamMember.findMany({ orderBy: [{ isLeader: 'desc' }, { order: 'asc' }] });
    },

    createTeamMember(input: { name: string; position: string; bio?: string; isLeader?: boolean; order?: number }) {
      return db.aboutTeamMember.create({ data: input });
    },

    updateTeamMember(
      id: string,
      input: Partial<{ name: string; position: string; bio: string | null; isLeader: boolean; order: number }>,
    ) {
      return db.aboutTeamMember.update({ where: { id }, data: input });
    },

    async deleteTeamMember(id: string) {
      const member = await db.aboutTeamMember.findUniqueOrThrow({ where: { id } });
      if (member.photoUrl) await deleteImage(member.photoUrl);
      return db.aboutTeamMember.delete({ where: { id } });
    },

    async setTeamMemberPhoto(id: string, dataUrl: string) {
      const member = await db.aboutTeamMember.findUniqueOrThrow({ where: { id } });
      if (member.photoUrl) await deleteImage(member.photoUrl);
      const { url } = await saveImage(`about/team/${id}`, dataUrl);
      return db.aboutTeamMember.update({ where: { id }, data: { photoUrl: url } });
    },

    async removeTeamMemberPhoto(id: string) {
      const member = await db.aboutTeamMember.findUniqueOrThrow({ where: { id } });
      if (member.photoUrl) await deleteImage(member.photoUrl);
      return db.aboutTeamMember.update({ where: { id }, data: { photoUrl: null } });
    },

    listAwards() {
      return db.aboutAward.findMany({ orderBy: { order: 'asc' } });
    },

    createAward(input: { year: string; title: string; organization: string; description?: string; order?: number }) {
      return db.aboutAward.create({ data: input });
    },

    updateAward(
      id: string,
      input: Partial<{ year: string; title: string; organization: string; description: string | null; order: number }>,
    ) {
      return db.aboutAward.update({ where: { id }, data: input });
    },

    deleteAward(id: string) {
      return db.aboutAward.delete({ where: { id } });
    },

    /** One round trip for the public site's whole About page. */
    async getPublicAbout() {
      const [content, milestones, team, awards] = await Promise.all([
        getAboutContent(),
        db.aboutMilestone.findMany({ orderBy: { order: 'asc' } }),
        db.aboutTeamMember.findMany({ orderBy: [{ isLeader: 'desc' }, { order: 'asc' }] }),
        db.aboutAward.findMany({ orderBy: { order: 'asc' } }),
      ]);
      return { content, milestones, team, awards };
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;

/**
 * One-time content seed for the About-page CMS (AboutPageContent/AboutMilestone/AboutTeamMember/
 * AboutAward — see settings.prisma). Promotes the real copy that was hardcoded directly into
 * apps/client/src/app/pages/AboutPage.tsx into editable rows, so ManageAboutPage.tsx has real
 * content to manage from day one instead of an empty CMS regressing the live page to blank.
 *
 * Unlike prisma/seed.ts, this is NOT destructive — it only inserts if the relevant table is
 * still empty (or upserts the singleton content row), so it's safe to re-run.
 *
 * Team member photos are deliberately left blank rather than carrying over the mock page's
 * Unsplash stock photos, which were attached to made-up employee identities — a real headshot
 * should be uploaded per person via the admin UI once available, not fabricated.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  await db.aboutPageContent.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      pageTitle: 'About ERA Cambodia',
      subtitle:
        'Leading the future of real estate in Cambodia with innovative AI technology and exceptional service',
      paragraph1:
        "ERA Cambodia is a pioneering real estate company that combines traditional expertise with cutting-edge artificial intelligence technology. We're revolutionizing how Cambodians buy, sell, and rent properties through our innovative AI-powered platform, with our own integrated CRM, sales and inventory system.",
      paragraph2:
        "Under the leadership of Chairman and CEO Kungkea Khorn, ERA Cambodia has built a trusted reputation in Cambodia's property market. We help families, investors and businesses buy, sell and rent across Phnom Penh and the country's key provinces, with an experienced team supporting every client from first enquiry to handover.",
      mission:
        'To democratize access to quality real estate through innovative AI technology, making property search and transactions seamless, transparent, and efficient for all Cambodians.',
      values: ['Innovation & Technology Excellence', 'Customer-First Approach', 'Integrity & Transparency'],
      statProjects: '5',
      statLeads: '1,247+',
      statAccuracy: '94.5%',
      statTeamSize: '10',
    },
    update: {},
  });

  // History as undated stages — the template's dates and figures (e.g. "6 intelligent agents",
  // "40% increase in conversion") were never ERA's. Staff can add dated milestones in Manage About.
  if ((await db.aboutMilestone.count()) === 0) {
    await db.aboutMilestone.createMany({
      data: [
        {
          year: 'Today',
          title: 'AI-Powered Service',
          description:
            'Our AI property assistant now helps clients around the clock on our website and Telegram, working alongside our experienced team.',
          order: 0,
        },
        {
          year: 'Going Digital',
          title: 'Integrated Platform',
          description:
            'We built our own integrated CRM, sales and inventory system, so every listing and every client is managed in one place.',
          order: 1,
        },
        {
          year: 'Growing Together',
          title: 'Wider Reach',
          description:
            "We grew our team and our portfolio to serve buyers, renters and investors across Phnom Penh and Cambodia's key provinces.",
          order: 2,
        },
        {
          year: 'The Beginning',
          title: 'Founded on Trust',
          description: 'ERA Cambodia set out to bring professional, trustworthy real estate service to Cambodia.',
          order: 3,
        },
      ],
    });
  }

  // No awards are seeded: the template's awards were made up. The Awards section stays hidden on
  // the site until staff add real ones in Manage About.

  if ((await db.aboutTeamMember.count()) === 0) {
    await db.aboutTeamMember.createMany({
      data: [
        {
          name: 'KUNGKEA KHORN',
          position: 'CHAIRMAN AND CEO',
          bio: 'Kungkea has an educational background in Business Management. Prior to set up ERA Cambodia, Kungkea was a Franchise Manager of an international real estate company. He is a Certified Real Estate Specialist (CIPS) and a Senior Real Estate Specialist (SRES), both certified from USA. Kungkea is also an International Real Estate Speaker and Negotiator, invited to speak at events and conferences locally and internationally. In 2018, Kungkea successfully set up ERA Cambodia as a master franchise from USA to Cambodia. He is presently Chairman and CEO of ERA Cambodia.',
          isLeader: true,
          order: 0,
        },
        { name: 'ATH PHEARAK', position: 'Design & Tech Supervisor', isLeader: false, order: 1 },
        { name: 'HOEM SEIHA', position: 'Director at ERA Data Intel', isLeader: false, order: 2 },
        { name: 'CHOU RATHA', position: 'Media Supervisor', isLeader: false, order: 3 },
        { name: 'NCEL ROTANA', position: 'Account Manager', isLeader: false, order: 4 },
        { name: 'KHORN CHANTREA', position: 'Account Supervisor', isLeader: false, order: 5 },
        { name: 'SINOUN SNGOUN', position: 'Sale and Marketing Manager', isLeader: false, order: 6 },
        { name: 'KHORN SEAKLENG', position: 'Account Officer', isLeader: false, order: 7 },
        { name: 'THORN SREYENG', position: 'Senior Sales Executive', isLeader: false, order: 8 },
        { name: 'YEM LYHOUR', position: 'Senior Sales Executive', isLeader: false, order: 9 },
        { name: 'EN CHIVORN', position: 'Senior Sales Executive', isLeader: false, order: 10 },
        { name: 'KIEN CHHENGHOR', position: 'Recruitment Manager', isLeader: false, order: 11 },
        { name: 'KIM CHHAY RATANAK', position: 'Graphic Designer', isLeader: false, order: 12 },
        { name: 'KHORN CHHENGLEANG', position: 'Sales & Marketing Officer', isLeader: false, order: 13 },
        { name: 'NGEAV CHAN KRESNA', position: 'Photographer / Editor', isLeader: false, order: 14 },
        { name: 'CHHEANG DIENG SOTHEARITH', position: 'Sales Internal', isLeader: false, order: 15 },
        { name: 'MENG THOVLENG', position: 'Graphic Designer', isLeader: false, order: 16 },
        { name: 'NEM SOTHIN', position: 'Content Creator', isLeader: false, order: 17 },
      ],
    });
  }

  console.log('About page content seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

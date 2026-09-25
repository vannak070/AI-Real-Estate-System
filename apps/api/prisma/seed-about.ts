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
        "With a portfolio of 5 premium projects across Phnom Penh and a dedicated team of 10 sales professionals, we're committed to delivering exceptional service and results to our clients.",
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

  if ((await db.aboutMilestone.count()) === 0) {
    await db.aboutMilestone.createMany({
      data: [
        {
          year: '2026 - Present',
          title: 'AI Integration Era',
          description:
            'Launched comprehensive AI Real Estate System with 6 intelligent agents, achieving 40% increase in conversion rates and 50-70% reduction in manual workload.',
          order: 0,
        },
        {
          year: '2024',
          title: 'Digital Transformation',
          description:
            'Launched an integrated platform connecting CRM, Sales, and Inventory for seamless operations. Introduced multi-channel lead capture across Facebook, Website, Telegram, and WhatsApp.',
          order: 1,
        },
        {
          year: '2022',
          title: 'Rapid Expansion',
          description:
            'Expanded portfolio to 5 premium projects across Phnom Penh. Grew sales team to 10 professionals, handling over 400 monthly leads.',
          order: 2,
        },
        {
          year: '2020',
          title: 'Foundation',
          description:
            'ERA Cambodia was established with a vision to revolutionize the real estate industry through technology and exceptional customer service.',
          order: 3,
        },
      ],
    });
  }

  if ((await db.aboutAward.count()) === 0) {
    await db.aboutAward.createMany({
      data: [
        {
          year: '2025',
          title: 'Best Real Estate Innovation',
          organization: 'Cambodia Property Awards',
          description: 'Recognized for pioneering AI-powered real estate solutions',
          order: 0,
        },
        {
          year: '2024',
          title: 'Top Real Estate Agency',
          organization: 'Asia Pacific Property Excellence',
          description: 'Outstanding performance in residential property sales',
          order: 1,
        },
        {
          year: '2024',
          title: 'Digital Transformation Leader',
          organization: 'ASEAN Business Awards',
          description: 'Excellence in real estate technology integration',
          order: 2,
        },
        {
          year: '2023',
          title: 'Customer Service Excellence',
          organization: 'Cambodia Business Awards',
          description: 'Highest customer satisfaction ratings in the industry',
          order: 3,
        },
      ],
    });
  }

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

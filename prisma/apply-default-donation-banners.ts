import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const banners = [
  "/images/donation-banners/warm-care-photo.webp",
  "/images/donation-banners/children-learning-photo.webp",
  "/images/donation-banners/community-meal-photo.webp",
  "/images/donation-banners/sharing-village-animation.webp",
  "/images/donation-banners/community-garden-illustration.webp",
];

async function main() {
  const organizations = await prisma.organization.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, donationPage: { select: { heroImageUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  let applied = 0;
  let preserved = 0;
  for (const org of organizations) {
    if (org.donationPage?.heroImageUrl) {
      preserved += 1;
      continue;
    }
    const heroImageUrl = banners[Math.floor(Math.random() * banners.length)];
    await prisma.donationPage.upsert({
      where: { organizationId: org.id },
      update: { heroImageUrl },
      create: { organizationId: org.id, heroImageUrl },
    });
    applied += 1;
  }

  console.log(JSON.stringify({ organizations: organizations.length, applied, preserved }));
}

main().finally(() => prisma.$disconnect());

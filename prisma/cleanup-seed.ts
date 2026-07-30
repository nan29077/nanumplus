import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// seed.ts 로 생성된 더미 기관 슬러그 목록
const SEED_SLUGS = [
  "warmhands",
  "bluehope",
  "hanultari",
  "brightfuture",
  "dawndew",
  "happymulti",
];

async function main() {
  console.log("더미 데이터 정리 시작...");

  const seedOrgs = await prisma.organization.findMany({
    where: { slug: { in: SEED_SLUGS } },
    select: { id: true, name: true, slug: true },
  });

  if (seedOrgs.length === 0) {
    console.log("삭제할 더미 기관이 없습니다.");
    return;
  }

  const orgIds = seedOrgs.map((o) => o.id);
  console.log("삭제 대상 기관:", seedOrgs.map((o) => o.name).join(", "));

  // cascade 순서대로 삭제
  const deletedItems = await prisma.settlementItem.deleteMany({ where: { settlement: { organizationId: { in: orgIds } } } });
  console.log("settlementItem:", deletedItems.count);

  const deletedSettlements = await prisma.settlement.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("settlement:", deletedSettlements.count);

  const deletedFees = await prisma.organizationFee.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("organizationFee:", deletedFees.count);

  const deletedRecurring = await prisma.recurringDonation.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("recurringDonation:", deletedRecurring.count);

  const deletedDonations = await prisma.donation.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("donation:", deletedDonations.count);

  const deletedDonors = await prisma.donor.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("donor:", deletedDonors.count);

  const deletedCampaigns = await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("campaign:", deletedCampaigns.count);

  const deletedQrCodes = await prisma.qrCode.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("qrCode:", deletedQrCodes.count);

  const deletedSms = await prisma.smsNumberAssignment.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("smsNumberAssignment:", deletedSms.count);

  // OrganizationAdmin 먼저 삭제 (User FK 때문)
  const adminUserIds: string[] = [];
  const admins = await prisma.organizationAdmin.findMany({ where: { organizationId: { in: orgIds } }, select: { userId: true } });
  adminUserIds.push(...admins.map((a) => a.userId));

  const deletedAdmins = await prisma.organizationAdmin.deleteMany({ where: { organizationId: { in: orgIds } } });
  console.log("organizationAdmin:", deletedAdmins.count);

  // seed 더미 기관 관리자 유저 삭제 (super admin 제외)
  if (adminUserIds.length > 0) {
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: adminUserIds }, role: "ORG_ADMIN" },
    });
    console.log("orgAdmin user:", deletedUsers.count);
  }

  // 기관 삭제
  const deletedOrgs = await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  console.log("organization:", deletedOrgs.count);

  console.log("\nDone: 더미 데이터 정리 완료");
}

main().catch(console.error).finally(() => prisma.$disconnect());

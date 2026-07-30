/**
 * 모든 기관의 SMS 문자후원 수수료를 16.5%(부가세 포함)로 일괄 설정
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SMS_FEE_PERCENT = 16.5;

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  console.log(`대상 기관: ${orgs.length}개`);

  let success = 0;
  let failed = 0;

  for (const org of orgs) {
    try {
      await prisma.organizationFee.upsert({
        where: {
          organizationId_channel: {
            organizationId: org.id,
            channel: "SMS",
          },
        },
        create: {
          organizationId: org.id,
          channel: "SMS",
          feePercent: SMS_FEE_PERCENT,
        },
        update: {
          feePercent: SMS_FEE_PERCENT,
        },
      });
      success++;
    } catch (err) {
      console.error(`실패: ${org.name}`, err);
      failed++;
    }
  }

  console.log(`완료: 성공 ${success}개, 실패 ${failed}개`);
  console.log(`SMS 수수료 ${SMS_FEE_PERCENT}% 적용 완료`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

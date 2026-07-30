/**
 * 시드/더미 SMS 후원 데이터 전체 삭제
 * providerName이 'infobank-emma'가 아닌 것(= 실제 EMMA 처리가 아닌 것)을 삭제
 * 실 운영 데이터가 없을 경우 전체 SMS Donation 삭제
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 실 EMMA 처리 건 수 확인
  const realCount = await prisma.donation.count({
    where: { channel: "SMS", providerName: "infobank-emma" },
  });
  const dummyCount = await prisma.donation.count({
    where: { channel: "SMS", NOT: { providerName: "infobank-emma" } },
  });
  console.log(`실 EMMA 처리 건: ${realCount}건`);
  console.log(`더미/시드 건: ${dummyCount}건`);

  if (dummyCount === 0) {
    console.log("삭제할 더미 SMS 후원 데이터가 없습니다.");
    return;
  }

  const deleted = await prisma.donation.deleteMany({
    where: { channel: "SMS", NOT: { providerName: "infobank-emma" } },
  });
  console.log(`삭제 완료: ${deleted.count}건`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

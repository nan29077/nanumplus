import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.organization.updateMany({
    where: { name: "세이브더온드런" },
    data: { name: "세이브더칠드런" },
  });

  console.log(`업데이트된 기관 수: ${result.count}`);

  // 확인
  const org = await prisma.organization.findFirst({
    where: { name: "세이브더칠드런" },
    select: { id: true, name: true },
  });
  console.log("수정 결과:", org);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.organization.count();
  const seeds = await prisma.organization.count({
    where: { slug: { in: ["warmhands", "bluehope", "hanultari", "brightfuture", "dawndew", "happymulti"] } },
  });
  const result = `총 기관 수: ${total}\n더미 기관(seed) 남은 수: ${seeds}\n실제 기관 수: ${total - seeds}\n`;
  console.log(result);
  writeFileSync("E:\\프로젝트\\nanumplus\\prisma\\org-result.txt", result, "utf8");
  console.log("결과를 prisma/org-result.txt 에 저장했습니다.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

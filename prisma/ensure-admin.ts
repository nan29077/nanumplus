/**
 * 최고관리자 계정이 없을 경우에만 생성합니다.
 * install-and-run.ps1 에서 빈 DB 초기화 시 호출됩니다.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("최고관리자 이미 존재:", existing.email);
    return;
  }

  const superAdmin = await prisma.user.create({
    data: {
      name: "나눔플러스 최고관리자",
      email: "admin@onjung.kr",
      passwordHash: await bcrypt.hash("admin1234", 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log("최고관리자 생성:", superAdmin.email, "/ 비밀번호: admin1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());

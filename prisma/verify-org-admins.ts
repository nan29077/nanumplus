/**
 * 기관관리자 계정 상태 점검.
 *
 * ★ 검증할 비밀번호는 환경변수로 주입한다 (평문 커밋 금지).
 *   set ADMIN_INITIAL_PASSWORD=... && npx tsx prisma/verify-org-admins.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

const EXPECTED_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD?.trim() ?? "";

async function main() {
  if (!EXPECTED_PASSWORD) {
    console.error(
      "환경변수 ADMIN_INITIAL_PASSWORD 가 없습니다.\n" +
        "  예) set ADMIN_INITIAL_PASSWORD=초기비밀번호 && npx tsx prisma/verify-org-admins.ts"
    );
    process.exit(1);
  }
  const admins = await prisma.organizationAdmin.findMany({
    include: {
      user: { select: { email: true, role: true, isActive: true, deletedAt: true, passwordHash: true } },
      organization: { select: { name: true } },
    },
  });

  let pwOk = 0;
  const bad: string[] = [];
  for (const a of admins) {
    const ok = a.user.passwordHash ? await bcrypt.compare(EXPECTED_PASSWORD, a.user.passwordHash) : false;
    if (ok) pwOk++;
    else bad.push(`${a.organization.name} :: ${a.user.email}`);
  }

  const lines = [
    `기관관리자 계정 수: ${admins.length}`,
    `초기 비밀번호(ADMIN_INITIAL_PASSWORD) 검증 통과: ${pwOk}`,
    `role=ORG_ADMIN: ${admins.filter((a) => a.user.role === "ORG_ADMIN").length}`,
    `isActive=true: ${admins.filter((a) => a.user.isActive).length}`,
    `deletedAt=null: ${admins.filter((a) => !a.user.deletedAt).length}`,
    `관리자 없는 기관: ${await prisma.organization.count({ where: { admins: { none: {} } } })}`,
    ...(bad.length ? ["", "--- 비밀번호 불일치 ---", ...bad] : []),
  ];
  writeFileSync("E:\\프로젝트\\nanumplus\\prisma\\org-admin-verify.txt", lines.join("\n"), "utf8");
  console.log("verify written");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

/**
 * 전체 기관에 대한 기관관리자(ORG_ADMIN) 로그인 계정 생성/갱신.
 *
 * - 이메일: organizations.email 이 있으면 그 값, 없으면 기존 기관관리자 계정 이메일,
 *   그것도 없으면 마이그레이션 규칙과 동일한 `{slug}@modugive.kr`
 * - 비밀번호: 전 기관 공통 "12345678" (bcrypt cost 12)
 * - upsert 로 처리해 중복 생성 없음
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const PASSWORD = "12345678";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      admins: { select: { user: { select: { email: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  const failures: string[] = [];
  const rows: string[] = [];

  for (const org of orgs) {
    const email = (
      org.email?.trim() ||
      org.admins[0]?.user.email ||
      `${org.slug}@modugive.kr`
    ).toLowerCase();

    try {
      const existing = await prisma.user.findUnique({ where: { email } });

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: org.name,
          passwordHash,
          role: "ORG_ADMIN",
          isActive: true,
          deletedAt: null,
        },
        create: {
          email,
          name: org.name,
          passwordHash,
          role: "ORG_ADMIN",
          isActive: true,
        },
      });

      // 기관 ↔ 계정 연결 (userId 가 unique 이므로 userId 기준 upsert)
      await prisma.organizationAdmin.upsert({
        where: { userId: user.id },
        update: { organizationId: org.id },
        create: { userId: user.id, organizationId: org.id },
      });

      if (existing) updated++;
      else created++;
      rows.push(`${org.name}\t${org.slug}\t${email}`);
    } catch (e) {
      failures.push(`${org.name} (${org.slug}): ${(e as Error).message}`);
    }
  }

  const summary = [
    `대상 기관 수: ${orgs.length}`,
    `신규 생성: ${created}`,
    `기존 갱신(upsert): ${updated}`,
    `실패: ${failures.length}`,
    `비밀번호: ${PASSWORD} (bcrypt cost 12)`,
    ...(failures.length ? ["", "--- 실패 ---", ...failures] : []),
    "",
    "--- 기관명\tslug\t로그인 이메일 ---",
    ...rows,
  ].join("\n");

  writeFileSync("E:\\프로젝트\\nanumplus\\prisma\\org-admin-accounts.txt", summary, "utf8");
  console.log(`done: created=${created} updated=${updated} failed=${failures.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

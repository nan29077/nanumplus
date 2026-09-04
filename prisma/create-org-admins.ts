/**
 * 전체 기관에 대한 기관관리자(ORG_ADMIN) 로그인 계정 생성/갱신.
 *
 * - 이메일: organizations.email 이 있으면 그 값, 없으면 기존 기관관리자 계정 이메일,
 *   그것도 없으면 마이그레이션 규칙과 동일한 `{slug}@modugive.kr`
 * - 비밀번호: 환경변수 ADMIN_INITIAL_PASSWORD 값 (bcrypt cost 12)
 *   ※ 저장소에 평문 비밀번호를 두지 않는다. 실행할 때만 주입한다.
 *      Windows:  set ADMIN_INITIAL_PASSWORD=... && npx tsx prisma/create-org-admins.ts
 *      bash:     ADMIN_INITIAL_PASSWORD=... npx tsx prisma/create-org-admins.ts
 * - 생성된 계정은 passwordChangeRequired=true 로 표시되어
 *   첫 로그인 후 비밀번호를 반드시 변경해야 한다.
 * - upsert 로 처리해 중복 생성 없음
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

/** 초기 비밀번호는 환경변수로만 받는다 (평문 커밋 금지) */
function initialPassword(): string {
  const pw = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  if (!pw || pw.length < 8) {
    throw new Error(
      "환경변수 ADMIN_INITIAL_PASSWORD 가 없거나 8자 미만입니다.\n" +
        "  예) set ADMIN_INITIAL_PASSWORD=원하는비밀번호 && npx tsx prisma/create-org-admins.ts"
    );
  }
  return pw;
}

async function main() {
  const passwordHash = await bcrypt.hash(initialPassword(), 12);

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
          // 일괄 발급된 초기 비밀번호 → 첫 로그인 시 변경 강제 + 기존 토큰 무효화
          passwordChangeRequired: true,
          tokenVersion: { increment: 1 },
        },
        create: {
          email,
          name: org.name,
          passwordHash,
          role: "ORG_ADMIN",
          isActive: true,
          passwordChangeRequired: true,
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
    // 평문 비밀번호는 파일로도 남기지 않는다. 실행자가 주입한 값을 별도 경로로 전달할 것.
    `비밀번호: 환경변수 ADMIN_INITIAL_PASSWORD 값 (bcrypt cost 12, 첫 로그인 시 변경 강제)`,
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

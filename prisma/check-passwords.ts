/**
 * 기관관리자 계정의 비밀번호가 '일괄 기본값'인지 점검한다.
 * 비밀번호는 bcrypt 해시라 값 자체는 못 읽지만, 후보 비밀번호로 대조는 가능하다.
 *
 * ★ 후보 비밀번호를 코드에 적어두지 않는다. 환경변수로 주입한다.
 *   PASSWORD_CANDIDATES="후보1,후보2,후보3" npx tsx prisma/check-passwords.ts
 *   (Windows) set PASSWORD_CANDIDATES=후보1,후보2 && npx tsx prisma/check-passwords.ts
 *
 * 실행: npx tsx prisma/check-passwords.ts
 * 결과: 콘솔 출력 + prisma/password-check.txt 저장 (후보 평문은 파일에 남기지 않음)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

// 확인할 후보 비밀번호 — 환경변수로만 받는다 (평문 커밋 금지)
const CANDIDATES = (process.env.PASSWORD_CANDIDATES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (CANDIDATES.length === 0) {
  console.error(
    "환경변수 PASSWORD_CANDIDATES 가 비어 있습니다.\n" +
      '  예) set PASSWORD_CANDIDATES=후보1,후보2 && npx tsx prisma/check-passwords.ts'
  );
  process.exit(1);
}

/** 결과 파일/로그에 평문을 남기지 않기 위한 표기 */
const label = (i: number) => `후보#${i + 1}`;

async function main() {
  const admins = await prisma.organizationAdmin.findMany({
    include: {
      user: { select: { email: true, isActive: true, deletedAt: true, passwordHash: true } },
      organization: { select: { name: true, slug: true } },
    },
    orderBy: { organization: { name: "asc" } },
  });

  const buckets: Record<string, string[]> = {};
  for (const c of CANDIDATES) buckets[c] = [];
  const changed: string[] = []; // 어느 후보와도 불일치 = 직접 변경(또는 기타)
  const noHash: string[] = [];

  for (const a of admins) {
    const label = `${a.organization.name}  (${a.user.email})`;
    if (!a.user.passwordHash) { noHash.push(label); continue; }
    let matched: string | null = null;
    for (const c of CANDIDATES) {
      if (await bcrypt.compare(c, a.user.passwordHash)) { matched = c; break; }
    }
    if (matched) buckets[matched].push(label);
    else changed.push(label);
  }

  const lines: string[] = [];
  lines.push(`기관관리자 계정 수: ${admins.length}`);
  lines.push("");
  CANDIDATES.forEach((c, i) => {
    lines.push(`■ ${label(i)} 그대로 사용 중 (미변경): ${buckets[c].length}곳`);
    for (const l of buckets[c]) lines.push(`   - ${l}`);
    lines.push("");
  });
  lines.push(`■ 직접 변경함 (후보와 불일치): ${changed.length}곳`);
  for (const l of changed) lines.push(`   - ${l}`);
  if (noHash.length) {
    lines.push("");
    lines.push(`■ 비밀번호 미설정: ${noHash.length}곳`);
    for (const l of noHash) lines.push(`   - ${l}`);
  }

  const out = lines.join("\n");
  console.log(out);
  writeFileSync("prisma/password-check.txt", out, "utf8");
  console.log("\n→ prisma/password-check.txt 에도 저장했습니다.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

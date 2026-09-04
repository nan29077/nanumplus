/**
 * 최고관리자 계정이 없을 경우에만 생성합니다.
 * install-and-run.ps1 에서 빈 DB 초기화 시 호출됩니다.
 *
 * ★ 비밀번호는 저장소에 두지 않습니다. 환경변수 ADMIN_INITIAL_PASSWORD 로 주입하세요.
 *   미설정 시 임의의 1회용 비밀번호를 생성해 콘솔에 1번만 출력합니다.
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function initialPassword(): { password: string; generated: boolean } {
  const pw = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  if (pw && pw.length >= 8) return { password: pw, generated: false };
  // 평문 상수를 코드에 두지 않기 위해 임의 생성 후 1회 출력
  return { password: randomBytes(12).toString("base64url"), generated: true };
}

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("최고관리자 이미 존재:", existing.email);
    return;
  }

  const { password, generated } = initialPassword();
  const superAdmin = await prisma.user.create({
    data: {
      name: "나눔플러스 최고관리자",
      email: "admin@onjung.kr",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
      passwordChangeRequired: true,
    },
  });

  console.log("최고관리자 생성:", superAdmin.email);
  if (generated) {
    console.log("─────────────────────────────────────────────");
    console.log("1회용 초기 비밀번호(지금 저장하세요):", password);
    console.log("이 값은 다시 출력되지 않습니다. 로그인 후 즉시 변경하세요.");
    console.log("─────────────────────────────────────────────");
  } else {
    console.log("비밀번호: 환경변수 ADMIN_INITIAL_PASSWORD 값");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

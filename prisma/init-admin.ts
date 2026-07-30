/**
 * 테스트 관리자 계정 초기화 · 복구 스크립트
 *
 * 실행:  npm run db:init-admin
 *
 * 아래 두 계정을 항상 "로그인 가능한 상태"로 만들어 줍니다. (여러 번 실행해도 안전)
 *   - 최고관리자(SUPER_ADMIN) : admin@onjung.kr    / admin1234
 *   - 기관관리자(ORG_ADMIN)   : manager1@onjung.kr / org1234
 *
 * 하는 일
 *   1) 계정이 없으면 생성, 있으면 비밀번호를 다시 설정
 *   2) isActive = true, deletedAt = null 로 복구 (비활성/삭제된 계정은 로그인 불가)
 *   3) role 을 올바른 값으로 교정
 *   4) 기관관리자는 소속 기관(Organization)과 OrganizationAdmin 매핑을 보장
 *      → 소속 기관이 없으면 /org/dashboard 진입이 막혀 로그인이 실패한 것처럼 보입니다
 *   5) 현재 DB에 존재하는 모든 최고관리자 계정 목록을 출력
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPER_ADMIN = {
  email: "admin@onjung.kr",
  password: "admin1234",
  name: "나눔플러스 최고관리자",
};

const ORG_ADMIN = {
  email: "manager1@onjung.kr",
  password: "org1234",
  name: "김복지",
};

/** 기관관리자가 붙을 기본 기관 (없으면 생성) */
const DEFAULT_ORG = {
  slug: "warmhands",
  name: "따뜻한손길복지재단",
  description: "결식이웃과 위기가정에 따뜻한 한 끼와 생활을 지원합니다.",
  address: "서울특별시 종로구 자선로 12",
  phone: "02-123-4567",
  email: "hello@warmhands.kr",
  bankName: "국민은행",
  bankAccount: "123-456-789012",
  bankHolder: "따뜻한손길복지재단",
};

async function main() {
  console.log("🔑 테스트 관리자 계정 초기화 시작...\n");

  // ─────────────── 1. 최고관리자 ───────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN.email },
    update: {
      // 로그인 불가 원인(잘못된 비밀번호 / 비활성 / 소프트삭제 / 잘못된 권한)을 모두 복구
      passwordHash: await bcrypt.hash(SUPER_ADMIN.password, 10),
      role: "SUPER_ADMIN",
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: SUPER_ADMIN.email,
      name: SUPER_ADMIN.name,
      passwordHash: await bcrypt.hash(SUPER_ADMIN.password, 10),
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ 최고관리자 : ${superAdmin.email} / ${SUPER_ADMIN.password}`);

  // ─────────────── 2. 기관관리자가 소속될 기관 ───────────────
  const org = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG.slug },
    update: {},
    create: {
      name: DEFAULT_ORG.name,
      slug: DEFAULT_ORG.slug,
      description: DEFAULT_ORG.description,
      address: DEFAULT_ORG.address,
      phone: DEFAULT_ORG.phone,
      email: DEFAULT_ORG.email,
      bankName: DEFAULT_ORG.bankName,
      bankAccount: DEFAULT_ORG.bankAccount,
      bankHolder: DEFAULT_ORG.bankHolder,
    },
  });

  // ─────────────── 3. 기관관리자 ───────────────
  const orgAdmin = await prisma.user.upsert({
    where: { email: ORG_ADMIN.email },
    update: {
      passwordHash: await bcrypt.hash(ORG_ADMIN.password, 10),
      role: "ORG_ADMIN",
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: ORG_ADMIN.email,
      name: ORG_ADMIN.name,
      passwordHash: await bcrypt.hash(ORG_ADMIN.password, 10),
      role: "ORG_ADMIN",
      isActive: true,
    },
  });

  // 소속 기관 매핑 보장 — 없으면 로그인 후 대시보드 진입이 막힙니다
  await prisma.organizationAdmin.upsert({
    where: { userId: orgAdmin.id },
    update: { organizationId: org.id },
    create: { userId: orgAdmin.id, organizationId: org.id },
  });
  console.log(`✅ 기관관리자 : ${orgAdmin.email} / ${ORG_ADMIN.password}  (소속: ${org.name})`);

  // ─────────────── 4. 현재 최고관리자 목록 출력 ───────────────
  const supers = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { email: true, name: true, isActive: true, deletedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`현재 DB의 최고관리자 계정 (${supers.length}개)`);
  console.log("═══════════════════════════════════════════════════");
  for (const u of supers) {
    const state = u.deletedAt ? "삭제됨" : u.isActive ? "활성" : "비활성";
    console.log(`  · ${u.email}  (${u.name}) — ${state}`);
  }
  console.log("═══════════════════════════════════════════════════");
  console.log("로그인 주소 : http://localhost:3005/login");
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("\n❌ 실패:", e instanceof Error ? e.message : e);
    console.error(
      "\n💡 'Can't reach database server' 오류라면 PostgreSQL이 실행 중인지 먼저 확인하세요.\n" +
        "   .env 의 DATABASE_URL 을 확인한 뒤 `npx prisma db push` 로 스키마를 반영하세요."
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- ─────────────────────────────────────────────────────────────────────────────
-- 실서버 스키마 동기화 스크립트 (2026-09-04) — 인증 강화
--
-- 배경(보안 점검 지적사항)
--   1) JWT 무효화 수단이 없었다. 비밀번호를 바꾸거나 로그아웃해도
--      이미 발급된 토큰은 만료(8시간)까지 그대로 사용할 수 있었다.
--   2) 전 기관 관리자 계정이 공통 초기 비밀번호로 생성되어 있는데,
--      변경을 강제할 플래그가 없었다.
--
-- 추가 컬럼
--   User.tokenVersion            INT     NOT NULL DEFAULT 0
--       → 로그아웃 / 비밀번호 변경 / 비밀번호 초기화 시 +1.
--         JWT 안의 tv 클레임과 값이 다르면 서버가 세션을 무효 처리한다.
--   User.passwordChangeRequired  BOOLEAN NOT NULL DEFAULT false
--       → true 면 로그인 후 /org/settings 비밀번호 변경 화면으로 강제 이동.
--
-- 주의: `npm run db:push` 는 Prisma 스키마에 없는 em_* (EMMA) 테이블을 모두
--       삭제하므로 실서버에서 절대 사용하지 말 것. (2026-08-26 장애 원인)
--       이 스크립트는 순수 증분(additive) DDL 만 포함하며 여러 번 실행해도
--       안전(idempotent)하다. em_* 테이블은 건드리지 않는다.
--
-- 실행 방법 (실서버에서, DATABASE_URL 설정된 상태):
--   npx prisma db execute --file prisma/sync-prod-20260904-auth-hardening.sql --schema prisma/schema.prisma
--   (psql 사용 시: sudo -u postgres psql -d donation_platform -f prisma/sync-prod-20260904-auth-hardening.sql)
--
-- 실행 후: 앱 재시작 (sudo systemctl restart nanumplus) — Prisma 클라이언트 재생성 필요
--
-- ★ 안전 설계: 기본값이 0 / false 이므로, 적용만으로는 기존 세션이 끊기거나
--   비밀번호 변경이 강제되지 않는다. 아래 3번 블록은 주석 처리되어 있다.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. JWT 무효화용 버전 카운터 ────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "User"."tokenVersion" IS 'JWT 무효화 카운터 — 로그아웃/비밀번호 변경 시 +1';

-- 2. 초기 비밀번호 강제 변경 플래그 ──────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "User"."passwordChangeRequired" IS '초기 비밀번호 상태 — true 면 로그인 후 비밀번호 변경 강제';

-- 3. (선택) 공통 초기 비밀번호를 쓰는 기관관리자에게 변경 강제 걸기 ──────────
--    비밀번호는 bcrypt 해시라 SQL 로 판별할 수 없다.
--    `npx tsx prisma/check-passwords.ts` 로 미변경 계정을 확인한 뒤,
--    아래 문장의 주석을 풀고 실행하면 전체 기관관리자에게 변경을 강제한다.
--    (실행 즉시 해당 계정들은 로그인 후 비밀번호 변경 화면으로 이동한다.)
--
-- UPDATE "User"
--    SET "passwordChangeRequired" = true
--  WHERE "role" = 'ORG_ADMIN'
--    AND "deletedAt" IS NULL;

-- 4. (선택) 기존에 발급된 모든 JWT 를 즉시 무효화하려면 ──────────────────────
--    (전 관리자 강제 재로그인. 운영 중 실행하면 모두 로그아웃된다.)
--
-- UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;

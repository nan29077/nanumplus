-- ─────────────────────────────────────────────────────────────────────────────
-- 실서버 스키마 동기화 스크립트 (2026-09-03) — 기관별 MT(감사문자) 스위치
--
-- 배경: 감사 문자 발송을 기관 단위로 켜고 끌 수단이 없어, 전역 env 를 켜는 순간
--       173개 기관 전체에 동시에 문자가 나가는 구조였다.
--       최고관리자가 화면에서 기관별로 제어할 수 있도록 스키마를 확장한다.
--
-- 주의: `npm run db:push` 는 Prisma 스키마에 없는 em_* (EMMA) 테이블을 모두
--       삭제하므로 실서버에서 절대 사용하지 말 것. (2026-08-26 장애 원인)
--       이 스크립트는 순수 증분(additive) DDL 만 포함하며 여러 번 실행해도
--       안전(idempotent)하다. em_* 테이블은 건드리지 않는다.
--
-- 실행 방법 (실서버에서, DATABASE_URL 설정된 상태):
--   npm run db:sync-prod-mt
--   또는: npx prisma db execute --file prisma/sync-prod-20260903-mt-switch.sql --schema prisma/schema.prisma
--   (psql 사용 시: sudo -u postgres psql -d donation_platform -f prisma/sync-prod-20260903-mt-switch.sql)
--
-- 실행 후: 앱 재시작 (sudo systemctl restart nanumplus) — Prisma 클라이언트 재생성 필요
--
-- ★ 안전 설계: smsMtEnabled 기본값은 false 다. 이 스크립트를 적용해도
--   기존 173개 기관은 전부 '꺼짐' 상태이며, 발송은 시작되지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Organization — 기관별 MT 스위치 / 발신번호 ────────────────────────────────

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "smsMtEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "mtSenderNumber" TEXT;

COMMENT ON COLUMN "Organization"."smsMtEnabled"   IS '감사 문자(MT) 발송 여부 — 전역 마스터와 AND 로 판단';
COMMENT ON COLUMN "Organization"."mtSenderNumber" IS '기관 MT 발신번호 — 미설정이면 발송하지 않는다(인포뱅크 사전등록 필요)';

-- 2. PlatformSetting — 전역 설정 (key-value) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "key"         TEXT NOT NULL,
    "value"       TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

COMMENT ON TABLE "PlatformSetting" IS '플랫폼 전역 설정 — 재배포 없이 최고관리자가 변경하는 값';

-- 3. 초기값 — 전역 마스터는 OFF 로 시작 ────────────────────────────────────────
--    (이미 값이 있으면 덮어쓰지 않는다)

INSERT INTO "PlatformSetting" ("key", "value")
VALUES ('sms.mt.enabled', 'false')
ON CONFLICT ("key") DO NOTHING;

-- 발신번호는 기관별로만 설정한다(공용 폴백 없음). 전역 기본값 키는 두지 않는다.

-- 4. 확인용 ───────────────────────────────────────────────────────────────────
-- SELECT "key", "value" FROM "PlatformSetting" ORDER BY "key";
-- SELECT count(*) FILTER (WHERE "smsMtEnabled") AS 켜진기관, count(*) AS 전체
--   FROM "Organization" WHERE "deletedAt" IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 실서버 스키마 동기화 스크립트 (2026-08-26)
--
-- 배경: 커밋 382718e(후원솔루션 고도화)와 c2866e7(채널별 정산주기)에서
--       Prisma 스키마가 변경되었으나 실서버 DB에는 반영되지 않아,
--       Donor/Donation 조회 시 "column does not exist" (P2022) 오류로
--       기관관리자 전체 메뉴와 최고관리자 후원자 메뉴가 깨지는 문제 발생.
--
-- 주의: `npm run db:push`는 Prisma 스키마에 없는 em_* (EMMA) 테이블을 모두
--       삭제하므로 실서버에서 절대 사용하지 말 것. (README.md 참고)
--       이 스크립트는 순수 증분(additive) DDL만 포함하며 여러 번 실행해도
--       안전(idempotent)하다. em_* 테이블은 건드리지 않는다.
--
-- 실행 방법 (실서버에서, DATABASE_URL 설정된 상태):
--   npm run db:sync-prod
--   또는: npx prisma db execute --file prisma/sync-prod-20260826.sql --schema prisma/schema.prisma
--   (psql 사용 시: psql "$DATABASE_URL" -f prisma/sync-prod-20260826.sql)
--
-- 실행 후: pm2 restart 등으로 앱 재시작 (Prisma 커넥션 캐시 초기화)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enum 추가/확장 ───────────────────────────────────────────────────────────

ALTER TYPE "DonationChannel" ADD VALUE IF NOT EXISTS 'RECURRING_CARD';

DO $$ BEGIN
  CREATE TYPE "RecurringMethod" AS ENUM ('TRANSFER', 'CARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SettlementRuleType" AS ENUM ('DAYS', 'MONTHS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. 신규 테이블 ──────────────────────────────────────────────────────────────

-- 후원자 계정 (플랫폼 통합)
CREATE TABLE IF NOT EXISTS "DonorAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "profileImage" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DonorAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DonorAccount_provider_providerId_key" ON "DonorAccount"("provider", "providerId");
CREATE INDEX IF NOT EXISTS "DonorAccount_email_idx" ON "DonorAccount"("email");
CREATE INDEX IF NOT EXISTS "DonorAccount_phone_idx" ON "DonorAccount"("phone");

-- 후원페이지 빌더 설정
CREATE TABLE IF NOT EXISTS "DonationPage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "themeColor" TEXT NOT NULL DEFAULT '#2f8f5b',
    "heroImageUrl" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "introTitle" TEXT,
    "introBody" TEXT,
    "blocks" TEXT,
    "suggestedAmounts" TEXT,
    "enabledChannels" TEXT,
    "thankYouTitle" TEXT,
    "thankYouMessage" TEXT,
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    "showCampaigns" BOOLEAN NOT NULL DEFAULT true,
    "showFaq" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DonationPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DonationPage_organizationId_key" ON "DonationPage"("organizationId");

-- 카드 빌링키 (정기후원)
CREATE TABLE IF NOT EXISTS "BillingKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "donorAccountId" TEXT,
    "donorId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'hecto',
    "billingKeyRef" TEXT NOT NULL,
    "cardIssuer" TEXT,
    "cardLast4" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingKey_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BillingKey_organizationId_idx" ON "BillingKey"("organizationId");
CREATE INDEX IF NOT EXISTS "BillingKey_donorAccountId_idx" ON "BillingKey"("donorAccountId");
CREATE INDEX IF NOT EXISTS "BillingKey_donorId_idx" ON "BillingKey"("donorId");

-- 정산주기 규칙 (채널별, 플랫폼 전역)
CREATE TABLE IF NOT EXISTS "SettlementRule" (
    "id" TEXT NOT NULL,
    "channel" "DonationChannel" NOT NULL,
    "ruleType" "SettlementRuleType" NOT NULL DEFAULT 'MONTHS',
    "offsetValue" INTEGER NOT NULL DEFAULT 1,
    "anchorDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SettlementRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SettlementRule_channel_key" ON "SettlementRule"("channel");

-- 3. 기존 테이블 컬럼 추가 ────────────────────────────────────────────────────
-- (P2022 오류의 직접 원인: 이 컬럼들이 실서버에 없음)

ALTER TABLE "Donor" ADD COLUMN IF NOT EXISTS "donorAccountId" TEXT;
CREATE INDEX IF NOT EXISTS "Donor_donorAccountId_idx" ON "Donor"("donorAccountId");

ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "donorAccountId" TEXT;
CREATE INDEX IF NOT EXISTS "Donation_donorAccountId_idx" ON "Donation"("donorAccountId");

ALTER TABLE "RecurringDonation" ADD COLUMN IF NOT EXISTS "method" "RecurringMethod" NOT NULL DEFAULT 'TRANSFER';
ALTER TABLE "RecurringDonation" ADD COLUMN IF NOT EXISTS "billingKeyId" TEXT;
ALTER TABLE "RecurringDonation" ADD COLUMN IF NOT EXISTS "donorAccountId" TEXT;
CREATE INDEX IF NOT EXISTS "RecurringDonation_donorAccountId_idx" ON "RecurringDonation"("donorAccountId");

-- 4. 외래키 ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Donor" ADD CONSTRAINT "Donor_donorAccountId_fkey"
    FOREIGN KEY ("donorAccountId") REFERENCES "DonorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorAccountId_fkey"
    FOREIGN KEY ("donorAccountId") REFERENCES "DonorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecurringDonation" ADD CONSTRAINT "RecurringDonation_donorAccountId_fkey"
    FOREIGN KEY ("donorAccountId") REFERENCES "DonorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecurringDonation" ADD CONSTRAINT "RecurringDonation_billingKeyId_fkey"
    FOREIGN KEY ("billingKeyId") REFERENCES "BillingKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DonationPage" ADD CONSTRAINT "DonationPage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingKey" ADD CONSTRAINT "BillingKey_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingKey" ADD CONSTRAINT "BillingKey_donorAccountId_fkey"
    FOREIGN KEY ("donorAccountId") REFERENCES "DonorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingKey" ADD CONSTRAINT "BillingKey_donorId_fkey"
    FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Settlement 유니크 제약 변경 (organizationId+period → organizationId+scheduledDate)
-- 주의: (organizationId, scheduledDate) 중복 데이터가 있으면 이 단계가 실패한다.
--       실패 시 아래 쿼리로 중복을 확인·정리 후 재실행:
--       SELECT "organizationId", "scheduledDate", count(*)
--         FROM "Settlement" GROUP BY 1, 2 HAVING count(*) > 1;

ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_organizationId_period_key";
DROP INDEX IF EXISTS "Settlement_organizationId_period_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Settlement_organizationId_scheduledDate_key" ON "Settlement"("organizationId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "Settlement_organizationId_period_idx" ON "Settlement"("organizationId", "period");

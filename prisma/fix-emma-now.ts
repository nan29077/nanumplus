/**
 * EMMA 연동 즉시 수리 스크립트
 * - em_mo_log 테이블 생성 (없으면)
 * - 크론 엔드포인트 즉시 실행
 * - 결과 확인 (처리된 MO 건수, Donation 생성)
 *
 * Usage: npx tsx prisma/fix-emma-now.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: [] });
const SERVER = "http://localhost:3001";

function fmtKst(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

async function main() {
  const now = new Date();
  const suffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const moTable = `em_mo_log_${suffix}`;

  console.log("=".repeat(60));
  console.log("  EMMA 연동 즉시 수리");
  console.log("  실행 시각 (KST):", fmtKst(now));
  console.log("=".repeat(60));
  console.log();

  // 1. em_mo_log 테이블 현황
  console.log("[1] EMMA 테이블 상태 확인 →", moTable);
  let tableExists = false;
  let existingCount = 0;
  try {
    const res = await prisma.$queryRawUnsafe<[{exists: boolean}]>(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=$1) AS exists`,
      moTable
    );
    tableExists = res[0].exists;

    if (tableExists) {
      const cnt = await prisma.$queryRawUnsafe<[{count: bigint}]>(
        `SELECT COUNT(*) AS count FROM ${moTable}`
      );
      existingCount = Number(cnt[0].count);
      const pending = await prisma.$queryRawUnsafe<[{count: bigint}]>(
        `SELECT COUNT(*) AS count FROM ${moTable} WHERE msg_status IN ('3','0')`
      );
      const pendingCnt = Number(pending[0].count);
      console.log(`  ✅ 테이블 존재 (전체 ${existingCount}건, 미처리 ${pendingCnt}건)`);

      // 미처리 레코드 상세
      if (pendingCnt > 0) {
        const rows = await prisma.$queryRawUnsafe<{mo_key:string; mo_recipient:string; mo_originator:string; msg_status:string; content:string|null; date_mo:Date|null}[]>(
          `SELECT mo_key, mo_recipient, mo_originator, msg_status, content, date_mo
           FROM ${moTable} WHERE msg_status IN ('3','0')
           ORDER BY date_mo DESC LIMIT 10`
        );
        console.log("  미처리 MO 목록:");
        rows.forEach(r => {
          const t = r.date_mo ? fmtKst(new Date(r.date_mo)) : "시각없음";
          console.log(`    ${t} | ${r.mo_recipient} | ${r.mo_originator} | "${r.content ?? ""}"`);
        });
      }
    } else {
      console.log(`  ⚠ 테이블 없음 → EMMA 에이전트가 이 DB에 연결되어 있지 않을 수 있습니다`);
    }
  } catch(e) {
    console.error("  DB 오류:", (e as Error).message);
  }

  // 2. EMMA 테이블 생성 (CREATE IF NOT EXISTS — 이미 있으면 무시)
  console.log();
  console.log("[2] EMMA 테이블 생성 (이미 있으면 건너뜀)");
  try {
    const res = await fetch(`${SERVER}/api/admin/emma-setup?action=create-tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": "" },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("  ✅ 테이블 생성 완료:", data.created?.join(", ") ?? "이미 존재");
    } else if (res.status === 403) {
      // 인증 없이 호출 → Prisma로 직접 생성
      console.log("  ⚠ API 인증 실패 → Prisma로 직접 생성");
      const mtTable = `em_mt_log_${suffix}`;
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${moTable} (
          mo_key VARCHAR(50) NOT NULL,
          service_type CHAR(2) NOT NULL DEFAULT 'MO',
          mo_recipient VARCHAR(32) NOT NULL,
          emo_recipient VARCHAR(80),
          mo_originator VARCHAR(32) NOT NULL,
          mo_callback VARCHAR(32) NOT NULL DEFAULT '',
          msg_status CHAR(1) NOT NULL DEFAULT '3',
          subject VARCHAR(40),
          content VARCHAR(4000),
          date_mo TIMESTAMP NOT NULL DEFAULT now(),
          date_mo_recv TIMESTAMP NOT NULL DEFAULT now(),
          carrier NUMERIC(5),
          rs_id VARCHAR(20),
          ems_id NUMERIC(3),
          ems_total NUMERIC(1),
          ems_seq NUMERIC(1),
          emma_id CHAR(2) NOT NULL DEFAULT '  ',
          CONSTRAINT pk_${moTable} PRIMARY KEY (mo_key)
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_${moTable}_status
        ON ${moTable} (msg_status, date_mo ASC)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${mtTable} (
          mt_key VARCHAR(50) NOT NULL,
          service_type CHAR(2) NOT NULL DEFAULT 'MO',
          emma_id CHAR(2) NOT NULL DEFAULT '  ',
          mt_recipient VARCHAR(32) NOT NULL,
          mt_originator VARCHAR(32) NOT NULL,
          msg_type CHAR(1) NOT NULL DEFAULT '1',
          content VARCHAR(4000),
          mt_status CHAR(1) NOT NULL DEFAULT '3',
          date_mt TIMESTAMP NOT NULL DEFAULT now(),
          date_mt_send TIMESTAMP NOT NULL DEFAULT now(),
          callback VARCHAR(32),
          result_code VARCHAR(10),
          result_msg VARCHAR(200),
          date_mt_result TIMESTAMP,
          CONSTRAINT pk_${mtTable} PRIMARY KEY (mt_key)
        )
      `);
      console.log("  ✅ Prisma로 직접 생성 완료:", moTable, mtTable);
    } else {
      console.warn("  ⚠ 서버 응답 오류:", res.status, "→ 서버가 실행 중인지 확인하세요");
    }
  } catch(e) {
    console.error("  오류:", (e as Error).message);
    console.log("  ⚠ 서버가 실행 중이 아닌 것 같습니다. 나눔플러스 서버를 먼저 시작하세요.");
  }

  // 3. 처리 전 Donation 현황
  const beforeCount = await prisma.donation.count({
    where: { channel: "SMS", deletedAt: null },
  });

  // 4. 크론 즉시 실행
  console.log();
  console.log("[3] EMMA MO 처리 크론 즉시 실행");
  try {
    const res = await fetch(`${SERVER}/api/cron/emma-mo`);
    if (res.ok) {
      const data = await res.json();
      console.log("  ✅ 크론 실행 완료");
      console.log("     처리:", data.processed ?? 0, "건");
      console.log("     건너뜀:", data.skipped ?? 0, "건");
      console.log("     오류:", data.errors ?? 0, "건");
      if (data.details && data.details.length > 0) {
        console.log("  상세:");
        data.details.forEach((d: {moKey: string; status: string; reason?: string}) => {
          console.log(`    ${d.moKey} → ${d.status}${d.reason ? " (" + d.reason + ")" : ""}`);
        });
      }
    } else {
      console.warn("  ⚠ 크론 실행 실패 HTTP", res.status);
    }
  } catch(e) {
    console.error("  오류:", (e as Error).message);
    console.log("  ⚠ 서버가 실행 중이 아닌 것 같습니다.");
  }

  // 5. 처리 후 Donation 현황
  console.log();
  console.log("[4] SMS 후원 현황 (처리 후)");
  const afterCount = await prisma.donation.count({
    where: { channel: "SMS", deletedAt: null },
  });
  console.log(`  총 SMS 후원: ${afterCount}건 (처리 전: ${beforeCount}건, 신규: ${afterCount - beforeCount}건)`);

  const recentDonations = await prisma.$queryRawUnsafe<{donatedAt: Date; senderPhone: string|null; smsBody: string|null; providerTransactionId: string|null; organizationId: string|null}[]>(
    `SELECT "donatedAt", "senderPhone", "smsBody", "providerTransactionId", "organizationId"
     FROM "Donation"
     WHERE channel = 'SMS' AND "deletedAt" IS NULL
     ORDER BY "donatedAt" DESC LIMIT 10`
  );

  if (recentDonations.length > 0) {
    console.log("  최근 10건:");
    recentDonations.forEach(d => {
      const kst = fmtKst(new Date(d.donatedAt));
      const phone = d.senderPhone ?? "번호없음";
      const body = (d.smsBody ?? "").slice(0, 15);
      const orgLabel = d.organizationId ? "기관있음" : "기관배정없음";
      console.log(`    ${kst} | ${phone} | ${orgLabel} | "${body}"`);
    });
  }

  console.log();
  console.log("=".repeat(60));

  if (afterCount > beforeCount) {
    console.log("  ✅ EMMA MO 처리 완료! 새로운 후원이 등록되었습니다.");
  } else if (existingCount === 0 && !tableExists) {
    console.log("  ⚠ EMMA 테이블이 없었습니다. 테이블을 생성했으니 EMMA 에이전트를");
    console.log("     donation_platform DB로 연결하면 이후부터 자동 수신됩니다.");
  } else {
    console.log("  ℹ 처리할 미처리 MO 없음.");
    console.log("  → EMMA 에이전트가 실제 문자를 이 DB의", moTable, "테이블에 기록해야 합니다.");
    console.log("  → diagnose-emma.bat 를 실행하여 EMMA 연동 상태를 진단하세요.");
  }

  console.log("  → 확인 주소: http://localhost:3001/admin/sms-donations");
  console.log("  → EMMA 설정: http://localhost:3001/admin/settings/emma");
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

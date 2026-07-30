/**
 * EMMA 연동 진단 스크립트
 * Usage: npx tsx prisma/diagnose-emma.ts
 *
 * - em_mo_log_202506 테이블 존재 여부
 * - ALL 레코드 조회 (msg_status 무관)
 * - msg_status 분포
 * - 최근 SMS Donation 내역
 * - 오후 9시 22분 KST (12:22 UTC) 전후 레코드 조회
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: [],
});

function fmtKst(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("  EMMA 연동 진단");
  console.log("  실행 시각 (KST):", fmtKst(new Date()));
  console.log("=".repeat(60));

  // 1. em_mo_log 테이블 목록
  console.log("\n[1] donation_platform DB의 em_ 테이블 목록");
  try {
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema='public' AND table_name LIKE 'em_%' 
       ORDER BY table_name`
    );
    if (tables.length === 0) {
      console.log("  ❌ em_ 테이블 없음 → EMMA가 이 DB를 사용하지 않거나 아직 미설치");
    } else {
      console.log("  ✅ 발견된 em_ 테이블:");
      tables.forEach((t) => console.log(`     - ${t.table_name}`));
    }

    // 2. em_mo_log_202506 상세 조회
    const suffix = "202506";
    const tableName = `em_mo_log_${suffix}`;
    const exists = tables.some((t) => t.table_name === tableName);

    console.log(`\n[2] ${tableName} 상세 조회`);
    if (!exists) {
      console.log(`  ❌ ${tableName} 없음`);
      console.log("  → EMMA 에이전트가 donation_platform DB에 연결되지 않았습니다.");
      console.log("  → EMMA 에이전트 설정에서 DB 연결을 donation_platform으로 바꾸세요.");
    } else {
      // ALL 레코드 (msg_status 무관)
      const allRows = await prisma.$queryRawUnsafe<{
        mo_key: string;
        mo_recipient: string;
        mo_originator: string;
        msg_status: string;
        content: string | null;
        date_mo: Date | null;
        date_mo_recv: Date | null;
        emma_id: string | null;
      }[]>(
        `SELECT mo_key, mo_recipient, mo_originator, msg_status, content,
                date_mo, date_mo_recv, emma_id
         FROM ${tableName}
         ORDER BY date_mo DESC NULLS LAST
         LIMIT 50`
      );

      console.log(`  총 레코드 수 (최대 50): ${allRows.length}`);

      if (allRows.length === 0) {
        console.log("  → EMMA 테이블은 존재하지만 MO 수신 기록이 없습니다.");
      } else {
        // msg_status 분포
        const statusMap: Record<string, number> = {};
        allRows.forEach((r) => {
          statusMap[r.msg_status] = (statusMap[r.msg_status] ?? 0) + 1;
        });
        console.log("  msg_status 분포:");
        Object.entries(statusMap).forEach(([s, c]) => {
          const label =
            s === "0" ? "(신규? or 완료?)"
            : s === "3" ? "(신규)"
            : s === "2" ? "(처리중)"
            : s === "9" ? "(처리완료-나눔플러스)"
            : s === "1" ? "(오류)"
            : "";
          console.log(`    status='${s}' → ${c}건 ${label}`);
        });

        console.log("\n  최근 MO 레코드 (KST 기준):");
        console.log(
          "  " + ["date_mo(KST)", "recipient", "originator", "status", "content"].join(" | ")
        );
        console.log("  " + "-".repeat(80));
        allRows.slice(0, 20).forEach((r) => {
          const kstTime = r.date_mo ? fmtKst(new Date(r.date_mo)) : "NULL";
          const content = (r.content ?? "").slice(0, 20);
          console.log(
            `  ${kstTime} | ${r.mo_recipient.padEnd(14)} | ${r.mo_originator.padEnd(14)} | ${r.msg_status.padEnd(2)} | ${content}`
          );
        });

        // 9:22 PM KST 전후 레코드 (2026-06-15 21:00~21:59 KST = 12:00~12:59 UTC)
        console.log("\n  2026-06-15 오후 9시대 (KST) 레코드:");
        const targetRows = allRows.filter((r) => {
          if (!r.date_mo) return false;
          const d = new Date(r.date_mo);
          // KST = UTC+9 → 21:00~21:59 KST = 12:00~12:59 UTC
          const utcHour = d.getUTCHours();
          const utcDay = d.getUTCDate();
          const utcMonth = d.getUTCMonth(); // 0-indexed (5 = June)
          return utcMonth === 5 && utcDay === 15 && utcHour === 12;
        });
        if (targetRows.length === 0) {
          console.log("  → 해당 시간대 레코드 없음");
          console.log("  → 오후 9시 22분에 보낸 문자가 EMMA에 수신되지 않았습니다.");
        } else {
          targetRows.forEach((r) => {
            console.log(
              `  ✅ ${fmtKst(new Date(r.date_mo!))} | ${r.mo_recipient} | ${r.mo_originator} | status=${r.msg_status} | "${r.content}"`
            );
          });
        }

        // #25409991 수신 번호로 필터
        const num9991 = allRows.filter(
          (r) =>
            r.mo_recipient.replace(/\D/g, "").includes("9991") ||
            r.mo_recipient.includes("9991")
        );
        if (num9991.length > 0) {
          console.log("\n  #25409991 수신 레코드:");
          num9991.forEach((r) => {
            const kst = r.date_mo ? fmtKst(new Date(r.date_mo)) : "NULL";
            console.log(`    ${kst} | ${r.mo_recipient} | ${r.mo_originator} | status=${r.msg_status} | "${r.content}"`);
          });
        }
      }
    }
  } catch (err) {
    console.error("  DB 조회 오류:", (err as Error).message);
  }

  // 3. 최근 SMS Donation 내역
  console.log("\n[3] 나눔플러스 시스템 내 최근 SMS 후원");
  try {
    const donations = await prisma.$queryRawUnsafe<{
      id: string;
      donatedAt: Date;
      senderPhone: string | null;
      smsBody: string | null;
      providerTransactionId: string | null;
      organizationId: string | null;
    }[]>(
      `SELECT id, "donatedAt", "senderPhone", "smsBody", "providerTransactionId", "organizationId"
       FROM "Donation"
       WHERE channel = 'SMS'
       ORDER BY "donatedAt" DESC
       LIMIT 15`
    );

    if (donations.length === 0) {
      console.log("  → 아직 SMS 후원 내역 없음");
    } else {
      console.log(`  총 ${donations.length}건:`);
      donations.forEach((d) => {
        const kst = fmtKst(new Date(d.donatedAt));
        const phone = d.senderPhone ?? "없음";
        const body = (d.smsBody ?? "").slice(0, 15);
        const txId = (d.providerTransactionId ?? "").slice(0, 30);
        const orgId = d.organizationId ? d.organizationId.slice(0, 8) + "..." : "기관없음";
        console.log(`  ${kst} | ${phone} | orgId=${orgId} | txId=${txId} | "${body}"`);
      });
    }
  } catch (err) {
    console.error("  오류:", (err as Error).message);
  }

  // 4. 최근 KST 시간 테스트
  console.log("\n[4] KST 시간 변환 테스트");
  const testDate = new Date("2026-06-15T12:22:00Z"); // UTC 12:22 = KST 21:22
  console.log("  UTC 12:22:00 → KST:", fmtKst(testDate));
  console.log("  (정상이면 '2026. 06. 15. 21:22:00' 또는 유사 형식이 나와야 함)");

  // 5. 진단 요약
  console.log("\n" + "=".repeat(60));
  console.log("  진단 완료");
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

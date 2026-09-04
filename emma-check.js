/**
 * EMMA MT 점검 — psql / HeidiSQL 없이 Node로 DB 조회
 * 실행:  node emma-check.js      (프로젝트 폴더에서)
 * 결과:  콘솔 출력 + emma-check-result.txt
 */
const fs = require("fs");
const path = require("path");

// .env 에서 DATABASE_URL 직접 파싱 (@prisma/client 는 .env 를 자동 로드하지 않음)
const envPath = path.join(__dirname, ".env");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const out = [];
const log = (s = "") => { console.log(s); out.push(String(s)); };

const ym = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
const now = new Date();
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const THIS = ym(now), PREV = ym(prev);

async function q(title, sql) {
  log("");
  log("=".repeat(60));
  log(title);
  log("=".repeat(60));
  try {
    const rows = await prisma.$queryRawUnsafe(sql);
    if (!rows || rows.length === 0) { log("(0 rows)"); return; }
    for (const r of rows) {
      const o = {};
      for (const [k, v] of Object.entries(r)) o[k] = typeof v === "bigint" ? Number(v) : v;
      log(JSON.stringify(o));
    }
  } catch (e) {
    log("[ERROR] name=" + (e && e.name) + " code=" + (e && e.code));
    log((e && (e.message || e.stack)) ? String(e.message || e.stack).trim() : String(e));
  }
}

(async () => {
  log(`EMMA MT 점검 — ${now.toISOString()}`);
  log(`DB: ${(process.env.EMMA_DB_URL || process.env.DATABASE_URL || "").replace(/:\/\/[^@]*@/, "://***@")}`);
  log(`EMMA_ID(.env) = ${JSON.stringify(process.env.EMMA_ID)}  → 코드가 넣는 값: ${JSON.stringify((process.env.EMMA_ID ?? "  ").substring(0,2).padEnd(2," "))}`);
  log(`INFOBANK_PROVIDER = ${process.env.INFOBANK_PROVIDER}`);
  log(`INFOBANK_MT_SENDER_NUMBER = ${process.env.INFOBANK_MT_SENDER_NUMBER}`);

  // --- 접속 자체 확인 ---
  log("");
  log("=".repeat(60));
  log("[CONN] DB 접속 테스트");
  log("=".repeat(60));
  try {
    const r = await prisma.$queryRawUnsafe(`SELECT current_database() AS db, current_user AS usr, version() AS ver`);
    log(JSON.stringify(r[0]));
  } catch (e) {
    log("[CONN ERROR] name=" + (e && e.name) + " code=" + (e && e.code));
    log(String(e && (e.message || e.stack) || e).trim());
    log("");
    log(">>> 접속 자체가 실패했습니다. 아래 쿼리 결과는 모두 같은 이유입니다.");
  }

  await q("[0] 이 DB의 EMMA 테이블 목록",
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name LIKE 'em/_%' ESCAPE '/'
     ORDER BY table_name`);

  await q("[1] MT 발송 큐 테이블 존재? (null 이면 없음)",
    `SELECT to_regclass('public.em_smt_tran')::text AS em_smt_tran`);

  await q("[2] MT 큐 적체 현황 ('1' = 발송 대기)",
    `SELECT msg_status, count(*)::int AS cnt,
            min(date_client_req) AS oldest, max(date_client_req) AS newest
     FROM em_smt_tran GROUP BY msg_status ORDER BY 1`);

  await q("[2b] 큐 최근 10건",
    `SELECT mt_pr, date_client_req, msg_status, emma_id, callback,
            recipient_num, left(content,40) AS content_head
     FROM em_smt_tran ORDER BY mt_pr DESC LIMIT 10`);

  await q(`[3] EMMA가 실제로 쓰는 emma_id — em_mo_log_${THIS}`,
    `SELECT emma_id, count(*)::int AS cnt FROM em_mo_log_${THIS} GROUP BY emma_id`);

  await q(`[3b] EMMA가 실제로 쓰는 emma_id — em_mo_log_${PREV}`,
    `SELECT emma_id, count(*)::int AS cnt FROM em_mo_log_${PREV} GROUP BY emma_id`);

  await q(`[4] MT 실제 발송 이력 — em_smt_log_${THIS} / ${PREV}`,
    `SELECT count(*)::int AS sent_${THIS} FROM em_smt_log_${THIS}`);
  await q(`[4b] em_smt_log_${PREV}`,
    `SELECT count(*)::int AS sent_${PREV} FROM em_smt_log_${PREV}`);

  await q("[5] 서버 내 DB 목록",
    `SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1`);

  log("");
  log("=".repeat(60));
  log("DONE");
  fs.writeFileSync(path.join(__dirname, "emma-check-result.txt"), out.join("\r\n"), "utf8");
  console.log("\n결과 저장: emma-check-result.txt");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("치명적 오류:", e);
  fs.writeFileSync(path.join(__dirname, "emma-check-result.txt"), out.join("\r\n") + "\r\n\r\nFATAL: " + e.message, "utf8");
  await prisma.$disconnect();
  process.exit(1);
});

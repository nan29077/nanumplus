/**
 * 1단계: 어떤 접속정보/DB가 살아있는지 탐색
 * 실행: node emma-probe.js
 */
const { PrismaClient } = require("@prisma/client");

const fs = require("fs");
const path = require("path");

// EMMA3/conf/db.cf 에서 EMMA가 실제로 쓰는 접속정보를 읽어온다
let cf = { user: null, pw: null, db: null, host: null, port: null };
try {
  const raw = fs.readFileSync(path.join(__dirname, "EMMA3", "conf", "db.cf"), "latin1");
  for (const line of raw.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\s*db0\.url\s*=\s*jdbc:postgresql:\/\/([^:\/]+):(\d+)\/(\S+)/))) {
      cf.host = m[1]; cf.port = m[2]; cf.db = m[3];
    } else if ((m = line.match(/^\s*db0\.user\s*=\s*(\S+)/))) {
      cf.user = m[1];
    } else if ((m = line.match(/^\s*db0\.password\s*=\s*(\S+)/))) {
      cf.pw = m[1];
    }
  }
  console.log(`db.cf 읽음: user=${cf.user} db=${cf.db} host=${cf.host}:${cf.port} pw=${cf.pw ? "(있음, "+cf.pw.length+"자)" : "(없음)"}`);
} catch (e) {
  console.log("db.cf 읽기 실패: " + e.message);
}

const users = [cf.user, "postgres"].filter((v,i,a)=>v&&a.indexOf(v)===i);
const pws   = [cf.pw, "rmachs1734", "postgres"].filter((v,i,a)=>v&&a.indexOf(v)===i);
const dbs   = [cf.db, "nanumplus", "donation_platform", "postgres"].filter((v,i,a)=>v&&a.indexOf(v)===i);
const HOST  = cf.host || "localhost";
const PORT  = cf.port || "5432";

const out = [];
const log = (s="") => { console.log(s); out.push(String(s)); };

(async () => {
  log(`=== 접속 조합 탐색 (${HOST}:${PORT}) ===`);
  let winner = null;
  for (const u of users) for (const p of pws) for (const d of dbs) {
    const url = `postgresql://${u}:${encodeURIComponent(p)}@${HOST}:${PORT}/${d}`;
    const c = new PrismaClient({ datasources: { db: { url } } });
    try {
      const r = await c.$queryRawUnsafe(`SELECT current_database() AS db`);
      const t = await c.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM information_schema.tables
         WHERE table_schema='public' AND table_name LIKE 'em/_%' ESCAPE '/'`);
      log(`  OK   ${u}/${p.replace(/./g,"*")} → ${d}   (EMMA 테이블 ${t[0].n}개)`);
      if (!winner || t[0].n > 0) winner = { url, u, p, d, n: t[0].n };
    } catch (e) {
      const m = String(e.message||e).replace(/\s+/g," ").trim();
      const brief = /Authentication failed/.test(m) ? "인증 실패(비밀번호 불일치)"
                  : /does not exist|database .* not/.test(m) ? "DB 없음"
                  : /Can't reach|ECONNREFUSED/.test(m) ? "서버 접속 불가"
                  : m.slice(0,110);
      log(`  --   ${u}/${p.replace(/./g,"*")} → ${d}   ${brief}`);
    } finally { await c.$disconnect().catch(()=>{}); }
  }

  log("");
  if (!winner) { log("살아있는 조합 없음. PostgreSQL 서비스 상태부터 확인 필요."); return; }

  log(`=== 선택: DB "${winner.d}" (EMMA 테이블 ${winner.n}개) ===`);
  const c = new PrismaClient({ datasources: { db: { url: winner.url } } });
  const q = async (title, sql) => {
    log(""); log("--- " + title + " ---");
    try {
      const rows = await c.$queryRawUnsafe(sql);
      if (!rows.length) return log("(0 rows)");
      for (const r of rows) {
        const o={}; for (const [k,v] of Object.entries(r)) o[k]= typeof v==="bigint"?Number(v):v;
        log(JSON.stringify(o));
      }
    } catch(e){ log("[ERR] " + String(e.message||e).replace(/\s+/g," ").slice(0,200)); }
  };

  await q("서버 내 DB 목록", `SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1`);
  await q("각 DB의 EMMA 테이블 유무는 아래 개별 조회 참고", `SELECT current_database() AS now_in`);
  await q("[0] EMMA 테이블 목록",
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name LIKE 'em/_%' ESCAPE '/' ORDER BY 1`);
  await q("[1] em_smt_tran 존재?", `SELECT to_regclass('public.em_smt_tran')::text AS em_smt_tran`);
  await q("[2] MT 큐 적체",
    `SELECT msg_status, count(*)::int AS cnt, min(date_client_req) AS oldest, max(date_client_req) AS newest
     FROM em_smt_tran GROUP BY msg_status ORDER BY 1`);
  await q("[2b] 큐 최근 10건",
    `SELECT mt_pr, date_client_req, msg_status, emma_id, callback, recipient_num, left(content,40) AS head
     FROM em_smt_tran ORDER BY mt_pr DESC LIMIT 10`);
  const now=new Date(), ym=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`;
  const prev=new Date(now.getFullYear(), now.getMonth()-1, 1);
  for (const s of [ym(now), ym(prev)]) {
    await q(`[3] emma_id 실제값 em_mo_log_${s}`, `SELECT emma_id, count(*)::int AS cnt FROM em_mo_log_${s} GROUP BY emma_id`);
    await q(`[4] MT 발송이력 em_smt_log_${s}`, `SELECT count(*)::int AS sent FROM em_smt_log_${s}`);
  }
  await q("[6] 나눔플러스 문자후원 Donation 건수",
    `SELECT count(*)::int AS sms_donations FROM "Donation" WHERE channel='SMS'`);

  await c.$disconnect();
  log(""); log("=== DONE ===");
  fs.writeFileSync(__dirname+"/emma-probe-result.txt", out.join("\r\n"), "utf8");
  console.log("\n결과 저장: emma-probe-result.txt");
})().catch(e=>{
  console.error(e);
  fs.writeFileSync(__dirname+"/emma-probe-result.txt", out.join("\r\n")+"\r\nFATAL "+e.message, "utf8");
});

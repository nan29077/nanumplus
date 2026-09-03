/**
 * EMMA 진단 API
 * GET /api/admin/emma-diagnostic
 *
 * EMMA DB 테이블 존재 여부, 미처리 MO 건수, 최근 레코드를 반환한다.
 * EMMA_DB_URL이 설정된 경우 해당 DB를 조회하고, 없으면 기본 DB 사용.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmmaClient, getEmmaSuffix, getPrevEmmaSuffix } from "@/lib/emma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suffix = getEmmaSuffix(); // KST 기준 YYYYMM
  const prevSuffix = getPrevEmmaSuffix(); // KST 기준 전월 YYYYMM

  const client = getEmmaClient();

  const results: Record<string, unknown> = {
    provider: process.env.INFOBANK_PROVIDER ?? "mock",
    emmaId: process.env.EMMA_ID ?? "",
    emmaDbUrl: process.env.EMMA_DB_URL ? "설정됨 (별도 DB)" : "미설정 (DATABASE_URL 공유)",
    tables: {} as Record<string, unknown>,
  };

  // 이번 달 + 저번 달 테이블 확인
  for (const s of [suffix, prevSuffix]) {
    const moTable = `em_mo_log_${s}`;
    const mtTable = `em_mt_log_${s}`;

    try {
      // 테이블 존재 여부 확인
      const exists = await client.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        moTable
      );

      if (!exists[0].exists) {
        (results.tables as any)[s] = { moTable, exists: false };
        continue;
      }

      // 미처리 건수 — 처리기(mo-processor)와 동일하게 '3'(수신)과 '0'(초기) 모두 집계
      const unprocessed = await client.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) AS count FROM ${moTable} WHERE msg_status IN ('3', '0')`
      );

      // 최근 5건 (처리 여부 무관)
      const recent = await client.$queryRawUnsafe<any[]>(
        `SELECT mo_key, mo_recipient, mo_originator, content, msg_status, date_mo
         FROM ${moTable}
         ORDER BY date_mo DESC
         LIMIT 5`
      );

      (results.tables as any)[s] = {
        moTable,
        exists: true,
        unprocessed: Number(unprocessed[0].count),
        recent: recent.map((r) => ({
          mo_key: r.mo_key,
          mo_recipient: r.mo_recipient,
          mo_originator: r.mo_originator
            ? String(r.mo_originator).replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
            : null,
          content: r.content,
          msg_status: r.msg_status,
          date_mo: r.date_mo,
        })),
      };
    } catch (err) {
      (results.tables as any)[s] = {
        moTable,
        exists: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // em_mt_log_YYYYMM 은 과거 구현이 만들던 자체 로그 테이블로, EMMA는 읽지 않는다.
    // 참고용으로만 존재 여부를 남긴다. 실제 발송 큐 진단은 아래 mtQueue 를 볼 것.
    try {
      const mtExists = await client.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        mtTable
      );
      (results.tables as any)[s] = {
        ...(results.tables as any)[s],
        legacyMtLogTable: mtTable,
        legacyMtLogExists: mtExists[0].exists,
        note: "em_mt_log_* 는 EMMA가 읽지 않는 레거시 테이블입니다. 발송 큐는 em_smt_tran 입니다.",
      };
    } catch {
      // 레거시 테이블 체크 실패는 무시
    }
  }

  /**
   * MT 발송 큐 진단 — EMMA가 실제로 폴링하는 테이블은 em_smt_tran 이다.
   *
   * 2026-08-26 장애: db:push 가 em_* 테이블을 지우면서 독립 시퀀스
   * sq_em_smt_tran_01 만 남았고, EMMA의 sp_em_smt_create() 가 CREATE SEQUENCE
   * 단계에서 실패해 테이블이 영구히 재생성되지 않았다. 그런데 이 진단 API는
   * em_mt_log_* 만 보고 있어 장애를 전혀 드러내지 못했다. 그래서 아래를 추가한다.
   */
  const mtQueue: Record<string, unknown> = { table: "em_smt_tran" };
  try {
    const exists = await client.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT to_regclass('public.em_smt_tran') IS NOT NULL AS exists`
    );
    mtQueue.exists = exists[0].exists;

    if (exists[0].exists) {
      const rows = await client.$queryRawUnsafe<
        { msg_status: string; cnt: bigint; oldest: Date | null; newest: Date | null }[]
      >(
        `SELECT msg_status, count(*) AS cnt,
                min(date_client_req) AS oldest, max(date_client_req) AS newest
         FROM em_smt_tran GROUP BY msg_status ORDER BY 1`
      );
      mtQueue.byStatus = rows.map((r) => ({
        msg_status: r.msg_status,
        count: Number(r.cnt),
        oldest: r.oldest,
        newest: r.newest,
      }));
      mtQueue.waiting = rows
        .filter((r) => r.msg_status === "1")
        .reduce((n, r) => n + Number(r.cnt), 0);
    } else {
      // 테이블이 없다면 고아 시퀀스가 원인일 수 있으므로 함께 확인해 준다.
      const seq = await client.$queryRawUnsafe<{ sequencename: string }[]>(
        `SELECT sequencename FROM pg_sequences
         WHERE schemaname = 'public' AND sequencename LIKE 'sq/_em%' ESCAPE '/'`
      );
      mtQueue.orphanSequences = seq.map((r) => r.sequencename);
      mtQueue.hint =
        seq.length > 0
          ? "테이블은 없는데 시퀀스가 남아 있습니다. EMMA의 테이블 생성 프로시저가 CREATE SEQUENCE 에서 실패합니다. 시퀀스를 제거한 뒤 EMMA를 재기동하세요."
          : "발송 큐 테이블이 없습니다. npm run db:emma 로 EMMA 테이블을 설치하세요.";
    }
  } catch (err) {
    mtQueue.error = err instanceof Error ? err.message : String(err);
  }
  (results as any).mtQueue = mtQueue;

  // PostgreSQL 내 모든 데이터베이스 목록 (EMMA DB 위치 파악용)
  try {
    const allDbs = await client.$queryRawUnsafe<{ datname: string }[]>(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    );
    (results as any).allDatabases = allDbs.map((d) => d.datname);
  } catch {
    (results as any).allDatabases = "조회 실패";
  }

  // 'postgres' 기본 DB에도 EMMA 테이블이 있는지 확인
  const { PrismaClient: PrismaClientTemp } = await import("@prisma/client");
  const postgresUrl = process.env.DATABASE_URL?.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const postgresClient = postgresUrl
    ? new PrismaClientTemp({ datasources: { db: { url: postgresUrl } }, log: [] })
    : null;
  if (postgresClient) {
    try {
      const pgExists = await postgresClient.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        `em_mo_log_${suffix}`
      );
      (results as any).postgresDbHasEmma = pgExists[0].exists;
      if (pgExists[0].exists) {
        const cnt = await postgresClient.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) AS count FROM em_mo_log_${suffix}`
        );
        (results as any).postgresDbMoCount = Number(cnt[0].count);
      }
    } catch (e) {
      (results as any).postgresDbHasEmma = false;
      (results as any).postgresDbError = e instanceof Error ? e.message : String(e);
    } finally {
      await postgresClient.$disconnect();
    }
  } else {
    (results as any).postgresDbHasEmma = false;
    (results as any).postgresDbError = "DATABASE_URL 미설정";
  }

  // donation_platform의 em_ 관련 테이블 전부 나열 (EMMA 설치 흔적 탐지)
  try {
    const emmaTables = await client.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name LIKE 'em_%'
       ORDER BY table_name`
    );
    (results as any).emmaRelatedTables = emmaTables.map((t) => t.table_name);
  } catch {
    (results as any).emmaRelatedTables = [];
  }

  return NextResponse.json(results);
}

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
           WHERE table_name = $1
         ) AS exists`,
        moTable
      );

      if (!exists[0].exists) {
        (results.tables as any)[s] = { moTable, exists: false };
        continue;
      }

      // 미처리 건수 (msg_status='3')
      const unprocessed = await client.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) AS count FROM ${moTable} WHERE msg_status = '3'`
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

    // MT 테이블 존재 여부
    try {
      const mtExists = await client.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables WHERE table_name = $1
         ) AS exists`,
        mtTable
      );
      (results.tables as any)[s] = {
        ...(results.tables as any)[s],
        mtTable,
        mtExists: mtExists[0].exists,
      };
    } catch {
      // MT 테이블 체크 실패 무시
    }
  }

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
           SELECT 1 FROM information_schema.tables WHERE table_name = $1
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

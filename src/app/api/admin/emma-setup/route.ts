/**
 * EMMA 테이블 초기화 + 테스트 MO 삽입 API
 * POST /api/admin/emma-setup?action=create-tables   → EMMA 테이블 생성
 * POST /api/admin/emma-setup?action=insert-test-mo  → 테스트 MO 레코드 삽입
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmmaClient, getEmmaSuffix } from "@/lib/emma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const client = getEmmaClient();

  const suffix = getEmmaSuffix(); // KST 기준 YYYYMM
  const moTable = `em_mo_log_${suffix}`;
  const mtTable = `em_mt_log_${suffix}`;

  if (action === "create-tables") {
    // MO 수신 테이블 생성
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${moTable} (
        mo_key        VARCHAR(50)  NOT NULL,
        service_type  CHAR(2)      NOT NULL DEFAULT 'MO',
        mo_recipient  VARCHAR(32)  NOT NULL,
        emo_recipient VARCHAR(80),
        mo_originator VARCHAR(32)  NOT NULL,
        mo_callback   VARCHAR(32)  NOT NULL DEFAULT '',
        msg_status    CHAR(1)      NOT NULL DEFAULT '3',
        subject       VARCHAR(40),
        content       VARCHAR(4000),
        date_mo       TIMESTAMP    NOT NULL DEFAULT now(),
        date_mo_recv  TIMESTAMP    NOT NULL DEFAULT now(),
        carrier       NUMERIC(5),
        rs_id         VARCHAR(20),
        ems_id        NUMERIC(3),
        ems_total     NUMERIC(1),
        ems_seq       NUMERIC(1),
        emma_id       CHAR(2)      NOT NULL DEFAULT '  ',
        CONSTRAINT pk_${moTable} PRIMARY KEY (mo_key)
      )
    `);
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_${moTable}_status
      ON ${moTable} (msg_status, date_mo ASC)
    `);

    // MT 발신 테이블 생성
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${mtTable} (
        mt_key        VARCHAR(50)  NOT NULL,
        service_type  CHAR(2)      NOT NULL DEFAULT 'MO',
        emma_id       CHAR(2)      NOT NULL DEFAULT '  ',
        mt_recipient  VARCHAR(32)  NOT NULL,
        mt_originator VARCHAR(32)  NOT NULL,
        msg_type      CHAR(1)      NOT NULL DEFAULT '1',
        content       VARCHAR(4000),
        mt_status     CHAR(1)      NOT NULL DEFAULT '3',
        date_mt       TIMESTAMP    NOT NULL DEFAULT now(),
        date_mt_send  TIMESTAMP    NOT NULL DEFAULT now(),
        callback      VARCHAR(32),
        result_code   VARCHAR(10),
        result_msg    VARCHAR(200),
        date_mt_result TIMESTAMP,
        CONSTRAINT pk_${mtTable} PRIMARY KEY (mt_key)
      )
    `);

    return NextResponse.json({ ok: true, created: [moTable, mtTable] });
  }

  if (action === "insert-test-mo") {
    const body = await req.json().catch(() => ({}));
    const moRecipient: string = body.recipient ?? "#25409999"; // 기관배정 없음
    const moOriginator: string = body.phone ?? "01012345678";
    const content: string = body.content ?? "테스트 후원입니다";
    const moKey = `TEST-${Date.now()}`;

    // 테이블 없으면 먼저 생성
    const exists = await client.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
      moTable
    );
    if (!exists[0].exists) {
      return NextResponse.json({ error: `${moTable} 테이블이 없습니다. 먼저 테이블을 생성하세요.` }, { status: 400 });
    }

    await client.$executeRawUnsafe(
      `INSERT INTO ${moTable} (mo_key, mo_recipient, mo_originator, content, msg_status, emma_id)
       VALUES ($1, $2, $3, $4, '3', 'na')
       ON CONFLICT (mo_key) DO NOTHING`,
      moKey, moRecipient, moOriginator, content
    );

    return NextResponse.json({ ok: true, moKey, moTable, moRecipient, moOriginator, content });
  }

  if (action === "delete-tests") {
    // providerTransactionId가 'TEST-'로 시작하는 검증용 더미 삭제
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "Donation" WHERE "providerTransactionId" LIKE 'TEST-%'`
    );
    return NextResponse.json({ ok: true, deleted });
  }

  return NextResponse.json({ error: "action 파라미터 필요: create-tables | insert-test-mo | delete-tests" }, { status: 400 });
}

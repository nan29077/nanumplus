#!/usr/bin/env bash
# ============================================================
# EMMA (인포뱅크) PostgreSQL 오브젝트 설치 스크립트 (macOS/Linux)
#
# 사용법:
#   npm run db:emma
#   또는 bash emma-sql/install.sh
#
# 주의:
#   `prisma db push` 는 Prisma 스키마에 없는 em_* 테이블을 모두 DROP 한다.
#   db:push 실행 후에는 반드시 이 스크립트를 다시 실행해야 한다.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# DATABASE_URL 로드 (.env)
if [ -f .env ]; then
  DB_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
else
  DB_URL="${DATABASE_URL:-}"
fi
if [ -z "${DB_URL}" ]; then
  echo "ERROR: DATABASE_URL 을 찾을 수 없습니다 (.env 확인)" >&2
  exit 1
fi

# psql 탐색 (PATH → homebrew keg-only 경로)
PSQL_BIN=$(command -v psql || true)
if [ -z "$PSQL_BIN" ]; then
  for v in 17 16 15 14; do
    for p in "/opt/homebrew/opt/postgresql@$v/bin/psql" "/usr/local/opt/postgresql@$v/bin/psql"; do
      [ -x "$p" ] && PSQL_BIN="$p" && break 2
    done
  done
fi
if [ -z "$PSQL_BIN" ]; then
  echo "ERROR: psql 을 찾을 수 없습니다" >&2
  exit 1
fi

run() { "$PSQL_BIN" "$DB_URL" -q -v ON_ERROR_STOP=1 "$@"; }

echo "[1/3] EMMA Stored Procedure 등록"
for f in emma_sp_com emma_sp_smt emma_sp_mmt emma_sp_smo emma_sp_mmo emma_sp_mon emma_sp_sjs; do
  run -f "emma-sql/$f.sql" >/dev/null
  echo "  - $f.sql"
done

echo "[2/3] EMMA 기본/월별 테이블 생성"
# db:push 가 테이블만 드롭하고 시퀀스는 남기는 경우 대비:
# 본 테이블이 없으면 고아 시퀀스를 정리해 sp_em_*_create 재실행을 가능하게 한다.
run -Atc "DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename='em_smt_tran') THEN
    DROP SEQUENCE IF EXISTS sq_em_smt_tran_01;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename='em_mmt_tran') THEN
    DROP SEQUENCE IF EXISTS sq_em_mmt_tran_01;
  END IF;
END \$\$;" >/dev/null
YM=$(TZ=Asia/Seoul date +%Y%m)
# 다음 달 계산 (BSD date / GNU date 모두 지원)
YM_NEXT=$(TZ=Asia/Seoul date -v+1m +%Y%m 2>/dev/null || TZ=Asia/Seoul date -d "next month" +%Y%m)
run -Atc "SELECT sp_em_common_create();" >/dev/null
run -Atc "SELECT sp_em_smt_create();"    >/dev/null
run -Atc "SELECT sp_em_mmt_create();"    >/dev/null
run -Atc "SELECT sp_em_mon_create();"    >/dev/null
run -Atc "SELECT sp_em_stat_create();"   >/dev/null
for ym in "$YM" "$YM_NEXT"; do
  run -Atc "SELECT sp_em_smt_log_create('$ym');" >/dev/null
  run -Atc "SELECT sp_em_smo_log_create('$ym');" >/dev/null
  run -Atc "SELECT sp_em_mmt_log_create('$ym');" >/dev/null
  echo "  - 월별 로그 테이블: $ym"
done

echo "[3/3] 나눔플러스 연동 테이블 (em_mo_log/em_mt_log)"
run -f prisma/emma-setup.sql >/dev/null

echo "완료. 현재 em_* 테이블:"
run -Atc "SELECT '  - '||table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'em\_%' ORDER BY 1;"

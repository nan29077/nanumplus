-- ============================================================
-- EMMA (인포뱅크) PostgreSQL 테이블 초기 설정 스크립트
-- 나눔플러스 문자후원 연동용
--
-- 실행 방법:
--   psql -U postgres -d donation_platform -f prisma/emma-setup.sql
-- 또는:
--   emma-setup.bat 을 실행
--
-- 주의:
--   - EMMA 설치 시 인포뱅크 기술팀이 별도 SP(저장 프로시저) 파일을 제공한다.
--     해당 SP 파일들(emma_sp_*.sql)을 먼저 실행한 후 이 스크립트를 실행하세요.
--   - 이 스크립트는 나눔플러스 연동에 필요한 최소 테이블만 생성한다.
--   - 테이블명의 YYYYMM은 월별 파티션이며, 매월 자동 생성된다.
-- ============================================================

-- 현재 월 MO 수신 로그 테이블 (EMMA가 MO 수신 시 INSERT)
-- 실제 EMMA 설치 환경에서는 EMMA 에이전트가 자동 생성함
-- 개발/테스트용 수동 생성 스크립트
DO $$
DECLARE
  suffix TEXT := to_char(NOW(), 'YYYYMM');
  mo_table TEXT;
  mt_table TEXT;
BEGIN
  mo_table := 'em_mo_log_' || suffix;
  mt_table := 'em_mt_log_' || suffix;

  -- MO 수신 로그 테이블
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      mo_key        VARCHAR(50)  NOT NULL,
      service_type  CHAR(2)      NOT NULL DEFAULT ''MO'',
      mo_recipient  VARCHAR(32)  NOT NULL,
      emo_recipient VARCHAR(80),
      mo_originator VARCHAR(32)  NOT NULL,
      mo_callback   VARCHAR(32)  NOT NULL DEFAULT '''',
      msg_status    CHAR(1)      NOT NULL DEFAULT ''3'',
      subject       VARCHAR(40),
      content       VARCHAR(4000),
      date_mo       TIMESTAMP    NOT NULL DEFAULT now(),
      date_mo_recv  TIMESTAMP    NOT NULL DEFAULT now(),
      carrier       NUMERIC(5),
      rs_id         VARCHAR(20),
      ems_id        NUMERIC(3),
      ems_total     NUMERIC(1),
      ems_seq       NUMERIC(1),
      emma_id       CHAR(2)      NOT NULL DEFAULT ''  '',
      CONSTRAINT pk_%I PRIMARY KEY (mo_key)
    )', mo_table, mo_table);

  -- MO 처리 상태 인덱스 (폴링 최적화)
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_%I_status
    ON %I (msg_status, date_mo ASC)',
    mo_table, mo_table);

  -- MT 발신 로그 테이블 (나눔플러스가 INSERT → EMMA가 픽업해 발송)
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      mt_key        VARCHAR(50)  NOT NULL,
      service_type  CHAR(2)      NOT NULL DEFAULT ''MO'',
      emma_id       CHAR(2)      NOT NULL DEFAULT ''  '',
      mt_recipient  VARCHAR(32)  NOT NULL,
      mt_originator VARCHAR(32)  NOT NULL,
      msg_type      CHAR(1)      NOT NULL DEFAULT ''1'',
      content       VARCHAR(4000),
      mt_status     CHAR(1)      NOT NULL DEFAULT ''3'',
      date_mt       TIMESTAMP    NOT NULL DEFAULT now(),
      date_mt_send  TIMESTAMP    NOT NULL DEFAULT now(),
      callback      VARCHAR(32),
      result_code   VARCHAR(10),
      result_msg    VARCHAR(200),
      date_mt_result TIMESTAMP,
      CONSTRAINT pk_%I PRIMARY KEY (mt_key)
    )', mt_table, mt_table);

  RAISE NOTICE 'EMMA 테이블 생성 완료: %, %', mo_table, mt_table;
END;
$$;

-- ============================================================
-- 연동 확인용 테스트 MO 삽입 (필요 시 주석 해제)
-- 실행 후 /api/cron/emma-mo 를 호출하면 Donation이 생성됨
-- sms_number 값을 실제 기관 SMS 번호(#2540-1234 형식)로 교체 필요
-- ============================================================
-- DO $$
-- DECLARE
--   suffix TEXT := to_char(NOW(), 'YYYYMM');
-- BEGIN
--   EXECUTE format(
--     'INSERT INTO em_mo_log_%s (mo_key, mo_recipient, mo_originator, content, msg_status)
--      VALUES ($1, $2, $3, $4, $5)
--      ON CONFLICT (mo_key) DO NOTHING',
--     suffix
--   ) USING
--     'TEST-MO-' || gen_random_uuid()::text,
--     '#2540-1234',   -- 기관 SMS 번호로 교체
--     '01012345678', -- 테스트 후원자 번호
--     '테스트 후원',
--     '3';           -- 3=미처리
-- END;
-- $$;

SELECT 'EMMA 설정 완료.' AS result;

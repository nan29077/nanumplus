-- ============================================================
-- EMMA MT 점검 쿼리  (HeidiSQL / PostgreSQL)
-- 사용법: 쿼리 하나씩 커서 놓고  Ctrl + F9  (현재 쿼리만 실행)
--         전체 실행(F9)은 없는 테이블에서 멈출 수 있으니 비추천
-- ============================================================


-- [0] 이 DB에 있는 EMMA 테이블 목록 ---------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'em/_%' ESCAPE '/'
ORDER BY table_name;


-- [1] MT 발송 큐 테이블이 존재하는가 (NULL이면 없음) ----------
SELECT to_regclass('public.em_smt_tran') AS em_smt_tran;


-- [2] MT 큐 적체 현황  ('1' = 발송 대기) ----------------------
SELECT msg_status,
       count(*)             AS cnt,
       min(date_client_req) AS oldest,
       max(date_client_req) AS newest
FROM em_smt_tran
GROUP BY msg_status
ORDER BY 1;


-- [2b] 큐 최근 10건 -------------------------------------------
SELECT mt_pr, date_client_req, msg_status, emma_id,
       callback, recipient_num, left(content, 40) AS content_head
FROM em_smt_tran
ORDER BY mt_pr DESC
LIMIT 10;


-- [3] EMMA가 직접 기록한 emma_id 실제값 (핵심) -----------------
--     'na' 가 아니면 mt-sender.ts 의 절삭값이 틀린 것
SELECT emma_id, count(*) AS cnt
FROM em_mo_log_202609
GROUP BY emma_id;

-- 9월 테이블이 없다면 8월로
SELECT emma_id, count(*) AS cnt
FROM em_mo_log_202608
GROUP BY emma_id;


-- [4] MT가 한 번이라도 실제 발송된 적이 있는가 -----------------
SELECT count(*) AS sent_202609 FROM em_smt_log_202609;

SELECT count(*) AS sent_202608 FROM em_smt_log_202608;


-- [5] 서버 내 DB 목록 (EMMA가 다른 DB에 설치됐을 가능성 확인) --
SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1;

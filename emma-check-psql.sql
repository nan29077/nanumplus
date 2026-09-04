\echo
\echo ===== [0] EMMA tables in this database =====
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'em/_%' ESCAPE '/'
ORDER BY table_name;

\echo ===== [1] MT send queue table exists? (NULL = missing) =====
SELECT to_regclass('public.em_smt_tran') AS em_smt_tran;

\echo ===== [2] MT queue backlog by msg_status ('1' = waiting) =====
SELECT msg_status, count(*) AS cnt,
       min(date_client_req) AS oldest, max(date_client_req) AS newest
FROM em_smt_tran GROUP BY msg_status ORDER BY 1;

\echo ===== [2b] latest 10 queued rows =====
SELECT mt_pr, date_client_req, msg_status, emma_id, callback, recipient_num,
       left(content,40) AS content_head
FROM em_smt_tran ORDER BY mt_pr DESC LIMIT 10;

\echo ===== [3] emma_id EMMA actually writes (MO log) =====
SELECT emma_id, count(*) AS cnt FROM em_mo_log_202609 GROUP BY emma_id;
SELECT emma_id, count(*) AS cnt FROM em_mo_log_202608 GROUP BY emma_id;

\echo ===== [4] any MT ever sent? =====
SELECT count(*) AS sent_202609 FROM em_smt_log_202609;
SELECT count(*) AS sent_202608 FROM em_smt_log_202608;

\echo ===== [5] databases on this server =====
SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1;

\echo ===== DONE =====

/**
 * @(#)emma_sp_sjs.sql
 * Copyright 2008 InfoBank Corporation. All rights reserved.
 * emma statistics job scheduler table ddl & dml.
 *
 *
 * 일통계 제공을 위한 PostgreSQL Stored Procedure 이다.
 * 고객사의 표준 프로시저를 이용하여 테이블 변경을 원할 경우
 * 아래의 프로시저를 수정하여 반영할 수 있으나,
 * INPUT PARAMETER 및 RESULTSET 결과는 아래 정의된
 * 대로 꼭 제공해 주어야 한다.
 *
 * @author	jh.lee Service R&D Lab
 * @version 1.0
 * @since	09/03/11
 * @history
 *
 *
 */

/************************************************************************/
/* NAME : sp_em_stat_create												*/
/* DESC : 엠마 통계에서 사용하는 테이블을 생성한다.						*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/

CREATE OR REPLACE FUNCTION sp_em_stat_create()
RETURNS void 
AS $$ 
DECLARE
	n_cnt		NUMERIC;
	sql_string	VARCHAR(4000);
BEGIN

	/** check em_statistics_m table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_statistics_m';

	IF n_cnt < 1 THEN
		/** em_statistics_m table create  */
		sql_string := '
		CREATE TABLE em_statistics_m
		(
			stat_date			VARCHAR(8)   NOT NULL,
            stat_servicetype    CHAR(2)      NOT NULL,
            stat_payment_code   VARCHAR(20)  NOT NULL,
            stat_carrier        NUMBER(5)    NOT NULL,
            stat_success        NUMBER(11),
            stat_failure        NUMBER(11),
            stat_invalid        NUMBER(11),
            stat_invalid_ib     NUMBER(11),
            stat_remained       NUMBER(11),
            stat_regdate        TIMESTAMP default now() NOT NULL,
			CONSTRAINT pk_em_statistics_m PRIMARY KEY (stat_date, stat_servicetype, stat_payment_code, stat_carrier)
		) ';
		EXECUTE sql_string ;
		
		/** comment create */
        sql_string := ' COMMENT ON TABLE em_statistics_m IS ''일별 통계 마스터''';
        EXECUTE sql_string;

        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_date IS ''년월일''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_servicetype IS ''서비스구분''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_payment_code IS ''부서 코드 (참조용 필드)''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_carrier IS ''착신망 정보''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_success IS ''성공 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_failure IS ''이통사 전송 실패 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_invalid IS ''단말기, 수신번호, 메시지형식 등의 오류로 인한 전송 실패 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_invalid_ib IS ''IB 실패 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_remained IS ''현재 결과 미수신 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_m.stat_regdate IS ''등록일시''';
        EXECUTE sql_string;

	END IF;


	/** check em_statistics_d table is exist */
	SELECT COUNT(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_statistics_d';

	IF n_cnt < 1 THEN
		/** em_statistics_d table create  */
		sql_string := '
		CREATE TABLE em_statistics_d
		(
			stat_date			VARCHAR(8)  NOT NULL,
			stat_servicetype	CHAR(2)     NOT NULL,
			stat_payment_code   VARCHAR(20) NOT NULL,
			stat_carrier        NUMERIC(5)  NOT NULL,
			stat_fail_code		VARCHAR(10) NOT NULL,
			stat_fail_cnt		NUMERIC(11),
			stat_regdate		TIMESTAMP default now() NOT NULL,
			CONSTRAINT pk_em_statistics_d PRIMARY KEY (stat_date, stat_servicetype, stat_payment_code, stat_carrier, stat_fail_code)
		) ';
		EXECUTE sql_string ;
		
        /** comment create */
        sql_string := ' COMMENT ON TABLE em_statistics_d IS ''일별 통계 상세''';
        EXECUTE sql_string;

        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_date IS ''년월일''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_servicetype IS ''서비스구분''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_payment_code IS ''부서 코드 (참조용 필드)''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_carrier IS ''착신망 정보''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_fail_code IS ''실패 상세코드''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_fail_cnt IS ''실패 건수''';
        EXECUTE sql_string;
        sql_string := ' COMMENT ON COLUMN em_statistics_d.stat_regdate IS ''등록일시''';
        EXECUTE sql_string;

	END IF;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_stat_execute											*/
/* DESC : 일별 통계 데이터를 생성한다.									*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_stat_execute(
)
RETURNS void
AS $$
DECLARE
   	v_prc_date      VARCHAR(8);
	sql_string		VARCHAR(4000);
BEGIN

	SELECT TO_CHAR( CURRENT_DATE -1, 'yyyymmdd' ) INTO v_prc_date;     

	/** statistics table create if not exist */
	sql_string := 'select sp_em_stat_create(); ';
	EXECUTE sql_string ;

	/** delete record if data exists */
	sql_string := 'SELECT sp_em_stat_delete( ''' || v_prc_date || ''' ); ';
	EXECUTE sql_string ;

	/** SMS MT */
	sql_string := 'SELECT sp_em_stat_mt_insert( ''' || v_prc_date || ''', ''0'' ); ';
	EXECUTE sql_string ;

	/** MMS MT */
	sql_string := 'SELECT sp_em_stat_mt_insert( ''' || v_prc_date || ''', ''2'' ); ';
	EXECUTE sql_string ;

	/** SMS MO */
	sql_string := 'SELECT sp_em_stat_mo_insert( ''' || v_prc_date || ''', ''4'' ); ';
	EXECUTE sql_string ;

	/** MMS MO */
	sql_string := 'SELECT sp_em_stat_mo_insert( ''' || v_prc_date || ''', ''5'' ); ';
	EXECUTE sql_string ;

END;  
$$ LANGUAGE plpgsql;  


/********************************************************************************/
/* NAME : sp_em_stat_mt_insert													*/
/* DESC : MT 로그테이블에서 일별통계 마스터 및 디테일테이블 데이터를 입력한다.	*/
/* PARAMETERS																	*/
/*   IN p_prc_date : 처리일자													*/
/*   IN p_service_type : 서비스 종류											*/
/* REMARK																		*/
/*   N/A																		*/
/********************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_stat_mt_insert(
	p_prc_date 			IN		VARCHAR,
	p_service_type 		IN		CHAR
)
RETURNS void 
AS $$
DECLARE        
	v_table_name 	VARCHAR(20);   
    sql_string  	VARCHAR(4000);  
BEGIN     

	IF p_service_type = '0' THEN
		v_table_name := 'em_smt_log_' || SUBSTR(p_prc_date,1,6);
	ELSIF p_service_type = '2' THEN
		v_table_name := 'em_mmt_log_' || SUBSTR(p_prc_date,1,6);
	END IF;   
        
	sql_string := '
		INSERT INTO em_statistics_m (
			stat_date,
			stat_servicetype,
			stat_success,
			stat_fail,
			stat_regdate
		) SELECT 
			'''||p_prc_date||''',
			'''||p_service_type||''',
			A.success,
			B.fail,
			sysdate
		FROM 
			(
				SELECT count(*) AS success 
				FROM '|| v_table_name ||' 
				WHERE to_char(date_mt_report, ''yyyymmdd'') = '''|| p_prc_date ||'''
				AND mt_report_code_ib = ''1000''
			) A, 
			(
				SELECT count(*) AS fail 
				FROM '|| v_table_name ||'
				WHERE to_char(date_mt_report, ''yyyymmdd'') = '''|| p_prc_date ||'''
				AND mt_report_code_ib <> ''1000''
			) B 
	';
	
	EXECUTE sql_string ;


	sql_string := '
		INSERT INTO em_statistics_d (
			stat_date,
			stat_servicetype,
			stat_fail_code,
			stat_fail_cnt,
			stat_regdate
		) SELECT 
			'''|| p_prc_date ||''',
			'''|| p_service_type ||''',
			mt_report_code_ib,
			count(mt_report_code_ib),
			sysdate
		FROM '|| v_table_name ||'
		WHERE to_char(date_mt_report, ''yyyymmdd'') = '''|| p_prc_date ||'''
		AND mt_report_code_ib <> ''1000'' 
		GROUP BY mt_report_code_ib 
	';  	
	
	EXECUTE sql_string ;

	EXCEPTION
	WHEN others THEN
		-- do nothing

END;   
$$ LANGUAGE plpgsql;  


/********************************************************************************/
/* NAME : sp_em_stat_mo_insert													*/
/* DESC : MO 로그테이블에서 일별통계 마스터 및 디테일테이블 데이터를 입력한다	*/
/* PARAMETERS																	*/
/*   IN p_prc_date : 처리일자													*/
/*   IN p_service_type : 서비스 종류											*/
/* REMARK																		*/
/*   N/A																		*/
/********************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_stat_mo_insert(
	p_prc_date 			IN		VARCHAR,
	p_service_type 		IN		CHAR
)
RETURNS void 
AS $$
DECLARE
	v_table_name 	VARCHAR(20);
	sql_string  	VARCHAR(4000);
BEGIN     

	IF p_service_type = '4' THEN
		v_table_name := 'em_mo_log_' || SUBSTR(p_prc_date,1,6);
	ELSIF p_service_type = '5' THEN
		v_table_name := 'em_mo_log_' || SUBSTR(p_prc_date,1,6);
	END IF;   
                     
	sql_string := '
		INSERT INTO em_statistics_m (
			stat_date,
			stat_servicetype,
			stat_success,
			stat_fail,
			stat_regdate
		) SELECT 
			'''||p_prc_date||''',
			'''||p_service_type||''',
			A.success,
			B.fail,
			sysdate
		FROM 
			(
				SELECT count(*) AS success 
				FROM '|| v_table_name ||' 
				WHERE to_char(date_mo_recv, ''yyyymmdd'') = '''|| p_prc_date ||'''
				AND service_type = '''|| p_service_type ||'''
				AND msg_status = ''3''

			) A, 
			(
				SELECT count(*) AS fail 
				FROM '|| v_table_name ||'
				WHERE to_char(date_mo_recv, ''yyyymmdd'') = '''|| p_prc_date ||'''
				AND service_type = '''|| p_service_type ||'''
				AND msg_status = ''E''
			) B 
	';

	EXECUTE sql_string ;
	
				  
	sql_string := '
		INSERT INTO em_statistics_d (
			stat_date,
			stat_servicetype,
			stat_fail_code,
			stat_fail_cnt,
			stat_regdate
		) SELECT 
			'''|| p_prc_date ||''',
			'''|| p_service_type ||''',
			msg_status,
			count(msg_status),
			now()
		FROM '|| v_table_name ||'
		WHERE to_char(date_mo_recv, ''yyyymmdd'') = '''|| p_prc_date ||'''
		AND service_type = '''|| p_service_type ||'''
		AND msg_status = ''E'' 
		GROUP by msg_status 
	';

	EXECUTE sql_string ;

	EXCEPTION
	WHEN others THEN
		-- do nothing
		
END;  
$$ LANGUAGE plpgsql;
    
    
/************************************************************************/
/* NAME : sp_em_stat_delete												*/
/* DESC : 기존에 남은 통계정보를 삭제한다.								*/
/* PARAMETERS															*/
/*   IN p_prc_date : 처리일자											*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_stat_delete(
	p_prc_date 			IN		VARCHAR
)
RETURNS void 
AS $$
DECLARE
BEGIN
    		
	/* delete record */
	DELETE FROM em_statistics_m
	WHERE stat_date = p_prc_date;

	DELETE FROM em_statistics_d
	WHERE stat_date = p_prc_date; 
			
    EXCEPTION
    WHEN others THEN
		-- do nothing
		
END;                 
$$ LANGUAGE plpgsql;

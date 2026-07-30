/**
 * @(#)emma_sp_com.sql
 * Copyright 2008 InfoBank Corporation. All rights reserved.
 * emma common table ddl & dml.
 *
 *
 * EMMA가 공통으로 사용하는 PostgreSQL Stored Procedure 이다.
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
/* NAME : sp_em_common_create											*/
/* DESC : 각 서비스에서 공통적으로 사용하는 테이블을 사용한다.			*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_common_create()
RETURNS void 
AS $$ 
DECLARE
	n_cnt		NUMERIC;
	sql_string	VARCHAR(4000);
BEGIN

	/** check em_banlist table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_banlist';

	IF n_cnt < 1 THEN

		/** em_banlist table create  */
		sql_string := '
		CREATE TABLE em_banlist
		(
			service_type 	CHAR(2) NOT NULL,
			ban_seq 		NUMERIC(11) NOT NULL,
			ban_type 		CHAR(1) NOT NULL,
			content 		VARCHAR(45) NOT NULL,
			send_yn 		CHAR(1) default ''N'' NOT NULL ,
			ban_status_yn 	CHAR(1) default ''Y'' NOT NULL ,
			reg_date 		TIMESTAMP default now() NOT NULL ,
			reg_user 		VARCHAR(20),
			update_date 	TIMESTAMP default to_date(''19700101000000'',''YYYYMMDDHH24MISS'') NOT NULL ,
			update_user 	VARCHAR(20),
			CONSTRAINT pk_em_banlist PRIMARY KEY (service_type, ban_seq)
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_banlist_01 ON em_banlist(ban_type, service_type, ban_status_yn) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_banlist_02 ON em_banlist(content) ';
		EXECUTE sql_string ;
		
		/* comment create */
		sql_string := ' COMMENT ON TABLE em_banlist IS ''차단 번호 리스트 테이블''';
		EXECUTE sql_string;

		sql_string := ' COMMENT ON COLUMN em_banlist.service_type IS ''서비스 메시지 전송 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.ban_seq IS ''순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.ban_type IS ''스팸 차단 구분(수신번호, 회신번호, 메시지 내용)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.content IS ''스팸 문구''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.send_yn IS ''스팸 문구 전송 여부''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.ban_status_yn IS ''전송 차단 여부''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.reg_date IS ''등록 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.reg_user IS ''등록 자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.update_date IS ''수정 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_banlist.update_user IS ''수정 자''';
		EXECUTE sql_string;
		
	END IF;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_common_banlist											*/
/* DESC : 전송차단테이블에서 전송차단 리스트 조회한다.					*/
/* PARAMETERS															*/
/*   OUT p_list : Resultset												*/
/*   IN p_service_type : 서비스 구분 (0: SMT, 1:URL, 2:MMT)				*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_common_banlist(
	p_service_type	 	IN	    CHAR
)
RETURNS refcursor
AS $$
DECLARE
	p_list				refcursor;
	sql_string			VARCHAR(4000);
BEGIN           

	sql_string := '
	SELECT 
		service_type,
		ban_type,
		content,
		send_yn
	FROM em_banlist
	WHERE service_type =  ''' ||  p_service_type || '''
	AND ban_type  <> ''R''
	AND ban_status_yn = ''Y'' ';

	OPEN p_list FOR EXECUTE sql_string;
	RETURN p_list;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_common_checkprivilege									*/
/* DESC : 테이블 관리 권한을 체크한다.									*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_common_checkprivilege(
)
RETURNS void 
AS $$ 
DECLARE
	n_cnt       NUMERIC;
	sql_string  VARCHAR(100);
BEGIN

	/** check table IS exist */
	SELECT count(table_name)
	INTO n_cnt
	FROM    information_schema.tables 
	WHERE table_type = 'BASE TABLE'
	AND	     lower(table_name) = 'em_temp';

	IF n_cnt < 1 THEN
		sql_string := 'CREATE TABLE em_temp (a char(1)) ';
		EXECUTE sql_string ;
					
		sql_string := 'DROP TABLE em_temp ';
		EXECUTE sql_string ;  
	END IF;

	EXCEPTION
	WHEN others THEN
		--RAISE NOTICE '===> %', SQLSTATE;

END;
$$ LANGUAGE plpgsql;

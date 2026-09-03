/**
 * @(#)emma_sp_mon.sql
 * Copyright 2008 InfoBank Corporation. All rights reserved.
 * emma status monitor table ddl & dml.
 *
 *
 * 실시간 상태정보 제공을 위한 PostgreSQL Stored Procedure 이다.
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
/* NAME : sp_em_mon_create												*/
/* DESC : 실시간 상태정보 모니터링 관련 테이블 생성한다.				*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/

CREATE OR REPLACE FUNCTION sp_em_mon_create()
RETURNS void 
AS $$ 
DECLARE
	n_cnt		NUMERIC;
	sql_string	VARCHAR(4000);
BEGIN

	/** check em_status table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_status';

	IF n_cnt < 1 THEN
		/** em_status table create  */
		sql_string := '
		CREATE TABLE em_status
		(
		    emma_id         CHAR(2) default '' '' NOT NULL,
			process_name	VARCHAR(40) NOT NULL,
			pid				VARCHAR(20) NOT NULL,
			service_type	CHAR(2) NOT NULL,
			cnt_today		NUMERIC(11),
			cnt_total		NUMERIC(11),
			cnt_resent_1	NUMERIC(11),
			cnt_resent_10	NUMERIC(11),
			que_size		NUMERIC(11),
			conn_time		VARCHAR(20),
			update_time		VARCHAR(20),
			conn_gw_info	VARCHAR(40),
			reg_date		TIMESTAMP default to_date(''19700101000000'',''YYYYMMDDHH24MISS'') NOT NULL,
			CONSTRAINT pk_em_status PRIMARY KEY (emma_id, process_name, pid, service_type)
		) ';
		EXECUTE sql_string ;

        /* comment create */
		sql_string := ' COMMENT ON TABLE em_status IS ''실시간 상태정보 모니터링''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_status.emma_id IS ''HA Id''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.process_name IS ''프로세스명''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.pid IS ''프로세스 ID''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.service_type IS ''서비스구분''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.cnt_today IS ''세션 금일 처리된 건수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.cnt_total IS ''세션 전체 처리된 건수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.cnt_resent_1 IS ''최근 10분동안 처리된 건수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.cnt_resent_10 IS ''최근 10분동안 처리된 건수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.que_size IS ''que 에 남아있는 건수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.conn_time IS ''접속시각''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.update_time IS ''정보갱신시각''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.conn_gw_info IS ''접속 GW 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_status.reg_date IS ''등록일시''';
		EXECUTE sql_string;
			
	END IF;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_mon_status_insert										*/
/* DESC : 엠마가 최초 실행시 각 프로세스의 상태정보를 Insert 한다.		*/
/* PARAMETERS															*/
/*   IN p_process_name : 엠마 프로세스 이름								*/
/*   IN p_pid          : 엠마 프로세스 PID(Thread ID)					*/
/*   IN p_service_type : 수행 서비스(0:sms, 1:MMS						*/
/*   IN p_conn_time    : 최초 연결 시각									*/
/*   IN p_conn_gw_info : 연결 G/W 정보									*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mon_status_insert(
    p_emma_id           IN      CHAR,
	p_process_name	 	IN	    VARCHAR,
	p_pid	 			IN	    VARCHAR,
	p_service_type	 	IN	    CHAR,
	p_conn_time	 		IN	    VARCHAR,
	p_conn_gw_info	 	IN	    VARCHAR
)
RETURNS void
AS $$
DECLARE
	sql_string  		VARCHAR(4000);
BEGIN

	INSERT INTO em_status (
	    emma_id,
		process_name,
		pid,
		service_type,
		cnt_today,
		cnt_total,
		cnt_resent_1,
		cnt_resent_10,
		que_size,
		conn_time,
		update_time,
		conn_gw_info,
		reg_date
	) values ( 
	    p_emma_id,
		p_process_name, 
		p_pid,
		p_service_type,
		0,
		0,
		0,
		0,
		0,
		p_conn_time,
		to_char( now(), 'yyyy-mm-dd hh24:mi:ss'),
		p_conn_gw_info,
		now()
	);    

	EXCEPTION
	/** duplicate error */
	WHEN unique_violation THEN
		sql_string := 'SELECT sp_em_mon_status_delete( ''' || p_emma_id || ''',''' || p_process_name || ''', ''' || p_pid || ''', ''' || p_service_type || ''' );';
		EXECUTE sql_string ;

		sql_string := 'SELECT sp_em_mon_status_insert( ''' || p_emma_id || ''',''' || p_process_name || ''', ''' || p_pid || ''', ''' || p_service_type || ''', ''' || p_conn_time || ''', ''' || p_conn_gw_info || ''' );';
		EXECUTE sql_string ;

	WHEN others THEN
		-- do nothing

END;  
$$ LANGUAGE plpgsql;


/****************************************************************************/
/* NAME : sp_em_mon_status_update											*/
/* DESC : 각 프로세스(스레드)의 상태 정보를 설정한 주기별로 업데이트 한다.	*/
/* PARAMETERS																*/
/*   IN p_process_name  : 엠마 프로세스 이름								*/
/*   IN p_pid           : 엠마 프로세스 PID(Thread ID)						*/
/*   IN p_service_type  : 수행 서비스(0:sms, 1:MMS							*/
/*   IN p_cnt_today     : 당일 처리 건수									*/
/*   IN p_cnt_total     : 엠마가 실행 후 현재까지 처리 건수					*/
/*   IN p_cnt_resent_1  : 최근 1분간 처리건수								*/
/*   IN p_cnt_resent_10 : 최근 10분간 처리건수								*/
/*   IN p_que_size      : 큐에 남은 건수									*/
/* REMARK																	*/
/*   N/A																	*/
/****************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mon_status_update(
	p_emma_id           IN      CHAR,
	p_process_name	 	IN	    VARCHAR,
	p_pid	 			IN	    VARCHAR,
	p_service_type	 	IN	    CHAR,
	p_cnt_today	 		IN	    NUMERIC,
	p_cnt_total	 		IN	    NUMERIC,
	p_cnt_resent_1		IN	    NUMERIC,
	p_cnt_resent_10	 	IN	    NUMERIC,
	p_que_size	 		IN	    NUMERIC
)
RETURNS void
AS $$
DECLARE
BEGIN
            
	 UPDATE em_status SET
		cnt_today               = p_cnt_today,
		cnt_total               = p_cnt_total,
		cnt_resent_1            = p_cnt_resent_1,
		cnt_resent_10         	= p_cnt_resent_10,
		que_size     			= p_que_size,
		update_time             = to_char( now(), 'yyyy-mm-dd hh24:mi:ss')
	WHERE emma_id               = p_emma_id
      AND process_name          = p_process_name
	  AND pid 					= p_pid
	  AND service_type			= p_service_type;
	
END; 
$$ LANGUAGE plpgsql;
    

/************************************************************************/
/* NAME : sp_em_mon_status_delete_all									*/
/* DESC : 엠마 기동시 기존 상태정보를 모두 삭제한다.					*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mon_status_delete_all(
	p_emma_id           IN      CHAR
)
RETURNS void 
AS $$
DECLARE
BEGIN

	DELETE FROM em_status
    WHERE emma_id = p_emma_id;
END;  
$$ LANGUAGE plpgsql;

    
/************************************************************************/
/* NAME : sp_em_mon_status_delete										*/
/* DESC : 기존에 남은 상태정보를 삭제한다.								*/
/* PARAMETERS															*/
/*   IN p_process_name  : 엠마 프로세스 이름							*/
/*   IN p_pid           : 엠마 프로세스 PID(Thread ID)					*/
/*   IN p_service_type  : 수행 서비스(0:sms, 1:MMS						*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mon_status_delete(
	p_emma_id           IN      CHAR,
	p_process_name	 	IN	    VARCHAR,
	p_pid	 			IN	    VARCHAR,
	p_service_type	 	IN	    CHAR
)
RETURNS void 
AS $$
DECLARE
BEGIN
		
	/* delete record */
	DELETE FROM em_status
	WHERE emma_id = p_emma_id
	AND process_name = p_process_name
	AND pid = p_pid
	AND service_type = p_service_type;
	
END;           
$$ LANGUAGE plpgsql;



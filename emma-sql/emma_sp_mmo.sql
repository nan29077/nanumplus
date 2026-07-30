/**
 * @(#)emma_sp_mmo.sql
 * Copyright 2008 InfoBank Corporation. All rights reserved.
 * emma mmo table ddl & dml.
 *
 *
 * MMS MO 서비스를 위한 PostgreSQL Stored Procedure 이다.
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

/****************************************************************************/
/* NAME : sp_em_mmo_log_create												*/
/* DESC : MMSMO 로그 테이블을 생성한다.										*/
/* PARAMETERS																*/
/*   p_log_table : 로그테이블 변경 postfix(년월)							*/
/* REMARK																	*/
/*   p_log_table이 YYYYMM이 default이지만 값을 변경하면 YYYY등의 확장 가능	*/
/****************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmo_log_create(
	p_log_table			IN		 VARCHAR
)
RETURNS void 
AS $$
DECLARE
	n_cnt           NUMERIC;
	sql_string      VARCHAR(4000);
BEGIN

	/** check em_mo_log table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_mo_log_' || p_log_table;

	IF n_cnt < 1 THEN
		/** em_mo_log table create  */
		sql_string := '
		CREATE TABLE em_mo_log_' || p_log_table || '
		(
			mo_key 			VARCHAR(50) NOT NULL,
			service_type 	CHAR(2) NOT NULL,
			mo_recipient 	VARCHAR(32) NOT NULL,
			emo_recipient 	VARCHAR(80),
			mo_originator 	VARCHAR(32) NOT NULL,
			mo_callback 	VARCHAR(32) NOT NULL,
			msg_status 		CHAR(1) default ''3'' NOT NULL ,
			subject 		VARCHAR(40),
			content 		VARCHAR(4000),
			date_mo 		TIMESTAMP NOT NULL,
			date_mo_recv 	TIMESTAMP default now() NOT NULL ,
			carrier 		NUMERIC(5),
			rs_id 			VARCHAR(20),    
			ems_id 			NUMERIC(3),
			ems_total 		NUMERIC(1),
			ems_seq 		NUMERIC(1),
			emma_id         CHAR(2)   default '' '',
			constraint pk_em_mo_log_' || p_log_table || ' primary key (mo_key)
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mo_log_' || p_log_table || '_1 ON em_mo_log_' || p_log_table || '(date_mo, mo_originator) ';
		EXECUTE sql_string ;

		sql_string := ' CREATE INDEX ix_em_mo_log_' || p_log_table || '_2 ON em_mo_log_' || p_log_table || '(carrier) ';
		EXECUTE sql_string ;

        /* comment create */
		sql_string := ' COMMENT ON TABLE em_mo_log_' || p_log_table || ' IS ''SMS / MMS MO 로그 테이블''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.mo_key IS ''인포뱅크 G/W가 보내온 메시지 키''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.service_type IS ''서비스 메시지 전송 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.mo_recipient IS ''mo 번호 (특번)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.emo_recipient IS ''mo 추가 번호 (특번), emo 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.mo_originator IS ''mo 보낸 핸드폰 원래 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.mo_callback IS ''mo 보낸 핸드폰에서 입력된 회신번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.msg_status IS ''메시지 상태''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.subject IS ''메시지 제목(mmsmo인 경우 사용)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.content IS ''메시지 내용''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.date_mo IS ''mo 발생 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.date_mo_recv IS ''인포뱅크로부터 mo를 수신한 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.carrier IS ''착신망 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.rs_id IS ''수신된 인포뱅크 G/W (RS) 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.ems_id IS ''LGT EMS Session ID''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.ems_total IS ''LGT EMS Session 전체 메시지 개수''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.ems_seq IS ''LGT EMS Session 메시지 순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mo_log_' || p_log_table || '.emma_id IS ''EMMA 이중화시 사용되는 EMMA ID''';
		EXECUTE sql_string;
		
	END IF;


	/** check em_mmo_file_log table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_mmo_file_log_' || p_log_table;

	IF n_cnt < 1 THEN
		/** em_mmo_file_log table create  */
		sql_string := '
			CREATE TABLE em_mmo_file_log_' || p_log_table || ' 
			(      
				mo_key 				VARCHAR(50) NOT NULL,
				mo_seq 				NUMERIC(11) NOT NULL,
				attach_file_key 	VARCHAR(50) NOT NULL,
				attach_file_subpath	VARCHAR(64) NOT NULL,
				attach_file_name 	VARCHAR(255) NOT NULL,
				attach_file_size 	NUMERIC(11) NOT NULL,
				attach_file_type 	VARCHAR(20) NOT NULL,
				reg_date 			TIMESTAMP default now() NOT NULL,
				constraint pk_em_mmo_file_log_' || p_log_table || ' primary key (mo_key, mo_seq)
			) '; 
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmo_file_log_' || p_log_table || '_1 ON em_mmo_file_log_' || p_log_table || ' (attach_file_name) ';
		EXECUTE sql_string ;
		
		/* comment create */
		sql_string := ' COMMENT ON TABLE em_mmo_file_log_' || p_log_table || ' IS ''MMS MO 첨부 파일 로그 테이블''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.mo_key IS ''인포뱅크 G/W가 보내온 메시지 키''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.mo_seq IS ''파일 순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.attach_file_key IS ''첨부화일 키''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.attach_file_subpath IS ''수신 파일 하위 경로''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.attach_file_name IS ''수신 파일 이름''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.attach_file_size IS ''수신 파일 사이즈''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.attach_file_type IS ''수신 파일 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmo_file_log_' || p_log_table || '.reg_date IS ''등록 시간''';
		EXECUTE sql_string;
		
	END IF;

END;
$$ LANGUAGE plpgsql;


/********************************************************************************/
/* NAME : sp_em_mmo_tran_insert													*/
/* DESC : SMS MO 수신 데이터를 em_mo_log_yyyymm 테이블에 Insert한다.			*/
/* PARAMETERS																	*/
/*   IN p_rs_id : 수신된 인포뱅크 G/W (RS) 정보									*/
/*   IN p_client_msg_key : 인포뱅크 G/W가 보내온 메시지 키						*/
/*   IN p_mo_recipient : mo 번호 (특번)											*/
/*   IN p_emo_recipient : mo 추가 번호 (특번), emo 번호							*/
/*   IN p_originator : mo 보낸 핸드폰 원래 번호									*/
/*   IN p_mo_callback : mo 보낸 핸드폰에서 입력된 회신번호						*/
/*   IN p_msg_status : 메시지 상태 3 MO 접수									*/
/*   IN p_subject : 메시지 제목													*/
/*   IN p_content : 메시지 내용													*/
/*   IN p_date_mo : mo 발생 시간												*/
/*   IN p_carrier : 착신망 정보 10001(SKT), 10002(KTF), 10003(LGT), 10000(ETC)	*/
/*   IN p_emma_id : EMMA 이중화시 사용되는 EMMA ID (' ' 인 경우: 이중화 사용안함, ' ' 아닌 경우: 이중화 사용함)  */
/* REMARK																		*/
/*   N/A																		*/
/********************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmo_tran_insert (
	p_rs_id 			IN		VARCHAR,
	p_client_msg_key 	IN		VARCHAR,
	p_mo_recipient 		IN		VARCHAR,
	p_emo_recipient 	IN		VARCHAR,
	p_originator 		IN		VARCHAR,
	p_mo_callback 		IN		VARCHAR,             
	p_msg_status		IN		CHAR,
	p_subject 			IN		VARCHAR,   
	p_content 			IN		VARCHAR,
	p_date_mo 			IN		TIMESTAMP,
	p_carrier 			IN		NUMERIC,
	p_emma_id           IN      CHAR
)
RETURNS void
AS $$
DECLARE
	sql_string			VARCHAR(4000);
	v_log_table			VARCHAR(6);
BEGIN

	v_log_table := TO_CHAR(p_date_mo, 'yyyymm'); 

	sql_string := ' INSERT INTO em_mo_log_' || v_log_table || ' (  ';

	sql_string := sql_string
		|| quote_ident( 'mo_key' )				|| ', '	
		|| quote_ident( 'service_type' ) 		|| ', '	
		|| quote_ident( 'mo_recipient' )		|| ', '	
		|| quote_ident( 'emo_recipient' )		|| ', '	
		|| quote_ident( 'mo_originator' )		|| ', '	
		|| quote_ident( 'mo_callback' )			|| ', '	
		|| quote_ident( 'msg_status' )			|| ', '	
		|| quote_ident( 'subject' )				|| ', '	
		|| quote_ident( 'content' )				|| ', '	
		|| quote_ident( 'date_mo' )				|| ', '	
		|| quote_ident( 'date_mo_recv' )		|| ', '	
		|| quote_ident( 'carrier' )				|| ', '	
		|| quote_ident( 'rs_id' )               || ', '			
		|| quote_ident( 'emma_id' )
		|| ' ) VALUES (  ' 
		|| quote_literal( p_client_msg_key )	|| ', '		
		|| quote_literal( 5 )					|| ', '	
		|| quote_literal( p_mo_recipient )		|| ', '	
		|| quote_literal( p_emo_recipient )		|| ', '	
		|| quote_literal( p_originator )		|| ', '	
		|| quote_literal( p_mo_callback )		|| ', '	
		|| quote_literal( p_msg_status )		|| ', '	
		|| quote_literal( p_subject )			|| ', '	
		|| quote_literal( p_content )			|| ', '	
		|| quote_literal( p_date_mo )			|| ', '	
		|| ' now() '							|| ', '	
		|| quote_literal( p_carrier )			|| ', '	
		|| quote_literal( p_rs_id )		        || ', '		
        || quote_literal( p_emma_id )					
		|| ' ) ' ;

	EXECUTE sql_string;

	EXCEPTION
	/** if table IS not exist THEN create table AND retry INSERT */
	WHEN undefined_table THEN
		sql_string := 'SELECT sp_em_mmo_log_create( ''' || v_log_table || ''' );';
		EXECUTE sql_string ;
		
		sql_string := 'SELECT sp_em_mmo_tran_insert( ''' || p_rs_id || ''', ''' || p_client_msg_key 
			|| ''', ''' || p_mo_recipient || ''', ''' || p_emo_recipient || ''', ''' || p_originator
			|| ''', ''' || p_mo_callback  || ''', ''' || p_msg_status    || ''', ''' || p_subject
			|| ''', ''' || p_content      || ''', ''' || p_date_mo       || ''', ''' || p_carrier || ''', ''' || p_emma_id || ''' );';
		EXECUTE sql_string ;

	WHEN others THEN
		-- do nothing
END;
$$ LANGUAGE plpgsql;

   
/************************************************************************/	
/* NAME : sp_em_mmo_file_insert											*/
/* DESC : SMS MO 수신 데이터를 em_mo_log_yyyymm 테이블에 Insert한다.	*/
/* PARAMETERS															*/
/*   IN p_date_mo : mo 발생 시간										*/
/*   IN p_client_msg_key : 인포뱅크 G/W가 보내온 메시지 키				*/
/*   IN p_mo_seq : 파일 순번											*/
/*   IN p_attach_file_key : 첨부화일 키									*/
/*   IN p_attach_file_subpath : 수신 파일 하위 경로						*/
/*   IN p_attach_file_name : 수신 파일 이름								*/
/*   IN p_attach_file_size : 수신 파일 사이즈							*/
/*   IN p_attach_file_type : 수신 파일 타입								*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmo_file_insert (
	p_date_mo 				IN		TIMESTAMP,
	p_client_msg_key 		IN		VARCHAR,
	p_mo_seq 				IN		NUMERIC,
	p_attach_file_key 		IN		VARCHAR,
	p_attach_file_subpath 	IN		VARCHAR,
	p_attach_file_name 		IN		VARCHAR,
	p_attach_file_size 		IN		NUMERIC,
	p_attach_file_type 		IN		VARCHAR
)
RETURNS void
AS $$
DECLARE
	sql_string  VARCHAR(4000);
	v_log_table	VARCHAR(6);
BEGIN

	v_log_table := TO_CHAR(p_date_mo, 'yyyymm'); 

	sql_string := ' INSERT INTO em_mmo_file_log_' || v_log_table || ' ( ';

	sql_string := sql_string
		|| quote_ident( 'mo_key' )				|| ', '	
		|| quote_ident( 'mo_seq' )				|| ', '	
		|| quote_ident( 'attach_file_key' )				|| ', '	
		|| quote_ident( 'attach_file_subpath' )				|| ', '	
		|| quote_ident( 'attach_file_name' )				|| ', '	
		|| quote_ident( 'attach_file_size' )				|| ', '	
		|| quote_ident( 'attach_file_type' )				|| ', '	
		|| quote_ident( 'reg_date' )
		|| ' ) VALUES (  ' 
		|| quote_literal( p_client_msg_key )	|| ', '		
		|| quote_literal( p_mo_seq )	|| ', '		
		|| quote_literal( p_attach_file_key )	|| ', '		
		|| quote_literal( p_attach_file_subpath )	|| ', '		
		|| quote_literal( p_attach_file_name )	|| ', '		
		|| quote_literal( p_attach_file_size )	|| ', '		
		|| quote_literal( p_attach_file_type )	|| ', '		
		|| ' now() '
		|| ' ) ' ;

        EXECUTE sql_string;

	EXCEPTION
	/** if table IS not exist THEN create table AND retry INSERT */
	WHEN undefined_table THEN
		sql_string := 'SELECT sp_em_mmo_log_create( ''' || v_log_table || ''' );';
		EXECUTE sql_string ;
		
		sql_string := 'SELECT sp_em_mmo_file_insert( ''' 
			|| p_date_mo             || ''', ''' || p_client_msg_key    || ''', ''' || p_mo_seq              || ''', ''' || p_attach_file_key || ''', ''' 
			|| p_attach_file_subpath || ''', ''' || p_attach_file_name  || ''', ''' || p_attach_file_size    || ''', ''' || p_attach_file_type || ''' );';
		EXECUTE sql_string ;
			
	WHEN others THEN
		-- do nothing

END;
$$ LANGUAGE plpgsql;
    

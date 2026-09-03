/**
 * @(#)emma_sp_mmt.sql
 * Copyright 2008 InfoBank Corporation. All rights reserved.
 * emma mmt table ddl & dml.
 *
 *
 * MMS MT 서비스를 위한 PostgreSQL Stored Procedure 이다.
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
/* NAME : sp_em_mmt_create													*/
/* DESC : MMSMT 서비스 관련 테이블을 생성한다.								*/
/* PARAMETERS																*/
/*   N/A																	*/
/* REMARK																	*/
/*   em_mmt_tran :  MMSMT 전송 테이블										*/
/*   em_mmt_client : 동보 전송을 위한 수신번호 테이블(em_mmt_tran의 Detail) */
/****************************************************************************/
/** 테이블이 존재하는 지 확인한 후 없으면 테이블 / 인덱스 / 시퀀스 등을 생성하는 형태 */

CREATE OR REPLACE FUNCTION sp_em_mmt_create()
RETURNS void 
AS $$ 
DECLARE
	n_cnt		NUMERIC;
	sql_string	VARCHAR(4000);
BEGIN

	/** check em_mmt_tran table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_mmt_tran';

	IF n_cnt < 1 THEN

		/** em_mmt_tran table create  */
		sql_string := '
		CREATE TABLE em_mmt_tran
		(
			mt_pr					NUMERIC(11) NOT NULL,
			msg_key					VARCHAR(20),
			input_type				CHAR(1) default ''0'' NOT NULL ,
			mt_refkey				VARCHAR(20),
			priority				CHAR(2)  default ''S'' NOT NULL,
			msg_class				CHAR(1) default ''1'',
			date_client_req			TIMESTAMP NOT NULL ,
			subject					VARCHAR(40) NOT NULL,
			content_type          	NUMERIC(5) default 0,
			content					VARCHAR(4000) NOT NULL,
			attach_file_group_key	NUMERIC(11) default 0,
			callback				VARCHAR(25) NOT NULL,
			service_type			CHAR(2) NOT NULL,
			broadcast_yn			CHAR(1) default ''N'' NOT NULL ,
			msg_status				CHAR(1) default ''1'' NOT NULL ,
			recipient_num			VARCHAR(25),
			date_mt_sent			TIMESTAMP,
			date_rslt				TIMESTAMP,
			date_mt_report			TIMESTAMP,
			mt_report_code_ib		CHAR(4),
			mt_report_code_ibtype	CHAR(1),
			carrier					NUMERIC(5),
			rs_id					VARCHAR(20),
			recipient_net			NUMERIC(5),
			recipient_npsend		VARCHAR(1),
			country_code			VARCHAR(8) default ''82'' NOT NULL ,
			charset					VARCHAR(20),
			msg_type				NUMERIC(11),
			crypto_yn				CHAR(1) default ''N'',
			ttl						NUMERIC(5),
			emma_id               	CHAR(2) default '' '',
			reg_date				TIMESTAMP default NOW(),
			mt_res_cnt				NUMERIC(5),
			client_sub_id			VARCHAR(20),
			origin_cid               VARCHAR(20),
			constraint pk_em_mmt_tran primary key (mt_pr)
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_tran_01 ON em_mmt_tran(msg_status, date_client_req) ';
		EXECUTE sql_string ;           

		sql_string := ' CREATE INDEX ix_em_mmt_tran_02 ON em_mmt_tran(recipient_num) ';
		EXECUTE sql_string ;

		sql_string := ' CREATE INDEX ix_em_mmt_tran_03 ON em_mmt_tran(attach_file_group_key) ';
		EXECUTE sql_string ;
		
		sql_string := ' CREATE INDEX ix_em_mmt_tran_04 ON em_mmt_tran(emma_id) ';
		EXECUTE sql_string ;
		
		sql_string := ' CREATE INDEX ix_em_mmt_tran_05 ON em_mmt_tran(msg_key) ';
		EXECUTE sql_string ;

		/** sequence create  */
		sql_string := ' CREATE SEQUENCE sq_em_mmt_tran_01 INCREMENT BY 1 START WITH 1 ';
		EXECUTE sql_string ;

        /* comment create */
        sql_string := ' COMMENT ON TABLE em_mmt_tran IS ''MMS MT 전송 테이블(Master)''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.mt_pr IS ''sequence''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.msg_key IS ''메시지 고유 key''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.input_type IS ''발송 유형''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.mt_refkey IS ''부서 코드 (참조용 필드)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.priority IS ''메시지 우선 순위''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.msg_class IS ''메시지 등급 구분, 일반/광고 구분''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.date_client_req IS ''전송 예약 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.subject IS ''메시지 제목''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.content_type IS ''전송 메시지 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.content IS ''전송 메시지''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.attach_file_group_key IS ''첨부 파일 그룹키 (생략 시, LMS)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.callback IS ''발신자 전화 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.service_type IS ''서비스 메시지 전송 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.broadcast_yn IS ''동보발송유무''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.msg_status IS ''메시지 상태''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.recipient_num IS ''수신자 전화 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.date_mt_sent IS ''인포뱅크 G/W 접수 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.date_rslt IS ''단말기 도착 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.date_mt_report IS ''인포뱅크로부터 결과 수신한 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.mt_report_code_ib IS ''전송 결과''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.mt_report_code_ibtype IS ''전송 결과 분류''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.carrier IS ''착신망 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.rs_id IS ''전송된 인포뱅크 G/W 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.recipient_net IS ''전송 요청 통신사 (고객이 해당이통사 정의하는 필드)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.recipient_npsend IS ''전송 요청 통신사에 값이 들어있는 경우 번호 결과 수신 시 재 전송 할건지 여부''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.country_code IS ''국가 코드''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.charset IS ''메시지의 CHARSET ''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.msg_type IS ''메시지 종류 ''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.crypto_yn IS ''암호화 사용 유무''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.ttl IS ''전송 유효 시간 설정 (단위, 분)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.emma_id IS ''EMMA 이중화시 사용되는 EMMA ID''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.reg_date IS ''데이터 등록일자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.mt_res_cnt IS ''분할 발송 된 결과 값에 대한 건수 (국제 발송)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.client_sub_id IS ''Sender ID, 메시지 서명을 복수로 지정하기 위한 구분자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_tran.origin_cid IS ''발신자 식별코드''';
		EXECUTE sql_string;
		
	END IF;


	/** check em_mmt_client table is exist */
	SELECT COUNT(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_mmt_client';

	IF n_cnt < 1 THEN

		/** em_mmt_client table create  */
		sql_string := '
		CREATE TABLE em_mmt_client
		(
			mt_pr					NUMERIC(11) NOT NULL,
			mt_seq					NUMERIC(11) NOT NULL,
			msg_status				CHAR(1) default ''1'' NOT NULL ,
			recipient_num			VARCHAR(25) NOT NULL,
			change_word1			VARCHAR(20),
			change_word2			VARCHAR(20),
			change_word3			VARCHAR(20),
			change_word4			VARCHAR(20),
			change_word5			VARCHAR(20),
			date_mt_sent			TIMESTAMP,
			date_rslt				TIMESTAMP,
			date_mt_report			TIMESTAMP,
			mt_report_code_ib		CHAR(4),
			mt_report_code_ibtype	CHAR(1),
			carrier					NUMERIC(5),
			rs_id					VARCHAR(20),
			recipient_net			NUMERIC(5),
			recipient_npsend		VARCHAR(1),
			country_code			VARCHAR(8) default ''82'' NOT NULL ,
			reg_date              	TIMESTAMP default NOW(),
			mt_res_cnt				NUMERIC(5),
			constraint pk_em_mmt_client primary key (mt_pr, mt_seq)  
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_client_01 ON em_mmt_client(recipient_num) ';
		EXECUTE sql_string ;

		sql_string := ' CREATE INDEX ix_em_mmt_client_02 ON em_mmt_client(msg_status) ';
		EXECUTE sql_string ;

		/* comment create */
		sql_string := ' COMMENT ON TABLE em_mmt_client IS ''수신자 번호 리스트 테이블(Detail)''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mmt_client.mt_pr IS ''마스터 키 (전송 테이블 PK)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.mt_seq IS ''순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.msg_status IS ''메시지 상태''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.recipient_num IS ''수신자 전화 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.change_word1 IS ''메시지 동보 단어 1''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.change_word2 IS ''메시지 동보 단어 2''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.change_word3 IS ''메시지 동보 단어 3''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.change_word4 IS ''메시지 동보 단어 4''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.change_word5 IS ''메시지 동보 단어 5''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.date_mt_sent IS ''인포뱅크 G/W 접수 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.date_rslt IS ''단말기 도착 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.date_mt_report IS ''인포뱅크로부터 결과 수신한 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.mt_report_code_ib IS ''전송 결과''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.mt_report_code_ibtype IS ''전송 결과 분류''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.carrier IS ''착신망 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.rs_id IS ''전송된 인포뱅크 G/W (RS) 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.recipient_net IS ''전송 요청 통신사 (고객이 해당이통사 정의하는 필드)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.recipient_npsend IS ''전송 요청 통신사에 값이 들어있는 경우 번호 결과 수신 시 재 전송 할건지 여부''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.country_code IS ''국가 코드''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.reg_date IS ''데이터 등록일자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_client.mt_res_cnt IS ''분할 발송 된 결과 값에 대한 건수 (국제 발송)''';
        EXECUTE sql_string;
		
	END IF;


	/** check em_mmt_file_group table is exist */
	SELECT COUNT(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = 'em_mmt_file';

	IF n_cnt < 1 THEN

		/* create em_mmt_file table, file master */
		sql_string := '

		CREATE TABLE em_mmt_file
		(
			attach_file_group_key 	NUMERIC(11) NOT NULL,
			attach_file_group_seq 	NUMERIC(11) NOT NULL,
			attach_file_seq 		NUMERIC(11),
			attach_file_subpath 	VARCHAR(64),
			attach_file_name 		VARCHAR(64) NOT NULL,
			attach_file_carrier		NUMERIC(11),
			reg_date 				TIMESTAMP default NOW() NOT NULL,
			constraint pk_em_mmt_file primary key (attach_file_group_key, attach_file_group_seq)
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_file_01 ON em_mmt_file(attach_file_seq) ';
		EXECUTE sql_string ;

		sql_string := ' CREATE INDEX ix_em_mmt_file_02 ON em_mmt_file(attach_file_name) ';
		EXECUTE sql_string ;
		
		/* comment create */
		sql_string := ' COMMENT ON TABLE em_mmt_file IS ''MMS MT 첨부 파일 테이블''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_group_key IS ''파일 그룹키''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_group_seq IS ''파일 그룹키 순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_seq IS ''파일 순번(키)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_subpath IS ''파일 하위 경로''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_name IS ''파일이름''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.attach_file_carrier IS ''전송 요청 이통사''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_file.reg_date IS ''등록 시간''';
		EXECUTE sql_string;
		
	END IF;

END;
$$ LANGUAGE plpgsql;


/****************************************************************************/
/* NAME : sp_em_mmt_log_temp_create											*/
/* DESC : MMSMT 서비스 관련 테이블을 생성한다.								*/
/* PARAMETERS																*/
/*   N/A																	*/
/* REMARK																	*/
/*   em_mmt_log_temp : temporary table										*/
/****************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_log_temp_create(
	p_emma_id			IN		 VARCHAR
)
RETURNS void 
AS $$ 
DECLARE
	n_cnt		NUMERIC;
	sql_string	VARCHAR(4000);
	v_table_suffix    VARCHAR(50);
BEGIN

	v_table_suffix := '';
	
	IF LENGTH(TRIM(p_emma_id)) > 0 THEN
		v_table_suffix := '_' || p_emma_id;
	END IF;

	/** check em_mmt_log_temp table is exist */
	sql_string := 'SELECT count(1) FROM pg_tables WHERE lower(tablename) = lower(''em_mmt_log_temp' || v_table_suffix || ''')';
	EXECUTE sql_string
	INTO n_cnt;

	IF n_cnt < 1 THEN

		/** em_mmt_log_temp table create  */
		sql_string := '
		create table em_mmt_log_temp' || v_table_suffix || '
		(
			mt_pr 					NUMERIC(11) NOT NULL,
			mt_seq 					NUMERIC(11) NOT NULL,
			msg_key 				VARCHAR(20),
			input_type 				CHAR(1)  default ''0'' NOT NULL,
			mt_refkey 				VARCHAR(20),
			priority 				CHAR(2)  default ''S'' NOT NULL,
			msg_class 				CHAR(1) default ''1'',
			date_client_req 		TIMESTAMP NOT NULL ,
			subject 				VARCHAR(40) NOT NULL,
			content_type         	NUMERIC(5) default 0,
			content 				VARCHAR(4000) NOT NULL,
			attach_file_group_key 	NUMERIC(11),
			callback 				VARCHAR(25) NOT NULL,
			service_type 			CHAR(2) NOT NULL,
			broadcast_yn 			CHAR(1) default ''N'' NOT NULL ,
			msg_status 				CHAR(1) default ''1'' NOT NULL ,
			recipient_num 			VARCHAR(25),
			change_word1 			VARCHAR(20),
			change_word2 			VARCHAR(20),
			change_word3 			VARCHAR(20),
			change_word4 			VARCHAR(20),
			change_word5 			VARCHAR(20),
			date_mt_sent 			TIMESTAMP,
			date_rslt 				TIMESTAMP,
			date_mt_report 			TIMESTAMP,
			mt_report_code_ib 		CHAR(4),
			mt_report_code_ibtype 	CHAR(1),
			carrier 				NUMERIC(5),
			rs_id 					VARCHAR(20),
			recipient_net 			NUMERIC(5),
			recipient_npsend 		VARCHAR(1),
			country_code 			VARCHAR(8) default ''82'' NOT NULL ,
			charset 				VARCHAR(20),
			msg_type 				NUMERIC(11),
			crypto_yn 				CHAR(1) default ''N'',
			ttl						NUMERIC(5),
			emma_id               	CHAR(2)                default '' '',
        	reg_date_tran         	TIMESTAMP,
       		reg_date              	TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
        	mt_res_cnt            	NUMERIC(5),
        	client_sub_id			VARCHAR(20),
            origin_cid               VARCHAR(20)
		) ';
		EXECUTE sql_string ;   
		
	END IF;      

END;
$$ LANGUAGE plpgsql;


/****************************************************************************/
/* NAME : sp_em_mmt_log_create												*/
/* DESC : MMSMT 로그 테이블을 생성한다.										*/
/* PARAMETERS																*/
/*   p_log_table : 로그테이블 변경 postfix(년월)							*/	
/* REMARK																	*/
/*   p_log_table이 YYYYMM이 default이지만 값을 변경하면 YYYY등의 확장 가능	*/
/****************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_log_create(
	p_log_table			IN		 VARCHAR
)
RETURNS void 
AS $$
DECLARE
	n_cnt           NUMERIC;
	sql_string      VARCHAR(4000);
	v_table_name    VARCHAR(50);
BEGIN

	v_table_name := 'em_mmt_log_' || p_log_table;

	/** check em_mmt_log table is exist */
	SELECT count(1)
	INTO n_cnt
	FROM pg_tables
	WHERE lower(tablename) = v_table_name;

	IF n_cnt < 1 THEN
		/** em_mmt_log table create  */
		sql_string := '
		CREATE TABLE em_mmt_log_' || p_log_table || '
		(
			mt_pr 					NUMERIC(11) NOT NULL,
			mt_seq 					NUMERIC(11) NOT NULL,
			msg_key 				VARCHAR(20),
			input_type 				CHAR(1) default ''0'',
			mt_refkey 				VARCHAR(20),
			priority 				CHAR(2)  default ''S'' NOT NULL,
			msg_class 				CHAR(1) default ''1'',
			date_client_req 		TIMESTAMP NOT NULL ,
			subject 				VARCHAR(40) NOT NULL,
			content_type         	NUMERIC(5) default 0,
			content 				VARCHAR(4000) NOT NULL,
			attach_file_group_key 	NUMERIC(11),
			callback 				VARCHAR(25) NOT NULL,
			service_type 			CHAR(2) NOT NULL,
			broadcast_yn 			CHAR(1) default ''N'' NOT NULL ,
			msg_status 				CHAR(1) default ''1'' NOT NULL ,
			recipient_num 			VARCHAR(25),
			change_word1 			VARCHAR(20),
			change_word2 			VARCHAR(20),
			change_word3 			VARCHAR(20),
			change_word4 			VARCHAR(20),
			change_word5 			VARCHAR(20),
			date_mt_sent 			TIMESTAMP,
			date_rslt 				TIMESTAMP,
			date_mt_report 			TIMESTAMP,
			mt_report_code_ib 		CHAR(4),
			mt_report_code_ibtype 	CHAR(1),
			carrier 				NUMERIC(5),
			rs_id 					VARCHAR(20),
			recipient_net 			NUMERIC(5),
			recipient_npsend 		VARCHAR(1),
			country_code 			VARCHAR(8) default ''82'' NOT NULL ,
			charset 				VARCHAR(20),
			msg_type 				NUMERIC(11),
			crypto_yn 				CHAR(1) default ''N'',
			ttl						NUMERIC(5),
			emma_id               	CHAR(2) default '' '',
			reg_date_tran         	TIMESTAMP,
			reg_date              	TIMESTAMP default NOW(),
			mt_res_cnt            	NUMERIC(5),
			client_sub_id			VARCHAR(20),
			origin_cid               VARCHAR(20),
			constraint pk_em_mmt_log_' || p_log_table || '  primary key (mt_pr, mt_seq) 
		) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_log_' || p_log_table || '_01 ON em_mmt_log_' || p_log_table || '(date_client_req, recipient_num) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_log_' || p_log_table || '_02 ON em_mmt_log_' || p_log_table || '(date_mt_report, mt_report_code_ib) ';
		EXECUTE sql_string ;

		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_log_' || p_log_table || '_03 ON em_mmt_log_' || p_log_table || '(msg_status) ';
		EXECUTE sql_string ;
		
		/** index create  */
		sql_string := ' CREATE INDEX ix_em_mmt_log_' || p_log_table || '_04 ON em_mmt_log_' || p_log_table || '(msg_key) ';
		EXECUTE sql_string ;

		/* comment create */
		sql_string := ' COMMENT ON TABLE em_mmt_log_' || p_log_table || ' IS ''MMS MT 년/월별 로그 테이블''';
		EXECUTE sql_string;
			
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_pr IS ''마스터 키 (전송 테이블 PK)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_seq IS ''순번''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.msg_key IS ''메시지 고유 key''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.input_type IS ''발송 유형''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_refkey IS ''부서 코드 (참조용 필드)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.priority IS ''메시지 우선 순위''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.msg_class IS ''메시지 등급 구분, 일반/광고 구분''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.date_client_req IS ''전송 예약 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.subject IS ''메시지 제목''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.content_type IS ''전송 메시지 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.content IS ''전송 메시지''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.attach_file_group_key IS ''첨부 파일 그룹키''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.callback IS ''발신자 전화 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.service_type IS ''서비스 메시지 전송 타입''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.broadcast_yn IS ''동보발송유무''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.msg_status IS ''메시지 상태''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.recipient_num IS ''수신자 전화 번호''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.change_word1 IS ''메시지 동보 단어 1''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.change_word2 IS ''메시지 동보 단어 2''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.change_word3 IS ''메시지 동보 단어 3''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.change_word4 IS ''메시지 동보 단어 4''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.change_word5 IS ''메시지 동보 단어 5''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.date_mt_sent IS ''인포뱅크 G/W 접수 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.date_rslt IS ''단말기 도착 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.date_mt_report IS ''인포뱅크로부터 결과 수신한 시간''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_report_code_ib IS ''전송 결과''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_report_code_ibtype IS ''전송 결과 분류''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.carrier IS ''착신망 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.rs_id IS ''전송된 인포뱅크 G/W (RS) 정보''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.recipient_net IS ''전송 요청 통신사 (고객이 해당이통사 정의하는 필드)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.recipient_npsend IS ''전송 요청 통신사에 값이 들어있는 경우 번호 결과 수신 시 재 전송 할건지 여부''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.country_code IS ''국가 코드''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.charset IS ''메시지의 CHARSET ''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.msg_type IS ''메시지 종류 ''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.crypto_yn IS ''암호화 사용 유무''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.ttl IS ''전송 유효 시간 설정 (단위, 분)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.emma_id IS ''EMMA 이중화시 사용되는 EMMA ID''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.reg_date_tran IS ''tran 테이블 데이터 등록 일자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.reg_date IS ''log 테이블 데이터 등록 일자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.mt_res_cnt IS ''분할 발송 된 결과 값에 대한 건수 (국제 발송)''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.client_sub_id IS ''Sender ID, 메시지 서명을 복수로 지정하기 위한 구분자''';
		EXECUTE sql_string;
		sql_string := ' COMMENT ON COLUMN em_mmt_log_' || p_log_table || '.origin_cid IS ''발신자 식별코드''';
		EXECUTE sql_string;
			
	END IF;

END;
$$ LANGUAGE plpgsql;


/********************************************************************************/
/* NAME : sp_em_mmt_tran_select													*/
/* DESC : MMSMT 전송 테이블로 부터 전송할 메시지를 조회한다.					*/
/* PARAMETERS																	*/
/*   OUT p_list : Resultset														*/
/*   IN p_priority : 메시지 우선순위(VF/F/S)									*/
/*   IN p_ttl : 전송 유효 시간 (단위: 분)										*/
/*   IN p_emma_id : EMMA 이중화시 EMMA ID										*/
/*   IN p_bancheck_yn : 수신차단테이블 체크 여부								*/
/* REMARK																		*/
/*   조회 결과의 필드명은 꼭 지켜져야 한다.										*/
/*   한번에 쿼리할 수 있는 개수는 조절 가능하지만, 변경 후 테스트가 필요하다.	*/
/********************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_tran_select(
	p_priority		IN	CHAR,
	p_ttl			IN	NUMERIC,
	p_emma_id		IN	CHAR,
	p_bancheck_yn	IN	CHAR
)
RETURNS refcursor
AS $$
DECLARE
	p_list			refcursor;
	sql_string		VARCHAR(4000);
	v_mt_pr         NUMERIC;
BEGIN

	IF p_emma_id <> ' ' THEN
		sql_string := '
			SELECT mt_pr 
				FROM em_mmt_tran
				WHERE  priority = ''' || p_priority || '''
		        AND msg_status = ''1''      
		        AND date_client_req < now() 
				AND date_client_req > now() - interval ''' || p_ttl || ' minute ''
		        AND emma_id = '' '' LIMIT 300 FOR UPDATE ';
		EXECUTE sql_string;
		
		OPEN p_list FOR EXECUTE sql_string;
            LOOP		
            	FETCH p_list INTO v_mt_pr;
                EXIT WHEN NOT FOUND; 	
					
				BEGIN
                    UPDATE em_mmt_tran SET 
                        emma_id = p_emma_id
                    WHERE mt_pr = v_mt_pr;              
                                
                EXCEPTION
                    WHEN others THEN
                        ROLLBACK; 
                        RAISE;
                END;
			END LOOP;

			CLOSE p_list;		
		
	END IF;
		
	sql_string := '
	SELECT 
		A.mt_pr					AS mt_pr,
		A.mt_refkey				AS mt_refkey,
		A.subject				AS subject,
		A.content_type          AS content_type,
		A.content				AS content,
		A.priority				AS priority,
		A.broadcast_yn			AS broadcast_yn,
		A.callback				AS callback,
		A.recipient_num			AS recipient_num,
		A.recipient_net			AS recipient_net,
		A.recipient_npsend		AS recipient_npsend,
		A.country_code			AS country_code,
		to_char( A.date_client_req, ''yyyy-mm-dd hh24:mi:ss'')	AS date_client_req,
        to_char( A.reg_date, ''yyyy-mm-dd hh24:mi:ss'')  AS reg_date,
		A.charset				AS charset,
		A.msg_class				AS msg_class, 
		A.attach_file_group_key	AS attach_file_group_key,
		A.msg_type				AS msg_type,
		A.crypto_yn				AS crypto_yn,
		A.service_type			AS service_type,
		A.ttl					AS ttl,
		B.ban_type				AS ban_type,
		B.send_yn				AS send_yn,
		A.client_sub_id			AS client_sub_id,
		A.origin_cid              AS origin_cid
	FROM em_mmt_tran A
		LEFT OUTER JOIN em_banlist B
		ON  A.recipient_num = B.content
		AND A.service_type = B.service_type
		AND B.ban_type = ''R''
		AND B.ban_status_yn = ''Y''
	WHERE A.emma_id = ''' || p_emma_id || '''
	AND   A.priority = ''' || p_priority || '''
	AND   A.msg_status = ''1'' 
	AND   A.date_client_req < now()
	AND   A.date_client_req > now() - interval ''' || p_ttl || ' minute''
    LIMIT 300 ';

	OPEN p_list FOR EXECUTE sql_string;
	RETURN p_list;

END;
$$ LANGUAGE plpgsql;


/********************************************************************************/
/* NAME : sp_em_mmt_client_select												*/
/* DESC : MMSMT 동보 전송 테이블로 부터 전송할 메시지를 조회한다.				*/
/* PARAMETERS																	*/
/*   OUT p_list : Resultset														*/
/*   IN p_mt_pr : 마스터테이블(EM_MMT_TRAN)의 전송키							*/
/*   IN p_service_type : 서비스 구분 (0: SMT, 1:URL, 2:MMT)						*/
/*   IN p_bancheck_yn : 수신차단TABLE 체크 여부									*/
/* REMARK																		*/
/*   조회 결과의 필드명은 꼭 지켜져야 한다.										*/
/*   한번에 쿼리할 수 있는 개수는 조절 가능하지만, 변경 후 테스트가 필요하다.	*/
/********************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_client_select(
	p_mt_pr		        IN		VARCHAR,
	p_service_type		IN		CHAR,
	p_bancheck_yn       IN      CHAR
)
RETURNS refcursor
AS $$
DECLARE
	p_list				refcursor;
	sql_string			VARCHAR(4000);
BEGIN

	sql_string := '
		SELECT
			A.mt_pr				AS mt_pr,
			A.mt_seq			AS mt_seq,
			A.recipient_num		AS recipient_num,
			A.recipient_net		AS recipient_net,
			A.recipient_npsend	AS recipient_npsend,	
			A.country_code		AS country_code,
			A.change_word1		AS change_word1,
			A.change_word2		AS change_word2,
			A.change_word3		AS change_word3,
			A.change_word4		AS change_word4,
			A.change_word5		AS change_word5,
			B.ban_type 			AS ban_type,
			B.send_yn 			AS send_yn
		FROM em_mmt_client A 
		LEFT OUTER JOIN em_banlist B 
		ON  A.recipient_num = B.content
		AND B.service_type =  ''' || p_service_type || '''
		AND B.ban_type = ''R''
		AND B.ban_status_yn = ''Y''
		WHERE A.mt_pr = ''' || p_mt_pr || '''
		AND   A.msg_status = ''1''  
	    LIMIT 300 ';

	OPEN p_list FOR EXECUTE sql_string;
	RETURN p_list;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_mmt_file_select											*/
/* DESC : MMSMT에 첨부파일이 있을경우 첨부파일 정보를 조회한다.			*/
/* PARAMETERS															*/
/*   OUT p_list : Resultset												*/
/*   IN p_attach_file_group_key : 첨부파일 그룹키						*/
/* REMARK																*/
/*   조회 결과의 필드명은 꼭 지켜져야 한다.								*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_file_select(	
	p_attach_file_group_key	IN		NUMERIC
)
RETURNS refcursor
AS $$
DECLARE
	p_list					refcursor;
	sql_string				VARCHAR(4000);
BEGIN

	sql_string := '		
		SELECT
			attach_file_group_key,
			attach_file_group_seq,
			attach_file_seq,
			attach_file_subpath,
			attach_file_name,
			attach_file_carrier
		 FROM em_mmt_file
		WHERE attach_file_group_key = ''' || p_attach_file_group_key || '''
		LIMIT 50 ';

	OPEN p_list FOR EXECUTE sql_string;
	RETURN p_list;

END;
$$ LANGUAGE plpgsql;


/****************************************************************************/
/* NAME : sp_em_mmt_update													*/
/* DESC : MMSMT 발송을 위한 큐에 데이터 적재 후 상태정보를 업데이트 한다.	*/
/* PARAMETERS																*/
/*   IN p_table_divi : 업데이트할 테이블(마스터/디테일 ) 구분				*/
/*   IN p_update_all : 동보테이블 전체 업데이트 여부						*/
/*   IN p_mt_pr : 마스터 테이블 키											*/
/*   IN p_mt_seq : 디테일 테이블 키(개별전송시 0, 동보전송시 해당순번		*/
/*   IN p_msg_status : 메시지 상태 (정상-2, 실패-3)							*/
/*   IN p_mt_report_code_ib : 오류시 결과 코드								*/
/*   IN p_mt_report_code_ibtype : 오류결과코드분류							*/
/*   IN p_msg_key 				: 전송키 (EMMA-3.6.6부터 사용안함)          */
/* REMARK																	*/
/*   N/A																	*/
/****************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmt_update(
	p_table_divi        	IN	    CHAR,
	p_update_all        	IN	    CHAR,
	p_mt_pr		        	IN	    VARCHAR,
	p_mt_seq            	IN	    NUMERIC,
	p_msg_status        	IN	    CHAR,
	p_mt_report_code_ib 	IN	    CHAR,
	p_mt_report_code_ibtype	IN	    CHAR,
	p_msg_key				IN	    CHAR
)
RETURNS void
AS $$
DECLARE
    sql_string  VARCHAR(1000);
    v_msg_key   VARCHAR(20);
BEGIN
	
	IF ( p_table_divi = 'M' ) THEN
		sql_string := ' UPDATE em_mmt_tran SET ';
	ELSEIF ( p_table_divi = 'D' ) THEN
		sql_string := ' UPDATE em_mmt_client SET ';
	END IF;

	sql_string := sql_string 
		|| quote_ident( 'msg_status' )
		|| ' = '
		|| quote_literal( p_msg_status )
		|| ',  '
		|| quote_ident( 'mt_report_code_ib' )
		|| ' = '
		|| quote_literal( p_mt_report_code_ib )
		|| ',  '
		|| quote_ident( 'mt_report_code_ibtype' )
		|| ' = '
		|| quote_literal( p_mt_report_code_ibtype )
		|| ',  '
		|| quote_ident( 'date_mt_sent' )
		|| ' = '
		|| quote_literal( now() )
        || '  WHERE '
		|| quote_ident( 'mt_pr' )
		|| ' = '
		|| quote_literal( p_mt_pr );

	IF ( p_table_divi = 'D' AND p_update_all = 'N' ) THEN
		sql_string := sql_string || '  AND  ';
		sql_string := sql_string
			|| quote_ident( 'mt_seq' )
			|| ' = '
			|| quote_literal( p_mt_seq );
	END IF;

	EXECUTE sql_string;

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_mmt_tran_rslt_update									*/
/* DESC : MMSMT 이통사 전송 결과를 업데이트 한다.						*/
/* PARAMETERS															*/
/*   IN p_mt_report_code_ib : 이통사 결과코드							*/
/*   IN p_mt_report_code_ibtype : 이통사 결과코드 분류					*/
/*   IN p_rs_id : 전송 IB RS아이디										*/
/*   IN p_client_msg_key : 전송키(mt_pr)								*/
/*   IN p_msg_status : 전송키의 하위 순번(mt_seq)						*/
/*   IN p_carrier : 전송 이통사 코드									*/
/*   IN p_date_rslt : 단말기 도착시각									*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmt_tran_rslt_update(
	p_mt_report_code_ib 	IN	    CHAR,
	p_mt_report_code_ibtype	IN	    CHAR,
	p_rs_id		        	IN	    VARCHAR,
	p_client_msg_key    	IN	    VARCHAR,
	p_recipient_order    	IN	    NUMERIC,
	p_carrier	    		IN	    NUMERIC,
	p_date_rslt    	    	IN	    TIMESTAMP,
	p_mt_res_cnt	    	IN	    NUMERIC
)
RETURNS void 
AS $$
DECLARE
    sql_string         VARCHAR(4000);
    v_date_client_req  VARCHAR(8);
    v_log_table        VARCHAR(6);
BEGIN

	/*
	UPDATE em_mmt_tran  SET
		msg_status 				= '3',
		date_rslt 				= p_date_rslt,
		date_mt_report 			= now(),
		mt_report_code_ib 		= p_mt_report_code_ib,
		mt_report_code_ibtype 	= p_mt_report_code_ibtype,
		carrier 				= p_carrier,
		rs_id 					= p_rs_id,
		mt_res_cnt            	= p_mt_res_cnt
	WHERE msg_key			 	= p_client_msg_key;
	*/
	
    SELECT TO_CHAR(date_client_req, 'yyyymmdd') INTO v_date_client_req
    FROM em_mmt_tran
    WHERE mt_pr = to_number( p_client_msg_key , '999999999999999999999999999999');

    v_log_table := SUBSTRING(v_date_client_req, 1, 6);
  
    BEGIN
   
    sql_string := 'SELECT sp_em_mmt_log_create(''' || v_log_table || ''');';
    EXECUTE sql_string;
   
    -- log insert
    sql_string := 'INSERT INTO em_mmt_log_' || v_log_table || '
  			           SELECT mt_pr
				            , 0 AS mt_seq
				            , msg_key
				            , input_type
				            , mt_refkey
				            , priority
                            , msg_class
				            , date_client_req
                            , subject
                            , content_type
				            , content
                            , attach_file_group_key
				            , callback
				            , service_type
				            , broadcast_yn
				            , ''3'' AS msg_status
				            , recipient_num
				            , NULL AS change_word1
				            , NULL AS change_word2
				            , NULL AS change_word3
				            , NULL AS change_word4
				            , NULL AS change_word5
				            , date_mt_sent
				            , ' || quote_literal(p_date_rslt) || ' AS date_rslt
				            , NOW() AS date_mt_report
				            , ' || quote_literal(p_mt_report_code_ib) || ' AS mt_report_code_ib
				            , ' || quote_literal(p_mt_report_code_ibtype) || ' AS mt_report_code_ibtype
				            , ' || quote_literal(p_carrier) || ' AS carrier
				            , ' || quote_literal(p_rs_id) || ' AS rs_id
				            , recipient_net
				            , recipient_npsend
				            , country_code
				            , charset
				            , msg_type
				            , crypto_yn
				            , ttl
				            , emma_id
				            , reg_date
				            , NOW()
							, ' || quote_literal(p_mt_res_cnt) || ' AS mt_res_cnt
							, client_sub_id
							, origin_cid
                       FROM em_mmt_tran
			           WHERE mt_pr = to_number( ' || quote_literal(p_client_msg_key) || ' , ''999999999999999999999999999999'')';
     EXECUTE sql_string;

     -- tran delete
     sql_string := 'DELETE FROM em_mmt_tran
			        WHERE mt_pr = to_number( ' || quote_literal(p_client_msg_key) || ' , ''999999999999999999999999999999'')';
	 EXECUTE sql_string;
	
	 EXCEPTION
	 WHEN others THEN
			--RAISE NOTICE '===> %', SQLSTATE;
			RAISE;
		
    END;	

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_mmt_client_rslt_update									*/
/* DESC : MMS MT 동보 이통사 전송 결과를 업데이트 한다.					*/
/* PARAMETERS															*/
/*   IN p_mt_report_code_ib : 이통사 결과코드							*/
/*   IN p_mt_report_code_ibtype : 이통사 결과코드 분류					*/
/*   IN p_rs_id : 전송 IB RS아이디										*/
/*   IN p_client_msg_key : 전송키(mt_pr)								*/
/*   IN p_msg_status : 전송키의 하위 순번(mt_seq)						*/
/*   IN p_carrier : 전송 이통사 코드									*/
/*   IN p_date_rslt : 단말기 도착시각									*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/
CREATE OR REPLACE FUNCTION sp_em_mmt_client_rslt_update(
	p_mt_report_code_ib IN		CHAR,
	p_mt_report_code_ibtype IN		CHAR,
	p_rs_id 				IN		VARCHAR,
	p_client_msg_key 		IN 		VARCHAR,
	p_recipient_order 		IN 		NUMERIC,
	p_carrier 				IN		NUMERIC,
	p_date_rslt    	    	IN	    TIMESTAMP,
	p_mt_res_cnt 			IN		NUMERIC
)
RETURNS void 
AS $$
DECLARE
    sql_string         VARCHAR(4000);
    v_date_client_req  VARCHAR(8);
    v_log_table        VARCHAR(6);
BEGIN

	/*
	UPDATE em_mmt_client  SET
		msg_status 				= '3',
		date_rslt 				= p_date_rslt,
		date_mt_report 			= now(),
		mt_report_code_ib 		= p_mt_report_code_ib,
		mt_report_code_ibtype 	= p_mt_report_code_ibtype,
		carrier 				= p_carrier,
		rs_id 					= p_rs_id,
		mt_res_cnt            	= p_mt_res_cnt
	WHERE mt_pr			 		= (SELECT mt_pr FROM em_mmt_tran WHERE msg_key = p_client_msg_key)
	  AND mt_seq        		= p_recipient_order;
	  */
	
    SELECT TO_CHAR(date_client_req, 'yyyymmdd') INTO v_date_client_req
    FROM em_mmt_tran
    WHERE mt_pr = to_number( p_client_msg_key , '999999999999999999999999999999');

    v_log_table := SUBSTRING(v_date_client_req, 1, 6);
  
    BEGIN
   
    sql_string := 'SELECT sp_em_mmt_log_create(''' || v_log_table || ''');';
    EXECUTE sql_string;
   
    -- log insert
    sql_string := 'INSERT INTO em_mmt_log_' || v_log_table || '
  			           SELECT B.mt_pr                AS mt_pr
				            , B.mt_seq               AS mt_seq
				            , A.msg_key              AS msg_key
				            , A.input_type           AS input_type
				            , A.mt_refkey            AS mt_refkey
				            , A.priority             AS priority
                            , A.msg_class            AS msg_class
				            , A.date_client_req      AS date_client_req
                            , A.subject              AS subject
                            , A.content_type         AS content_type
				            , A.content              AS content
                            , A.attach_file_group_key AS attach_file_group_key
				            , A.callback             AS callback
				            , A.service_type         AS service_type
				            , A.broadcast_yn         AS broadcast_yn
				            , ''3''                  AS msg_status
				            , B.recipient_num        AS recipient_num
				            , B.change_word1         AS change_word1
				            , B.change_word2         AS change_word2
				            , B.change_word3         AS change_word3
				            , B.change_word4         AS change_word4
				            , B.change_word5         AS change_word5
				            , B.date_mt_sent         AS date_mt_sent
				            , ' || quote_literal(p_date_rslt) || ' AS date_rslt
				            , NOW() AS date_mt_report
				            , ' || quote_literal(p_mt_report_code_ib) || ' AS mt_report_code_ib
				            , ' || quote_literal(p_mt_report_code_ibtype) || ' AS mt_report_code_ibtype
				            , ' || quote_literal(p_carrier) || ' AS carrier
				            , ' || quote_literal(p_rs_id) || ' AS rs_id
				            , B.recipient_net        AS recipient_net
				            , B.recipient_npsend     AS recipient_npsend
				            , B.country_code         AS country_code
				            , A.charset              AS charset
				            , A.msg_type             AS msg_type
				            , A.crypto_yn            AS crypto_yn
				            , A.ttl                  AS ttl
				            , A.emma_id              AS emma_id
				            , B.reg_date             AS reg_date_tran
				            , NOW()                  AS reg_date
							, ' || quote_literal(p_mt_res_cnt) || ' AS mt_res_cnt
							, A.client_sub_id        AS client_sub_id
							, A.origin_cid           AS origin_cid
                       FROM em_mmt_tran A, em_mmt_client B
			           WHERE 1=1
                           AND A.mt_pr = B.mt_pr
                           AND A.mt_pr = to_number( ' || quote_literal(p_client_msg_key) || ' , ''999999999999999999999999999999'')
                           AND B.mt_seq = ' || p_recipient_order || '
                             ';
     EXECUTE sql_string;

     -- tran delete
     sql_string := 'DELETE FROM em_mmt_client
			        WHERE 1=1
                        AND mt_pr = to_number( ' || quote_literal(p_client_msg_key) || ' , ''999999999999999999999999999999'')
                        AND mt_seq = ' || p_recipient_order || '
                             ';
	 EXECUTE sql_string;
	
	 EXCEPTION
	 WHEN others THEN
			-- RAISE NOTICE '===> %', SQLSTATE;
			RAISE;
		
    END;		

END;
$$ LANGUAGE plpgsql;


/************************************************************************/
/* NAME : sp_em_mmt_tran_rslt_delete									*/
/* DESC : 동보전송완료된 마스터 테이블의 레코드를 삭제한다.				*/
/* PARAMETERS															*/
/*   N/A																*/
/* REMARK																*/
/*   N/A																*/
/************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmt_tran_rslt_delete(
)
RETURNS void 
AS $$
DECLARE
BEGIN

	DELETE FROM em_mmt_tran
	WHERE mt_pr IN ( SELECT A.mt_pr FROM em_mmt_tran A
					 WHERE (A.msg_status = '2' OR A.msg_status = '3' OR ( A.msg_status = '1' AND date_client_req < now() - interval '10 days' ))
					 AND A.broadcast_yn = 'Y'
					 AND ( SELECT COUNT(*) FROM em_mmt_client WHERE mt_pr = A.mt_pr) = 0
					 LIMIT 1000
				   );

END; 
$$ LANGUAGE plpgsql;   


/****************************************************************************/
/* NAME : sp_em_mmt_tran_log_move_past										*/
/* DESC : em_mmt_tran테이블의 전송 완료된 메시지를 로그 테이블로 이통한다.	*/
/* PARAMETERS																*/
/*   IN p_emma_id : EMMA 이중화시 EMMA ID									*/
/* REMARK																	*/
/*   N/A																	*/
/****************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmt_tran_log_move_past(
	p_emma_id	IN	    CHAR
)
RETURNS void 
AS $$
DECLARE
	v_rows_record		RECORD;
	sql_string			VARCHAR(4000);
	v_date_client_req	VARCHAR(8);
	v_log_table			VARCHAR(6);
BEGIN

	FOR v_rows_record IN
		SELECT
			TO_CHAR (date_client_req, 'yyyymmdd') AS date_client_req
		FROM em_mmt_tran
		WHERE date_client_req < now() - interval '10 days'
		AND    ( (msg_status = '1') OR (msg_status = '2' AND emma_id = p_emma_id) )
		AND (broadcast_yn = 'N' OR broadcast_yn IS NULL)
		GROUP BY TO_CHAR(date_client_req, 'yyyymmdd')
		LIMIT 100
			
	LOOP
		v_date_client_req := v_rows_record.date_client_req;
		v_log_table := SUBSTR(v_date_client_req,1,6);
		
		sql_string := 'SELECT sp_em_mmt_log_create(''' || v_log_table || ''');';
                EXECUTE sql_string;
		
		WITH cte AS (SELECT mt_pr FROM em_mmt_tran
		WHERE  1=1
			AND ( (msg_status = '1') OR (msg_status = '2' AND emma_id = p_emma_id) )
			AND    TO_CHAR (date_client_req, 'yyyymmdd') = v_date_client_req
			AND    (broadcast_yn = 'N' OR broadcast_yn IS NULL)
			LIMIT 50000)
		UPDATE em_mmt_tran A
		SET msg_status = '7', emma_id = p_emma_id
		FROM cte
		WHERE A.mt_pr = cte.mt_pr  ;		
		
		BEGIN			    
			sql_string := 'INSERT INTO em_mmt_log_' || v_log_table || '
                           SELECT mt_pr                       AS mt_pr
                                , 0                           AS mt_seq
                                , msg_key                     AS msg_key
                                , input_type                  AS input_type
                                , mt_refkey                   AS mt_refkey
                                , priority                    AS priority
				, msg_class                   AS msg_class
                                , date_client_req             AS date_client_req
				, subject                     AS subject
				, content_type                AS content_type
                                , content                     AS content
				, attach_file_group_key       AS attach_file_group_key
                                , callback                    AS callback
                                , service_type                AS service_type
                                , broadcast_yn                AS broadcast_yn
                                , ''3''                       AS msg_status
                                , recipient_num               AS recipient_num
                                , NULL                        AS change_word1
                                , NULL                        AS change_word2
                                , NULL                        AS change_word3
                                , NULL                        AS change_word4
                                , NULL                        AS change_word5
                                , date_mt_sent                AS date_mt_sent
                                , date_rslt                   AS date_rslt
                                , date_mt_report              AS date_mt_report
                                , mt_report_code_ib           AS mt_report_code_ib
                                , mt_report_code_ibtype       AS mt_report_code_ibtype
                                , carrier                     AS carrier
                                , rs_id                       AS rs_id
                                , recipient_net               AS recipient_net
                                , recipient_npsend            AS recipient_npsend
                                , country_code                AS country_code
                                , charset                     AS charset
                                , msg_type                    AS msg_type
                                , crypto_yn                   AS crypto_yn
                                , ttl                         AS ttl
                                , emma_id                     AS emma_id
                                , reg_date                    AS reg_date_tran
                                , NOW()                       AS reg_date
                                , mt_res_cnt                  AS mt_res_cnt
                                , client_sub_id               AS client_sub_id
                                , origin_cid                  AS origin_cid
                       FROM   em_mmt_tran 
                       WHERE  msg_status = ''7''
                         AND  emma_id = ' || quote_literal(p_emma_id) || '';
			EXECUTE sql_string;
				
		        sql_string := 
		            'DELETE FROM em_mmt_tran
		             WHERE EXISTS( SELECT NULL 
						           FROM   em_mmt_log_' || v_log_table || '
						           WHERE  em_mmt_tran.mt_pr = em_mmt_log_' || v_log_table || '.mt_pr )
	                 AND msg_status = ''7''
	                 AND emma_id = ' || quote_literal(p_emma_id) || '';
			EXECUTE sql_string;
			
			EXCEPTION
			/** if table IS not exist THEN create table AND retry INSERT */
			WHEN undefined_table THEN
				sql_string := 'SELECT sp_em_mmt_log_create( ''' || v_log_table || ''' );';
				EXECUTE sql_string ;

			WHEN others THEN
				RAISE ;
				
		END;			
            
	END LOOP;

END;
$$ LANGUAGE plpgsql;


/****************************************************************************/
/* NAME : sp_em_mmt_client_log_move_past									*/
/* DESC : em_mmt_client테이블의 전송 완료된 메시지를 로그 테이블로 이통한다.*/
/* PARAMETERS																*/
/*   IN p_emma_id : EMMA 이중화시 EMMA ID									*/
/* REMARK																	*/
/*   N/A																	*/
/****************************************************************************/	
CREATE OR REPLACE FUNCTION sp_em_mmt_client_log_move_past(
	p_emma_id	IN	    CHAR
)
RETURNS void 
AS $$
DECLARE
	v_rows_record		RECORD;
	sql_string  		VARCHAR(4000);
	v_date_client_req 	VARCHAR(8); 
	v_log_table 		VARCHAR(6);
BEGIN

	FOR v_rows_record IN
		SELECT
			TO_CHAR (date_client_req, 'yyyymmdd') AS date_client_req
		FROM em_mmt_tran A, em_mmt_client B
		WHERE A.date_client_req < now() - interval '10 days'
		AND A.broadcast_yn = 'Y'
		AND    ( (B.msg_status = '1') OR (B.msg_status = '2' AND A.emma_id = p_emma_id) )
		AND A.mt_pr = B.mt_pr
		GROUP BY TO_CHAR (date_client_req, 'yyyymmdd'), A.mt_pr
		LIMIT 100

	LOOP
		v_date_client_req := v_rows_record.date_client_req;
		v_log_table := SUBSTR(v_date_client_req,1,6); 
		
		sql_string := 'SELECT sp_em_mmt_log_create(''' || v_log_table || ''');';
                EXECUTE sql_string;
		
		WITH cte AS (SELECT mt_pr from em_mmt_tran A
		WHERE 1=1
			AND TO_CHAR (A.date_client_req, 'yyyymmdd') = v_date_client_req
  			AND A.broadcast_yn = 'Y'
			AND A.emma_id = ' '
			AND EXISTS (SELECT NULL FROM em_mmt_client B WHERE A.mt_pr = B.mt_pr AND B.msg_status = '1')
  			LIMIT 50000)
		UPDATE em_mmt_tran A
		SET emma_id = p_emma_id
		FROM cte
		WHERE A.mt_pr = cte.mt_pr ;
		
		UPDATE em_mmt_client 
		SET MSG_STATUS = '7'
		WHERE (MT_PR, mt_seq) IN (
		   SELECT B.mt_pr, B.mt_seq
		   FROM em_mmt_tran A, em_mmt_client B
		   WHERE  A.mt_pr = B.mt_pr
		     AND ( (B.msg_status = '1') OR (B.msg_status = '2') )
			 AND TO_CHAR (A.date_client_req, 'yyyymmdd') = v_date_client_req
			 AND A.broadcast_yn = 'Y' 
			 AND A.emma_id = p_emma_id
			 LIMIT 50000 );		
			
		BEGIN		    
			sql_string := '
                    INSERT INTO em_mmt_log_' || v_log_table || ' 
                       SELECT B.mt_pr                 AS mt_pr
                            , B.mt_seq                AS mt_seq
                            , A.msg_key		 		  AS msg_key
                            , A.input_type   	 	  AS input_type
                            , A.mt_refkey             AS mt_refkey
                            , A.priority              AS priority
			    , A.msg_class             AS msg_class
                            , A.date_client_req       AS date_client_req
			    , A.subject               AS subject
			    , A.content_type          AS content_type
                            , A.content               AS content
			    , A.attach_file_group_key AS attach_file_group_key
                            , A.callback              AS callback
                            , A.service_type          AS service_type
                            , A.broadcast_yn          AS broadcast_yn
                            , ''3''                   AS msg_status
                            , B.recipient_num         AS recipient_num
                            , B.change_word1          AS change_word1
                            , B.change_word2          AS change_word2
                            , B.change_word3          AS change_word3
                            , B.change_word4          AS change_word4
                            , B.change_word5          AS change_word5
                            , B.date_mt_sent          AS date_mt_sent
                            , B.date_rslt             AS date_rslt
                            , B.date_mt_report        AS date_mt_report
                            , B.mt_report_code_ib     AS mt_report_code_ib
                            , B.mt_report_code_ibtype AS mt_report_code_ibtype
                            , B.carrier               AS carrier
                            , B.rs_id                 AS rs_id
                            , B.recipient_net         AS recipient_net
                            , B.recipient_npsend      AS recipient_npsend
                            , B.country_code          AS country_code
                            , A.charset               AS charset
                            , A.msg_type              AS msg_type
                            , A.crypto_yn             AS crypto_yn
                            , A.ttl                   AS ttl
                            , A.emma_id               AS emma_id
                            , B.reg_date              AS reg_date_tran
                            , NOW()                   AS reg_date
                            , B.mt_res_cnt            AS mt_res_cnt
                            , A.client_sub_id         AS client_sub_id
                            , A.origin_cid            AS origin_cid
                       FROM   em_mmt_tran A, em_mmt_client B
                       WHERE  A.mt_pr = B.mt_pr
                         AND  B.msg_status = ''7''
                         AND  A.emma_id = ' || quote_literal(p_emma_id) || '';
			EXECUTE sql_string;
				
			sql_string := '                             
                DELETE FROM em_mmt_client
                WHERE EXISTS( SELECT NULL
                              FROM   em_mmt_log_' || v_log_table || ' 
                              WHERE  em_mmt_client.mt_pr = em_mmt_log_' || v_log_table || '.mt_pr
                              AND    em_mmt_client.mt_seq = em_mmt_log_' || v_log_table || '.mt_seq
                            )'; 
			EXECUTE sql_string;

			EXCEPTION
			/** if table IS not exist THEN create table AND retry INSERT */
			WHEN undefined_table THEN
				sql_string := 'SELECT sp_em_mmt_log_create( ''' || v_log_table || ''' );';
				EXECUTE sql_string ;

			WHEN others THEN
				RAISE ;

		END;			
            
     END LOOP;

END;
$$ LANGUAGE plpgsql;

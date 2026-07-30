#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EMMA 완전 설치 및 시작 스크립트"""

import os
import sys
import subprocess
import zipfile
import shutil
import urllib.request
import time

# 로그 파일
script_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(script_dir, 'emma-setup-py.log')

def log(msg):
    ts = time.strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

log("=" * 60)
log("EMMA 설치 스크립트 시작")
log(f"작업 디렉토리: {script_dir}")

# 현재 연월 (YYYYMM) - em_mo_log 테이블명 접미사
current_ym = time.strftime('%Y%m')
log(f"현재 연월: {current_ym}")

# === 1. psycopg2 설치 확인 ===
try:
    import psycopg2
    log("psycopg2 OK")
except ImportError:
    log("psycopg2 설치 중...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary'], 
                      check=True, capture_output=True)
        import psycopg2
        log("psycopg2 설치 완료")
    except Exception as e:
        log(f"psycopg2 설치 실패: {e}")

# === 2. psql.exe 찾기 ===
def find_psql():
    for ver in ['17', '16', '15', '14', '13']:
        p = rf'C:\Program Files\PostgreSQL\{ver}\bin\psql.exe'
        if os.path.exists(p):
            return p
    return shutil.which('psql')

psql_exe = find_psql()
if psql_exe:
    log(f"psql 발견: {psql_exe}")
else:
    log("psql.exe를 찾을 수 없음 - psycopg2로 대체")

# === 2. PostgreSQL SQL 실행 ===
def run_psql_file(sql_path):
    """psql.exe로 SQL 파일 실행"""
    if not psql_exe:
        return False, "psql 없음"
    env = os.environ.copy()
    env['PGPASSWORD'] = 'postgres'
    result = subprocess.run(
        [psql_exe, '-U', 'postgres', '-d', 'donation_platform', '-h', 'localhost', '-f', sql_path],
        env=env, capture_output=True, text=True, encoding='utf-8', errors='replace'
    )
    return result.returncode == 0, result.stdout + result.stderr

def run_psql_cmd(sql_cmd):
    """psql.exe로 SQL 명령 실행"""
    if not psql_exe:
        return False, "psql 없음"
    env = os.environ.copy()
    env['PGPASSWORD'] = 'postgres'
    result = subprocess.run(
        [psql_exe, '-U', 'postgres', '-d', 'donation_platform', '-h', 'localhost', '-c', sql_cmd],
        env=env, capture_output=True, text=True, encoding='utf-8', errors='replace'
    )
    return result.returncode == 0, result.stdout + result.stderr

def fix_postgresql_auth():
    """PostgreSQL pg_hba.conf에서 scram-sha-256 → md5로 변경 (구버전 JDBC 드라이버 호환)"""
    log("PostgreSQL 인증 방식 확인 중...")
    # pg_hba.conf 경로 탐색
    pg_data_dirs = []
    for ver in ['17', '16', '15', '14', '13']:
        pg_data_dirs.append(rf'C:\Program Files\PostgreSQL\{ver}\data')

    conf_path = None
    for d in pg_data_dirs:
        c = os.path.join(d, 'pg_hba.conf')
        if os.path.exists(c):
            conf_path = c
            break

    if not conf_path:
        log("pg_hba.conf를 찾을 수 없음 - PowerShell로 탐색...")
        try:
            ps_cmd = r'Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_hba.conf" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName'
            r = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True, timeout=15)
            conf_path = r.stdout.strip()
        except Exception as e:
            log(f"PowerShell 탐색 실패: {e}")

    if not conf_path or not os.path.exists(conf_path):
        log("pg_hba.conf 없음 - PostgreSQL 인증 수정 건너뜀")
        return

    log(f"pg_hba.conf 발견: {conf_path}")

    with open(conf_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    if 'scram-sha-256' not in content:
        log("scram-sha-256 없음 - 수정 불필요")
        return

    # 백업
    backup_path = conf_path + '.bak'
    if not os.path.exists(backup_path):
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        log(f"pg_hba.conf 백업: {backup_path}")

    # scram-sha-256 → md5
    new_content = content.replace('scram-sha-256', 'md5')
    with open(conf_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    log("pg_hba.conf 수정 완료 (scram-sha-256 → md5)")

    # PostgreSQL 리로드
    pg_dir = os.path.dirname(os.path.dirname(conf_path))
    pg_ctl = os.path.join(pg_dir, 'bin', 'pg_ctl.exe')
    pg_data = os.path.dirname(conf_path)

    for cmd_attempt in [
        [pg_ctl, 'reload', '-D', pg_data] if os.path.exists(pg_ctl) else None,
        ['powershell', '-Command', f'& "{pg_ctl}" reload -D "{pg_data}"'] if os.path.exists(pg_ctl) else None,
        ['net', 'stop', 'postgresql-x64-17'],
        ['net', 'start', 'postgresql-x64-17'],
    ]:
        if cmd_attempt is None:
            continue
        try:
            r = subprocess.run(cmd_attempt, capture_output=True, text=True, timeout=30)
            log(f"PostgreSQL 리로드: {' '.join(cmd_attempt[:3])} → rc={r.returncode}")
            if r.returncode == 0:
                break
        except Exception as e:
            log(f"  실패: {e}")


def download_pg_jdbc():
    """PostgreSQL JDBC 42.x 드라이버 다운로드 (SCRAM-SHA-256 지원)"""
    emma3_dir = os.path.join(script_dir, 'EMMA3')
    lib_dir = os.path.join(emma3_dir, 'lib')
    jar_path = os.path.join(lib_dir, 'postgresql-42.7.4.jar')

    # 이미 유효한 파일이 있으면 스킵
    if os.path.exists(jar_path) and os.path.getsize(jar_path) > 100000:
        log(f"PostgreSQL JDBC 42.7.4 이미 존재 ({os.path.getsize(jar_path):,} bytes)")
        return

    log("PostgreSQL JDBC 42.7.4 다운로드 중...")
    urls = [
        "https://jdbc.postgresql.org/download/postgresql-42.7.4.jar",
        "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar",
        "https://search.maven.org/remotecontent?filepath=org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar",
    ]

    for url in urls:
        try:
            log(f"  시도: {url[:60]}...")
            urllib.request.urlretrieve(url, jar_path)
            size = os.path.getsize(jar_path)
            if size > 100000:
                log(f"  다운로드 성공: {size:,} bytes")
                return
            else:
                log(f"  파일 크기 이상 ({size} bytes), 다음 시도...")
        except Exception as e:
            log(f"  실패: {e}")

    log("PostgreSQL JDBC 다운로드 실패 - pg_hba.conf 수정으로 대체")
    fix_postgresql_auth()


def run_sql():
    # 0. PostgreSQL JDBC 드라이버 확인/수정 (먼저 실행)
    emma3_dir_check = os.path.join(script_dir, 'EMMA3')
    lib_dir_check = os.path.join(emma3_dir_check, 'lib')
    jdbc_new = os.path.join(lib_dir_check, 'postgresql-42.7.4.jar')
    jdbc_old3 = os.path.join(lib_dir_check, 'postgresql-8.3-604.jdbc3.jar')
    jdbc_old4 = os.path.join(lib_dir_check, 'postgresql-8.3-604.jdbc4.jar')

    has_new_jdbc = os.path.exists(jdbc_new) and os.path.getsize(jdbc_new) > 100000
    if not has_new_jdbc:
        download_pg_jdbc()
    else:
        log(f"PostgreSQL JDBC 42.7.4 확인 완료 ({os.path.getsize(jdbc_new):,} bytes)")

    # 구버전 JAR 비활성화 (새 JDBC가 있을 경우)
    if os.path.exists(jdbc_new) and os.path.getsize(jdbc_new) > 100000:
        for old_jar in [jdbc_old3, jdbc_old4]:
            if os.path.exists(old_jar):
                disabled = old_jar + '.disabled'
                if not os.path.exists(disabled):
                    try:
                        os.rename(old_jar, disabled)
                        log(f"구버전 JDBC 비활성화: {os.path.basename(old_jar)}")
                    except Exception as e:
                        log(f"구버전 JDBC 비활성화 실패 ({os.path.basename(old_jar)}): {e}")

    # 2. 현재 월 테이블 생성 (em_mo_log_YYYYMM)
    table_name = f"em_mo_log_{current_ym}"
    log(f"{table_name} 테이블 생성 중...")

    # 모든 SQL 파일 실행 (저장 프로시저 포함)
    sql_dir = os.path.join(script_dir, 'emma-sql')
    if os.path.exists(sql_dir):
        for sql_file in sorted(os.listdir(sql_dir)):
            if sql_file.endswith('.sql'):
                sql_path = os.path.join(sql_dir, sql_file)
                log(f"SQL 실행: {sql_file}")
                ok, out = run_psql_file(sql_path)
                log(f"  결과: {'완료' if ok else out[:150]}")

    # 먼저 sp_em_smo_log_create 프로시저로 시도
    ok, out = run_psql_cmd(f"SELECT sp_em_smo_log_create('{current_ym}')")
    if ok:
        log(f"sp_em_smo_log_create('{current_ym}') 완료")
    else:
        log(f"프로시저 호출 결과: {out[:200]}")
        # 직접 테이블 생성
        create_sql = f"""CREATE TABLE IF NOT EXISTS {table_name} (
            mo_key VARCHAR(50) NOT NULL,
            service_type CHAR(2) NOT NULL DEFAULT 'MO',
            mo_recipient VARCHAR(32) NOT NULL,
            emo_recipient VARCHAR(80),
            mo_originator VARCHAR(32) NOT NULL,
            mo_callback VARCHAR(32) NOT NULL DEFAULT '',
            msg_status CHAR(1) NOT NULL DEFAULT '3',
            subject VARCHAR(40),
            content VARCHAR(4000),
            date_mo TIMESTAMP NOT NULL DEFAULT now(),
            date_mo_recv TIMESTAMP NOT NULL DEFAULT now(),
            carrier NUMERIC(5),
            rs_id VARCHAR(20),
            ems_id NUMERIC(3),
            ems_total NUMERIC(1),
            ems_seq NUMERIC(1),
            emma_id CHAR(2) NOT NULL DEFAULT '  ',
            CONSTRAINT pk_{table_name} PRIMARY KEY (mo_key)
        )"""
        ok2, out2 = run_psql_cmd(create_sql)
        log(f"직접 테이블 생성: {'성공' if ok2 else '실패 - ' + out2[:200]}")

    # 3. psycopg2로 확인
    try:
        import psycopg2
        conn = psycopg2.connect(host='localhost', port=5432,
            dbname='donation_platform', user='postgres', password='postgres')
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='{table_name}'")
        cnt = cur.fetchone()[0]
        log(f"{table_name} 테이블 확인: {'존재' if cnt > 0 else '없음'}")
        cur.close()
        conn.close()
    except Exception as e:
        log(f"psycopg2 확인 스킵: {e}")

    log("SQL 작업 완료")

run_sql()

# === 3. JRE 확보 ===
emma3_dir = os.path.join(script_dir, 'EMMA3')
jre_dir = os.path.join(emma3_dir, 'jre')
java_exe = os.path.join(jre_dir, 'bin', 'java.exe')

def find_java():
    """여러 경로에서 java.exe 탐색"""
    # 1. EMMA3/jre (프로젝트 내부)
    if os.path.exists(java_exe):
        return java_exe

    # 2. 하위 폴더 탐색
    if os.path.exists(jre_dir):
        for root, dirs, files in os.walk(jre_dir):
            if 'java.exe' in files:
                return os.path.join(root, 'java.exe')

    # 3. withjre 인스톨러가 설치한 경로
    withjre_installed = [
        r'C:\EMMA3\jre\bin\java.exe',
        r'C:\Program Files\EMMA\jre\bin\java.exe',
        r'C:\Program Files (x86)\EMMA\jre\bin\java.exe',
    ]
    for p in withjre_installed:
        if os.path.exists(p):
            return p

    # 4. 일반 Java 설치 경로
    common_paths = [
        r'C:\Program Files\Java',
        r'C:\Program Files\Eclipse Adoptium',
        r'C:\Program Files\OpenJDK',
        r'C:\Program Files\Microsoft',
        r'C:\Temp\jre11',
    ]
    for base in common_paths:
        if os.path.exists(base):
            for root, dirs, files in os.walk(base):
                if 'java.exe' in files:
                    return os.path.join(root, 'java.exe')

    # 5. PATH에서 java
    java_in_path = shutil.which('java')
    if java_in_path:
        return java_in_path

    return None

java = find_java()
if java:
    log(f"Java 발견: {java}")
else:
    log("Java 없음 - Adoptium JRE 11 다운로드 시도...")
    
    # withjre 인스톨러 실행 시도 (Inno Setup 방식)
    installer = r'C:\Users\user\Desktop\EMMA_windows_3_7_1_64bit\EMMA_windows_withjre_3_7_1_64bit.exe'
    if os.path.exists(installer):
        log("withjre 인스톨러 실행 중 (자동 설치)...")
        try:
            result = subprocess.run(
                [installer, '/SP-', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/INSTALLDIR=C:\\EMMA3'],
                timeout=120, capture_output=True
            )
            log(f"인스톨러 종료 (returncode={result.returncode})")
            java_check = find_java()
            if java_check:
                log(f"인스톨러로 Java 설치 완료: {java_check}")
                java = java_check
                # JRE 복사
                installed_jre = os.path.dirname(os.path.dirname(java_check))
                if installed_jre != jre_dir:
                    log(f"JRE 복사: {installed_jre} -> {jre_dir}")
                    if os.path.exists(jre_dir):
                        shutil.rmtree(jre_dir)
                    shutil.copytree(installed_jre, jre_dir)
                    log("JRE 복사 완료")
        except Exception as e:
            log(f"인스톨러 실행 실패: {e}")

    # 그래도 없으면 ZIP 추출 시도
    java = find_java()
    if not java and os.path.exists(installer):
        log(f"withjre ZIP 추출 시도 ({os.path.getsize(installer):,} bytes)")
        log("Python으로 JRE 섹션 추출 중...")
        try:
            import struct
            import io
            
            with open(installer, 'rb') as f:
                data = f.read()
            
            # 모든 EOCD 시그니처 탐색
            eocd_positions = []
            pos = 0
            while True:
                idx = data.find(b'PK\x05\x06', pos)
                if idx == -1:
                    break
                eocd_positions.append(idx)
                pos = idx + 1
            
            log(f"EOCD 섹션 수: {len(eocd_positions)}")
            
            for i, eocd_pos in enumerate(eocd_positions):
                try:
                    num_entries = struct.unpack_from('<H', data, eocd_pos + 10)[0]
                    cd_offset = struct.unpack_from('<I', data, eocd_pos + 16)[0]
                    
                    log(f"ZIP {i}: entries={num_entries}, cd_offset={cd_offset:,}")
                    
                    if num_entries > 200:
                        log(f"  -> JRE 후보 (entries={num_entries})")
                        
                        # 첫 번째 로컬 헤더 탐색
                        lh_pos = data.find(b'PK\x03\x04', max(0, cd_offset - 50*1024*1024))
                        if lh_pos >= 0 and lh_pos < cd_offset:
                            zip_start = lh_pos
                            zip_end = eocd_pos + 22
                            
                            try:
                                zf = zipfile.ZipFile(io.BytesIO(data[zip_start:zip_end]))
                                names = zf.namelist()
                                jre_names = [n for n in names if any(x in n.lower() for x in ['java.exe', 'jvm.dll', 'rt.jar', '/jre/', 'bin/java'])]
                                log(f"  JRE 파일 수: {len(jre_names)}, 전체: {len(names)}")
                                
                                if jre_names:
                                    log(f"  JRE 추출 중 -> {jre_dir}")
                                    os.makedirs(jre_dir, exist_ok=True)
                                    zf.extractall(jre_dir)
                                    log("  JRE 추출 완료!")
                                    break
                            except Exception as e:
                                log(f"  ZIP 처리 오류: {e}")
                except:
                    pass
        except Exception as e:
            log(f"withjre 추출 오류: {e}")
    
    # 그래도 없으면 다운로드
    java = find_java()
    if not java:
        log("Adoptium JRE 11 다운로드...")
        jre_url = "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.23+9/OpenJDK11U-jre_x64_windows_hotspot_11.0.23_9.zip"
        jre_zip = os.path.join(script_dir, 'jre11.zip')
        
        try:
            log(f"다운로드 중... {jre_url}")
            urllib.request.urlretrieve(jre_url, jre_zip)
            log(f"다운로드 완료: {os.path.getsize(jre_zip):,} bytes")
            
            log("압축 해제 중...")
            temp_dir = os.path.join(script_dir, 'jre11-temp')
            with zipfile.ZipFile(jre_zip) as zf:
                zf.extractall(temp_dir)
            
            # 폴더 이동
            for item in os.listdir(temp_dir):
                item_path = os.path.join(temp_dir, item)
                if os.path.isdir(item_path):
                    java_test = os.path.join(item_path, 'bin', 'java.exe')
                    if os.path.exists(java_test):
                        log(f"JRE 폴더 이동: {item_path} -> {jre_dir}")
                        if os.path.exists(jre_dir):
                            shutil.rmtree(jre_dir)
                        shutil.move(item_path, jre_dir)
                        break
            
            # 정리
            if os.path.exists(jre_zip):
                os.remove(jre_zip)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                
        except Exception as e:
            log(f"JRE 다운로드 실패: {e}")

# JRE 재확인
java = find_java()
if java:
    log(f"Java 준비 완료: {java}")
    
    # Java 버전 확인
    try:
        result = subprocess.run([java, '-version'], capture_output=True, text=True)
        log(f"Java 버전: {result.stderr.strip()[:100]}")
    except Exception as e:
        log(f"Java 버전 확인 실패: {e}")
else:
    log("ERROR: Java를 확보하지 못했습니다!")
    input("Enter를 눌러 종료...")
    sys.exit(1)

# === 4. EMMA 시작 ===
log("=" * 40)
log("EMMA 시작 준비 중...")

# 클래스패스 구성 (유효한 JAR만 포함)
lib_dir = os.path.join(emma3_dir, 'lib')
classes_dir = os.path.join(emma3_dir, 'classes')
classpath_parts = []
if os.path.exists(classes_dir):
    classpath_parts.append(classes_dir)
for jar in sorted(os.listdir(lib_dir)):
    if jar.endswith('.jar'):
        jar_path = os.path.join(lib_dir, jar)
        if os.path.getsize(jar_path) > 0:  # 0-byte JAR 제외
            classpath_parts.append(jar_path)

classpath = ';'.join(classpath_parts)
log(f"클래스패스: {len(classpath_parts)}개 JAR")

# cert 디렉토리 확인
cert_dir = os.path.join(emma3_dir, 'cert')
os.makedirs(cert_dir, exist_ok=True)
cert_files = [f for f in os.listdir(cert_dir) if f.endswith('.der')]
log(f"cert 파일 목록: {cert_files}")

# === KeyRegister: 인증키를 auth.infobank.net에 등록 ===
# 항상 KeyRegister 실행 - 기존 cert가 있어도 재등록 시도
# (IBKeyPairGenerator로 생성된 cert는 미등록 상태일 수 있음)
# auth.password가 올바른 경우에만 성공
log(f"KeyRegister 실행 (기존 cert: {cert_files})...")
log("(auth.password가 인포뱅크 제공 패스워드와 일치해야 성공)")
keyregister_args = [
    java,
    '-Xms32m', '-Xmx128m',
    '-cp', classpath,
    'ib.emma.main.KeyRegister',
    'register'
]
keyregister_ok = False
try:
    kr_result = subprocess.run(
        keyregister_args,
        cwd=emma3_dir,
        capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace'
    )
    kr_output = (kr_result.stdout + kr_result.stderr).strip()
    log(f"KeyRegister 결과 (rc={kr_result.returncode}): {kr_output[:500]}")
    # 성공 판단: "already registered" 또는 정상 완료
    if 'already registered' in kr_output.lower() or 'success' in kr_output.lower():
        keyregister_ok = True
        log("KeyRegister: 키가 이미 등록되어 있거나 신규 등록 성공")
    elif kr_result.returncode == 0 and 'fail' not in kr_output.lower() and 'error' not in kr_output.lower():
        keyregister_ok = True
        log("KeyRegister: 등록 완료")
    cert_files = [f for f in os.listdir(cert_dir) if f.endswith('.der')]
    log(f"KeyRegister 후 cert 파일: {cert_files}")
except Exception as e:
    log(f"KeyRegister 실행 오류: {e}")

# === auth.password 검증 ===
# emma.cf에서 auth.id, auth.password 읽기
emma_cf = os.path.join(emma3_dir, 'conf', 'emma.cf')
auth_id = auth_pwd = ''
try:
    with open(emma_cf, 'r', encoding='cp949', errors='replace') as f:
        for line in f:
            line = line.strip()
            if line.startswith('auth.id'):
                auth_id = line.split('=', 1)[-1].strip()
            elif line.startswith('auth.password'):
                auth_pwd = line.split('=', 1)[-1].strip()
    log(f"EMMA 인증: auth.id={auth_id}, auth.password={auth_pwd[:4]}****")
except Exception as e:
    log(f"emma.cf 읽기 오류: {e}")

# KeyRegister 실패 시 경고 출력 (cert가 있어도 미등록이면 EMMA auth 실패)
cert_files_now = [f for f in os.listdir(cert_dir) if f.endswith('.der')]
if not cert_files_now or not keyregister_ok:
    log("=" * 60)
    log("⚠️  경고: KeyRegister 실패 - EMMA 인증 실패 예상")
    log("(cert 파일이 있어도 인포뱅크 서버에 미등록이면 인증 불가)")
    log("KeyRegister 실패 가능한 원인:")
    log("  1. auth.password가 인포뱅크 서버의 패스워드와 불일치")
    log("  2. 계정 'nanum'이 인포뱅크에 미등록")
    log("")
    log("해결 방법:")
    log("  인포뱅크 고객센터에 문의하여 올바른 auth.password 확인:")
    log("  - 전화: 031-628-1531")
    log("  - 이메일: CCD_Team@infobank.net")
    log(f"  - 계정 ID: {auth_id}")
    log("  - 현재 패스워드: emma.cf의 auth.password 값")
    log("")
    log("  올바른 패스워드 확인 후:")
    log("  1. EMMA3\\conf\\emma.cf의 auth.password 수정")
    log("  2. .env의 EMMA_AUTH_PASSWORD 수정")
    log("  3. 이 스크립트 재실행 OR KeyRegister 직접 실행:")
    log(f"     {java} -cp EMMA3\\lib\\* ib.emma.main.KeyRegister register")
    log("=" * 60)

emma_args = [
    java,
    '-Xms64m', '-Xmx256m',
    '-Dfile.encoding=UTF-8',
    f'-Demma.home={emma3_dir}',
    '-cp', classpath,
    'ib.emma.main.EMMA',
    'startDaemon'
]

log(f"EMMA 데몬 시작: {java} ... ib.emma.main.EMMA startDaemon")

try:
    stdout_log = open(os.path.join(script_dir, 'emma-stdout.log'), 'w', encoding='utf-8', errors='replace')
    stderr_log = open(os.path.join(script_dir, 'emma-stderr.log'), 'w', encoding='utf-8', errors='replace')

    emma_proc = subprocess.Popen(
        emma_args,
        cwd=emma3_dir,
        stdout=stdout_log,
        stderr=stderr_log,
    )
    log(f"EMMA 프로세스 시작: PID={emma_proc.pid}")

    # 8초 대기 후 상태 확인
    time.sleep(8)
    if emma_proc.poll() is None:
        log("✅ EMMA 실행 중! (백그라운드 데몬)")
        log(f"   로그 확인: emma-stdout.log")
    else:
        rc = emma_proc.returncode
        log(f"❌ EMMA 종료됨 (returncode={rc})")
        # stdout 로그 마지막 10줄 출력
        stdout_log.flush()
        stdout_log.close()
        try:
            with open(os.path.join(script_dir, 'emma-stdout.log'), 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
                log("emma-stdout.log 마지막 10줄:")
                for line in lines[-10:]:
                    log(f"  {line.rstrip()}")
        except Exception as e2:
            log(f"로그 읽기 실패: {e2}")

except Exception as e:
    log(f"EMMA 시작 실패: {e}")

log("=" * 60)
log("설치 스크립트 완료")
log(f"로그 파일: {log_file}")
log("EMMA 로그: emma-stdout.log, emma-stderr.log")

input("\nEnter를 눌러 종료...")

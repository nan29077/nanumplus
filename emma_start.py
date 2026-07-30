#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EMMA 시작 스크립트 (DB 설치 완료 후 실행)"""

import os, subprocess, time, sys

emma3 = r'C:\Users\user\Desktop\프로젝트\나눔플러스\EMMA3'
java  = r'C:\Temp\jre11\bin\java.exe'
log_f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'emma-start.log')

def log(msg):
    ts = time.strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(log_f, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

log("=" * 50)
log("EMMA 시작 스크립트")

# --- Java 확인 ---
if not os.path.exists(java):
    # 대체 경로 탐색
    import glob, shutil
    candidates = glob.glob(r'C:\Program Files\Eclipse Adoptium\**\bin\java.exe', recursive=True) + \
                 glob.glob(r'C:\Program Files\Java\**\bin\java.exe', recursive=True) + \
                 ([shutil.which('java')] if shutil.which('java') else [])
    java = candidates[0] if candidates else None
    if not java:
        log("ERROR: java.exe 없음!")
        sys.exit(1)

log(f"Java: {java}")

# --- regkey.exe 실행 (cert 파일 생성) ---
regkey = os.path.join(emma3, 'regkey.exe')
cert_dir = os.path.join(emma3, 'cert')
cert_files = os.listdir(cert_dir) if os.path.exists(cert_dir) else []

if not cert_files:
    log("regkey.exe 실행 중 (인증키 생성)...")
    if os.path.exists(regkey):
        try:
            rk = subprocess.run(
                [regkey], cwd=emma3,
                capture_output=True, text=True, timeout=30,
                encoding='utf-8', errors='replace'
            )
            out = (rk.stdout + rk.stderr).strip()
            log(f"regkey 결과 (rc={rk.returncode}): {out[:400]}")
            cert_files = os.listdir(cert_dir) if os.path.exists(cert_dir) else []
            log(f"cert 파일: {cert_files}")
        except Exception as e:
            log(f"regkey 오류: {e}")
    else:
        log(f"regkey.exe 없음: {regkey}")
else:
    log(f"cert 파일 이미 존재: {cert_files}")

# --- 클래스패스 구성 ---
classes_dir = os.path.join(emma3, 'classes')
lib_dir = os.path.join(emma3, 'lib')

cp_parts = []
if os.path.exists(classes_dir):
    cp_parts.append(classes_dir)
if os.path.exists(lib_dir):
    for jar in os.listdir(lib_dir):
        if jar.endswith('.jar'):
            cp_parts.append(os.path.join(lib_dir, jar))

classpath = ';'.join(cp_parts)
log(f"클래스패스: {len(cp_parts)}개 항목")

# --- EMMA 시작 ---
emma_args = [
    java,
    '-Xms64m', '-Xmx256m',
    '-Dfile.encoding=EUC-KR',
    f'-Demma.home={emma3}',
    f'-Dlogback.configurationFile={os.path.join(emma3, "conf", "logback.xml")}',
    '-cp', classpath,
    'ib.emma.main.EMMA',
    'startDaemon'
]

log(f"EMMA 실행: ib.emma.main.EMMA startDaemon")
log(f"명령어: {' '.join(emma_args[:6])} ... ib.emma.main.EMMA startDaemon")

try:
    proc = subprocess.Popen(
        emma_args, cwd=emma3,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding='utf-8', errors='replace'
    )
    log(f"EMMA 프로세스 시작: PID={proc.pid}")

    # 5초 대기 후 확인
    time.sleep(5)
    ret = proc.poll()
    if ret is None:
        log("EMMA 실행 중 (5초 후 아직 실행 중 = 정상!)")
        # 15초 더 대기 후 재확인
        time.sleep(15)
        ret = proc.poll()
        if ret is None:
            log("EMMA 20초 후에도 실행 중 - 성공!")
        else:
            # 종료됨 - 출력 확인
            out, _ = proc.communicate(timeout=5)
            log(f"EMMA 종료 (rc={ret})")
            log(f"출력:\n{out[:2000]}")
    else:
        # 즉시 종료 - 에러 수집
        try:
            out = proc.stdout.read() if proc.stdout else ''
        except:
            out = ''
        log(f"EMMA 즉시 종료 (rc={ret})")
        log(f"출력:\n{out[:2000]}")

        # stderr 로그 파일 확인
        stderr_log = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'emma-stderr.log')
        if os.path.exists(stderr_log):
            with open(stderr_log, encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
            recent = ''.join(lines[-30:])
            log(f"emma-stderr.log 마지막 30줄:\n{recent}")

except Exception as e:
    log(f"EMMA 실행 오류: {e}")

log("완료")

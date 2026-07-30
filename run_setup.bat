@echo off
title 나눔플러스 DB 초기화
chcp 65001 >nul
cd /d "E:\프로젝트\nanumplus"

echo === .env 파일 확인 ===
type .env

echo.
echo === npm run db:push ===
call npm run db:push
if %ERRORLEVEL% neq 0 (
    echo [오류] db:push 실패!
    pause
    exit /b 1
)

echo.
echo === npm run db:seed ===
call npm run db:seed
if %ERRORLEVEL% neq 0 (
    echo [오류] db:seed 실패!
    pause
    exit /b 1
)

echo.
echo === npm run db:init-admin ===
call npm run db:init-admin
if %ERRORLEVEL% neq 0 (
    echo [오류] db:init-admin 실패!
    pause
    exit /b 1
)

echo.
echo ============================
echo  DB 초기화 완료!
echo  이제 run_dev.bat 을 실행하세요.
echo ============================
pause

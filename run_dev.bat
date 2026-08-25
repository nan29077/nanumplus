@echo off
title 나눔플러스 개발 서버 (http://localhost:3005)
chcp 65001 >nul
cd /d "E:\프로젝트\nanumplus"
echo === npm run dev 시작 ===
call npm.cmd run dev
set "START_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%START_EXIT_CODE%"=="0" echo 서버 시작 실패 (종료 코드: %START_EXIT_CODE%)
pause
exit /b %START_EXIT_CODE%

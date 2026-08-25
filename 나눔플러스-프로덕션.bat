@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo =========================================
echo   나눔플러스 프로덕션 빌드 및 실행
echo   (개발 서버보다 3-5배 빠른 응답 속도)
echo =========================================
echo.
echo [1/2] 빌드 중... (3-5분 소요)
call npm.cmd run build
if %ERRORLEVEL% neq 0 (
  echo [오류] 빌드 실패
  pause
  exit /b 1
)
echo.
echo [2/2] 프로덕션 서버 시작...
echo.
echo   http://localhost:3005
echo   관리자: admin@onjung.kr / admin1234
echo.
call npx.cmd next start -p 3005
set "START_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%START_EXIT_CODE%"=="0" echo [오류] 프로덕션 서버 시작 실패 (종료 코드: %START_EXIT_CODE%)
pause
exit /b %START_EXIT_CODE%

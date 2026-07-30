@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo =========================================
echo   나눔플러스 서버 시작
echo   http://localhost:3005
echo =========================================
echo.
echo   관리자: admin@onjung.kr / admin1234
echo.
echo =========================================
echo   서버를 중지하려면 Ctrl+C 를 누르세요.
echo =========================================
echo.
npm run dev
pause

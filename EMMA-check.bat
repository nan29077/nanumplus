@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal enabledelayedexpansion

set "PSQL="
for %%V in (17 16 15 14 13 12 11 10) do (
  if exist "C:\Program Files\PostgreSQL\%%V\bin\psql.exe" (
    if not defined PSQL set "PSQL=C:\Program Files\PostgreSQL\%%V\bin\psql.exe"
  )
)
if not defined PSQL (
  where psql.exe >nul 2>&1 && set "PSQL=psql.exe"
)
if not defined PSQL (
  echo.
  echo [ERROR] psql.exe not found.
  echo Edit this file and set PSQL to the full path, e.g.
  echo   set "PSQL=C:\Program Files\PostgreSQL\16\bin\psql.exe"
  echo.
  pause
  exit /b 1
)

echo Using: !PSQL!
echo.

set "PGPASSWORD=rmachs1734"
set "PGCLIENTENCODING=UTF8"

"!PSQL!" -U postgres -h localhost -p 5432 -d nanumplus -f emma-check-psql.sql > emma-check-result.txt 2>&1

echo.
echo Result written to: %~dp0emma-check-result.txt
echo.
start notepad "%~dp0emma-check-result.txt"
endlocal

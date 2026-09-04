@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "OUT=%~dp0emma-env-result.txt"
> "%OUT%" echo ===== PostgreSQL environment check =====
>>"%OUT%" echo.
>>"%OUT%" echo --- [1] who is listening on 5432 ---
netstat -ano | findstr ":5432" >> "%OUT%" 2>&1
>>"%OUT%" echo.
>>"%OUT%" echo --- [2] postgres related processes ---
tasklist /FI "IMAGENAME eq postgres.exe" >> "%OUT%" 2>&1
>>"%OUT%" echo.
>>"%OUT%" echo --- [3] postgres services ---
sc query type= service state= all | findstr /I "postgres" >> "%OUT%" 2>&1
>>"%OUT%" echo.
>>"%OUT%" echo --- [4] installed PostgreSQL folders ---
if exist "C:\Program Files\PostgreSQL" dir /b "C:\Program Files\PostgreSQL" >> "%OUT%" 2>&1
>>"%OUT%" echo.
>>"%OUT%" echo --- [5] docker containers (if docker installed) ---
docker ps -a >> "%OUT%" 2>&1
>>"%OUT%" echo.
>>"%OUT%" echo --- [6] saved password file (pgpass.conf) ---
if exist "%APPDATA%\postgresql\pgpass.conf" (
  >>"%OUT%" echo FOUND: %APPDATA%\postgresql\pgpass.conf
  type "%APPDATA%\postgresql\pgpass.conf" >> "%OUT%" 2>&1
) else (
  >>"%OUT%" echo not found: %APPDATA%\postgresql\pgpass.conf
)
>>"%OUT%" echo.
>>"%OUT%" echo --- [7] pg_hba.conf location ---
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
  if exist "%%D\data\pg_hba.conf" >>"%OUT%" echo %%D\data\pg_hba.conf
)
>>"%OUT%" echo.
>>"%OUT%" echo ===== DONE =====
start notepad "%OUT%"

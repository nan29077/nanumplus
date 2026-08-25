@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-nanumplus.ps1"
set "LAUNCH_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%LAUNCH_EXIT_CODE%"=="0" echo Startup failed with exit code %LAUNCH_EXIT_CODE%.
echo Press any key to close this window.
pause >nul
exit /b %LAUNCH_EXIT_CODE%

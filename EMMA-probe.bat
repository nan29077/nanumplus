@echo off
chcp 65001 >nul
cd /d "%~dp0"
node emma-probe.js
echo.
pause

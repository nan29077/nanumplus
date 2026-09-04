@echo off
chcp 65001 >nul
cd /d "%~dp0"
node emma-check.js
echo.
pause

@echo off
pushd "%~dp0"
echo Starting dev server on port 3005...
call npm.cmd run dev
set "START_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%START_EXIT_CODE%"=="0" echo Server failed with exit code %START_EXIT_CODE%.
pause
popd
exit /b %START_EXIT_CODE%

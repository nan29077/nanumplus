@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   나눔플러스 GitHub 커밋 + 푸시
echo ============================================
echo.
echo * 먼저 GitHub Desktop / VSCode 소스컨트롤 등 git 도구를 모두 닫아주세요.
echo   (열려 있으면 lock 오류가 납니다)
echo.
pause
echo.
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo [1/3] 변경사항 스테이징...
git add -A
echo.
echo [2/3] 커밋...
git commit -F ".commitmsg"
echo.
echo [3/3] GitHub 로 푸시...
git push origin main
echo.
echo ============================================
echo   끝났습니다.
echo   - error / rejected 없이 끝나면 성공입니다.
echo   - 로그인 창이 뜨면 GitHub 계정으로 로그인하세요.
echo   - 문제가 있으면 이 검은 창을 통째로 캡처해서 보내주세요.
echo ============================================
echo.
pause

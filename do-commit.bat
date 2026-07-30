@echo off
chcp 65001 > nul
echo === nanumplus 마이그레이션 커밋 스크립트 ===
cd /d "E:\프로젝트\nanumplus"

echo.
echo [1/4] index.lock 파일 제거 중...
if exist ".git\index.lock" (
    del /f ".git\index.lock"
    echo index.lock 삭제 완료
) else (
    echo index.lock 없음 (정상)
)

echo.
echo [2/4] DB 기관명 수정 (세이브더온드런 -> 세이브더칠드런)...
npx tsx prisma\fix-org-name.ts
if errorlevel 1 (
    echo DB 업데이트 실패! 계속 진행합니다...
)

echo.
echo [3/4] git add -A...
git add -A

echo.
echo [4/4] git status 확인...
git status

echo.
echo === staged 파일 목록 ===
git diff --cached --name-only

echo.
echo 커밋 및 푸시를 진행합니다...
git commit -m "기관 데이터 마이그레이션 및 세이브더칠드런 이름 수정"
git push origin main

echo.
echo === 완료 ===
pause

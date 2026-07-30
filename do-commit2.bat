@echo off
echo === nanumplus git commit script ===

echo Step 1: Remove index.lock if exists
if exist "%~dp0.git\index.lock" (
    del /f "%~dp0.git\index.lock"
    echo index.lock deleted
) else (
    echo index.lock not found, OK
)

echo Step 2: Run DB org name fix
cd /d "%~dp0"
npx tsx prisma\fix-org-name.ts
if errorlevel 1 echo DB update failed, continuing...

echo Step 3: git add
git add -A
if errorlevel 1 (
    echo git add failed!
    pause
    exit /b 1
)

echo Step 4: git status
git status

echo Step 5: staged files
git diff --cached --name-only

echo Step 6: git commit
git commit -F "%~dp0commit_msg.txt"
if errorlevel 1 (
    echo git commit failed!
    pause
    exit /b 1
)

echo Step 7: git push
git push origin main
if errorlevel 1 (
    echo git push failed!
    pause
    exit /b 1
)

echo === DONE ===
pause

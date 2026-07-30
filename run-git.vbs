Set fso = CreateObject("Scripting.FileSystemObject")
Set oShell = CreateObject("WScript.Shell")

' Set working directory
Dim projectPath
projectPath = "E:\프로젝트\nanumplus"
oShell.CurrentDirectory = projectPath

' Step 1: Delete index.lock
Dim lockFile
lockFile = projectPath & "\.git\index.lock"
If fso.FileExists(lockFile) Then
    fso.DeleteFile lockFile, True
    MsgBox "index.lock deleted", 64, "Step 1"
End If

' Step 2: DB fix - run npx tsx
Dim r0
r0 = oShell.Run("cmd /c npx tsx prisma\fix-org-name.ts > fix-result.txt 2>&1", 0, True)

' Step 3: git add
Dim r1
r1 = oShell.Run("cmd /c git add -A", 0, True)

' Step 4: git commit
Dim r2
r2 = oShell.Run("cmd /c git commit -F commit_msg.txt", 1, True)

If r2 <> 0 Then
    MsgBox "git commit failed (code " & r2 & "). Check the terminal.", 16, "Error"
    WScript.Quit 1
End If

' Step 5: git push
Dim r3
r3 = oShell.Run("cmd /c git push origin main", 1, True)

If r3 <> 0 Then
    MsgBox "git push failed (code " & r3 & ").", 16, "Error"
Else
    MsgBox "Done! Committed and pushed.", 64, "Success"
End If

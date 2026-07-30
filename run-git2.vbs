Set fso = CreateObject("Scripting.FileSystemObject")
Set oShell = CreateObject("WScript.Shell")

Dim projectPath
projectPath = "E:\프로젝트\nanumplus"
oShell.CurrentDirectory = projectPath

' Delete lock file
Dim lockFile
lockFile = projectPath & "\.git\index.lock"
If fso.FileExists(lockFile) Then
    fso.DeleteFile lockFile, True
End If

' Run DB fix
oShell.Run "cmd /c cd /d """ & projectPath & """ && npx tsx prisma\fix-org-name.ts > fix-result.txt 2>&1", 0, True

' Run all git steps in ONE cmd call (avoids lock file issue between steps)
Dim gitCmd
gitCmd = "cmd /c cd /d """ & projectPath & """ && git add -A && git commit -F commit_msg.txt && git push origin main"
Dim r
r = oShell.Run(gitCmd, 1, True)

If r = 0 Then
    MsgBox "SUCCESS: Committed and pushed!", 64, "Done"
Else
    MsgBox "FAILED (exit code " & r & "). Check the CMD window.", 16, "Error"
End If

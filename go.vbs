Set fso = CreateObject("Scripting.FileSystemObject")
Set oShell = CreateObject("WScript.Shell")

Dim p
p = "E:\프로젝트\nanumplus"

' Delete lock file
If fso.FileExists(p & "\.git\index.lock") Then
    fso.DeleteFile p & "\.git\index.lock", True
End If

' git add + commit + push in one shot
Dim r
r = oShell.Run("cmd /c cd /d """ & p & """ && git add -A && git commit -F commit_msg.txt && git push origin main", 1, True)

If r = 0 Then
    MsgBox "DONE!", 64, "git"
Else
    MsgBox "Exit code: " & r, 16, "git"
End If

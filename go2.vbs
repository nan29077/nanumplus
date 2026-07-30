Set fso = CreateObject("Scripting.FileSystemObject")
Set oShell = CreateObject("WScript.Shell")

' Set working directory (Korean path handled by WScript natively)
oShell.CurrentDirectory = "E:\프로젝트\nanumplus"

' Delete lock file using FSO (handles Korean path natively)
If fso.FileExists(oShell.CurrentDirectory & "\.git\index.lock") Then
    fso.DeleteFile oShell.CurrentDirectory & "\.git\index.lock", True
End If

' Run git commands WITHOUT cd (CurrentDirectory already set)
' Single cmd call: add + commit + push
Dim r
r = oShell.Run("cmd /c git add -A && git commit -F commit_msg.txt && git push origin main", 1, True)

If r = 0 Then
    MsgBox "SUCCESS!", 64, "git push done"
Else
    MsgBox "FAILED, exit=" & r, 16, "git error"
End If

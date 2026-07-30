Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -ExecutionPolicy Bypass -NoExit -File ""E:\프로젝트\nanumplus\setup_db.ps1""", 1, False

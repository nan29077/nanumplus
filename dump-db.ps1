$env:PGPASSWORD = "rmachs1734"
$outFile = "$PSScriptRoot\nanumplus_dump.sql"
pg_dump -U postgres -h localhost -p 5432 nanumplus -f $outFile
if ($LASTEXITCODE -eq 0) {
    Write-Host "덤프 완료: $outFile" -ForegroundColor Green
} else {
    Write-Host "덤프 실패 (pg_dump가 PATH에 없을 수 있음)" -ForegroundColor Red
    Write-Host "PostgreSQL bin 경로를 추가하거나 아래 경로를 직접 지정하세요:"
    Write-Host "  C:\Program Files\PostgreSQL\<버전>\bin\pg_dump.exe"
}

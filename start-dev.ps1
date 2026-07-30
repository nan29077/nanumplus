$ErrorActionPreference = "Continue"

# Get script directory (PSScriptRoot is set by PowerShell internally)
$DIR = $PSScriptRoot
if (-not $DIR) { $DIR = (Get-Location).Path }

$LOG = Join-Path $DIR "start-dev.log"
"=== start-dev $(Get-Date) ===" | Set-Content $LOG -Encoding UTF8

function Log([string]$m) { Write-Host $m; $m | Add-Content $LOG -Encoding UTF8 }

Set-Location $DIR
Log "WorkDir: $DIR"

# 1. Find PostgreSQL
$PSQL = $null
"17","16","15","14" | ForEach-Object {
    $p = "C:\Program Files\PostgreSQL\$_\bin\psql.exe"
    if ((-not $PSQL) -and (Test-Path $p)) { $PSQL = $p }
}
if (-not $PSQL) { Log "ERROR: psql not found"; exit 1 }
Log "psql: $PSQL"

# 2. Start service
$ver = ([regex]::Match($PSQL, "PostgreSQL\\(\d+)")).Groups[1].Value
$svcName = "postgresql-x64-$ver"
$svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($svc -and ($svc.Status -ne "Running")) {
    Log "Starting PostgreSQL service..."
    Start-Service $svcName
    Start-Sleep 3
}
Log "PostgreSQL: $(if($svc){$svc.Status}else{'no service - may be running'})"

# 3. Ensure DB exists
$env:PGPASSWORD = "postgres"
$chk = & $PSQL -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='donation_platform'" 2>&1
if ($chk -match "1") {
    Log "DB donation_platform: exists"
} else {
    Log "Creating DB donation_platform..."
    $r = & $PSQL -U postgres -h localhost -p 5432 -c "CREATE DATABASE donation_platform ENCODING 'UTF8'" 2>&1
    Log "$r"
}

# 4. npm install if needed
$nextBin = Join-Path $DIR "node_modules\.bin\next"
Log "Checking: $nextBin"
if (Test-Path -LiteralPath $nextBin) {
    Log "node_modules OK"
} else {
    $nm = Join-Path $DIR "node_modules"
    if (Test-Path -LiteralPath $nm) {
        Log "Removing partial node_modules..."
        Remove-Item -Recurse -Force -LiteralPath $nm -ErrorAction SilentlyContinue
        Start-Sleep 2
    }
    Log "Running npm install..."
    & npm install
}

# 5. Prisma
Log "Running prisma generate..."
& npx prisma generate
Log "Running prisma db push..."
& npx prisma db push --accept-data-loss

# 6. Seed
$seedFile = Join-Path $DIR "prisma\seed.ts"
if (Test-Path -LiteralPath $seedFile) {
    Log "Running seed..."
    & npm run db:seed
}

# 7. Start dev server
Log ""
Log "============================="
Log "Preview: http://localhost:3005"
Log "============================="
& npm run dev

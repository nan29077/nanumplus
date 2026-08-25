$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$exitCode = 0

try {
    $Host.UI.RawUI.WindowTitle = "나눔플러스 개발 서버"
} catch {
    # 일부 터미널 호스트는 제목 변경을 지원하지 않는다.
}

function Write-Section([string]$message) {
    Write-Host $message -ForegroundColor DarkGreen
}

try {
    Set-Location -LiteralPath $projectDir

    Write-Host ""
    Write-Section "========================================="
    Write-Section "  나눔플러스 서버 시작"
    Write-Section "  http://localhost:3005"
    Write-Section "========================================="
    Write-Host ""

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw "Node.js를 찾을 수 없습니다. https://nodejs.org 에서 Node.js LTS를 설치해 주세요."
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        throw "npm.cmd를 찾을 수 없습니다. Node.js 설치 상태와 PATH 환경 변수를 확인해 주세요."
    }

    if (-not (Test-Path -LiteralPath (Join-Path $projectDir "package.json") -PathType Leaf)) {
        throw "package.json을 찾을 수 없습니다. 프로젝트 폴더 위치를 확인해 주세요."
    }

    $nextCommand = Join-Path $projectDir "node_modules\.bin\next.cmd"
    if (-not (Test-Path -LiteralPath $nextCommand -PathType Leaf)) {
        Write-Host "[안내] 필요한 패키지를 처음 설치합니다. 잠시 기다려 주세요." -ForegroundColor Yellow
        & $npmCommand.Source install
        if ($LASTEXITCODE -ne 0) {
            throw "패키지 설치에 실패했습니다."
        }
    }

    $portInUse = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
        Where-Object { $_.Port -eq 3005 } |
        Select-Object -First 1
    if ($portInUse) {
        throw "3005 포트를 이미 다른 프로그램이 사용 중입니다. 기존 나눔플러스 서버 창을 닫고 다시 실행해 주세요."
    }

    Write-Host "  관리자: admin@onjung.kr / admin1234"
    Write-Host ""
    Write-Section "========================================="
    Write-Section "  서버를 중지하려면 Ctrl+C 를 누르세요."
    Write-Section "========================================="
    Write-Host ""

    & $npmCommand.Source run dev
    $exitCode = $LASTEXITCODE

    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "[안내] 나눔플러스 서버가 종료되었습니다."
    } else {
        Write-Host "[오류] 서버가 시작되지 않았습니다. 위의 오류 내용을 확인해 주세요." -ForegroundColor Red
    }
} catch {
    $exitCode = 1
    Write-Host ""
    Write-Host "[오류] $($_.Exception.Message)" -ForegroundColor Red
}

exit $exitCode

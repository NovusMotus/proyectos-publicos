param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$portfolioBase = $PSScriptRoot
$portfolioUrl = 'http://127.0.0.1:8877'
function Test-Portfolio {
    try {
        $response = Invoke-WebRequest -UseBasicParsing "$portfolioUrl/api/status" -TimeoutSec 2
        $status = $response.Content | ConvertFrom-Json
        return ($response.Headers['Server'] -like 'PortfolioLocal/1.0*' -and $status.corpus_count -eq 82 -and $status.publication_approved -eq $false)
    } catch { return $false }
}
if (Test-Portfolio) {
    Write-Host "Portfolio disponible en $portfolioUrl"
    if (-not $NoBrowser) { Start-Process $portfolioUrl }
    exit 0
}
if (Get-NetTCPConnection -LocalPort 8877 -State Listen -ErrorAction SilentlyContinue) {
    throw 'El puerto 8877 lo usa otro proceso. No se ha detenido ni reemplazado.'
}
$portfolioPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$portfolioPrefix = @()
if (-not (Test-Path -LiteralPath $portfolioPython)) {
    $portfolioCmd = Get-Command py -ErrorAction SilentlyContinue
    if ($portfolioCmd) { $portfolioPython = $portfolioCmd.Source; $portfolioPrefix = @('-3') }
    else {
        $portfolioCmd = Get-Command python -ErrorAction SilentlyContinue
        if (-not $portfolioCmd) { throw 'No se encuentra Python. Se necesita Python 3.10 o posterior.' }
        $portfolioPython = $portfolioCmd.Source
    }
}
& $portfolioPython @portfolioPrefix -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)'
if ($LASTEXITCODE -ne 0) { throw 'Se necesita Python 3.10 o posterior.' }
$portfolioRuntime = Join-Path $portfolioBase 'private-runtime'
New-Item -ItemType Directory -Path $portfolioRuntime -Force | Out-Null
$portfolioArgs = $portfolioPrefix + @('-u', ('"' + (Join-Path $portfolioBase 'server.py') + '"'), '--port', '8877')
$portfolioProcess = Start-Process -FilePath $portfolioPython -ArgumentList $portfolioArgs -WorkingDirectory $portfolioBase -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $portfolioRuntime 'server-start.log') -RedirectStandardError (Join-Path $portfolioRuntime 'server-error.log')
$portfolioProcess.Id | Set-Content -LiteralPath (Join-Path $portfolioRuntime 'server.pid') -Encoding ascii
for ($portfolioAttempt=0; $portfolioAttempt -lt 30; $portfolioAttempt++) {
    if (Test-Portfolio) {
        Write-Host "Portfolio disponible en $portfolioUrl"
        if (-not $NoBrowser) { Start-Process $portfolioUrl }
        exit 0
    }
    if ($portfolioProcess.HasExited) { throw 'El servidor no ha arrancado. Consulta private-runtime/server-error.log.' }
    Start-Sleep -Milliseconds 500
}
throw 'El servidor tarda en arrancar. Consulta private-runtime/server-error.log.'

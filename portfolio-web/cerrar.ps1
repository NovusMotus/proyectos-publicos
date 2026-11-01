$ErrorActionPreference = 'Stop'
$portfolioPidFile = Join-Path $PSScriptRoot 'private-runtime\server.pid'
if (-not (Test-Path -LiteralPath $portfolioPidFile)) { Write-Host 'No hay un servidor iniciado por este lanzador.'; exit 0 }
$portfolioPidText = (Get-Content -LiteralPath $portfolioPidFile -Raw).Trim()
if ($portfolioPidText -notmatch '^\d+$') { throw 'Identificador de proceso no válido.' }
$portfolioProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$portfolioPidText"
if (-not $portfolioProcess) { Write-Host 'El servidor ya está cerrado.'; exit 0 }
$portfolioServer = Join-Path $PSScriptRoot 'server.py'
$portfolioServerToken = '(?:^|\s)"?' + [regex]::Escape($portfolioServer) + '"?(?=\s|$)'
if ($portfolioProcess.Name -notmatch '^python(?:w)?\.exe$' -or $portfolioProcess.CommandLine -notmatch $portfolioServerToken) {
    throw 'El proceso no corresponde a este servidor. No se ha detenido.'
}
Stop-Process -Id ([int]$portfolioPidText)
Write-Host 'Servidor del portfolio cerrado.'

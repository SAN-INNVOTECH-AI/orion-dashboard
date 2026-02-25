# Orion Dashboard Launcher
param([switch]$Silent)

$root = $PSScriptRoot
$env:PORT = "3001"

if (-not $Silent) { Write-Host "Orion Dashboard starting..." -ForegroundColor Cyan }

Start-Process node -ArgumentList "index.js" `
  -WorkingDirectory "$root\server" `
  -NoNewWindow -PassThru `
  -RedirectStandardOutput "$env:TEMP\orion-server.log" `
  -RedirectStandardError "$env:TEMP\orion-server-err.log" | Out-Null

Start-Sleep 2

Start-Process node -ArgumentList "node_modules\next\dist\bin\next dev" `
  -WorkingDirectory "$root\client" `
  -NoNewWindow -PassThru `
  -RedirectStandardOutput "$env:TEMP\orion-client.log" `
  -RedirectStandardError "$env:TEMP\orion-client-err.log" | Out-Null

if (-not $Silent) {
  Start-Sleep 5
  Write-Host "Ready: http://localhost:3000  (admin / admin)" -ForegroundColor Green
}

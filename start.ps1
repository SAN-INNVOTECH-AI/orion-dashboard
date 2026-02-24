# Orion Dashboard - Start Script
# Usage: .\start.ps1
# Starts server (port 3001) and client (port 3000) as detached processes

$root = $PSScriptRoot

Write-Host "Starting Orion Server (port 3001)..." -ForegroundColor Cyan
$env:PORT = "3001"
$server = Start-Process node -ArgumentList "index.js" `
  -WorkingDirectory "$root\server" `
  -NoNewWindow -PassThru `
  -RedirectStandardOutput "$env:TEMP\orion-server.log" `
  -RedirectStandardError "$env:TEMP\orion-server-err.log"
Write-Host "  Server PID: $($server.Id)"

Start-Sleep 2

Write-Host "Starting Orion Client (port 3000)..." -ForegroundColor Cyan
$client = Start-Process cmd.exe -ArgumentList "/c node_modules\.bin\next.cmd dev" `
  -WorkingDirectory "$root\client" `
  -NoNewWindow -PassThru `
  -RedirectStandardOutput "$env:TEMP\orion-client.log" `
  -RedirectStandardError "$env:TEMP\orion-client-err.log"
Write-Host "  Client PID: $($client.Id)"

Start-Sleep 8

Write-Host ""
Write-Host "Dashboard ready:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "  Login:    admin / admin"
Write-Host ""
Write-Host "Logs: $env:TEMP\orion-server.log | $env:TEMP\orion-client.log"

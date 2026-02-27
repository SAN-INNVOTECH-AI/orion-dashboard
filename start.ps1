# Orion Silent Startup Script

$root = $PSScriptRoot
$env:PORT = "3001"

$env:ORION_API_TARGET = "http://127.0.0.1:3001"

# Start Backend
Start-Process "cmd.exe" `
  -ArgumentList "/c node index.js" `
  -WorkingDirectory "$root\server" `
  -WindowStyle Hidden `
  -RedirectStandardOutput "$env:TEMP\orion-server.log" `
  -RedirectStandardError "$env:TEMP\orion-server-error.log"

Start-Sleep 3

# Start Frontend (Production Silent)
Start-Process "C:\Program Files\nodejs\npm.cmd" `
  -ArgumentList "run dev -- --experimental-https -p 3000 -H 0.0.0.0" `
  -WorkingDirectory "$root\client" `
  -WindowStyle Hidden `
  -RedirectStandardOutput "$env:TEMP\orion-client.log" `
  -RedirectStandardError "$env:TEMP\orion-client-error.log"
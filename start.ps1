# Orion Silent Startup Script

$root = $PSScriptRoot
$env:PORT = "3001"
$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"

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
  -ArgumentList "run dev -- -p 3000" `
  -WorkingDirectory "$root\client" `
  -WindowStyle Hidden `
  -RedirectStandardOutput "$env:TEMP\orion-client.log" `
  -RedirectStandardError "$env:TEMP\orion-client-error.log"
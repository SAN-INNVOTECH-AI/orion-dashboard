# Orion Dashboard - Stop Script
Write-Host "Stopping Orion on ports 3000 and 3001..." -ForegroundColor Yellow

@(3000, 3001) | ForEach-Object {
  $port = $_
  $pids = (netstat -ano | Select-String ":$port .*LISTENING") -replace '.*LISTENING\s+', '' | Select-Object -Unique
  $pids | ForEach-Object {
    if ($_ -match '^\d+$' -and $_ -ne '0') {
      try { Stop-Process -Id $_ -Force; Write-Host "  Killed PID $_ (port $port)" } catch {}
    }
  }
}
Write-Host "Done." -ForegroundColor Green

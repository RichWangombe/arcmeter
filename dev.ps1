# dev.ps1 – ArcMeter convenience launcher for Windows
# Starts all services in parallel; keeps them on top.

Write-Host "Starting ArcMeter services..." -ForegroundColor Cyan

$jobs = @(
    { Name = "shared";   Script = { Set-Location "packages/shared";   pnpm dev } },
    { Name = "facilitator"; Script = { Set-Location "services/facilitator"; pnpm dev } },
    { Name = "seller-api"; Script = { Set-Location "services/seller-api"; pnpm dev } },
    { Name = "agent-buyer"; Script = { Set-Location "services/agent-buyer"; pnpm dev } },
    { Name = "web"; Script = { Set-Location "apps/web"; pnpm dev } }
)

# Start each job in its own window
foreach ($job in $jobs) {
    $title = "ArcMeter - $($job.Name)"
    $cmd = "pwsh -NoExit -Command `" & { Set-Location '$($job.Script)'; Read-Host -Prompt 'Press Enter to stop' }""
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $cmd -NoNewWindow
}

Write-Host "`nAll services launched. Press Enter in this window to stop all." -ForegroundColor Green
Read-Host

# Optional: cleanup on exit if you want
# Get-Process pwsh | Where-Object { $_.MainWindowTitle -like "ArcMeter" } | Stop-Process

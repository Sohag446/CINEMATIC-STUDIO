$proc = Get-Process -Name 'cinematic-studio' -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "FOUND RUNNING INSTANCE:"
    $proc | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle | Format-Table -AutoSize
} else {
    Write-Host "NOT RUNNING. Launching installed application..."
    $exePath = "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio.exe"
    if (Test-Path $exePath) {
        $started = Start-Process -FilePath $exePath -PassThru
        Write-Host "Started process ID: $($started.Id)"
        Start-Sleep -Seconds 3
        $proc2 = Get-Process -Id $started.Id -ErrorAction SilentlyContinue
        $proc2 | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle | Format-Table -AutoSize
    } else {
        Write-Error "Executable not found at $exePath"
    }
}


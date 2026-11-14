$proc = Start-Process -FilePath "C:\Users\Sohag Hossen\AppData\Local\Cinematic Studio\cinematic-studio.exe" -PassThru
Write-Host "Started process ID: $($proc.Id)"
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 1
    $p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host "[$i s] Process alive! Responding: $($p.Responding), MainWindowTitle: '$($p.MainWindowTitle)', HWND: $($p.MainWindowHandle)"
    } else {
        Write-Host "[$i s] Process has exited. ExitCode: $($proc.ExitCode)"
        break
    }
}

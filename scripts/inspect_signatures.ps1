$targets = @(
    "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio-host.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\uninstall.exe",
    "src-tauri\resources\media-engine\windows-x64\ffmpeg.exe",
    "src-tauri\resources\media-engine\windows-x64\ffprobe.exe"
)

Write-Host "============================================================"
Write-Host "AUTHENTICODE SIGNATURE & CERTIFICATE CHAIN INSPECTION"
Write-Host "============================================================"

foreach ($path in $targets) {
    if (Test-Path $path) {
        $sig = Get-AuthenticodeSignature -FilePath $path
        Write-Host "File: $path"
        Write-Host "  Status:        $($sig.Status)"
        Write-Host "  StatusMessage: $($sig.StatusMessage)"
        Write-Host "  Signer:        $($sig.SignerCertificate.Subject)"
        Write-Host "  Issuer:        $($sig.SignerCertificate.Issuer)"
        Write-Host "  Thumbprint:    $($sig.SignerCertificate.Thumbprint)"
        Write-Host "  NotAfter:      $($sig.SignerCertificate.NotAfter)"
        Write-Host "  TimeStamper:   $($sig.TimeStamperCertificate.Subject)"
        Write-Host "  IsOSBinary:    $($sig.IsOSBinary)"
        Write-Host ""
    } else {
        Write-Host "File not found: $path`n"
    }
}

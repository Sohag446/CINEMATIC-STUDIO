Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipDir = "C:\Users\Sohag Hossen\Downloads\github video soft"
$zipFiles = Get-ChildItem -Path $zipDir -Filter "*.zip"

foreach ($file in $zipFiles) {
    Write-Host "================================================================="
    Write-Host "ZIP: $($file.Name) | Size: $($file.Length) bytes"
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
        Write-Host "Total entries: $($zip.Entries.Count)"
        $keyFiles = $zip.Entries | Where-Object { $_.Name -match "(?i)^readme|^package\.json$|^cargo\.toml$|^license" }
        foreach ($k in $keyFiles) {
            Write-Host "  -> $($k.FullName) ($($k.Length) bytes)"
        }
        $zip.Dispose()
    } catch {
        Write-Host "  Failed to open: $($_.Exception.Message)"
    }
}

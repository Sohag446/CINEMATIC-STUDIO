Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "C:\Users\Sohag Hossen\Downloads\github video soft\shorts-studio-main.zip"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
Write-Host "Total Shorts Studio entries: $($zip.Entries.Count)"
$entries = $zip.Entries | Select-Object -First 50
foreach ($e in $entries) {
    Write-Host $e.FullName
}
$zip.Dispose()

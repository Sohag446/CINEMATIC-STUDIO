Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "C:\Users\Sohag Hossen\Downloads\github video soft\Video-Editor-SDK-React-main.zip"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
Write-Host "Total Video-Editor-SDK-React entries: $($zip.Entries.Count)"
$entries = $zip.Entries | Select-Object -First 40
foreach ($e in $entries) {
    Write-Host $e.FullName
}
$zip.Dispose()

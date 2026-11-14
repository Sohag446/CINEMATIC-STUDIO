Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipDir = "C:\Users\Sohag Hossen\Downloads\github video soft"
$targets = @(
    "MeerCut-main.zip",
    "shorts-studio-main.zip",
    "agnes-video-generator-master.zip",
    "free-short-video-studio-main.zip",
    "CupCat-Video-Editor-2026-main.zip",
    "openshot-qt-develop.zip",
    "Video-Editor-SDK-React-main.zip"
)

foreach ($t in $targets) {
    $fullPath = Join-Path $zipDir $t
    if (Test-Path $fullPath) {
        Write-Host "================================================================="
        Write-Host "INSPECTING: $t"
        $zip = [System.IO.Compression.ZipFile]::OpenRead($fullPath)
        
        # Look for README
        $readme = $zip.Entries | Where-Object { $_.Name -match "(?i)^readme\.md$" } | Select-Object -First 1
        if ($readme) {
            $stream = $readme.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $text = $reader.ReadToEnd()
            $reader.Dispose()
            $stream.Dispose()
            Write-Host "--- README (first 500 chars) ---"
            Write-Host $text.Substring(0, [Math]::Min(500, $text.Length))
        }

        # Look for package.json
        $pkg = $zip.Entries | Where-Object { $_.Name -eq "package.json" } | Select-Object -First 1
        if ($pkg) {
            $stream = $pkg.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $text = $reader.ReadToEnd()
            $reader.Dispose()
            $stream.Dispose()
            Write-Host "--- package.json (first 500 chars) ---"
            Write-Host $text.Substring(0, [Math]::Min(500, $text.Length))
        }

        $zip.Dispose()
    }
}

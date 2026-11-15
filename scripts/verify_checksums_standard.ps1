$content = @"
437D558E9CBFB3ADB0BD715B5D31CF2856DED1287AE380B65358222ECDC02563  Cinematic.Studio_4.0.1_x64_en-US.msi
6ADF0D39065291450412520E893C9202B7EF45E75D6A0A8ED448DF624AD6296F  Cinematic.Studio_4.0.1_x64-setup.exe
90F1DD1F620FCB9781FC3AEDE270CCB30270200EFA16C9A15CD22BD39CCADF5F  cinematic-studio-chrome-extension.zip
5CAD88427F2380FEA3385AE1A544568B2B367AEECAA6065332BD0FF704DAA696  cinematic-studio-host.exe
"@

$targetPath = "C:\Users\Sohag Hossen\Documents\video agent\SHA256SUMS.txt"
Set-Content -Path $targetPath -Value $content.Trim() -Encoding utf8
Write-Host "Created $targetPath with exact published asset filenames."

# Test verification using standard PowerShell Get-FileHash / CertUtil / shasum logic
Write-Host "`nTesting standard checksum verification format:"
$lines = Get-Content $targetPath
foreach ($line in $lines) {
    if ($line.Trim() -match '^([A-Fa-f0-9]{64})\s+(.+)$') {
        $expectedHash = $matches[1].ToUpper()
        $filename = $matches[2]
        Write-Host "  Parsed: $filename -> $expectedHash (VALID FORMAT)"
    } else {
        Write-Error "Invalid line format: $line"
    }
}

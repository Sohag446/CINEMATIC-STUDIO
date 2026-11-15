param()

function Get-PEDependencies($filePath) {
    if (-not (Test-Path $filePath)) { return @() }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -lt 64) { return @() }
    if ($bytes[0] -ne 0x4D -or $bytes[1] -ne 0x5A) { return @() }
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
    if ($peOffset + 24 -gt $bytes.Length) { return @() }
    if ($bytes[$peOffset] -ne 0x50 -or $bytes[$peOffset+1] -ne 0x45) { return @() }
    
    $optHeaderOffset = $peOffset + 24
    $magic = [BitConverter]::ToUInt16($bytes, $optHeaderOffset)
    
    $importDirRVA = 0
    if ($magic -eq 0x20B) { # 64-bit PE32+
        $importDirRVA = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 120)
    } elseif ($magic -eq 0x10B) { # 32-bit PE32
        $importDirRVA = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 104)
    }
    if ($importDirRVA -eq 0) { return @() }
    
    $numSections = [BitConverter]::ToUInt16($bytes, $peOffset + 6)
    $sectionHeaderOffset = $optHeaderOffset + [BitConverter]::ToUInt16($bytes, $peOffset + 20)
    
    function RvaToOffset([int]$rva, $sections, $bytesArr, $secOffset) {
        for ($i = 0; $i -lt $sections; $i++) {
            $sh = $secOffset + ($i * 40)
            $vSize = [BitConverter]::ToInt32($bytesArr, $sh + 8)
            $vAddr = [BitConverter]::ToInt32($bytesArr, $sh + 12)
            $rOffset = [BitConverter]::ToInt32($bytesArr, $sh + 20)
            if ($rva -ge $vAddr -and $rva -lt ($vAddr + $vSize)) {
                return $rOffset + ($rva - $vAddr)
            }
        }
        return -1
    }
    
    $descOffset = RvaToOffset $importDirRVA $numSections $bytes $sectionHeaderOffset
    if ($descOffset -lt 0) { return @() }
    
    $dlls = [System.Collections.Generic.List[string]]::new()
    while ($true) {
        if ($descOffset + 20 -gt $bytes.Length) { break }
        $nameRVA = [BitConverter]::ToInt32($bytes, $descOffset + 12)
        if ($nameRVA -eq 0) { break }
        $nameOffset = RvaToOffset $nameRVA $numSections $bytes $sectionHeaderOffset
        if ($nameOffset -ge 0) {
            $dllName = ""
            for ($idx = $nameOffset; $idx -lt $bytes.Length -and $bytes[$idx] -ne 0; $idx++) {
                $dllName += [char]$bytes[$idx]
            }
            if ($dllName.Length -gt 0) {
                $dlls.Add($dllName)
            }
        }
        $descOffset += 20
    }
    return $dlls
}

$targets = @(
    "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio-host.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\uninstall.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\resources\media-engine\windows-x64\ffmpeg.exe",
    "$env:LOCALAPPDATA\Cinematic Studio\resources\media-engine\windows-x64\ffprobe.exe"
)

$report = @{}
foreach ($t in $targets) {
    $leaf = Split-Path $t -Leaf
    Write-Host "==================================================="
    Write-Host "File: $leaf"
    Write-Host "Path: $t"
    $imported = Get-PEDependencies $t
    $report[$leaf] = $imported
    Write-Host "Imported DLLs count: $($imported.Count)"
    foreach ($d in $imported) {
        Write-Host "  -> $d"
    }
}

$jsonPath = "docs/EXECUTABLE_DEPENDENCIES_AUDIT.json"
$report | ConvertTo-Json -Depth 4 | Set-Content -Path $jsonPath -Encoding utf8
Write-Host "`nMachine-readable audit written to $jsonPath"

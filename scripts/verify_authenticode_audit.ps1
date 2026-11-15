# scripts/verify_authenticode_audit.ps1
param(
    [string[]]$FilePaths = @(
        "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio.exe",
        "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio-host.exe",
        "$env:LOCALAPPDATA\Cinematic Studio\uninstall.exe",
        "$env:LOCALAPPDATA\Cinematic Studio\resources\media-engine\windows-x64\ffmpeg.exe",
        "$env:LOCALAPPDATA\Cinematic Studio\resources\media-engine\windows-x64\ffprobe.exe"
    ),
    [string]$ExpectedPublisher = "Md. Sohag Hossen",
    [string]$OutputJson = "docs/AUTHENTICODE_AUDIT_REPORT.json"
)

Add-Type -AssemblyName System.Security

function Inspect-FileSignature([string]$path, [string]$expectedPub) {
    $record = [ordered]@{
        FilePath             = $path
        FileName             = Split-Path $path -Leaf
        Exists               = Test-Path $path
        Status               = "FileNotFound"
        StatusMessage        = ""
        HasSignature         = $false
        IsAuthenticodeValid  = $false
        PublisherMatches     = $false
        Subject              = $null
        Issuer               = $null
        Thumbprint           = $null
        CertNotBefore        = $null
        CertNotAfter         = $null
        HasTimestampCounterSig = $false
        TimestampAuthority   = $null
        TimestampCertValid   = $false
        TimestampSigningTime = $null
    }

    if (-not $record.Exists) { return $record }

    $sig = Get-AuthenticodeSignature -FilePath $path
    $record.Status = $sig.Status.ToString()
    $record.StatusMessage = $sig.StatusMessage
    $record.HasSignature = ($sig.Status -ne "NotSigned")
    $record.IsAuthenticodeValid = ($sig.Status -eq "Valid")

    if ($sig.SignerCertificate) {
        $cert = $sig.SignerCertificate
        $record.Subject = $cert.Subject
        $record.Issuer = $cert.Issuer
        $record.Thumbprint = $cert.Thumbprint
        $record.CertNotBefore = $cert.NotBefore.ToString("o")
        $record.CertNotAfter = $cert.NotAfter.ToString("o")
        if ($expectedPub -and $cert.Subject -match [regex]::Escape($expectedPub)) {
            $record.PublisherMatches = $true
        }
    }

    if ($sig.TimeStamperCertificate) {
        $tsCert = $sig.TimeStamperCertificate
        $record.HasTimestampCounterSig = $true
        $record.TimestampAuthority = $tsCert.Subject
        $now = Get-Date
        if ($now -ge $tsCert.NotBefore -and $now -le $tsCert.NotAfter) {
            $record.TimestampCertValid = $true
        }

        # Extract RFC 3161 / Authenticode timestamp signing time via SignedCms
        try {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            # Find security directory in PE header
            $peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
            $optHeaderOffset = $peOffset + 24
            $magic = [BitConverter]::ToUInt16($bytes, $optHeaderOffset)
            $secDirRVA = 0
            $secDirSize = 0
            if ($magic -eq 0x20B) { # 64-bit
                $secDirRVA = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 144)
                $secDirSize = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 148)
            } elseif ($magic -eq 0x10B) { # 32-bit
                $secDirRVA = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 128)
                $secDirSize = [BitConverter]::ToInt32($bytes, $optHeaderOffset + 132)
            }
            if ($secDirRVA -gt 0 -and $secDirSize -gt 8) {
                # In PE, secDirRVA is a file pointer (not virtual address)
                $certHeaderLength = [BitConverter]::ToInt32($bytes, $secDirRVA)
                $certRevision = [BitConverter]::ToUInt16($bytes, $secDirRVA + 4)
                $certType = [BitConverter]::ToUInt16($bytes, $secDirRVA + 6)
                # WIN_CERT_TYPE_PKCS_SIGNED_DATA = 0x0002
                if ($certType -eq 2) {
                    $pkcsBytes = New-Object byte[] ($secDirSize - 8)
                    [Array]::Copy($bytes, $secDirRVA + 8, $pkcsBytes, 0, $secDirSize - 8)
                    $signedCms = New-Object System.Security.Cryptography.Pkcs.SignedCms
                    $signedCms.Decode($pkcsBytes)
                    foreach ($signer in $signedCms.SignerInfos) {
                        foreach ($attr in $signer.UnauthenticatedAttributes) {
                            # OID 1.2.840.113549.1.9.6 = timestamp counter-signature
                            # OID 1.2.840.113549.1.9.16.1.4 = RFC 3161 id-aa-timeStampToken
                            if ($attr.Oid.Value -eq "1.2.840.113549.1.9.16.1.4" -or $attr.Oid.Value -eq "1.2.840.113549.1.9.6") {
                                $record.HasTimestampCounterSig = $true
                                # Parse timestamp token CMS
                                try {
                                    $tstCms = New-Object System.Security.Cryptography.Pkcs.SignedCms
                                    $tstCms.Decode($attr.Values[0].RawData)
                                    foreach ($tstSigner in $tstCms.SignerInfos) {
                                        foreach ($tstAttr in $tstSigner.SignedAttributes) {
                                            if ($tstAttr.Oid.Value -eq "1.2.840.113549.1.9.5") { # signingTime
                                                $record.TimestampSigningTime = (New-Object System.Security.Cryptography.Pkcs.Pkcs9SigningTime -ArgumentList @(,$tstAttr.RawData)).SigningTime.ToString("o")
                                            }
                                        }
                                    }
                                } catch {}
                            }
                        }
                    }
                }
            }
        } catch {}
    }

    return $record
}

$results = @()
foreach ($f in $FilePaths) {
    $r = Inspect-FileSignature $f $ExpectedPublisher
    $results += $r
    Write-Host "File: $($r.FileName)"
    Write-Host "  Status:         $($r.Status)"
    Write-Host "  AuthValid:      $($r.IsAuthenticodeValid)"
    Write-Host "  Subject:        $($r.Subject)"
    Write-Host "  Timestamped:    $($r.HasTimestampCounterSig)"
    Write-Host "  TimestampTime:  $($r.TimestampSigningTime)"
}

$jsonDir = Split-Path $OutputJson -Parent
if ($jsonDir -and -not (Test-Path $jsonDir)) {
    New-Item -ItemType Directory -Path $jsonDir -Force | Out-Null
}
$results | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputJson -Encoding utf8
Write-Host "`nMachine-readable audit report saved to $OutputJson"


# scripts/test_sac_event_log.ps1
param(
    [int]$HoursBack = 24,
    [string]$TargetProcess = "cinematic",
    [string]$OutputJson = "docs/SMART_APP_CONTROL_EVENT_AUDIT.json"
)

Write-Host "============================================================"
Write-Host "WINDOWS CODE INTEGRITY / SMART APP CONTROL EVENT AUDIT"
Write-Host "============================================================"
Write-Host "Scanning log: Microsoft-Windows-CodeIntegrity/Operational"
Write-Host "Lookback window: Last $HoursBack hours"
Write-Host "Event IDs:"
Write-Host "  - 3076: Audit-mode block (file WOULD be blocked under enforcement)"
Write-Host "  - 3077: Enforcement-mode block (file WAS blocked)"
Write-Host "  - 3089: Signature information associated with CI events"
Write-Host "============================================================`n"

$startTime = (Get-Date).AddHours(-$HoursBack)

$filter = @{
    LogName   = 'Microsoft-Windows-CodeIntegrity/Operational'
    Id        = 3076, 3077, 3089
    StartTime = $startTime
}

$events = @()
try {
    $events = Get-WinEvent -FilterHashtable $filter -ErrorAction SilentlyContinue
} catch {
    Write-Host "No CodeIntegrity events found in the specified window or log unavailable."
}

$parsedRecords = [System.Collections.Generic.List[PSObject]]::new()
$blockCount = 0
$auditBlockCount = 0

foreach ($evt in $events) {
    $xml = [xml]$evt.ToXml()
    $data = @{}
    foreach ($node in $xml.Event.EventData.Data) {
        if ($node.Name) {
            $data[$node.Name] = $node.'#text'
        }
    }

    $fileName = $data["FileName"]
    $processName = $data["ProcessName"]

    # Filter for cinematic studio related files if targetProcess specified
    $isMatch = $true
    if ($TargetProcess) {
        $combined = "$fileName $processName $($evt.Message)"
        if ($combined -notmatch [regex]::Escape($TargetProcess) -and $combined -notmatch "ffmpeg" -and $combined -notmatch "setup") {
            $isMatch = $false
        }
    }

    if ($isMatch) {
        $eventType = switch ($evt.Id) {
            3076 { $auditBlockCount++; "AUDIT_BLOCK (File would have been blocked under enforcement)" }
            3077 { $blockCount++; "ENFORCEMENT_BLOCK (File was blocked by policy)" }
            3089 { "SIGNATURE_INFO" }
            Default { "UNKNOWN" }
        }

        $record = [PSCustomObject]@{
            TimeCreated   = $evt.TimeCreated.ToString("o")
            EventId       = $evt.Id
            EventType     = $eventType
            FileName      = $fileName
            ProcessName   = $processName
            PolicyName    = $data["PolicyName"]
            Message       = $evt.Message
        }
        $parsedRecords.Add($record)

        Write-Host "[$($evt.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss'))] Event $($evt.Id): $eventType"
        if ($fileName) { Write-Host "  File:    $fileName" }
        if ($processName) { Write-Host "  Process: $processName" }
        Write-Host ""
    }
}

Write-Host "------------------------------------------------------------"
Write-Host "SUMMARY:"
Write-Host "  Total matching CI events: $($parsedRecords.Count)"
Write-Host "  Active Blocks (3077):     $blockCount"
Write-Host "  Audit Blocks (3076):      $auditBlockCount"
Write-Host "------------------------------------------------------------"

$jsonDir = Split-Path $OutputJson -Parent
if ($jsonDir -and -not (Test-Path $jsonDir)) {
    New-Item -ItemType Directory -Path $jsonDir -Force | Out-Null
}
$parsedRecords | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputJson -Encoding utf8
Write-Host "Event audit saved to $OutputJson"

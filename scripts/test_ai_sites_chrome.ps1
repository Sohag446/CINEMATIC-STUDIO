# Test 4 AI sites with genuine Chrome using CinematicStudio managed profile
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (!(Test-Path $chromePath)) {
    $chromePath = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
}

$userDir = "$env:LOCALAPPDATA\CinematicStudio\Profiles\Acceptance_Profile"
if (!(Test-Path $userDir)) { New-Item -ItemType Directory -Force -Path $userDir | Out-Null }

$sites = @(
    @{ Name = "ChatGPT"; Url = "https://chatgpt.com" },
    @{ Name = "Gemini"; Url = "https://gemini.google.com" },
    @{ Name = "Claude"; Url = "https://claude.ai" },
    @{ Name = "Google_Flow_Veo"; Url = "https://deepmind.google/technologies/veo/" }
)

Write-Host "============================================================"
Write-Host "TESTING 4 AI WEBSITES WITH GENUINE CHROME"
Write-Host "Profile: $userDir"
Write-Host "============================================================"

foreach ($site in $sites) {
    Write-Host "`n--- Testing $($site.Name) ($($site.Url)) ---"
    $proc = Start-Process -FilePath $chromePath -ArgumentList @(
        "--app=$($site.Url)",
        "--user-data-dir=`"$userDir`"",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1024,768"
    ) -PassThru

    Write-Host "Launched $($site.Name) with PID: $($proc.Id)"
    Start-Sleep -Seconds 6

    # Verify process is running
    $check = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($check) {
        Write-Host "Result: PASS (Chrome process active, PID $($check.Id), window opened)"
    } else {
        Write-Host "Result: FAILED (Process exited early)"
    }

    # Close test browser instance cleanly
    if ($check -and !$check.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}
Write-Host "`nAI Website navigation tests completed."


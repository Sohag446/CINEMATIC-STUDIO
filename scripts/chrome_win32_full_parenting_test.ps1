Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$definition = @"
using System;
using System.Runtime.InteropServices;

public class Win32ParentTest {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetParent(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public const int GWL_STYLE = -16;
    public const int WS_VISIBLE = 0x10000000;
    public const int WS_CHILD = 0x40000000;
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_THICKFRAME = 0x00040000;
    public const int WS_POPUP = unchecked((int)0x80000000);

    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint SWP_SHOWWINDOW = 0x0040;
}
"@

Add-Type -TypeDefinition $definition

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = "$env:LOCALAPPDATA\CinematicStudio\Profiles\EmbeddingVerification"
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
}

# Create host form and embedding panel
$form = New-Object System.Windows.Forms.Form
$form.Text = "CINEMATIC STUDIO — Chrome Embedding Host Test"
$form.Width = 900
$form.Height = 700
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen

$panel = New-Object System.Windows.Forms.Panel
$panel.Location = New-Object System.Drawing.Point(50, 50)
$panel.Size = New-Object System.Drawing.Size(800, 580)
$panel.BackColor = [System.Drawing.Color]::Black
$form.Controls.Add($panel)

$form.Show()
[System.Windows.Forms.Application]::DoEvents()

Write-Host "[TEST] Container HWND: $($panel.Handle)"

# Launch Chrome
$proc = Start-Process -FilePath $chromePath -ArgumentList @(
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--app=https://deepmind.google/technologies/veo/",
    "--window-size=800,580"
) -PassThru

# Wait for Chrome window
$chromeHwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    [System.Windows.Forms.Application]::DoEvents()
    $proc.Refresh()
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
        $chromeHwnd = $proc.MainWindowHandle
        break
    }
}

if ($chromeHwnd -eq [IntPtr]::Zero) {
    # Check all chrome processes
    $chromes = Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
    if ($chromes) {
        $chromeHwnd = $chromes[0].MainWindowHandle
    }
}

Write-Host "[TEST] Target Chrome HWND: $chromeHwnd"

if ($chromeHwnd -ne [IntPtr]::Zero) {
    # Step 1: Change Window Style to WS_CHILD
    $style = [Win32ParentTest]::GetWindowLong($chromeHwnd, [Win32ParentTest]::GWL_STYLE)
    $newStyle = ($style -band (-bnot [Win32ParentTest]::WS_POPUP) -band (-bnot [Win32ParentTest]::WS_CAPTION) -band (-bnot [Win32ParentTest]::WS_THICKFRAME)) -bor [Win32ParentTest]::WS_CHILD -bor [Win32ParentTest]::WS_VISIBLE
    [Win32ParentTest]::SetWindowLong($chromeHwnd, [Win32ParentTest]::GWL_STYLE, $newStyle) | Out-Null

    # Step 2: SetParent to the container panel
    $prevParent = [Win32ParentTest]::SetParent($chromeHwnd, $panel.Handle)
    Write-Host "[TEST] SetParent executed. Previous parent: $prevParent"

    # Step 3: Reposition Chrome to fill panel
    [Win32ParentTest]::SetWindowPos(
        $chromeHwnd,
        [IntPtr]::Zero,
        0, 0,
        $panel.Width, $panel.Height,
        [Win32ParentTest]::SWP_NOZORDER -bor [Win32ParentTest]::SWP_FRAMECHANGED -bor [Win32ParentTest]::SWP_SHOWWINDOW
    ) | Out-Null

    # Verify parent
    $currentParent = [Win32ParentTest]::GetParent($chromeHwnd)
    Write-Host "[TEST] Current parent of Chrome HWND: $currentParent (Expected: $($panel.Handle))"

    if ($currentParent -eq $panel.Handle) {
        Write-Host "[PASS] Verified: Chrome is reparented as a native child window inside the container panel!"
    } else {
        Write-Host "[FAIL] Parent mismatch: $currentParent vs $($panel.Handle)"
    }

    Start-Sleep -Seconds 2
    [System.Windows.Forms.Application]::DoEvents()
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[FAIL] Could not find Chrome HWND"
}

$form.Close()

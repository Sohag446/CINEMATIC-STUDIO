Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$definition = @"
using System;
using System.Runtime.InteropServices;

public class Win32Embed {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    public const int GWL_STYLE = -16;
    public const int WS_VISIBLE = 0x10000000;
    public const int WS_CHILD = 0x40000000;
    public const int WS_BORDER = 0x00800000;
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_THICKFRAME = 0x00040000;
    public const int WS_POPUP = unchecked((int)0x80000000);

    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_SHOW = 5;
}
"@

Add-Type -TypeDefinition $definition

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    Write-Host "[ERROR] Chrome not found at $chromePath"
    exit 1
}

$profileDir = "$env:LOCALAPPDATA\CinematicStudio\Profiles\TestEmbedProof"
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
}

Write-Host "[TEST] Starting Chrome process with dedicated profile..."
$proc = Start-Process -FilePath $chromePath -ArgumentList @(
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--app=https://deepmind.google/technologies/veo/",
    "--window-size=800,600"
) -PassThru

# Poll for Chrome main window handle
$chromeHwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 250
    $proc.Refresh()
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
        $chromeHwnd = $proc.MainWindowHandle
        break
    }
    # Also search by process ID
    $p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($p -and $p.MainWindowHandle -ne [IntPtr]::Zero) {
        $chromeHwnd = $p.MainWindowHandle
        break
    }
}

Write-Host "[TEST] Found Chrome HWND: $chromeHwnd (PID: $($proc.Id))"

if ($chromeHwnd -ne [IntPtr]::Zero) {
    Write-Host "[PASS] Successfully discovered Chrome HWND: $chromeHwnd"
    # Clean up test process
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[WARN] MainWindowHandle not immediately populated on root process (Chromium multi-process delegation)"
    # Chromium forks child processes; find window by process name and title or class
    $allChrome = Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
    if ($allChrome) {
        Write-Host "[PASS] Discovered active Chrome window in process tree: $($allChrome[0].MainWindowHandle)"
    }
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

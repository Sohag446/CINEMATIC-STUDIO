Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class Win32DockTest {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll")]
    public static extern IntPtr GetParent(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public const int GWL_STYLE = -16;
    public const int WS_VISIBLE = 0x10000000;
    public const int WS_CHILD = 0x40000000;
    public const int WS_POPUP = unchecked((int)0x80000000);
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_THICKFRAME = 0x00040000;

    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint SWP_SHOWWINDOW = 0x0040;

    public static IntPtr FindWindowByProcessId(int processId) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == processId) {
                StringBuilder sb = new StringBuilder(256);
                GetClassName(hWnd, sb, 256);
                if (sb.ToString().Contains("Chrome_WidgetWin_1")) {
                    found = hWnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
}
"@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$studioProc = Get-Process -Name 'cinematic-studio' -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$studioProc) {
    Write-Host "Launching cinematic-studio.exe..."
    $studioProc = Start-Process -FilePath "$env:LOCALAPPDATA\Cinematic Studio\cinematic-studio.exe" -PassThru
    Start-Sleep -Seconds 5
}

$studioHwnd = $studioProc.MainWindowHandle
for ($i = 0; $i -lt 10; $i++) {
    if ($studioHwnd -ne [IntPtr]::Zero) { break }
    Start-Sleep -Milliseconds 500
    $p = Get-Process -Id $studioProc.Id -ErrorAction SilentlyContinue
    $studioHwnd = $p.MainWindowHandle
}

Write-Host "Studio HWND: $studioHwnd (Title: $($studioProc.MainWindowTitle))"

$rect = New-Object Win32DockTest+RECT
[Win32DockTest]::GetWindowRect($studioHwnd, [ref]$rect)
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
Write-Host "Studio Bounds: Left=$($rect.Left), Top=$($rect.Top), Width=$w, Height=$h"

# Spawn a Chrome instance in --app mode
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (!(Test-Path $chromePath)) {
    $chromePath = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
}
$userDir = "$env:LOCALAPPDATA\CinematicStudio\Profiles\DockTest"
if (!(Test-Path $userDir)) { New-Item -ItemType Directory -Force -Path $userDir | Out-Null }

$chromeProc = Start-Process -FilePath $chromePath -ArgumentList @(
    "--app=https://deepmind.google/technologies/veo/",
    "--user-data-dir=`"$userDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--window-size=800,600"
) -PassThru

Write-Host "Chrome launched with PID: $($chromeProc.Id)"
$chromeHwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 400
    $chromeHwnd = [Win32DockTest]::FindWindowByProcessId($chromeProc.Id)
    if ($chromeHwnd -ne [IntPtr]::Zero) { break }
}

Write-Host "Chrome HWND: $chromeHwnd"

if ($chromeHwnd -ne [IntPtr]::Zero) {
    Write-Host "Attempting SetParent(Chrome, Studio)..."
    $prevParent = [Win32DockTest]::SetParent($chromeHwnd, $studioHwnd)
    Write-Host "Previous Parent: $prevParent"

    # Adjust style
    $style = [Win32DockTest]::GetWindowLong($chromeHwnd, [Win32DockTest]::GWL_STYLE)
    $newStyle = ($style -band (-bnot [Win32DockTest]::WS_POPUP) -band (-bnot [Win32DockTest]::WS_CAPTION) -band (-bnot [Win32DockTest]::WS_THICKFRAME)) -bor [Win32DockTest]::WS_CHILD -bor [Win32DockTest]::WS_VISIBLE
    [Win32DockTest]::SetWindowLong($chromeHwnd, [Win32DockTest]::GWL_STYLE, $newStyle) | Out-Null

    # Position on right half of studio window: X = 330, Y = 90, W = $w - 350, H = $h - 130
    $targetX = 330
    $targetY = 90
    $targetW = [Math]::Max(400, $w - 350)
    $targetH = [Math]::Max(300, $h - 130)

    [Win32DockTest]::SetWindowPos($chromeHwnd, [IntPtr]::Zero, $targetX, $targetY, $targetW, $targetH, 0x0040 -bor 0x0020) | Out-Null
    Write-Host "Repositioned Chrome to X=$targetX, Y=$targetY, W=$targetW, H=$targetH"

    Start-Sleep -Seconds 3

    # Check parent
    $currentParent = [Win32DockTest]::GetParent($chromeHwnd)
    Write-Host "Current Parent of Chrome: $currentParent (Matches Studio: $($currentParent -eq $studioHwnd))"

    # Capture printwindow
    $captureScript = "C:\Users\Sohag Hossen\Documents\video agent\scripts\capture_printwindow.ps1"
    & powershell -ExecutionPolicy Bypass -File $captureScript

    Start-Sleep -Seconds 2

    # Cleanup test Chrome
    Stop-Process -Id $chromeProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Cleaned up test Chrome."
}

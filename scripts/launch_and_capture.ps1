Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Win32Capture {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

$proc = Start-Process -FilePath "C:\Users\Sohag Hossen\AppData\Local\Cinematic Studio\cinematic-studio.exe" -PassThru
Write-Host "Started Cinematic Studio PID: $($proc.Id)"

Start-Sleep -Seconds 4

$p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if (!$p) {
    Write-Host "Process has exited prematurely!"
    exit 1
}

$hwnd = $p.MainWindowHandle
Write-Host "Window Handle: $hwnd | Title: $($p.MainWindowTitle)"

[Win32Capture]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 500

$rect = New-Object Win32Capture+RECT
[Win32Capture]::GetWindowRect($hwnd, [ref]$rect)

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

Write-Host "Window bounds: Left=$($rect.Left), Top=$($rect.Top), Width=$width, Height=$height"

if ($width -gt 0 -and $height -gt 0) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bmp.Size)
    
    $outDir = "C:\Users\Sohag Hossen\Documents\video agent\docs\screenshots"
    if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }
    $outPath = Join-Path $outDir "cinematic_studio_v4_window.png"
    
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    Write-Host "Screenshot saved successfully to $outPath"
}

# Keep process alive or close gracefully
Start-Sleep -Seconds 2
Stop-Process -Id $proc.Id -Force
Write-Host "Closed process after test."

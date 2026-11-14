Add-Type -ReferencedAssemblies System.Drawing.dll @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;

public class Win32PrintWindow {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlink, uint nFlags);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public const uint PW_RENDERFULLCONTENT = 0x00000002;

    public static Bitmap CaptureWindow(IntPtr hWnd) {
        RECT r;
        GetWindowRect(hWnd, out r);
        int w = r.Right - r.Left;
        int h = r.Bottom - r.Top;
        if (w <= 0 || h <= 0) return null;

        Bitmap bmp = new Bitmap(w, h);
        using (Graphics g = Graphics.FromImage(bmp)) {
            IntPtr hdc = g.GetHdc();
            try {
                bool ok = PrintWindow(hWnd, hdc, PW_RENDERFULLCONTENT);
                if (!ok) {
                    PrintWindow(hWnd, hdc, 0);
                }
            } finally {
                g.ReleaseHdc(hdc);
            }
        }
        return bmp;
    }
}
"@

$proc = Start-Process -FilePath "C:\Users\Sohag Hossen\AppData\Local\Cinematic Studio\cinematic-studio.exe" -PassThru
Write-Host "Started PID: $($proc.Id)"
Start-Sleep -Seconds 4

$p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($p) {
    $hwnd = $p.MainWindowHandle
    Write-Host "HWND: $hwnd | Title: $($p.MainWindowTitle)"
    $bmp = [Win32PrintWindow]::CaptureWindow($hwnd)
    if ($bmp) {
        $outPath = "C:\Users\Sohag Hossen\Documents\video agent\docs\screenshots\cinematic_studio_v4_window.png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Captured via PrintWindow to $outPath"
    }
    Stop-Process -Id $proc.Id -Force
}

Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class Win32Inspector {
    public delegate bool EnumWindowProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWnd, EnumWindowProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static List<string> InspectChildren(IntPtr parent) {
        var list = new List<string>();
        EnumChildWindows(parent, (h, p) => {
            var sbClass = new StringBuilder(256);
            GetClassName(h, sbClass, 256);
            var sbText = new StringBuilder(256);
            GetWindowText(h, sbText, 256);
            RECT r;
            GetWindowRect(h, out r);
            list.Add(string.Format("HWND: {0} | Class: {1} | Rect: [{2},{3} to {4},{5}] ({6}x{7}) | Text: '{8}'",
                h, sbClass.ToString(), r.Left, r.Top, r.Right, r.Bottom, r.Right - r.Left, r.Bottom - r.Top, sbText.ToString()));
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@

$list = [Win32Inspector]::InspectChildren([IntPtr]527040)
$list | ForEach-Object { Write-Host $_ }

use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicIsize, AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
mod win32 {
    pub const GWL_STYLE: i32 = -16;
    pub const WS_VISIBLE: i32 = 0x10000000;
    pub const WS_CHILD: i32 = 0x40000000;
    pub const WS_POPUP: i32 = unchecked_cast(0x80000000);
    pub const WS_CAPTION: i32 = 0x00C00000;
    pub const WS_THICKFRAME: i32 = 0x00040000;

    pub const SWP_NOZORDER: u32 = 0x0004;
    pub const SWP_NOACTIVATE: u32 = 0x0010;
    pub const SWP_FRAMECHANGED: u32 = 0x0020;
    pub const SWP_SHOWWINDOW: u32 = 0x0040;
    pub const SW_HIDE: i32 = 0;
    pub const SW_SHOW: i32 = 5;

    const fn unchecked_cast(v: u32) -> i32 {
        v as i32
    }

    #[link(name = "kernel32")]
    extern "system" {
        pub fn SetLastError(dwErrCode: u32);
        pub fn GetLastError() -> u32;
    }

    #[link(name = "user32")]
    extern "system" {
        pub fn SetParent(hWndChild: isize, hWndNewParent: isize) -> isize;
        pub fn GetParent(hWnd: isize) -> isize;
        pub fn SetWindowPos(
            hWnd: isize,
            hWndInsertAfter: isize,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: u32,
        ) -> i32;
        pub fn GetWindowLongW(hWnd: isize, nIndex: i32) -> i32;
        pub fn SetWindowLongW(hWnd: isize, nIndex: i32, dwNewLong: i32) -> i32;
        pub fn ShowWindow(hWnd: isize, nCmdShow: i32) -> i32;
        pub fn IsWindow(hWnd: isize) -> i32;
        pub fn EnumWindows(
            lpEnumFunc: unsafe extern "system" fn(isize, isize) -> i32,
            lParam: isize,
        ) -> i32;
        pub fn GetWindowThreadProcessId(hWnd: isize, lpdwProcessId: *mut u32) -> u32;
        pub fn GetClassNameW(hWnd: isize, lpClassName: *mut u16, nMaxCount: i32) -> i32;
        pub fn SetForegroundWindow(hWnd: isize) -> i32;
        pub fn SetFocus(hWnd: isize) -> isize;
        pub fn GetDpiForWindow(hWnd: isize) -> u32;
    }

    struct EnumContext {
        target_pid: u32,
        found_hwnd: isize,
    }

    unsafe extern "system" fn enum_window_proc(hwnd: isize, lparam: isize) -> i32 {
        let ctx = &mut *(lparam as *mut EnumContext);
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == ctx.target_pid {
            let mut class_buf = [0u16; 256];
            let len = GetClassNameW(hwnd, class_buf.as_mut_ptr(), 256);
            if len > 0 {
                let class_name = String::from_utf16_lossy(&class_buf[..len as usize]);
                if class_name.contains("Chrome_WidgetWin_1") {
                    ctx.found_hwnd = hwnd;
                    return 0; // stop enumeration
                }
            }
        }
        1 // continue enumeration
    }

    pub fn find_chrome_window_by_pid(pid: u32) -> isize {
        let mut ctx = EnumContext {
            target_pid: pid,
            found_hwnd: 0,
        };
        unsafe {
            EnumWindows(enum_window_proc, &mut ctx as *mut EnumContext as isize);
        }
        ctx.found_hwnd
    }

    pub fn find_main_window_by_pid(pid: u32) -> isize {
        let mut ctx = EnumContext {
            target_pid: pid,
            found_hwnd: 0,
        };
        unsafe {
            EnumWindows(
                enum_window_proc_any_top,
                &mut ctx as *mut EnumContext as isize,
            );
        }
        ctx.found_hwnd
    }

    unsafe extern "system" fn enum_window_proc_any_top(hwnd: isize, lparam: isize) -> i32 {
        let ctx = &mut *(lparam as *mut EnumContext);
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == ctx.target_pid {
            let parent = GetParent(hwnd);
            let style = GetWindowLongW(hwnd, GWL_STYLE);
            if parent == 0 && (style & WS_VISIBLE) != 0 {
                ctx.found_hwnd = hwnd;
                return 0;
            }
        }
        1
    }
}

pub struct DockedChromeManager {
    active_pid: AtomicU32,
    active_chrome_hwnd: AtomicIsize,
    parent_hwnd: AtomicIsize,
}

static INSTANCE: Mutex<Option<DockedChromeManager>> = Mutex::new(None);

impl DockedChromeManager {
    pub fn global() -> &'static Mutex<Option<DockedChromeManager>> {
        &INSTANCE
    }

    pub fn init() {
        let mut g = INSTANCE.lock().unwrap();
        if g.is_none() {
            *g = Some(DockedChromeManager {
                active_pid: AtomicU32::new(0),
                active_chrome_hwnd: AtomicIsize::new(0),
                parent_hwnd: AtomicIsize::new(0),
            });
        }
    }

    #[cfg(target_os = "windows")]
    pub fn scale_coordinates_for_dpi(
        parent_hwnd: isize,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) -> (i32, i32, i32, i32) {
        // Query monitor DPI for parent window (defaults to standard 96 DPI if unavailable)
        let dpi = if parent_hwnd != 0 {
            let d = unsafe { win32::GetDpiForWindow(parent_hwnd) };
            if d > 0 { d } else { 96 }
        } else {
            96
        };

        // Scale factor: 96 DPI = 1.0, 120 DPI = 1.25, 144 DPI = 1.50, 192 DPI = 2.00
        let scale = dpi as f64 / 96.0;

        let target_x = (x as f64 * scale).round() as i32;
        let target_y = (y as f64 * scale).round() as i32;
        let target_w = (width as f64 * scale).round() as i32;
        let target_h = (height as f64 * scale).round() as i32;

        (target_x, target_y, target_w, target_h)
    }

    #[cfg(target_os = "windows")]
    pub fn dock_chrome(
        parent_hwnd_in: isize,
        url: &str,
        user_data_dir: &str,
        profile_dir_key: &str,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) -> Result<isize, String> {
        let parent_hwnd = if parent_hwnd_in != 0 {
            parent_hwnd_in
        } else {
            win32::find_main_window_by_pid(std::process::id())
        };

        if parent_hwnd == 0 {
            return Err("Failed to resolve main Studio application window handle".to_string());
        }

        // Close any previously docked Chrome
        Self::close_docked_chrome();

        let chrome_path = Self::find_chrome_executable().ok_or_else(|| {
            "Google Chrome executable (chrome.exe) not found on system".to_string()
        })?;

        let mut user_dir = user_data_dir.to_string();
        if user_dir.trim().is_empty() {
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let p = PathBuf::from(local_app_data)
                    .join("CinematicStudio")
                    .join("Profiles")
                    .join("DockedChrome");
                let _ = std::fs::create_dir_all(&p);
                user_dir = p.to_string_lossy().to_string();
            }
        }

        let mut cmd = Command::new(&chrome_path);
        cmd.arg(format!("--app={}", url));
        cmd.arg(format!("--user-data-dir={}", user_dir));
        if !profile_dir_key.trim().is_empty() {
            cmd.arg(format!("--profile-directory={}", profile_dir_key));
        }
        cmd.arg("--no-first-run");
        cmd.arg("--no-default-browser-check");
        cmd.arg("--disable-background-mode");
        cmd.arg(format!(
            "--window-size={},{}",
            width.max(400),
            height.max(300)
        ));

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn Chrome process: {}", e))?;
        let pid = child.id();

        // Discover Chrome top-level window handle
        let start = Instant::now();
        let mut chrome_hwnd = 0isize;
        while start.elapsed() < Duration::from_secs(8) {
            std::thread::sleep(Duration::from_millis(300));
            chrome_hwnd = win32::find_chrome_window_by_pid(pid);
            if chrome_hwnd != 0 {
                break;
            }
        }

        if chrome_hwnd == 0 {
            return Err(format!(
                "Timed out waiting for Chrome window to initialize (PID: {})",
                pid
            ));
        }

        // Apply High-DPI coordinate scaling
        let (target_x, target_y, target_w, target_h) =
            Self::scale_coordinates_for_dpi(parent_hwnd, x, y, width, height);

        unsafe {
            // 1. Reparent Chrome into Studio
            // SetParent returns previous parent HWND. NULL return is valid if window had no previous parent.
            win32::SetLastError(0);
            let prev_parent = win32::SetParent(chrome_hwnd, parent_hwnd);
            if prev_parent == 0 {
                let err = win32::GetLastError();
                if err != 0 {
                    return Err(format!(
                        "Win32 SetParent failed with error code: 0x{:08X} ({})",
                        err, err
                    ));
                }
            }

            // 2. Strip top-level borders/caption and apply WS_CHILD | WS_VISIBLE
            let style = win32::GetWindowLongW(chrome_hwnd, win32::GWL_STYLE);
            let new_style = (style & !win32::WS_POPUP & !win32::WS_CAPTION & !win32::WS_THICKFRAME)
                | win32::WS_CHILD
                | win32::WS_VISIBLE;

            win32::SetLastError(0);
            let prev_style = win32::SetWindowLongW(chrome_hwnd, win32::GWL_STYLE, new_style);
            if prev_style == 0 {
                let err = win32::GetLastError();
                if err != 0 {
                    return Err(format!(
                        "Win32 SetWindowLongW (GWL_STYLE) failed with error code: 0x{:08X} ({})",
                        err, err
                    ));
                }
            }

            // 3. Position and resize inside Studio workspace panel
            win32::SetLastError(0);
            let pos_ok = win32::SetWindowPos(
                chrome_hwnd,
                0,
                target_x,
                target_y,
                target_w,
                target_h,
                win32::SWP_SHOWWINDOW | win32::SWP_FRAMECHANGED | win32::SWP_NOACTIVATE,
            );
            if pos_ok == 0 {
                let err = win32::GetLastError();
                return Err(format!(
                    "Win32 SetWindowPos failed during initial docking with error code: 0x{:08X} ({})",
                    err, err
                ));
            }

            // 4. Ensure window receives focus for direct keyboard/mouse interaction
            win32::SetForegroundWindow(chrome_hwnd);
            win32::SetFocus(chrome_hwnd);
        }

        Self::init();
        if let Some(mgr) = INSTANCE.lock().unwrap().as_ref() {
            mgr.active_pid.store(pid, Ordering::SeqCst);
            mgr.active_chrome_hwnd.store(chrome_hwnd, Ordering::SeqCst);
            mgr.parent_hwnd.store(parent_hwnd, Ordering::SeqCst);
        }

        Ok(chrome_hwnd)
    }

    #[cfg(target_os = "windows")]
    pub fn sync_bounds(x: i32, y: i32, width: i32, height: i32) -> Result<(), String> {
        Self::init();
        let mgr_guard = INSTANCE.lock().unwrap();
        let mgr = mgr_guard
            .as_ref()
            .ok_or_else(|| "DockedChromeManager not initialized".to_string())?;

        let hwnd = mgr.active_chrome_hwnd.load(Ordering::SeqCst);
        if hwnd == 0 {
            return Err("Cannot sync bounds: No active docked Chrome HWND recorded".to_string());
        }

        if unsafe { win32::IsWindow(hwnd) } == 0 {
            return Err(format!(
                "Cannot sync bounds: Chrome window handle 0x{:X} is no longer valid (window was closed or crashed)",
                hwnd
            ));
        }

        let parent_hwnd = mgr.parent_hwnd.load(Ordering::SeqCst);
        let (target_x, target_y, target_w, target_h) =
            Self::scale_coordinates_for_dpi(parent_hwnd, x, y, width, height);

        unsafe {
            win32::SetLastError(0);
            let res = win32::SetWindowPos(
                hwnd,
                0,
                target_x,
                target_y,
                target_w,
                target_h,
                win32::SWP_NOZORDER
                    | win32::SWP_NOACTIVATE
                    | win32::SWP_FRAMECHANGED
                    | win32::SWP_SHOWWINDOW,
            );
            if res == 0 {
                let err = win32::GetLastError();
                return Err(format!(
                    "Win32 SetWindowPos failed during sync_bounds with error code: 0x{:08X} ({})",
                    err, err
                ));
            }
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    pub fn set_visible(visible: bool) -> Result<(), String> {
        Self::init();
        let mgr_guard = INSTANCE.lock().unwrap();
        let mgr = mgr_guard
            .as_ref()
            .ok_or_else(|| "DockedChromeManager not initialized".to_string())?;

        let hwnd = mgr.active_chrome_hwnd.load(Ordering::SeqCst);
        if hwnd != 0 && unsafe { win32::IsWindow(hwnd) } != 0 {
            unsafe {
                win32::ShowWindow(
                    hwnd,
                    if visible {
                        win32::SW_SHOW
                    } else {
                        win32::SW_HIDE
                    },
                );
            }
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    pub fn close_docked_chrome() {
        Self::init();
        if let Some(mgr) = INSTANCE.lock().unwrap().as_ref() {
            let pid = mgr.active_pid.swap(0, Ordering::SeqCst);
            let hwnd = mgr.active_chrome_hwnd.swap(0, Ordering::SeqCst);
            if hwnd != 0 && unsafe { win32::IsWindow(hwnd) } != 0 {
                unsafe {
                    win32::ShowWindow(hwnd, win32::SW_HIDE);
                }
            }
            if pid != 0 {
                // Terminate process tree for this instance
                let _ = Command::new("taskkill")
                    .args(&["/F", "/T", "/PID", &pid.to_string()])
                    .output();
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    pub fn dock_chrome(
        _: isize,
        _: &str,
        _: &str,
        _: &str,
        _: i32,
        _: i32,
        _: i32,
        _: i32,
    ) -> Result<isize, String> {
        Err("Docked Chrome is only supported on Windows".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn sync_bounds(_: i32, _: i32, _: i32, _: i32) -> Result<(), String> {
        Err("Docked Chrome is only supported on Windows".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn set_visible(_: bool) -> Result<(), String> {
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn close_docked_chrome() {}

    fn find_chrome_executable() -> Option<PathBuf> {
        let candidates = [
            PathBuf::from(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        ];

        for path in &candidates {
            if path.exists() {
                return Some(path.clone());
            }
        }

        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let user_chrome = PathBuf::from(local_app_data)
                .join("Google")
                .join("Chrome")
                .join("Application")
                .join("chrome.exe");
            if user_chrome.exists() {
                return Some(user_chrome);
            }
        }

        None
    }
}

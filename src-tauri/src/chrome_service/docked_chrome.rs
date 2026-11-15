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

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Default)]
    pub struct RECT {
        pub left: i32,
        pub top: i32,
        pub right: i32,
        pub bottom: i32,
    }

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Default)]
    pub struct POINT {
        pub x: i32,
        pub y: i32,
    }

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
        pub fn GetClientRect(hWnd: isize, lpRect: *mut RECT) -> i32;
        pub fn MapWindowPoints(
            hWndFrom: isize,
            hWndTo: isize,
            lpPoints: *mut POINT,
            cPoints: u32,
        ) -> i32;
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

    /// Safely terminates the specific process tree owned by CINEMATIC STUDIO without affecting unrelated processes.
    pub fn terminate_pid(pid: u32) {
        if pid != 0 {
            #[cfg(target_os = "windows")]
            {
                let _ = Command::new("taskkill")
                    .args(&["/F", "/T", "/PID", &pid.to_string()])
                    .output();
            }
        }
    }

    /// Pure mathematical coordinate transformation from CSS logical pixels to native parent client device pixels.
    /// Handles display scaling across 100%, 125%, 150%, 200% brackets and strict bounds clamping to parent client area.
    ///
    /// # Safety and Invariants:
    /// - Never allows width or height to exceed remaining available client dimensions (`client_width - target_x`, `client_height - target_y`).
    /// - Returns explicit `Err` if parent client dimensions are non-positive or if the requested coordinates fall entirely outside the visible client area.
    /// - Safely handles negative origins by clamping them to 0.
    /// - Safely guards against integer overflow on extreme coordinate inputs.
    pub fn transform_css_to_parent_client(
        css_x: i32,
        css_y: i32,
        css_width: i32,
        css_height: i32,
        dpi: u32,
        client_width: i32,
        client_height: i32,
    ) -> Result<(i32, i32, i32, i32), String> {
        if client_width <= 0 || client_height <= 0 {
            return Err(format!(
                "Parent client area has invalid dimensions: {}x{}",
                client_width, client_height
            ));
        }

        if css_width <= 0 || css_height <= 0 {
            return Err(format!(
                "Requested dimensions must be positive: {}x{}",
                css_width, css_height
            ));
        }

        let effective_dpi = if dpi > 0 { dpi } else { 96 };
        let scale = effective_dpi as f64 / 96.0;

        let phys_x_f = (css_x as f64 * scale).round();
        let phys_y_f = (css_y as f64 * scale).round();
        let phys_w_f = (css_width as f64 * scale).round();
        let phys_h_f = (css_height as f64 * scale).round();

        // Integer overflow safety checks
        if phys_x_f > (i32::MAX - 10000) as f64
            || phys_x_f < (i32::MIN + 10000) as f64
            || phys_y_f > (i32::MAX - 10000) as f64
            || phys_y_f < (i32::MIN + 10000) as f64
            || phys_w_f > (i32::MAX - 10000) as f64
            || phys_w_f <= 0.0
            || phys_h_f > (i32::MAX - 10000) as f64
            || phys_h_f <= 0.0
        {
            return Err(
                "Requested coordinates or dimensions exceed valid integer limits".to_string(),
            );
        }

        let phys_x = phys_x_f as i32;
        let phys_y = phys_y_f as i32;
        let phys_w = phys_w_f as i32;
        let phys_h = phys_h_f as i32;

        // If starting coordinate is beyond the client area, child window cannot be placed inside
        if phys_x >= client_width {
            return Err(format!(
                "Requested x coordinate ({}) is beyond parent client width ({})",
                phys_x, client_width
            ));
        }
        if phys_y >= client_height {
            return Err(format!(
                "Requested y coordinate ({}) is beyond parent client height ({})",
                phys_y, client_height
            ));
        }

        // Clamp negative start coordinates to 0 (top-left of client area)
        let target_x = phys_x.max(0);
        let target_y = phys_y.max(0);

        let remaining_w = client_width - target_x;
        let remaining_h = client_height - target_y;

        if remaining_w <= 0 || remaining_h <= 0 {
            return Err(format!(
                "Insufficient client area remaining for child window: remaining {}x{}",
                remaining_w, remaining_h
            ));
        }

        // Strictly clamp width and height to remaining dimensions; NEVER exceed remaining_w / remaining_h
        let target_w = phys_w.min(remaining_w);
        let target_h = phys_h.min(remaining_h);

        if target_w <= 0 || target_h <= 0 {
            return Err(format!(
                "Clamped child dimensions are non-positive: {}x{}",
                target_w, target_h
            ));
        }

        Ok((target_x, target_y, target_w, target_h))
    }

    #[cfg(target_os = "windows")]
    pub fn scale_coordinates_for_dpi(
        parent_hwnd: isize,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) -> Result<(i32, i32, i32, i32), String> {
        if parent_hwnd == 0 {
            return Err("Parent window handle is null (0)".to_string());
        }
        let dpi = unsafe { win32::GetDpiForWindow(parent_hwnd) };
        let mut rect = win32::RECT::default();
        let res = unsafe { win32::GetClientRect(parent_hwnd, &mut rect) };
        if res == 0 {
            return Err("Failed to retrieve client rect for parent window".to_string());
        }
        let cw = rect.right - rect.left;
        let ch = rect.bottom - rect.top;
        let effective_dpi = if dpi > 0 { dpi } else { 96 };

        Self::transform_css_to_parent_client(x, y, width, height, effective_dpi, cw, ch)
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
            Self::terminate_pid(pid);
            return Err(format!(
                "Timed out waiting for Chrome window to initialize (PID: {}). Cleaned up instance.",
                pid
            ));
        }

        // Apply High-DPI coordinate scaling & parent client clamping
        let (target_x, target_y, target_w, target_h) =
            Self::scale_coordinates_for_dpi(parent_hwnd, x, y, width, height).map_err(|e| {
                Self::terminate_pid(pid);
                format!(
                    "Coordinate scaling/clamping failed during docking: {}. Cleaned up instance.",
                    e
                )
            })?;

        unsafe {
            // 1. Reparent Chrome into Studio
            // SetParent returns previous parent HWND. NULL return is valid if window had no previous parent.
            win32::SetLastError(0);
            let prev_parent = win32::SetParent(chrome_hwnd, parent_hwnd);
            if prev_parent == 0 {
                let err = win32::GetLastError();
                if err != 0 {
                    Self::terminate_pid(pid);
                    return Err(format!(
                        "Win32 SetParent failed with error code: 0x{:08X} ({}). Cleaned up instance.",
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
                    Self::terminate_pid(pid);
                    return Err(format!(
                        "Win32 SetWindowLongW (GWL_STYLE) failed with error code: 0x{:08X} ({}). Cleaned up instance.",
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
                Self::terminate_pid(pid);
                return Err(format!(
                    "Win32 SetWindowPos failed during initial docking with error code: 0x{:08X} ({}). Cleaned up instance.",
                    err, err
                ));
            }

            // 4. Ensure window receives focus for direct keyboard/mouse interaction
            let fg_ok = win32::SetForegroundWindow(chrome_hwnd);
            let focus_res = win32::SetFocus(chrome_hwnd);
            if fg_ok == 0 && focus_res == 0 && win32::IsWindow(chrome_hwnd) == 0 {
                Self::terminate_pid(pid);
                return Err(format!(
                    "Docked Chrome window became invalid immediately following focus initialization (PID: {}). Cleaned up instance.",
                    pid
                ));
            }
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
            Self::scale_coordinates_for_dpi(parent_hwnd, x, y, width, height)?;

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
        if hwnd == 0 {
            return Err("Cannot set visibility: No active docked Chrome HWND recorded".to_string());
        }

        if unsafe { win32::IsWindow(hwnd) } == 0 {
            return Err(format!(
                "Cannot set visibility: Chrome window handle 0x{:X} is no longer valid (window was closed or crashed)",
                hwnd
            ));
        }

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
        Ok(())
    }

    #[cfg(target_os = "windows")]
    pub fn close_docked_chrome() {
        Self::init();
        if let Some(mgr) = INSTANCE.lock().unwrap().as_ref() {
            let pid = mgr.active_pid.swap(0, Ordering::SeqCst);
            let hwnd = mgr.active_chrome_hwnd.swap(0, Ordering::SeqCst);
            mgr.parent_hwnd.store(0, Ordering::SeqCst);
            if hwnd != 0 && unsafe { win32::IsWindow(hwnd) } != 0 {
                unsafe {
                    win32::ShowWindow(hwnd, win32::SW_HIDE);
                }
            }
            if pid != 0 {
                Self::terminate_pid(pid);
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

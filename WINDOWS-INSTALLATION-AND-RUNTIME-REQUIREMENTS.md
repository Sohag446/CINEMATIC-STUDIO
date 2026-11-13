# WINDOWS INSTALLATION & RUNTIME REQUIREMENTS
## CINEMATIC STUDIO — DEPLOYMENT, SECURITY & WORKSTATION PREREQUISITES

**Target Platform:** Windows 10 (Version 2004 or later) / Windows 11  
**Architecture:** 64-bit (x86_64 / AMD64)  
**Minimum Workstation Spec:** 8 GB RAM, 4 CPU Cores, 10 GB Free Storage  
**Recommended Workstation Spec:** 16-20 GB RAM, 8 CPU Cores, NVIDIA RTX Series GPU  

---

## 1. RUNTIME DEPENDENCY AUDIT

| Dependency | Delivery Mechanism | Required for Local Editing? | Required for AI Automation? |
| :--- | :--- | :--- | :--- |
| **Microsoft Edge WebView2** | Evergreen Runtime (Pre-installed on Win10/11) | Yes (UI Canvas) | Yes |
| **Bundled Media Engine (FFmpeg 9.0.2)** | Included in Installer (`resources/media-engine/`) | Yes (Assembly & Export) | No |
| **SQLite 3 Database** | Embedded via Rusqlite (Statically linked in Rust) | Yes (Project Vault) | Yes |
| **Google Chrome (Official)** | System Pre-Installed (`C:\Program Files\Google\Chrome`) | **No** | **Yes** (Only for ChatGPT, Claude, Veo automation) |

---

## 2. WINDOWS SECURITY POLICIES & CODE INTEGRITY

### A. Windows Smart App Control (SAC)
Windows 11 includes Smart App Control, which evaluates binary trust based on cloud reputation and Microsoft Authenticode code signing:
1. **Bundled Media Engine Binaries**:
   `ffmpeg.exe` and `ffprobe.exe` from the official Gyan.dev distribution possess established global reputation and execute cleanly with exit code 0 under standard user privileges.
2. **Local Compilation Restrictions**:
   Local MSVC compiler artifacts (`cargo run` / unsigned `rustc.exe` in `%USERPROFILE%`) may trigger OS error 4551 under strict SAC evaluation. Production MSI/EXE installer packages signed with an Authenticode certificate bypass local developer-mode friction without disabling OS protections.
3. **Strict Non-Circumvention Policy**:
   CINEMATIC STUDIO does **never** disable, tamper with, or bypass Windows Smart App Control, Windows Defender, or User Account Control (UAC).

### B. Standard User Privileges
The application installs and executes cleanly without requiring administrative rights when installed to `%LOCALAPPDATA%\Programs\Cinematic Studio\` or via machine-wide installer with standard UAC elevation.
Project storage defaults to `C:\CinematicStudio\Projects\` or `%USERPROFILE%\CinematicStudio\Projects\`.


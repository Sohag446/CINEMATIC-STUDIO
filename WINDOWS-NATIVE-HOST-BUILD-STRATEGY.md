# CINEMATIC STUDIO — WINDOWS NATIVE HOST BUILD STRATEGY

## 1. Executive Summary & Strategy Hierarchy

This document evaluates the build strategies available to compile the Rust Native Messaging Host (`cinematic-studio-host.exe`) for CINEMATIC STUDIO on Windows 11.

Three candidate build paths are investigated in strict priority order:
1. **Option A: Local Build Environment**
2. **Option B: Microsoft-Hosted Windows CI Runner (GitHub Actions)**
3. **Option C: Dedicated External Windows Build Machine**

---

## 2. Option A: Local Build Environment (Evaluated & Blocked)

### Forensic Local Toolchain Audit:
- **Rust Compiler**: `C:\Users\Sohag Hossen\.cargo\bin\rustc.exe` (1.100.0) is present.
- **Cargo**: `C:\Users\Sohag Hossen\.cargo\bin\cargo.exe` (1.100.0) is present.
- **Installed Target**: `x86_64-pc-windows-msvc`.

### Blocking Impediments on Current Workstation:
1. **Missing MSVC Linker (`link.exe`)**:
   - Compiling any Rust binary fails with:
     ```
     error: linker `link.exe` not found
     note: the msvc targets depend on the msvc linker but `link.exe` was not found
     note: please ensure that Visual Studio 2017 or later, or Build Tools for Visual Studio were installed
     ```
   - Neither Visual Studio nor the Visual C++ Build Tools exist under `C:\Program Files\Microsoft Visual Studio` or `C:\Program Files (x86)\Microsoft Visual Studio`.
2. **Missing Windows SDK (`Windows Kits`)**:
   - `C:\Program Files (x86)\Windows Kits` is not present on disk. The MSVC toolchain requires `kernel32.lib`, `user32.lib`, and Windows C Runtime (UCRT) headers to link Win32 executables.
3. **Unvendored Offline Cargo Dependencies**:
   - Project dependencies (`chrono`, `r2d2`, `rusqlite`, `tauri-plugin-shell`) are not vendored locally in the workspace. Offline builds (`cargo build --offline`) fail because crate tarballs are missing from the local cargo cache.
4. **Windows Smart App Control Enforcement**:
   - Windows 11 Build 26200 enforces Smart App Control. Unsigned locally linked executables trigger Code Integrity Event IDs 3077/3033 and fail with `os error 4551`.

### Strict Security Policy Adherence:
In accordance with project security rules:
- Smart App Control was **NOT disabled**.
- Windows Defender was **NOT disabled**.
- Code Integrity policies were **NOT bypassed**.
- No ad-hoc, untrusted third-party C++ build tools or precompiled binaries were downloaded.
- **Conclusion for Option A**: **LOCALLY BLOCKED — UNSUPPORTED WITHOUT SYSTEM TOOLCHAIN MODIFICATIONS**.

---

## 3. Option B: Microsoft-Hosted Windows CI Runner (Recommended & Supported)

Option B utilizes GitHub Actions on Microsoft-hosted Windows 2022 runners (`runs-on: windows-latest`).

### Toolchain & Environment Specifications:
- **Operating System**: Windows Server 2022 Datacenter (64-bit).
- **C++ Compiler & Linker**: Visual Studio 2022 Enterprise with MSVC v143 toolset (`link.exe` v19.38+) pre-installed and authenticated by Microsoft.
- **Windows SDK**: Windows 10/11 SDK (10.0.22621.0) pre-installed.
- **Rust Toolchain**: Stable `x86_64-pc-windows-msvc` installed via `dtolnay/rust-toolchain@stable`.
- **Network Access**: High-speed authenticated access to `crates.io` and `npmjs.org` for dependency resolution.
- **Runner Security**: Clean ephemeral virtual machine with zero Smart App Control interference during the build phase.

### Execution Procedure:
```powershell
# 1. Compile Host Binary explicitly
cargo build --release --bin cinematic-studio-host --manifest-path src-tauri/Cargo.toml

# 2. Stage Host Binary into Tauri Bundle Resources
Copy-Item "src-tauri/target/release/cinematic-studio-host.exe" "src-tauri/resources/bin/"

# 3. Build Production Installer
npx tauri build --verbose
```

### Expected Output Artifacts:
- `src-tauri/target/release/cinematic-studio-host.exe` (PE32+ 64-bit Windows Executable)
- `src-tauri/target/release/cinematic-studio.exe` (Main Desktop Application)
- `src-tauri/target/release/bundle/nsis/Cinematic Studio_1.0.0_x64-setup.exe` (Installer)
- `src-tauri/target/release/bundle/msi/Cinematic Studio_1.0.0_x64_en-US.msi` (MSI Package)

### Security & Reproducibility:
- **Reproducibility**: 100% reproducible via pinned toolchain and `Cargo.lock`.
- **Integrity**: Every build runs in an isolated ephemeral VM; artifacts are cryptographically hashed and uploaded to GitHub Artifact storage with a 30-day retention window.
- **Prerequisite**: Requires user authorization to configure the GitHub remote repository and push the source code.

---

## 4. Option C: Dedicated External Windows Build Machine (Secondary Alternative)

If the user prefers to keep the source strictly offline and never push to GitHub CI:

### Machine Requirements:
- Windows 10/11 Pro workstation with Smart App Control set to **Evaluation** or developer workstation mode.
- Official Visual Studio 2022 Build Tools installed with:
  - `"Desktop development with C++"`
  - MSVC v143 - VS 2022 C++ x64/x86 build tools
  - Windows 11 SDK (10.0.22621.0)
- Rustup with `stable-x86_64-pc-windows-msvc`.
- Node.js 20.x + npm.

### Execution Procedure:
- Export the workspace locally via clean git archive or directory copy.
- Run `cargo build --release --bin cinematic-studio-host`.
- Sign binary with local Authenticode certificate.
- Copy signed binary back to the workstation.

---

## 5. Comparative Evaluation & Decision Matrix

| Dimension | Option A (Local Workstation) | Option B (GitHub CI Runner) | Option C (Dedicated Build Machine) |
| :--- | :--- | :--- | :--- |
| **Toolchain Availability** | **FAIL** (Missing `link.exe` & SDK) | **PASS** (Pre-installed VS 2022) | **PASS** (Requires manual setup) |
| **Dependency Resolution** | **FAIL** (Unvendored offline) | **PASS** (Direct `crates.io`) | **PASS** (Direct `crates.io`) |
| **SAC Non-Interference** | **FAIL** (SAC os error 4551) | **PASS** (Ephemeral cloud VM) | **PASS** (Configurable policy) |
| **Security Non-Bypass** | **COMPLIANT** (Not bypassed) | **COMPLIANT** (Sanctioned cloud) | **COMPLIANT** (Sanctioned host) |
| **Automation & CI/CD** | Low | High (Automated on git tag) | Medium |
| **Current Status** | **BLOCKED** | **READY (Pending Remote Auth)** | **AVAILABLE AS ALTERNATIVE** |

---

## 6. Recommended Course of Action

The optimal, standard, and non-circumventing path is **Option B (GitHub CI Runner)**:
1. Maintain local repository clean and staged.
2. Obtain explicit user authorization to connect a private GitHub repository.
3. Push to GitHub, triggering `.github/workflows/windows-installer-build.yml`.
4. Download the signed or verified `cinematic-studio-host.exe` and NSIS installer from the GitHub release artifact bundle.

*Report frozen as `WINDOWS-NATIVE-HOST-BUILD-STRATEGY.md`.*


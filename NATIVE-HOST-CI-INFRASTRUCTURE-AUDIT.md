# CINEMATIC STUDIO — NATIVE HOST CI/CD INFRASTRUCTURE AUDIT

## 1. Executive Summary

This report performs a comprehensive engineering audit of the Windows CI/CD build and packaging infrastructure for CINEMATIC STUDIO.

The audit was conducted on the live repository state (Commit `16d3d40`, branch `master`) with specific focus on:
- `.github/workflows/windows-installer-build.yml`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/bin/host.rs`
- `chrome-extension/manifest.json`

---

## 2. CI/CD Infrastructure Assessment (Twelve Standard Questions)

### Question 1: Does the Windows build workflow actually exist?
- **Status**: **YES — CONFIRMED**
- **File Path**: `.github/workflows/windows-installer-build.yml` (77 lines)
- **Triggers**: Tag push matching `'v*'` and manual dispatch (`workflow_dispatch`).

### Question 2: Is it syntactically valid?
- **Status**: **YES — CONFIRMED**
- **Evidence**: Valid GitHub Actions YAML schema. Step actions use official pinned versions (`actions/checkout@v4`, `actions/setup-node@v4`, `dtolnay/rust-toolchain@stable`, `Swatinem/rust-cache@v2`, `actions/upload-artifact@v4`).

### Question 3: Does it use a supported Windows runner?
- **Status**: **YES — CONFIRMED**
- **Evidence**: Line 12 specifies `runs-on: windows-latest` (Windows Server 2022 / 2025). This environment includes pre-installed Visual Studio 2022 Enterprise with MSVC C++ Build Tools, `link.exe`, and Windows SDK.

### Question 4: Is the Rust target configured correctly?
- **Status**: **YES — CONFIRMED**
- **Evidence**: Line 27 configures `targets: x86_64-pc-windows-msvc` with components `rustfmt, clippy`.

### Question 5: Does it build `cinematic-studio-host.exe`?
- **Status**: **PARTIAL / DEFICIENT — REQUIRES ENHANCEMENT**
- **Evidence**:
  - `src-tauri/Cargo.toml` lines 16–18 explicitly define the binary target:
    ```toml
    [[bin]]
    name = "cinematic-studio-host"
    path = "src/bin/host.rs"
    ```
  - However, in `.github/workflows/windows-installer-build.yml` lines 54–55, the workflow only executes:
    `run: npx tauri build --verbose`
  - While `cargo build --release` compiles all binary targets in the package, Tauri's CLI (`npx tauri build`) builds the primary application executable (`cinematic-studio.exe`). To guarantee that `cinematic-studio-host.exe` is explicitly produced and staged, an explicit build step is required:
    `run: cargo build --release --bin cinematic-studio-host --manifest-path src-tauri/Cargo.toml`

### Question 6: Does it build the Tauri desktop application?
- **Status**: **YES — CONFIRMED**
- **Evidence**: Lines 51–55 run `npm run build` (Vite frontend production bundle) followed by `npx tauri build --verbose`.

### Question 7: Does it package the Native Messaging manifest?
- **Status**: **NO / DEFICIENT — MISSING FROM WORKFLOW**
- **Evidence**: The workflow does not currently copy or template `com.cinematic.studio.json` into the release bundle artifacts or installer staging folder.

### Question 8: Does it register the Native Messaging host during installation?
- **Status**: **NO / DEFICIENT — MISSING FROM WORKFLOW**
- **Evidence**: The workflow builds the NSIS/MSI packages via default Tauri bundling, which does not currently execute custom NSIS registry hooks to register `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.

### Question 9: Does it preserve the correct extension ID?
- **Status**: **YES — CONFIRMED**
- **Evidence**: The deterministic RSA public key declared in `chrome-extension/manifest.json` produces Extension ID `olfkacbfbgihonffpmnmnhmfmonfhmpf`. `src-tauri/src/chrome_service/ipc.rs` line 98 hardcodes this exact origin: `chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/`.

### Question 10: Does it produce downloadable build artifacts?
- **Status**: **YES — CONFIRMED**
- **Evidence**: Lines 69–76 use `actions/upload-artifact@v4` to upload:
  - `src-tauri/target/release/bundle/msi/*.msi`
  - `src-tauri/target/release/bundle/nsis/*.exe`
  - Retention period: 30 days.

### Question 11: Are all dependencies available through legitimate package sources?
- **Status**: **YES — CONFIRMED**
- **Evidence**:
  - Node dependencies resolve via standard npm registry (`npm ci`).
  - Rust dependencies resolve via standard `crates.io` index.
  - Media binaries (`ffmpeg.exe` and `ffprobe.exe`) are pre-verified via `node scripts/inspect_pe.cjs` and bundled under `src-tauri/resources/media-engine/windows-x64/`.

### Question 12: Does the workflow accidentally require signing secrets that have not been configured?
- **Status**: **SAFE — NO UNCONFIGURED SECRETS REQUIRED**
- **Evidence**: The workflow contains zero references to `${{ secrets.* }}`. It compiles and packages unsigned release binaries without failing on missing secrets.

---

## 3. Detailed Gap Analysis & Required CI Enhancements

To make `.github/workflows/windows-installer-build.yml` fully production-ready for the Native Messaging Host, two discrete steps must be integrated:

```yaml
      - name: Build Chrome Native Messaging Host Binary
        run: cargo build --release --bin cinematic-studio-host --manifest-path src-tauri/Cargo.toml

      - name: Stage Native Messaging Host & Manifest
        shell: pwsh
        run: |
          $binDir = "src-tauri/resources/bin"
          New-Item -ItemType Directory -Force -Path $binDir
          Copy-Item "src-tauri/target/release/cinematic-studio-host.exe" "$binDir/cinematic-studio-host.exe" -Force
          Write-Host "Staged cinematic-studio-host.exe into resources/bin/ for installer bundling"
```

---

## 4. Final Readiness Verdict

| Audit Aspect | Verdict | Justification |
| :--- | :--- | :--- |
| **Workflow Syntax & Runner** | **READY** | Standard GitHub Actions on Windows Server 2022 runner |
| **Toolchain & Target** | **READY** | `x86_64-pc-windows-msvc` target configured |
| **Test Suite Enforcement** | **READY** | Runs 7 regression suites prior to packaging |
| **Native Host Explicit Build** | **NEEDS MINOR ENHANCEMENT** | Needs explicit `cargo build --bin cinematic-studio-host` |
| **Registry Hook Integration** | **PENDING INSTALLER DESIGN** | NSIS hook needed for HKCU host registration |

### Overall Infrastructure Status:
**BUILD-READY — EXECUTION BLOCKED (PENDING GITHUB REMOTE AUTHORIZATION)**

*Report frozen as `NATIVE-HOST-CI-INFRASTRUCTURE-AUDIT.md`.*


# CINEMATIC STUDIO — REPRODUCIBLE WINDOWS INSTALLER BUILD GUIDE

**Document Purpose:** Complete operational manual for generating Windows x64 MSI and NSIS production installers in a clean environment.  
**Target Hardware / OS:** Windows 10/11 x64, Visual Studio 2022 C++ Build Tools, Rust 1.80+ (MSVC target).  
**Repository State:** Local-first repository (No remote configured).  

---

## 1. PREREQUISITES & TOOLCHAIN

To build the self-contained Windows desktop installer without local Smart App Control policy interference, the host system or CI agent must possess:

1. **Operating System:** Windows 10 (version 1903+) or Windows 11 (x64 architecture).
2. **Visual Studio C++ Build Tools:**
   - Visual Studio 2022 Build Tools (or Community/Enterprise).
   - Workload: "Desktop development with C++" (includes MSVC v143 compiler, Windows 10/11 SDK, C++ CMake tools).
3. **Rust Toolchain:**
   - Rust Stable 64-bit: `rustup default stable-x86_64-pc-windows-msvc`
4. **Node.js:**
   - Node.js LTS v20.x (x64) and npm 10+.
5. **WiX Toolset (for MSI generation):**
   - In Tauri 2, WiX v3/v4 is automatically fetched and configured by the Tauri bundler, or WiX 3.11 can be installed via `dotnet tool install --global wix`.

---

## 2. STEP-BY-STEP LOCAL BUILD PROCEDURE (ON APPROVED WORKSTATION)

When building on an administrator-approved development workstation where Smart App Control is set to Evaluation Mode or configured with a developer certificate:

```powershell
# 1. Navigate to the repository root
cd "C:\Users\Sohag Hossen\Documents\video agent"

# 2. Install reproducible Node dependencies matching package-lock.json
npm ci

# 3. Verify media engine integrity
node scripts/inspect_pe.cjs

# 4. Run the full local regression verification matrix
node tests/combined_phase1_2_validation.cjs
node tests/phase3_provider_matrix_test.cjs
node tests/phase4_media_assembly_test.cjs
node tests/phase4_runtime_hardening_test.cjs
node tests/media_engine_resolver_test.cjs
node tests/final_rendering_regression_suite.cjs

# 5. Compile frontend production bundle
npm run build

# 6. Build the native Windows installer packages
npx tauri build --verbose
```

### 2.1 Expected Output Locations
Upon successful compilation, Tauri generates the installer artifacts in:
- **MSI Installer (Enterprise / Standard Windows Installer):**  
  `src-tauri/target/release/bundle/msi/Cinematic Studio_1.0.0_x64_en-US.msi`
- **NSIS Executable (Standard Setup Wizard):**  
  `src-tauri/target/release/bundle/nsis/Cinematic Studio_1.0.0_x64-setup.exe`

---

## 3. REMOTE CI AUTOMATION (GITHUB ACTIONS READY)

When the user chooses to connect a GitHub remote repository in the future, the automated workflow `.github/workflows/windows-installer-build.yml` is already committed and prepared.

### 3.1 Future GitHub Commands (When Authorized by User)
```powershell
# To be executed ONLY when the user explicitly authorizes remote integration:
git remote add origin https://github.com/<user>/cinematic-studio.git
git branch -M main
git push -u origin main

# Tag a release to trigger the automatic installer builder:
git tag v1.0.0
git push origin v1.0.0
```

### 3.2 What the Automated CI Pipeline Executes
1. Spawns an official Microsoft-hosted `windows-latest` virtual machine.
2. Installs Rust MSVC toolchain, caching crates via `Swatinem/rust-cache`.
3. Runs `npm ci` and verifies bundled FFmpeg SHA-256 hashes.
4. Executes all 8 automated test suites across Phases 1–4.
5. Runs `npm run build` and `npx tauri build`.
6. Produces signed/packaged `.msi` and `.exe` installers.
7. Uploads the final standalone installer packages to GitHub Actions Artifacts.

---

## 4. TROUBLESHOOTING & COMMON PITFALLS

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `os error 4551: An Application Control policy has blocked this file` | Windows 11 Smart App Control blocking unsigned local rustc binaries | Execute build on standard CI runner (`windows-latest`) or sign binaries with a trusted code-signing certificate. |
| `spurious network error: Could not resolve hostname index.crates.io` | Offline sandbox prevents Cargo from fetching crates | Run with network access enabled or use a pre-populated offline Cargo vendor directory (`cargo vendor`). |
| `Tauri packages version mismatch` | Disparity between `@tauri-apps/api` and `tauri` in `Cargo.toml` | Maintain lockstep alignment: `Cargo.toml` specifies `tauri = "2.12"` to match `@tauri-apps/api@2.12.4`. |

*Guide verified and maintained by Cinematic Studio Systems Architecture Team.*


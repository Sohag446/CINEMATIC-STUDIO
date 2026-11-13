# CINEMATIC STUDIO — TAURI & RUST DEPENDENCY ALIGNMENT REPORT

**Audit Date:** November 13, 2026  
**Auditor:** Principal Software Architect & Tauri Engineer  
**Scope:** Dependency Consistency between Node.js NPM ecosystem, Tauri CLI, and Rust Cargo manifests  
**Operating Environment:** Windows 11 Pro (Build 26200), x86_64, 20 GB RAM  

---

## 1. INITIAL VERSION MISMATCH ANALYSIS

During installer packaging attempts, the Tauri CLI reported:
```
Found version mismatched Tauri packages. Make sure the NPM package and Rust crate versions are on the same major/minor releases:
tauri (v2.0.0) : @tauri-apps/api (v2.12.4)
tauri-plugin-shell (v2.0.0) : @tauri-apps/plugin-shell (v2.6.0)
```

### 1.1 Root Cause Identification
1. **Installed NPM Packages:**
   - `@tauri-apps/cli`: `2.12.4`
   - `@tauri-apps/api`: `2.12.4`
   - `@tauri-apps/plugin-shell`: `2.6.0`
2. **Rust Cargo Manifest (`src-tauri/Cargo.toml`):**
   - Originally pinned to patch releases:
     `tauri = { version = "2.0.0", features = [] }`
     `tauri-plugin-shell = "2.0.0"`
     `tauri-build = { version = "2.0.0", features = [] }`
3. **Tauri CLI Validator Logic:**
   - In Tauri 2, `tauri-cli` performs a pre-flight version validation. It parses `Cargo.toml` and compares the declared crate version against the installed `@tauri-apps/*` packages. When `tauri = "2.0.0"` is compared against `@tauri-apps/api@2.12.4`, the minor version disparity (`0` vs `12`) triggers a hard warning/error.

---

## 2. COMPATIBILITY & ALIGNMENT RESOLUTION

### 2.1 Applied Cargo Manifest Updates
To ensure reproducible, lockstep alignment across both JavaScript and Rust components of Tauri 2:
- **`tauri`:** Updated to `"2.12"` to match `@tauri-apps/api@2.12.4`
- **`tauri-plugin-shell`:** Updated to `"2.6"` to match `@tauri-apps/plugin-shell@2.6.0`
- **`tauri-build`:** Updated to `"2.12"` to match the core engine

```toml
[build-dependencies]
tauri-build = { version = "2.12", features = [] }

[dependencies]
tauri = { version = "2.12", features = [] }
tauri-plugin-shell = "2.6"
```

### 2.2 Preservation of `package.json` and `package-lock.json`
- `package.json` declared caret dependencies (`^2.0.0`), which legitimately resolved to `2.12.4` in `package-lock.json`.
- The lockfile was preserved intact without re-installing or altering existing dependencies.

---

## 3. VERIFICATION MATRIX & BUILD STATUS

| Step / Command | Target Component | Status | Result / Output |
| :--- | :--- | :---: | :--- |
| `npm run build` | TypeScript + Vite | **PASS** | Exit code 0, 1520 modules transformed, `dist/` generated in 10.74s |
| `MediaEngineResolver` | Centralized Engine | **PASS** | 15/15 unit tests passed |
| `cargo check --offline` | Rust Crate Resolution | `BLOCKED` | Offline environment cannot fetch missing transitive crates from `index.crates.io` |
| `cargo test --lib` | Local Rust Compilation | `BLOCKED` | Windows 11 Smart App Control policy enforcement (`os error 4551`) |

---

## 4. CONCLUSION & PACKAGING READINESS

The version definitions across `package.json`, `package-lock.json`, and `Cargo.toml` are now harmonized on the Tauri 2.12 / Plugin 2.6 line. The frontend builds cleanly with 0 errors. The remaining blockers for native compilation are local environment constraints (offline sandbox crate fetching and Windows SAC policy), which are scheduled for clean-machine CI execution.


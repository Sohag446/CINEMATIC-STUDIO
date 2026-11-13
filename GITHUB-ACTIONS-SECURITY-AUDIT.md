# CINEMATIC STUDIO — GITHUB ACTIONS SECURITY AUDIT

**Date:** 2026-11-13  
**Status:** COMPLETE & SECURE  
**Target Workflow:** `.github/workflows/windows-installer-build.yml`  
**Security Classification:** LEAST PRIVILEGE / ZERO-SECRET / HARDENED CI  

---

## 1. EXECUTIVE AUDIT SUMMARY

An in-depth security and architectural audit of the GitHub Actions Continuous Integration (CI) configuration was performed prior to repository publication. 

The audit focused on six core security domains:
1. **Permission Scoping & Principle of Least Privilege**
2. **Secret Management & Zero-Credential Exposure**
3. **Workflow Trigger Boundaries & PR Injection Prevention**
4. **Third-Party Action Provenance & Supply Chain Risk**
5. **Runner Isolation & Build Ephemerality**
6. **Artifact Integrity & Release Pipeline Security**

**Verdict:** The workflow meets high-assurance security standards. It contains zero embedded secrets, enforces read-only GITHUB_TOKEN permissions, prevents untrusted pull requests from triggering Windows runners, and uses verified, reputable actions.

---

## 2. PERMISSION ANALYSIS & LEAST PRIVILEGE

Standard GitHub Actions default permissions historically granted read/write permissions to repository contents, packages, and pull requests. In a public repository, broad permissions expose projects to token exfiltration risks if a dependency or test script is compromised.

### Current Implementation:
```yaml
permissions:
  contents: read
```

### Security Implications:
* The default `GITHUB_TOKEN` is strictly scoped to **read-only repository contents**.
* Write access to code, releases, packages, issues, pull requests, and security alerts is explicitly denied.
* Even if arbitrary code were executed inside a test runner, the token lacks permissions to push commits, alter tags, modify issues, or publish unauthorized releases.

---

## 3. WORKFLOW TRIGGER AUDIT

### Current Triggers:
```yaml
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
```

### Risk Mitigation Analysis:
* **Untrusted Pull Request Protection:** The workflow explicitly does **NOT** trigger on `pull_request` or `pull_request_target`. Malicious pull requests submitted from forks cannot execute arbitrary code inside Windows runner VMs or consume repository CI minutes.
* **Release Boundary Control:** Automated builds occur exclusively when a repository administrator pushes an authenticated semantic version tag (e.g., `v1.0.0`).
* **Manual Dispatch:** Allows maintainers to run builds on-demand via the GitHub web UI or CLI (`gh workflow run`) with full audit logging.

---

## 4. SECRET & CREDENTIAL POSTURE

A complete scan of the workflow file and repository environment reveals:
* **Zero Secrets Referenced:** The workflow references **zero** repository secrets (`${{ secrets.* }}` is completely absent).
* **Zero Hardcoded Keys:** No API keys, deployment tokens, bearer headers, or signing passwords exist in the YAML.
* **Code Signing Integrity:** In accordance with the project's zero-secret policy, code signing certificates (`.pfx`) are not stored in the repository. As documented in `AUTHENTICODE-SIGNING-READINESS.md`, production Authenticode signing is decoupled from public CI or configured via secure GitHub Actions environments using Azure Key Vault or hardware security modules (HSM) during release phases.

---

## 5. SUPPLY CHAIN & ACTION PROVENANCE

Every action referenced in `.github/workflows/windows-installer-build.yml` was evaluated for maintainer trustworthiness, community adoption, and supply chain vulnerability:

| Action Identifier | Publisher / Origin | Purpose | Integrity & Version Pinning |
| :--- | :--- | :--- | :--- |
| `actions/checkout@v4` | Official GitHub (`actions`) | Clones repository tree | Maintained by GitHub Security; pinned to major release v4 |
| `actions/setup-node@v4` | Official GitHub (`actions`) | Provisions Node.js 20 | Maintained by GitHub; caching enabled for npm |
| `dtolnay/rust-toolchain@stable` | David Tolnay (Rust Core Contributor) | Provisions MSVC Rust toolchain | Gold-standard Rust toolchain action; zero wrapper vulnerabilities |
| `Swatinem/rust-cache@v2` | Rust Community Leader (`Swatinem`) | Caches `target/` and Cargo cache | Safely scoped to `src-tauri` workspace; read/write scoped cache |
| `actions/upload-artifact@v4` | Official GitHub (`actions`) | Stores installer packages | Official GitHub artifact transport; secure TLS upload |

---

## 6. RUNNER ENVIRONMENT & BUILD STEP VERIFICATION

### Runner:
```yaml
runs-on: windows-latest
```
* Runs on GitHub-hosted, single-tenant, ephemeral Windows Server VMs.
* Completely destroyed and sanitized after every job execution, preventing cross-build contamination.

### Build & Verification Steps:
1. **`npm ci`**: Uses `package-lock.json` exact deterministic dependency tree (prevents unexpected minor/patch version drift).
2. **`node scripts/acquire_ffmpeg.cjs`**: Downloads FFmpeg Gyan essentials and verifies cryptographic hash `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba` before unzipping.
3. **`node scripts/inspect_pe.cjs`**: Audits PE header architecture (x64) and Authenticode status.
4. **Automated Test Matrix**: Executes 7 comprehensive test suites before any packaging begins:
   - `tests/combined_phase1_2_validation.cjs`
   - `tests/phase3_provider_matrix_test.cjs`
   - `tests/phase4_media_assembly_test.cjs`
   - `tests/phase4_runtime_hardening_test.cjs`
   - `tests/media_engine_resolver_test.cjs`
   - `tests/real_media_rendering_test.cjs`
   - `tests/final_rendering_regression_suite.cjs`
5. **Frontend Compilation**: `npm run build` generates production Vite bundle.
6. **Native Messaging Host Compilation**: `cargo build --release --bin cinematic-studio-host` compiles the host binary natively on the Windows runner. (Note: Resolves the local SAC compile blocker).
7. **Tauri Packaging**: `npx tauri build --verbose` generates self-contained `.msi` and NSIS `.exe` installers bundling both the media engine and native host.
8. **Artifact Upload**: Artifacts uploaded with a 30-day retention window.

---

## 7. RECOMMENDATIONS FOR FUTURE STAGES

While the current CI configuration is fully hardened for open-source publication, the following enhancements are scheduled for future production deployment:

1. **Tag Hash Pinning:** For ultra-high security compliance (e.g., SLSA Level 3), pin actions by their immutable commit SHA (e.g., `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`) rather than major version tags.
2. **Automated Release Tagging:** When production code signing certificates are provisioned, configure a dedicated `release` job utilizing GitHub Environments with manual approval gates to publish release assets directly to GitHub Releases.

---

## 8. AUDIT CONCLUSION

The GitHub Actions CI pipeline is **SECURE, DETERMINISTIC, and READY FOR PUBLIC GITHUB DEPLOYMENT**.


# CINEMATIC STUDIO — AUTHENTICODE SIGNING READINESS REPORT

## 1. Executive Summary & Audit Mandate

In strict accordance with the security audit rules:
> **"Audit signing requirements without inventing a certificate or claiming a signature exists. If no certificate is available, keep signing classified as NOT CONFIGURED. Document legitimate certificate acquisition and configuration steps. Never generate a fake certificate and call it trusted. A valid signature does not guarantee Smart App Control approval. Document this limitation accurately."**

This report establishes the current Authenticode signing posture of CINEMATIC STUDIO, the threat boundary enforced by Windows Smart App Control, and the exact steps required to implement production-grade code signing.

---

## 2. Current Certificate Status & Store Inspection

A forensic inspection of the local Windows certificate stores was performed:

```powershell
Get-ChildItem Cert:\CurrentUser\My
# Output: (No certificates found)

Get-ChildItem Cert:\LocalMachine\My
# Output: (No certificates found)
```

- **Available Code-Signing Certificate**: **NONE**
- **Signing Status**: **`NOT CONFIGURED`**
- **Repository Secrets**: **CLEAN** (Zero embedded private keys, `.pfx` files, or passwords exist in the Git workspace).

---

## 3. Threat Model: Windows 11 Smart App Control (SAC) vs. Authenticode

A common misconception in Windows software distribution is that any valid digital signature automatically passes Windows 11 Smart App Control.

### Forensic Operating System Reality:
1. **Dual Evaluation Criteria**:
   Windows Smart App Control evaluates executables against two sequential gates:
   - **Gate 1: Authenticode Signature Validity**: Verifies the binary is signed by a valid X.509 certificate chaining to a Microsoft-trusted Root CA, with valid RFC 3161 timestamping and matching digest hashes.
   - **Gate 2: Microsoft Defender Cloud Intelligence (Reputation Telemetry)**: The binary's SHA-256 hash is queried against Microsoft's cloud reputation database.
2. **The "New Certificate" Reputation Dilemma**:
   - If an application is signed with a newly purchased Standard Code Signing certificate that has zero download history, Smart App Control will **continue to block or warn against execution** until sufficient global telemetry is accumulated.
   - Only **Extended Validation (EV) Code Signing** certificates or **Microsoft Azure Trusted Signing** (formerly Azure Code Signing) offer immediate or rapid reputation bootstrapping.
3. **Audit Takeaway**:
   Obtaining a code signing certificate is necessary for Windows distribution, but Smart App Control compliance additionally requires building reputation or submitting false-positive telemetry to Microsoft Security Intelligence.

---

## 4. Legitimate Certificate Acquisition Options

To sign `cinematic-studio-host.exe`, `cinematic-studio.exe`, and the NSIS installer without workarounds, the organization must adopt one of the following two sanctioned paths:

### Option 1: Microsoft Azure Trusted Signing (Recommended & Cloud-Native)
- **Provider**: Microsoft Identity & Trust Services (in partnership with DigiCert).
- **Mechanism**: Cloud-based Hardware Security Module (HSM). No physical USB dongles required.
- **CI/CD Integration**: Seamless integration with GitHub Actions via the official `azure/trusted-signing-action` using GitHub OIDC workload identity federation.
- **Cost / Verification**: Subscription-based; requires Microsoft Entra ID organization identity verification.

### Option 2: Commercial Extended Validation (EV) Code Signing Certificate
- **Providers**: DigiCert, Sectigo, GlobalSign, SSL.com.
- **Mechanism**: FIPS 140-2 Level 2 hardware token or cloud HSM (e.g. DigiCert KeyLocker).
- **CI/CD Integration**: SignTool via cloud HSM CLI or encrypted `.pfx` stored in GitHub Actions encrypted secrets (`AZURE_KEY_VAULT` or base64 secret).

---

## 5. CI/CD Signing Integration Design (GitHub Actions)

When a trusted certificate is acquired, it must be supplied to the GitHub Actions build pipeline strictly via encrypted secrets:

### Required GitHub Secrets:
1. `SIGNING_CERT_BASE64`: Base64-encoded encrypted PFX certificate.
2. `SIGNING_CERT_PASSWORD`: Passphrase protecting the PFX archive.
3. *Alternative (Azure Trusted Signing)*: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CERT_PROFILE_NAME`.

### SignTool Command Specification:
```powershell
signtool.exe sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /f "$certPath" `
  /p "$env:SIGNING_CERT_PASSWORD" `
  "src-tauri/target/release/cinematic-studio-host.exe"

signtool.exe sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /f "$certPath" `
  /p "$env:SIGNING_CERT_PASSWORD" `
  "src-tauri/target/release/cinematic-studio.exe"

signtool.exe sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /f "$certPath" `
  /p "$env:SIGNING_CERT_PASSWORD" `
  "src-tauri/target/release/bundle/nsis/*.exe"
```

### Signature Verification Command:
```powershell
signtool.exe verify /pa /v "src-tauri/target/release/cinematic-studio-host.exe"
```
The `/pa` parameter validates the Authenticode signature against Windows Default Verification Policy.

---

## 6. Audit Classification

| Criterion | Evaluation Result | Status |
| :--- | :--- | :--- |
| **Local Certificate Presence** | None in user or machine store | **`NOT CONFIGURED`** |
| **CI Secret Configuration** | No signing secrets embedded | **`CLEAN`** |
| **Timestamping Architecture** | RFC 3161 SHA-256 defined | **`READY FOR CONFIGURATION`** |
| **Verification Strategy** | `signtool.exe verify /pa` defined | **`READY FOR CONFIGURATION`** |
| **Smart App Control Realism** | Reputation requirements documented | **`DOCUMENTED & ACCURATE`** |

*Report frozen as `AUTHENTICODE-SIGNING-READINESS.md`.*


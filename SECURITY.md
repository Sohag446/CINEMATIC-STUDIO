# Security Policy

## 1. Supported Versions

| Project Version | Supported | Security Notes |
| :--- | :--- | :--- |
| `1.0.0` (Master) | :white_check_mark: | Active development version |
| `< 1.0.0` | :x: | Historical development phases |

---

## 2. Security Tenets & Privacy Architecture

CINEMATIC STUDIO is engineered from the ground up under a **Zero-Trust, Local-First Data Sovereignty Policy**:

1. **Local Data Sovereignty**:
   - All projects, scripts, generated video clips, timelines, and user settings reside strictly on the creator's local filesystem.
   - The platform operates with zero telemetry, zero analytics tracking, and zero remote logging.
2. **Passive Authentication & Zero Credential Access**:
   - The application does not store, request, or handle user credentials, Google passwords, or OpenAI API keys.
   - The Manifest V3 Chrome extension relies entirely on the user's existing, authenticated browser sessions within dedicated Chrome profiles.
3. **Strict Origin & Extension Pining**:
   - Native Messaging communication is pinned to a single cryptographic extension ID (`olfkacbfbgihonffpmnmnhmfmonfhmpf`), derived from a 2048-bit RSA public key.
   - Wildcard origins and third-party extension injection are strictly rejected by the host.
4. **Memory Safety & Bounded IPC**:
   - Native Messaging packets are constrained to a strict 1 MB maximum limit to prevent denial-of-service and memory exhaustion.
   - Buffer headers and payloads are validated prior to heap allocation.
5. **Path Traversal Defenses**:
   - Reference assets and generated outputs are restricted to the project root directory. Paths resolving outside the approved project boundary are blocked.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability or security boundary bypass within CINEMATIC STUDIO:

1. **Do not create a public GitHub Issue** to report security vulnerabilities.
2. Please contact the project maintainer directly via GitHub Security Advisories or private email.
3. Include detailed reproduction steps, affected component versions, and proof of concept where applicable.
4. Maintainers will acknowledge reports within 48 hours and coordinate a coordinated disclosure timeline.


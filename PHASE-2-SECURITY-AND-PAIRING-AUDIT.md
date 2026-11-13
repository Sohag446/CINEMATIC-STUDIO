# CINEMATIC STUDIO — PHASE 2 SECURITY & CRYPTOGRAPHIC PAIRING AUDIT

**Date:** November 13, 2026  
**Auditor:** Principal Desktop Application Engineer & Systems Architect  
**Workspace:** `c:\Users\Sohag Hossen\Documents\video agent`  
**Milestone:** Phase 2 Security & Authentication Audit  

---

## 1. Cryptographic Pairing Protocol Specification

To prevent unauthorized extensions or cross-profile hijacking, every pairing handshake enforces mutual cryptographic authentication using **pure-Rust HMAC-SHA256 (RFC 2104)**:

```
[ Desktop Application ]                                              [ Chrome Extension (background.js) ]
          |                                                                           |
          |  1. Operator initiates pairing in UI                                      |
          |  2. Generates:                                                            |
          |     - 256-bit entropy pairing_secret                                      |
          |     - UUID v4 server_nonce                                                |
          |     - 5-minute expiration timestamp                                       |
          |  3. Displays one-time pairing URL:                                        |
          |     cinematic://pair?profile=<id>&secret=<secret>&session=<session_id>    |
          |                                                                           |
          | ---------------- (Operator pastes token into extension) ----------------> |
          |                                                                           |
          |                                                  4. Stores profileId & pairingSecret in isolated
          |                                                     chrome.storage.local
          |                                                  5. Connects via chrome.runtime.connectNative
          |                                                  6. Generates fresh client_nonce
          |                                                  7. Computes HMAC-SHA256:
          |                                                     Hash(pairingSecret, server_nonce + ":" + client_nonce)
          |                                                                           |
          | <------------------ 8. Sends VERIFY_HANDSHAKE_RESPONSE ------------------ |
          |                       { session_id, profile_id,                           |
          |                         client_nonce, signature_hex }                     |
          |                                                                           |
          |  9. Verifies:                                                             |
          |     - session_id exists                                                   |
          |     - stored profile_id == request profile_id (Anti-Impersonation)        |
          |     - is_used == false (Anti-Replay Attack)                               |
          |     - now <= expires_at (Expiration Enforcement)                          |
          |     - constant_time_eq(computed_hmac, signature_hex) (Side-Channel Proof) |
          | 10. Marks session is_used = 1                                             |
          | 11. Transitions connection_state = 'EXTENSION_CONNECTED'                  |
          |                                                                           |
          | ------------------------- 12. HANDSHAKE_VERIFIED -----------------------> |
          v                                                                           v
```

---

## 2. Threat Model & Mitigations

| Threat Vector | Potential Impact | Implemented Architectural Mitigation | Audit Test Case |
|---|---|---|---|
| **Replay Attack** | Attacker intercepts prior valid handshake and attempts to reconnect. | Every challenge session is single-use (`is_used = 1`). Re-submitting the same session ID is immediately rejected with a security error. | `test_pairing_replay_attack_rejected` / Category F |
| **Profile Impersonation** | Extension in Profile 1 attempts to pair or receive tasks for Profile 2. | Server validates `session.profile_id == request.profile_id`. Any mismatched ID is rejected. Background script drops packets addressed to other profile IDs. | `test_pairing_wrong_profile_identity_rejected` / Category F |
| **Expired Token Exploitation** | Stale pairing token used after user abandoned pairing. | Every challenge has a hard 5-minute validity window (`expires_at = now + 300000`). Expired sessions are rejected. | `test_pairing_expired_challenge_rejected` / Category F |
| **Timing Side-Channel Attacks** | Attacker probes signature byte-by-byte using response timing variations. | HMAC signature verification uses bitwise constant-time equality check (`constant_time_eq`), preventing timing discrepancies. | `test_crypto_sha256_and_hmac_sha256_known_vectors` / Category F |
| **IPC Buffer Overflow / Exhaustion** | Malicious or corrupt extension floods desktop with multi-gigabyte packets. | Native Messaging packet decoder enforces a strict 1 MB maximum length bound (`MAX_MESSAGE_SIZE = 1048576`). Packets exceeding 1 MB are dropped. | `test_ipc_packet_framing_and_size_bounds` / Category G |
| **Path Traversal via Extension** | Extension sends arbitrary file paths to overwrite desktop files. | Extension never supplies filesystem paths. Project directories are authoritatively resolved and contained inside the desktop application vault. | Phase 1 Security Matrix / Category G |
| **Credential Harvesting** | Extension reads user passwords or cookies from provider websites. | Content script is restricted to reading DOM indicators (e.g. user menu buttons). No cookies or credentials are read or stored. | Code inspection / Phase 2 specification |

---

## 3. Explicit Revocation & Re-Pairing

Calling `PairingService::revoke_pairing(conn, profile_id)`:
1. Purges the active pairing secret hash from `chrome_profiles`.
2. Deletes all associated sessions from `chrome_pairing_sessions`.
3. Transitions profile state to `PAIRING_REQUIRED`.
4. Subsequent Native Messaging messages from the extension are rejected until a fresh handshake is completed.

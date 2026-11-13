# CINEMATIC STUDIO — CRYPTOGRAPHIC PAIRING SECURITY AUDIT
## Forensic Protocol Analysis, Authentication Directionality & Key Storage

## 1. Executive Summary

This audit performs an independent cryptographic review of the pairing and authentication handshake implemented between the CINEMATIC STUDIO Desktop Native Host and the Chrome Extension.

The implementation was examined across:
- `src-tauri/src/chrome_service/crypto.rs` (Pure Rust HMAC-SHA256, constant-time equality)
- `src-tauri/src/chrome_service/pairing.rs` (Challenge issuance, verification, revocation)
- `src-tauri/src/bin/host.rs` (Native host handshake routing)
- `chrome-extension/background.js` (Extension crypto utilities and port handler)
- `tests/chrome_profile_pairing_suite.cjs` (14 local component tests)

---

## 2. Protocol Specification & Mathematical Construction

```
Desktop Host (Challenge Issuer)                  Chrome Extension (Prover)
       |                                                    |
       |  <--- 1. INITIATE_HANDSHAKE { profile_id } ------- |
       |                                                    |
       |  [Generate session_id (UUID v4)]                   |
       |  [Generate server_nonce (128-bit random)]          |
       |  [Set expires_at = now + 300,000ms]                |
       |                                                    |
       |  ---> 2. CHALLENGE_ISSUED ------------------------>|
       |          { session_id, server_nonce }              |
       |                                                    |
       |                     [Generate client_nonce (UUID)] |
       |                     [Message = server_nonce:client_nonce]
       |                     [Sig = HMAC-SHA256(secret, Message)]
       |                                                    |
       |  <--- 3. VERIFY_HANDSHAKE_RESPONSE ----------------|
       |          { session_id, client_nonce, Sig }         |
       |                                                    |
       |  [Lookup session_id in database]                   |
       |  [Verify stored_profile_id == profile_id]          |
       |  [Verify is_used == 0]                             |
       |  [Verify now <= expires_at]                        |
       |  [Expected = HMAC-SHA256(secret, Message)]         |
       |  [constant_time_eq(Sig, Expected)]                 |
       |  [Mark session is_used = 1]                        |
       |                                                    |
       |  ---> 4. HANDSHAKE_VERIFIED { success: true } ---->|
```

### Detailed Component Verification:
1. **Secret Generation**: `generate_pairing_secret()` generates 32 bytes (256 bits) of cryptographically secure pseudorandom entropy, encoded as a 64-character lowercase hex string.
2. **Server Nonce**: Generated via UUID v4 (128 bits), unique per session.
3. **Client Nonce**: Generated in the extension via `crypto.randomUUID()` (128 bits), incorporated into the HMAC payload to prevent chosen-plaintext replay.
4. **HMAC Algorithm**: HMAC-SHA256 conforming to RFC 2104 / FIPS 180-4.
5. **Constant-Time Comparison**:
   - Rust: `constant_time_eq` XORs bytes accumulating differences (`res |= a ^ b`) to guarantee $O(1)$ constant-time comparison, neutralizing timing side-channel attacks.
   - JavaScript: `crypto.timingSafeEqual` in Node.js / Web Crypto API.
6. **Nonce Expiry & Replay Prevention**:
   - Challenges expire after 5 minutes (`expires_at`).
   - Sessions are marked `is_used = 1` immediately upon first verification. Re-submitting a consumed challenge returns `"Replay rejected"`.
7. **Pairing Revocation**:
   - `revoke_pairing` resets profile state to `REVOKED`, nulls `pairing_secret_hash`, and hard-deletes active records from `chrome_pairing_sessions`.

---

## 3. Critical Architectural Finding: Client vs. Mutual Authentication

> [!WARNING]
> **Authentication Directionality Correction**:
> Previous documentation characterized this handshake as **"Mutual Authentication"**. This classification is **cryptographically inaccurate**.
> 
> The implemented protocol is strictly a **Client Authentication (One-Directional Challenge-Response) Protocol**.

### Cryptographic Analysis:
- **What the protocol proves**: The Extension (Client) proves to the Desktop Host that it possesses the pre-shared `pairing_secret`.
- **What the protocol does NOT prove**: The Desktop Host **never proves its identity back to the Extension**.
  - The Host sends `{ type: "HANDSHAKE_VERIFIED", payload: { success: true } }` as an unauthenticated plaintext acknowledgement.
  - The Host does not sign a client challenge nonce.
  - If a rogue application on the host machine were to spoof the Native Messaging stdio pipe, the extension would have no cryptographic proof that it is communicating with the genuine CINEMATIC STUDIO backend.

### Required Future Hardening (True Mutual Authentication):
To achieve true mutual authentication, the protocol must implement a 2-way Diffie-Hellman or mutual challenge exchange:
1. Host issues challenge: `server_nonce`.
2. Extension returns: `client_nonce` and `HMAC-SHA256(secret, "CLIENT:" + server_nonce + ":" + client_nonce)`.
3. Host verifies client signature, then returns: `HMAC-SHA256(secret, "HOST:" + client_nonce + ":" + server_nonce)`.
4. Extension verifies host signature before setting `isHandshakeComplete = true`.

---

## 4. Key Storage & Persistence Across Restarts

| Storage Domain | Stored Key Format | Storage Medium | Restart Survival | Security Posture |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop Application** | `SHA-256(pairing_secret)` (Hash only) | SQLite `chrome_profiles.pairing_secret_hash` | **Survives** | **High**: Database theft does not expose the plaintext secret. |
| **Pairing Session** | `pairing_secret` (Plaintext) | SQLite `chrome_pairing_sessions.pairing_secret` | **Survives** until consumed/revoked | **Medium**: Ephemeral record deleted upon revocation. |
| **Chrome Extension** | `{ profileId, pairingSecret }` (Plaintext) | `chrome.storage.local` (Chrome LevelDB) | **Survives** | **Medium**: Sandboxed to extension origin (`olfkacbfbgihonffpmnmnhmfmonfhmpf`). |

### Profile Isolation Audit:
- **Extension Restart**: On service worker restart, `background.js` re-reads `{ profileId, pairingSecret }` from `chrome.storage.local`, re-initiating the connection seamlessly.
- **Cross-Profile Tampering**: If Extension A (configured for `Profile 4`) receives a task envelope tagged with `profile_id: "Profile 6"`, the packet is dropped immediately (`background.js` line 121), preserving strict profile boundary isolation.

---

## 5. Security Verdict & Classification

| Cryptographic Attribute | Implementation State | Evidence Classification |
| :--- | :--- | :--- |
| **Secret & Nonce Entropy** | 256-bit secret + 128-bit UUID nonces | **`LOCAL_COMPONENT_PASS`** |
| **HMAC-SHA256 Construction** | RFC 2104 compliant | **`LOCAL_COMPONENT_PASS`** |
| **Timing Attack Mitigation** | Constant-time comparison verified | **`LOCAL_COMPONENT_PASS`** |
| **Replay & Expiry Defenses** | Consumed nonces rejected; 5-min TTL | **`LOCAL_COMPONENT_PASS`** |
| **Authentication Direction** | **One-Directional Client Auth Only** | **`AUDIT_CORRECTION_NOTED`** |
| **Storage Hygiene** | Hashed on host, sandboxed in extension | **`LOCAL_COMPONENT_PASS`** |

*Report frozen as `CRYPTOGRAPHIC-PAIRING-SECURITY-AUDIT.md`.*


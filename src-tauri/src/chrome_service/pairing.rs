use super::crypto::{
    constant_time_eq, generate_pairing_secret, hmac_sha256, sha256_digest, to_hex,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PairingChallengeDto {
    pub session_id: String,
    pub profile_id: String,
    pub pairing_secret: String,
    pub server_nonce: String,
    pub expires_at: i64,
    pub pairing_url: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPairingDto {
    pub session_id: String,
    pub profile_id: String,
    pub client_nonce: String,
    pub client_signature_hex: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PairingVerificationResult {
    pub success: bool,
    pub profile_id: String,
    pub message: String,
}

pub struct PairingService;

impl PairingService {
    /// Generates a fresh one-time cryptographic pairing challenge for a registered profile
    pub fn initiate_pairing(
        conn: &mut Connection,
        profile_id: &str,
    ) -> Result<PairingChallengeDto, String> {
        // 1. Verify profile exists
        let exists: bool = conn
            .query_row(
                "SELECT count(*) FROM chrome_profiles WHERE id = ?1",
                [profile_id],
                |r| r.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .map_err(|e| e.to_string())?;

        if !exists {
            return Err(format!(
                "Cannot pair: Profile with ID '{}' does not exist",
                profile_id
            ));
        }

        // 2. Generate cryptographically strong material
        let session_id = uuid::Uuid::new_v4().to_string();
        let pairing_secret = generate_pairing_secret();
        let server_nonce = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let expires_at = now + (5 * 60 * 1000); // 5-minute validity window

        // 3. Store active pairing session in database
        conn.execute(
            "INSERT INTO chrome_pairing_sessions (
                id, profile_id, pairing_secret, server_nonce, expires_at, is_used, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            params![
                session_id,
                profile_id,
                pairing_secret,
                server_nonce,
                expires_at,
                now
            ],
        )
        .map_err(|e| format!("Failed to record pairing session: {}", e))?;

        // 4. Update profile status to PAIRING_PENDING
        let secret_hash = to_hex(&sha256_digest(pairing_secret.as_bytes()));
        conn.execute(
            "UPDATE chrome_profiles 
             SET pairing_state = 'PAIRING_PENDING', pairing_secret_hash = ?1, updated_at = ?2 
             WHERE id = ?3",
            params![secret_hash, now, profile_id],
        )
        .map_err(|e| format!("Failed to update profile pairing state: {}", e))?;

        let pairing_url = format!(
            "cinematic://pair?profile={}&secret={}&session={}",
            profile_id, pairing_secret, session_id
        );

        Ok(PairingChallengeDto {
            session_id,
            profile_id: profile_id.to_string(),
            pairing_secret,
            server_nonce,
            expires_at,
            pairing_url,
        })
    }

    /// Verifies the extension's HMAC-SHA256 signature response against the stored server challenge
    pub fn verify_pairing(
        conn: &mut Connection,
        input: VerifyPairingDto,
    ) -> Result<PairingVerificationResult, String> {
        let now = chrono::Utc::now().timestamp_millis();

        // 1. Retrieve session record
        let session = conn
            .query_row(
                "SELECT profile_id, pairing_secret, server_nonce, expires_at, is_used \
                 FROM chrome_pairing_sessions WHERE id = ?1",
                [&input.session_id],
                |r| {
                    let p_id: String = r.get(0)?;
                    let secret: String = r.get(1)?;
                    let s_nonce: String = r.get(2)?;
                    let exp: i64 = r.get(3)?;
                    let used: i32 = r.get(4)?;
                    Ok((p_id, secret, s_nonce, exp, used == 1))
                },
            )
            .map_err(|_| "Invalid pairing session ID".to_string())?;

        let (stored_profile_id, pairing_secret, server_nonce, expires_at, is_used) = session;

        // 2. Reject mismatched profile identity (anti-impersonation)
        if stored_profile_id != input.profile_id {
            return Err(
                "Security Error: Session profile identity does not match request profile ID"
                    .to_string(),
            );
        }

        // 3. Reject replay attacks (already used challenge)
        if is_used {
            return Err("Security Error: This pairing challenge has already been consumed (replay rejected)".to_string());
        }

        // 4. Reject expired challenges
        if now > expires_at {
            return Err("Security Error: Pairing challenge has expired. Please initiate a new pairing request".to_string());
        }

        // 5. Verify HMAC-SHA256: Hash(pairing_secret, server_nonce + client_nonce)
        let message = format!("{}:{}", server_nonce, input.client_nonce);
        let expected_hmac = hmac_sha256(pairing_secret.as_bytes(), message.as_bytes());
        let expected_hex = to_hex(&expected_hmac);

        if !constant_time_eq(
            expected_hex.as_bytes(),
            input.client_signature_hex.to_lowercase().as_bytes(),
        ) {
            return Err("Security Error: HMAC-SHA256 challenge signature mismatch".to_string());
        }

        // 6. Mark session as used
        conn.execute(
            "UPDATE chrome_pairing_sessions SET is_used = 1, client_nonce = ?1 WHERE id = ?2",
            params![input.client_nonce, input.session_id],
        )
        .map_err(|e| format!("Failed to update pairing session: {}", e))?;

        // 7. Transition profile state to PAIRED & EXTENSION_CONNECTED
        conn.execute(
            "UPDATE chrome_profiles 
             SET pairing_state = 'PAIRED', connection_state = 'EXTENSION_CONNECTED', 
                 extension_installed = 1, last_seen_at = ?1, last_error = NULL, updated_at = ?1 
             WHERE id = ?2",
            params![now, input.profile_id],
        )
        .map_err(|e| format!("Failed to transition profile connection state: {}", e))?;

        Ok(PairingVerificationResult {
            success: true,
            profile_id: input.profile_id,
            message: "Profile successfully paired and authenticated via HMAC-SHA256".to_string(),
        })
    }

    /// Revokes pairing for a profile, forcing re-authentication
    pub fn revoke_pairing(conn: &mut Connection, profile_id: &str) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE chrome_profiles 
             SET pairing_state = 'REVOKED', connection_state = 'PAIRING_REQUIRED', 
                 pairing_secret_hash = NULL, updated_at = ?1 
             WHERE id = ?2",
            params![now, profile_id],
        )
        .map_err(|e| format!("Failed to revoke pairing: {}", e))?;

        // Delete all pairing sessions for this profile
        conn.execute(
            "DELETE FROM chrome_pairing_sessions WHERE profile_id = ?1",
            [profile_id],
        )
        .map_err(|e| format!("Failed to clear pairing sessions: {}", e))?;

        Ok(())
    }
}

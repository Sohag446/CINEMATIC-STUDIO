//! CINEMATIC STUDIO — Chrome Native Messaging Host
//! Stdio-framed Native Messaging Host for Chrome Extension Integration
//! 
//! Protocol Requirements:
//! 1. 32-bit (4-byte) little-endian length prefix on all packets
//! 2. UTF-8 JSON message payload
//! 3. Diagnostic logging MUST be emitted to stderr only (never stdout)
//! 4. Clean exit on EOF (when Chrome closes stdin)

use std::io::{self, Read, Write};
use std::path::PathBuf;
use cinematic_studio_lib::chrome_service::{
    NativeMessagingIpc, IpcMessage, PairingService, VerifyPairingDto
};
use cinematic_studio_lib::database;

fn main() {
    eprintln!("[Cinematic Host] Starting Native Messaging host process...");

    // Determine database path
    let app_data = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let db_path = app_data.join("CinematicStudio").join("cinematic_studio.db");

    let pool = match database::init_db(&db_path) {
        Ok(p) => Some(p),
        Err(e) => {
            eprintln!("[Cinematic Host] Warning: Could not connect to database: {}. Running in relay mode.", e);
            None
        }
    };

    let mut stdin = io::stdin().lock();
    let mut stdout = io::stdout().lock();

    loop {
        match NativeMessagingIpc::read_packet(&mut stdin) {
            Ok(msg) => {
                eprintln!("[Cinematic Host] Received message: type='{}', id='{}'", msg.msg_type, msg.id);
                let response = handle_incoming_message(&msg, pool.as_ref());

                if let Some(resp) = response {
                    if let Err(e) = NativeMessagingIpc::write_packet(&mut stdout, &resp) {
                        eprintln!("[Cinematic Host] Error writing response packet: {}", e);
                        break;
                    }
                }
            }
            Err(e) => {
                // When Chrome disconnects, stdin is closed (EOF / broken pipe)
                eprintln!("[Cinematic Host] Input stream ended or closed: {}. Terminating host.", e);
                break;
            }
        }
    }

    eprintln!("[Cinematic Host] Host shutdown complete.");
}

fn handle_incoming_message(msg: &IpcMessage, pool: Option<&r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>>) -> Option<IpcMessage> {
    let now = chrono::Utc::now().timestamp_millis();

    match msg.msg_type.as_str() {
        "INITIATE_HANDSHAKE" => {
            let profile_id = msg.profile_id.clone().unwrap_or_default();
            eprintln!("[Cinematic Host] Handshake initiated for profile: {}", profile_id);

            if let Some(pool) = pool {
                if let Ok(mut conn) = pool.get() {
                    match PairingService::initiate_pairing(&mut conn, &profile_id) {
                        Ok(challenge) => {
                            return Some(IpcMessage {
                                id: uuid::Uuid::new_v4().to_string(),
                                msg_type: "CHALLENGE_ISSUED".to_string(),
                                profile_id: Some(profile_id),
                                payload: serde_json::json!({
                                    "session_id": challenge.session_id,
                                    "server_nonce": challenge.server_nonce,
                                    "expires_at": challenge.expires_at
                                }),
                                timestamp: now,
                            });
                        }
                        Err(e) => {
                            eprintln!("[Cinematic Host] Failed to generate pairing challenge: {}", e);
                        }
                    }
                }
            }

            None
        }

        "VERIFY_HANDSHAKE_RESPONSE" => {
            let profile_id = msg.profile_id.clone().unwrap_or_default();
            let session_id = msg.payload.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let client_nonce = msg.payload.get("client_nonce").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let client_sig = msg.payload.get("signature_hex").and_then(|v| v.as_str()).unwrap_or_default().to_string();

            eprintln!("[Cinematic Host] Verifying handshake response for session {}", session_id);

            if let Some(pool) = pool {
                if let Ok(mut conn) = pool.get() {
                    let verify_dto = VerifyPairingDto {
                        session_id,
                        profile_id: profile_id.clone(),
                        client_nonce,
                        client_signature_hex: client_sig,
                    };

                    match PairingService::verify_pairing(&mut conn, verify_dto) {
                        Ok(result) => {
                            eprintln!("[Cinematic Host] Handshake verified successfully for profile {}", profile_id);
                            return Some(IpcMessage {
                                id: uuid::Uuid::new_v4().to_string(),
                                msg_type: "HANDSHAKE_VERIFIED".to_string(),
                                profile_id: Some(profile_id),
                                payload: serde_json::json!({
                                    "success": true,
                                    "message": result.message
                                }),
                                timestamp: now,
                            });
                        }
                        Err(e) => {
                            eprintln!("[Cinematic Host] Handshake verification failed: {}", e);
                            return Some(IpcMessage {
                                id: uuid::Uuid::new_v4().to_string(),
                                msg_type: "HANDSHAKE_FAILED".to_string(),
                                profile_id: Some(profile_id),
                                payload: serde_json::json!({
                                    "success": false,
                                    "error": e
                                }),
                                timestamp: now,
                            });
                        }
                    }
                }
            }

            None
        }

        "TASK_PROGRESS" => {
            let task_id = msg.payload.get("task_id").and_then(|v| v.as_str()).unwrap_or_default();
            let pct = msg.payload.get("percentage").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let status_msg = msg.payload.get("status_message").and_then(|v| v.as_str()).unwrap_or_default();
            eprintln!("[Cinematic Host] Task '{}' progress: {:.1}% - {}", task_id, pct, status_msg);

            if let Some(pool) = pool {
                if let Ok(conn) = pool.get() {
                    let _ = conn.execute(
                        "UPDATE tasks SET progress_percentage = ?1 WHERE id = ?2",
                        rusqlite::params![pct, task_id],
                    );
                }
            }
            None
        }

        "TASK_COMPLETED" => {
            let task_id = msg.payload.get("task_id").and_then(|v| v.as_str()).unwrap_or_default();
            eprintln!("[Cinematic Host] Task '{}' completed successfully", task_id);

            if let Some(pool) = pool {
                if let Ok(conn) = pool.get() {
                    let result_str = serde_json::to_string(&msg.payload).unwrap_or_default();
                    let _ = conn.execute(
                        "UPDATE tasks SET state = 'COMPLETED', progress_percentage = 100.0, result_json = ?1, completed_at = ?2 WHERE id = ?3",
                        rusqlite::params![result_str, now, task_id],
                    );
                }
            }
            None
        }

        "TASK_FAILED" => {
            let task_id = msg.payload.get("task_id").and_then(|v| v.as_str()).unwrap_or_default();
            let err = msg.payload.get("error_message").and_then(|v| v.as_str()).unwrap_or("Unknown task error");
            eprintln!("[Cinematic Host] Task '{}' failed: {}", task_id, err);

            if let Some(pool) = pool {
                if let Ok(conn) = pool.get() {
                    let _ = conn.execute(
                        "UPDATE tasks SET state = 'FAILED', error_message = ?1 WHERE id = ?2",
                        rusqlite::params![err, task_id],
                    );
                }
            }
            None
        }

        "NEEDS_HUMAN_ACTION" => {
            let task_id = msg.payload.get("task_id").and_then(|v| v.as_str()).unwrap_or_default();
            let reason = msg.payload.get("action_reason").and_then(|v| v.as_str()).unwrap_or("CAPTCHA_OR_AUTH");
            eprintln!("[Cinematic Host] Task '{}' requires human action: {}", task_id, reason);

            if let Some(pool) = pool {
                if let Ok(conn) = pool.get() {
                    let _ = conn.execute(
                        "UPDATE tasks SET state = 'NEEDS_HUMAN_ACTION', error_message = ?1 WHERE id = ?2",
                        rusqlite::params![format!("Human action required: {}", reason), task_id],
                    );
                }
            }
            None
        }

        "PING" => {
            Some(IpcMessage {
                id: msg.id.clone(),
                msg_type: "PONG".to_string(),
                profile_id: msg.profile_id.clone(),
                payload: serde_json::json!({
                    "status": "HEALTHY",
                    "timestamp": now
                }),
                timestamp: now,
            })
        }

        other => {
            eprintln!("[Cinematic Host] Unhandled message type: {}", other);
            None
        }
    }
}


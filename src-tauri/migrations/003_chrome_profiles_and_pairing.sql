-- ----------------------------------------------------------------------------
-- CINEMATIC STUDIO DATABASE MIGRATION 003: CHROME PROFILES & EXTENSION PAIRING
-- ----------------------------------------------------------------------------
-- Forward-only migration adding Chrome profile registry and pairing material.
-- Preserves all data from migration 001 and 002.

CREATE TABLE IF NOT EXISTS chrome_profiles (
    id TEXT PRIMARY KEY NOT NULL,                                       -- Application-assigned UUID v4
    profile_dir_key TEXT NOT NULL UNIQUE,                               -- Chrome directory key: 'Default', 'Profile 1', etc.
    display_name TEXT NOT NULL,                                         -- Discovered or user-assigned label
    user_data_dir TEXT NOT NULL,                                        -- Path to Chrome User Data root
    assigned_purpose TEXT NOT NULL DEFAULT 'GENERAL',                   -- 'STORY_GENERATION', 'VIDEO_GENERATION', 'GENERAL'
    assigned_provider TEXT,                                             -- 'chatgpt', 'claude', 'gemini', 'veo', 'flow', etc.
    extension_installed INTEGER NOT NULL DEFAULT 0,                     -- 1 if extension detected in profile, 0 otherwise
    pairing_state TEXT NOT NULL DEFAULT 'UNPAIRED',                     -- 'UNPAIRED', 'PAIRING_PENDING', 'PAIRED', 'REVOKED'
    connection_state TEXT NOT NULL DEFAULT 'DISCONNECTED',              -- 'DISCOVERED', 'CHROME_RUNNING', 'EXTENSION_INSTALLED', 'EXTENSION_CONNECTED', 'PROVIDER_READY', 'DISCONNECTED', 'HIBERNATED', 'PAIRING_REQUIRED', 'SESSION_EXPIRED', 'ERROR'
    pairing_secret_hash TEXT,                                           -- SHA-256 hash of active pairing secret
    last_seen_at INTEGER,                                               -- Unix epoch millisecond timestamp
    last_error TEXT,                                                    -- Last diagnostic or communication error
    created_at INTEGER NOT NULL,                                        -- Unix epoch milliseconds
    updated_at INTEGER NOT NULL                                         -- Unix epoch milliseconds
);

CREATE INDEX IF NOT EXISTS idx_chrome_profiles_dir_key ON chrome_profiles(profile_dir_key);
CREATE INDEX IF NOT EXISTS idx_chrome_profiles_conn_state ON chrome_profiles(connection_state);
CREATE INDEX IF NOT EXISTS idx_chrome_profiles_provider ON chrome_profiles(assigned_provider);

CREATE TABLE IF NOT EXISTS chrome_pairing_sessions (
    id TEXT PRIMARY KEY NOT NULL,                                       -- Unique pairing session ID
    profile_id TEXT NOT NULL,                                           -- FK -> chrome_profiles.id
    pairing_secret TEXT NOT NULL,                                       -- 256-bit cryptographically secure secret
    server_nonce TEXT NOT NULL,                                         -- Fresh challenge nonce
    client_nonce TEXT,                                                  -- Nonce supplied by extension during handshake
    expires_at INTEGER NOT NULL,                                        -- Unix epoch milliseconds when pairing challenge expires
    is_used INTEGER NOT NULL DEFAULT 0,                                 -- 1 if already consumed/verified
    created_at INTEGER NOT NULL,
    FOREIGN KEY(profile_id) REFERENCES chrome_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pairing_sessions_profile ON chrome_pairing_sessions(profile_id);

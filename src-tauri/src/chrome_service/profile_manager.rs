use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ProfileLifecycleState {
    Discovered,
    ChromeRunning,
    ExtensionInstalled,
    ExtensionConnected,
    ProviderReady,
    Disconnected,
    Hibernated,
    PairingRequired,
    SessionExpired,
    Error,
}

impl ProfileLifecycleState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Discovered => "DISCOVERED",
            Self::ChromeRunning => "CHROME_RUNNING",
            Self::ExtensionInstalled => "EXTENSION_INSTALLED",
            Self::ExtensionConnected => "EXTENSION_CONNECTED",
            Self::ProviderReady => "PROVIDER_READY",
            Self::Disconnected => "DISCONNECTED",
            Self::Hibernated => "HIBERNATED",
            Self::PairingRequired => "PAIRING_REQUIRED",
            Self::SessionExpired => "SESSION_EXPIRED",
            Self::Error => "ERROR",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "DISCOVERED" => Self::Discovered,
            "CHROME_RUNNING" => Self::ChromeRunning,
            "EXTENSION_INSTALLED" => Self::ExtensionInstalled,
            "EXTENSION_CONNECTED" => Self::ExtensionConnected,
            "PROVIDER_READY" => Self::ProviderReady,
            "HIBERNATED" => Self::Hibernated,
            "PAIRING_REQUIRED" => Self::PairingRequired,
            "SESSION_EXPIRED" => Self::SessionExpired,
            "ERROR" => Self::Error,
            _ => Self::Disconnected,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegisteredProfile {
    pub id: String,
    pub profile_dir_key: String,
    pub display_name: String,
    pub user_data_dir: String,
    pub assigned_purpose: String,
    pub assigned_provider: Option<String>,
    pub extension_installed: bool,
    pub pairing_state: String,
    pub connection_state: String,
    pub last_seen_at: Option<i64>,
    pub last_error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct RegisterProfileDto {
    pub profile_dir_key: String,
    pub display_name: String,
    pub user_data_dir: Option<String>,
    pub assigned_purpose: Option<String>,
    pub assigned_provider: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileDto {
    pub id: String,
    pub display_name: Option<String>,
    pub assigned_purpose: Option<String>,
    pub assigned_provider: Option<String>,
}

pub struct ProfileManager;

impl ProfileManager {
    /// Lists all registered profiles from the persistent database
    pub fn list_registered(conn: &Connection) -> Result<Vec<RegisteredProfile>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, profile_dir_key, display_name, user_data_dir, assigned_purpose, \
                     assigned_provider, extension_installed, pairing_state, connection_state, \
                     last_seen_at, last_error, created_at, updated_at \
              FROM chrome_profiles \
              ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let ext_installed: i32 = row.get(6)?;
                Ok(RegisteredProfile {
                    id: row.get(0)?,
                    profile_dir_key: row.get(1)?,
                    display_name: row.get(2)?,
                    user_data_dir: row.get(3)?,
                    assigned_purpose: row.get(4)?,
                    assigned_provider: row.get(5)?,
                    extension_installed: ext_installed == 1,
                    pairing_state: row.get(7)?,
                    connection_state: row.get(8)?,
                    last_seen_at: row.get(9)?,
                    last_error: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| e.to_string())?);
        }
        Ok(list)
    }

    /// Registers a newly discovered or existing Chrome profile into the database
    pub fn register_profile(
        conn: &mut Connection,
        input: RegisterProfileDto,
    ) -> Result<RegisteredProfile, String> {
        let trimmed_key = input.profile_dir_key.trim();
        if trimmed_key.is_empty() {
            return Err("Profile directory key cannot be empty".to_string());
        }

        // Check for duplicate profile_dir_key
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM chrome_profiles WHERE profile_dir_key = ?1",
                [trimmed_key],
                |r| r.get(0),
            )
            .ok();

        if let Some(existing_id) = existing {
            return Err(format!(
                "Profile with directory key '{}' is already registered (ID: {})",
                trimmed_key, existing_id
            ));
        }

        let id = uuid::Uuid::new_v4().to_string();
        let display_name = if input.display_name.trim().is_empty() {
            trimmed_key.to_string()
        } else {
            input.display_name.trim().to_string()
        };

        let user_data = input.user_data_dir.unwrap_or_else(|| {
            super::discovery::ChromeDiscoveryService::default_user_data_path()
                .to_string_lossy()
                .to_string()
        });

        let purpose = input
            .assigned_purpose
            .unwrap_or_else(|| "GENERAL".to_string());
        let provider = input.assigned_provider;
        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO chrome_profiles (
                id, profile_dir_key, display_name, user_data_dir, assigned_purpose, 
                assigned_provider, extension_installed, pairing_state, connection_state, 
                created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'UNPAIRED', 'DISCONNECTED', ?7, ?7)",
            params![
                id,
                trimmed_key,
                display_name,
                user_data,
                purpose,
                provider,
                now
            ],
        )
        .map_err(|e| format!("Failed to register profile: {}", e))?;

        Ok(RegisteredProfile {
            id,
            profile_dir_key: trimmed_key.to_string(),
            display_name,
            user_data_dir: user_data,
            assigned_purpose: purpose,
            assigned_provider: provider,
            extension_installed: false,
            pairing_state: "UNPAIRED".to_string(),
            connection_state: "DISCONNECTED".to_string(),
            last_seen_at: None,
            last_error: None,
            created_at: now,
            updated_at: now,
        })
    }

    /// Updates mutable metadata for a registered profile
    pub fn update_profile(
        conn: &mut Connection,
        input: UpdateProfileDto,
    ) -> Result<RegisteredProfile, String> {
        let mut profile = conn
            .query_row(
                "SELECT id, profile_dir_key, display_name, user_data_dir, assigned_purpose, \
                     assigned_provider, extension_installed, pairing_state, connection_state, \
                     last_seen_at, last_error, created_at, updated_at \
              FROM chrome_profiles WHERE id = ?1",
                [&input.id],
                |r| {
                    let ext: i32 = r.get(6)?;
                    Ok(RegisteredProfile {
                        id: r.get(0)?,
                        profile_dir_key: r.get(1)?,
                        display_name: r.get(2)?,
                        user_data_dir: r.get(3)?,
                        assigned_purpose: r.get(4)?,
                        assigned_provider: r.get(5)?,
                        extension_installed: ext == 1,
                        pairing_state: r.get(7)?,
                        connection_state: r.get(8)?,
                        last_seen_at: r.get(9)?,
                        last_error: r.get(10)?,
                        created_at: r.get(11)?,
                        updated_at: r.get(12)?,
                    })
                },
            )
            .map_err(|_| format!("Profile with ID {} not found", input.id))?;

        let now = chrono::Utc::now().timestamp_millis();
        if let Some(d) = input.display_name {
            if !d.trim().is_empty() {
                profile.display_name = d.trim().to_string();
            }
        }
        if let Some(p) = input.assigned_purpose {
            profile.assigned_purpose = p;
        }
        if input.assigned_provider.is_some() {
            profile.assigned_provider = input.assigned_provider;
        }
        profile.updated_at = now;

        conn.execute(
            "UPDATE chrome_profiles 
             SET display_name = ?1, assigned_purpose = ?2, assigned_provider = ?3, updated_at = ?4 
             WHERE id = ?5",
            params![
                profile.display_name,
                profile.assigned_purpose,
                profile.assigned_provider,
                now,
                profile.id
            ],
        )
        .map_err(|e| format!("Failed to update profile: {}", e))?;

        Ok(profile)
    }

    /// Unregisters a profile from the database without deleting Chrome user data on disk
    pub fn unregister_profile(conn: &mut Connection, profile_id: &str) -> Result<(), String> {
        let count = conn
            .execute("DELETE FROM chrome_profiles WHERE id = ?1", [profile_id])
            .map_err(|e| format!("Failed to unregister profile: {}", e))?;

        if count == 0 {
            return Err(format!("Profile with ID {} not found", profile_id));
        }
        Ok(())
    }

    /// Launches a specific Chrome profile using chrome.exe --profile-directory=...
    pub fn launch_profile(user_data_dir: &str, profile_dir_key: &str) -> Result<(), String> {
        let chrome_bin = Self::find_chrome_executable().ok_or_else(|| {
            "Google Chrome executable (chrome.exe) not found on system".to_string()
        })?;

        let mut cmd = Command::new(chrome_bin);
        cmd.arg(format!("--profile-directory={}", profile_dir_key));
        if !user_data_dir.trim().is_empty() {
            cmd.arg(format!("--user-data-dir={}", user_data_dir));
        }

        // Detach process
        cmd.spawn()
            .map_err(|e| format!("Failed to launch Chrome process: {}", e))?;

        Ok(())
    }

    /// Finds Google Chrome executable on standard Windows installation paths
    pub fn find_chrome_executable() -> Option<PathBuf> {
        let candidate_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ];

        for p in candidate_paths {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }

        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            let p = PathBuf::from(local)
                .join("Google")
                .join("Chrome")
                .join("Application")
                .join("chrome.exe");
            if p.exists() {
                return Some(p);
            }
        }

        None
    }

    /// Checks if the extension appears to be installed in the profile's Extensions folder
    pub fn check_extension_installed(user_data_dir: &str, profile_dir_key: &str) -> bool {
        let ext_dir = Path::new(user_data_dir)
            .join(profile_dir_key)
            .join("Extensions");
        if ext_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(ext_dir) {
                return entries.count() > 0;
            }
        }
        false
    }
}

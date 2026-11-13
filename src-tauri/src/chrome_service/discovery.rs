use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredChromeProfile {
    pub profile_dir_key: String,              // e.g. "Default", "Profile 1"
    pub display_name: String,                 // User label or "Default / Person 1"
    pub google_account_label: Option<String>, // gaia_name or user_name if present
    pub avatar_icon: Option<String>,          // avatar identifier
    pub profile_dir_path: String,             // Absolute directory path
    pub user_data_dir: String,                // Path to Chrome User Data
    pub profile_exists: bool,                 // Verified on disk
    pub is_chrome_running: bool,              // Active chrome.exe process found
}

#[derive(Debug, Deserialize)]
struct LocalStateJson {
    profile: Option<ProfileSection>,
}

#[derive(Debug, Deserialize)]
struct ProfileSection {
    info_cache: Option<HashMap<String, ProfileInfoEntry>>,
}

#[derive(Debug, Deserialize)]
struct ProfileInfoEntry {
    name: Option<String>,
    gaia_name: Option<String>,
    user_name: Option<String>,
    avatar_icon: Option<String>,
}

pub struct ChromeDiscoveryService;

impl ChromeDiscoveryService {
    /// Resolves the default Chrome User Data directory on Windows
    pub fn default_user_data_path() -> PathBuf {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            PathBuf::from(local_app_data)
                .join("Google")
                .join("Chrome")
                .join("User Data")
        } else {
            PathBuf::from(r"C:\Users\Default\AppData\Local\Google\Chrome\User Data")
        }
    }

    /// Read-only discovery scanning Chrome Local State without touching cookies or credentials
    pub fn discover_profiles(
        custom_user_data_dir: Option<&Path>,
    ) -> Result<Vec<DiscoveredChromeProfile>, String> {
        let user_data = custom_user_data_dir
            .map(|p| p.to_path_buf())
            .unwrap_or_else(Self::default_user_data_path);

        let local_state_path = user_data.join("Local State");
        let mut discovered = Vec::new();

        // 1. Check active Chrome processes to determine which profiles are currently open
        let running_profiles = Self::detect_running_chrome_profiles();

        // 2. Read Local State if accessible
        if local_state_path.exists() {
            if let Ok(content) = fs::read_to_string(&local_state_path) {
                if let Ok(state) = serde_json::from_str::<LocalStateJson>(&content) {
                    if let Some(profile_sec) = state.profile {
                        if let Some(info_cache) = profile_sec.info_cache {
                            for (key, entry) in info_cache {
                                let profile_path = user_data.join(&key);
                                let exists = profile_path.exists();
                                let is_running = running_profiles.contains(&key);

                                let display_name = entry
                                    .name
                                    .filter(|s| !s.trim().is_empty())
                                    .unwrap_or_else(|| key.clone());

                                let account_label = entry
                                    .gaia_name
                                    .or(entry.user_name)
                                    .filter(|s| !s.trim().is_empty());

                                discovered.push(DiscoveredChromeProfile {
                                    profile_dir_key: key,
                                    display_name,
                                    google_account_label: account_label,
                                    avatar_icon: entry.avatar_icon,
                                    profile_dir_path: profile_path.to_string_lossy().to_string(),
                                    user_data_dir: user_data.to_string_lossy().to_string(),
                                    profile_exists: exists,
                                    is_chrome_running: is_running,
                                });
                            }
                        }
                    }
                }
            }
        }

        // 3. Fallback discovery: Inspect filesystem directly if Local State is missing or empty
        if discovered.is_empty() && user_data.exists() {
            if let Ok(entries) = fs::read_dir(&user_data) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            if name == "Default" || name.starts_with("Profile ") {
                                let is_running = running_profiles.iter().any(|p| p == name);
                                discovered.push(DiscoveredChromeProfile {
                                    profile_dir_key: name.to_string(),
                                    display_name: if name == "Default" {
                                        "Default Profile".to_string()
                                    } else {
                                        name.to_string()
                                    },
                                    google_account_label: None,
                                    avatar_icon: None,
                                    profile_dir_path: path.to_string_lossy().to_string(),
                                    user_data_dir: user_data.to_string_lossy().to_string(),
                                    profile_exists: true,
                                    is_chrome_running: is_running,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Sort: Default first, then Profile 1, Profile 2, etc.
        discovered.sort_by(|a, b| {
            if a.profile_dir_key == "Default" {
                std::cmp::Ordering::Less
            } else if b.profile_dir_key == "Default" {
                std::cmp::Ordering::Greater
            } else {
                a.profile_dir_key.cmp(&b.profile_dir_key)
            }
        });

        Ok(discovered)
    }

    /// Detects which profile directories are actively running by inspecting chrome.exe command lines
    fn detect_running_chrome_profiles() -> Vec<String> {
        let mut sys = System::new();
        sys.refresh_processes();

        let mut active_keys = Vec::new();
        let target_bin = "chrome.exe";

        for process in sys.processes().values() {
            let proc_name = process.name().to_string_lossy().to_lowercase();
            if proc_name.contains(target_bin) {
                for arg in process.cmd() {
                    let arg_str = arg.to_string_lossy();
                    if arg_str.starts_with("--profile-directory=") {
                        let key = arg_str
                            .trim_start_matches("--profile-directory=")
                            .trim_matches('"');
                        if !active_keys.iter().any(|k| k == key) {
                            active_keys.push(key.to_string());
                        }
                    }
                }
            }
        }

        active_keys
    }
}

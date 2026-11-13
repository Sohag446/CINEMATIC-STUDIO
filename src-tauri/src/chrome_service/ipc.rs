use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

pub const NATIVE_HOST_NAME: &str = "com.cinematic.studio";
pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024; // 1 MB limit to prevent memory bloat
pub const WINDOWS_NAMED_PIPE_NAME: &str = r"\\.\pipe\cinematic_studio_ipc";

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeHostManifest {
    pub name: String,
    pub description: String,
    pub path: String,
    #[serde(rename = "type")]
    pub host_type: String,
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IpcMessage {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub profile_id: Option<String>,
    pub payload: serde_json::Value,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReferenceAssetPayload {
    pub id: String,
    pub asset_type: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: u64,
    pub local_path: String,
    pub data_base64: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskExecutionPayload {
    pub task_id: String,
    pub provider_id: String,
    pub task_type: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub target_duration_seconds: Option<f64>,
    pub target_aspect_ratio: Option<String>,
    pub reference_assets: Option<Vec<ReferenceAssetPayload>>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskProgressPayload {
    pub task_id: String,
    pub percentage: f64,
    pub status_message: String,
    pub current_phase: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskResultPayload {
    pub task_id: String,
    pub success: bool,
    pub text_output: Option<String>,
    pub output_video_url: Option<String>,
    pub downloaded_file_path: Option<String>,
    pub error_message: Option<String>,
    pub requires_human_action: Option<bool>,
    pub human_action_reason: Option<String>,
    pub execution_duration_ms: u64,
}

pub struct NativeMessagingIpc;

impl NativeMessagingIpc {
    /// Generates and installs the Chrome Native Messaging host manifest JSON on Windows
    pub fn install_host_manifest(host_exe_path: Option<&Path>, extension_id: Option<&str>) -> Result<PathBuf, String> {
        let app_data = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(r"C:\Users\Default\AppData\Local"));

        let manifest_dir = app_data.join("CinematicStudio").join("NativeMessaging");
        fs::create_dir_all(&manifest_dir).map_err(|e| e.to_string())?;

        let manifest_path = manifest_dir.join(format!("{}.json", NATIVE_HOST_NAME));

        let exe_path_str = host_exe_path
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| {
                let bin_dir = app_data.join("CinematicStudio").join("bin");
                let bin_path = bin_dir.join("cinematic-studio-host.exe");
                if bin_path.exists() {
                    bin_path.to_string_lossy().to_string()
                } else {
                    manifest_dir.join("cinematic-studio-host.exe").to_string_lossy().to_string()
                }
            });

        let ext_origin = if let Some(id) = extension_id {
            format!("chrome-extension://{}/", id)
        } else {
            "chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/".to_string()
        };

        let manifest = NativeHostManifest {
            name: NATIVE_HOST_NAME.to_string(),
            description: "Cinematic Studio Native Messaging Host".to_string(),
            path: exe_path_str,
            host_type: "stdio".to_string(),
            allowed_origins: vec![ext_origin],
        };

        let json_content = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
        fs::write(&manifest_path, json_content).map_err(|e| e.to_string())?;

        // On Windows, register under HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("reg")
                .args([
                    "add",
                    &format!(r"HKCU\Software\Google\Chrome\NativeMessagingHosts\{}", NATIVE_HOST_NAME),
                    "/ve",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &manifest_path.to_string_lossy(),
                    "/f",
                ])
                .output();
        }

        Ok(manifest_path)
    }

    /// Decodes a 32-bit little-endian length-prefixed Native Messaging packet from a reader
    pub fn read_packet<R: Read>(reader: &mut R) -> Result<IpcMessage, String> {
        let mut len_buf = [0u8; 4];
        reader.read_exact(&mut len_buf).map_err(|e| format!("Failed to read packet length: {}", e))?;
        let len = u32::from_le_bytes(len_buf) as usize;

        if len == 0 {
            return Err("Received 0-byte packet".to_string());
        }
        if len > MAX_MESSAGE_SIZE {
            return Err(format!("Message size {} exceeds maximum bounded limit of {} bytes", len, MAX_MESSAGE_SIZE));
        }

        let mut data = vec![0u8; len];
        reader.read_exact(&mut data).map_err(|e| format!("Failed to read packet body: {}", e))?;

        serde_json::from_slice::<IpcMessage>(&data).map_err(|e| format!("Invalid JSON message payload: {}", e))
    }

    /// Encodes and writes a 32-bit little-endian length-prefixed Native Messaging packet
    pub fn write_packet<W: Write>(writer: &mut W, msg: &IpcMessage) -> Result<(), String> {
        let json = serde_json::to_vec(msg).map_err(|e| e.to_string())?;
        if json.len() > MAX_MESSAGE_SIZE {
            return Err(format!("Message size {} exceeds maximum allowed packet limit", json.len()));
        }

        let len = (json.len() as u32).to_le_bytes();
        writer.write_all(&len).map_err(|e| e.to_string())?;
        writer.write_all(&json).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
}

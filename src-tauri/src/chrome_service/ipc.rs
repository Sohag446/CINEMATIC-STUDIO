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
                manifest_dir.join("cinematic-studio-host.exe").to_string_lossy().to_string()
            });

        let ext_origin = if let Some(id) = extension_id {
            format!("chrome-extension://{}/", id)
        } else {
            "chrome-extension://*/".to_string()
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

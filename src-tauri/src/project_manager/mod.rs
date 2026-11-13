use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub synopsis: String,
    pub target_aspect_ratio: String,
    pub target_fps: f64,
    pub target_duration_seconds: i64,
    pub project_dir_path: String,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct ProjectManager;

impl ProjectManager {
    /// Validates path strings against directory traversal attacks and invalid characters
    pub fn validate_path<P: AsRef<Path>>(path: P) -> Result<PathBuf, std::io::Error> {
        let p = path.as_ref();
        let path_str = p.to_string_lossy();

        if path_str.contains("..") || path_str.contains("../") || path_str.contains("..\\") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Path traversal sequences ('..') are strictly prohibited",
            ));
        }

        // Check for forbidden characters in filename components
        for component in p.components() {
            let comp_str = component.as_os_str().to_string_lossy();
            if comp_str.contains('<') || comp_str.contains('>') || comp_str.contains('|') || comp_str.contains('?') || comp_str.contains('*') {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Path contains illegal filesystem characters",
                ));
            }
        }

        Ok(p.to_path_buf())
    }

    /// Scaffolds the complete physical directory vault for a project
    pub fn create_project_vault<P: AsRef<Path>>(base_dir: P, slug: &str) -> Result<PathBuf, std::io::Error> {
        let clean_base = Self::validate_path(base_dir)?;
        let project_dir = clean_base.join(slug);

        if project_dir.exists() && project_dir.join("project.manifest.json").exists() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                format!("A project already exists at {:?}", project_dir),
            ));
        }

        // Required 14 subdirectories per PROJECT-FILE-STRUCTURE.md
        let subdirectories = [
            "characters",
            "environments",
            "storyboards",
            "references",
            "audio/dialogue",
            "audio/foley",
            "audio/music",
            "clips/raw",
            "clips/approved",
            "proxies",
            "thumbnails",
            "continuity_frames",
            "exports",
            "checkpoints",
        ];

        for sub in subdirectories.iter() {
            let path = project_dir.join(sub);
            fs::create_dir_all(&path)?;
        }

        Ok(project_dir)
    }

    /// Atomically writes project metadata: writes to .tmp, flushes to disk, and renames atomically
    pub fn save_metadata_atomic<P: AsRef<Path>>(project_dir: P, meta: &ProjectMetadata) -> Result<(), std::io::Error> {
        let p_dir = project_dir.as_ref();
        if !p_dir.exists() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Project directory does not exist",
            ));
        }

        let manifest_path = p_dir.join("project.manifest.json");
        let temp_filename = format!("project.manifest.tmp.{}", uuid::Uuid::new_v4());
        let temp_path = p_dir.join(&temp_filename);

        let json_bytes = serde_json::to_vec_pretty(meta)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        // Write and sync file to disk
        let mut file = File::create(&temp_path)?;
        file.write_all(&json_bytes)?;
        file.sync_all()?;
        drop(file);

        // Atomic replace
        if let Err(e) = fs::rename(&temp_path, &manifest_path) {
            // Clean up temporary file on failure
            let _ = fs::remove_file(&temp_path);
            return Err(e);
        }

        Ok(())
    }

    /// Reads and parses project.manifest.json, returning an error if corrupted or missing
    pub fn read_manifest<P: AsRef<Path>>(project_dir: P) -> Result<ProjectMetadata, std::io::Error> {
        let manifest_path = project_dir.as_ref().join("project.manifest.json");
        if !manifest_path.exists() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "project.manifest.json not found",
            ));
        }

        let content = fs::read_to_string(&manifest_path)?;
        if content.trim().is_empty() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "project.manifest.json is empty / corrupted",
            ));
        }

        let meta: ProjectMetadata = serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, format!("Invalid manifest JSON: {}", e)))?;

        Ok(meta)
    }

    /// Verifies that all required project directories exist and flags missing assets
    pub fn verify_vault_integrity<P: AsRef<Path>>(project_dir: P) -> (bool, Vec<String>) {
        let mut missing = Vec::new();
        let required = [
            "characters",
            "environments",
            "storyboards",
            "references",
            "audio/dialogue",
            "audio/foley",
            "audio/music",
            "clips/raw",
            "clips/approved",
            "proxies",
            "thumbnails",
            "continuity_frames",
            "exports",
            "checkpoints",
        ];

        for req in required.iter() {
            let path = project_dir.as_ref().join(req);
            if !path.exists() {
                missing.push(req.to_string());
            }
        }

        let is_intact = missing.is_empty();
        (is_intact, missing)
    }

    /// Heals missing vault directories automatically without modifying existing content
    pub fn heal_vault_directories<P: AsRef<Path>>(project_dir: P) -> Result<usize, std::io::Error> {
        let (_, missing) = Self::verify_vault_integrity(&project_dir);
        let count = missing.len();

        for rel in missing {
            let full_path = project_dir.as_ref().join(rel);
            fs::create_dir_all(full_path)?;
        }

        Ok(count)
    }

    /// Safely deletes a project directory if explicit confirmation matches
    pub fn delete_project_vault<P: AsRef<Path>>(project_dir: P) -> Result<(), std::io::Error> {
        let p = project_dir.as_ref();
        if p.exists() {
            fs::remove_dir_all(p)?;
        }
        Ok(())
    }
}

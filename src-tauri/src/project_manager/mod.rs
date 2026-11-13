use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    /// Scaffolds the complete physical directory vault for a project
    pub fn create_project_vault<P: AsRef<Path>>(base_dir: P, slug: &str) -> Result<PathBuf, std::io::Error> {
        let project_dir = base_dir.as_ref().join(slug);

        // Required subdirectories per PROJECT-FILE-STRUCTURE.md
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

    /// Atomically writes project metadata to project.manifest.json using temp rename pattern
    pub fn save_metadata_atomic<P: AsRef<Path>>(project_dir: P, meta: &ProjectMetadata) -> Result<(), std::io::Error> {
        let manifest_path = project_dir.as_ref().join("project.manifest.json");
        let temp_path = project_dir.as_ref().join(format!("project.manifest.tmp.{}", uuid::Uuid::new_v4()));

        let json_bytes = serde_json::to_vec_pretty(meta)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        fs::write(&temp_path, json_bytes)?;
        fs::rename(temp_path, manifest_path)?;

        Ok(())
    }

    /// Verifies that all required project directories exist and flags missing assets
    pub fn verify_vault_integrity<P: AsRef<Path>>(project_dir: P) -> (bool, Vec<String>) {
        let mut missing = Vec::new();
        let required = [
            "clips/raw",
            "clips/approved",
            "proxies",
            "thumbnails",
            "continuity_frames",
            "exports",
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
}

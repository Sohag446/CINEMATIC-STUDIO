use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

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
    pub storage_root: String,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum VaultDeletionOutcome {
    Deleted,
    AlreadyMissing,
}

pub struct ProjectManager;

impl ProjectManager {
    /// Returns default authorized projects directory in AppData / LocalAppData
    pub fn default_authorized_root() -> PathBuf {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            PathBuf::from(local_app_data)
                .join("CinematicStudio")
                .join("Projects")
        } else if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            PathBuf::from(user_profile)
                .join("CinematicStudio")
                .join("Projects")
        } else {
            PathBuf::from("./projects")
        }
    }

    /// Strips Windows extended-length prefix (\\?\) for cross-platform comparison
    pub fn strip_unc_prefix(path: &Path) -> PathBuf {
        let s = path.to_string_lossy();
        if s.starts_with(r"\\?\") {
            PathBuf::from(&s[4..])
        } else {
            path.to_path_buf()
        }
    }

    /// Checks if a path represents a root of a volume or filesystem (e.g. C:\ or /)
    pub fn is_filesystem_root(path: &Path) -> bool {
        let clean = Self::strip_unc_prefix(path);
        let components: Vec<_> = clean.components().collect();
        if components.is_empty() {
            return true;
        }
        if components.len() == 1 {
            match components[0] {
                std::path::Component::RootDir | std::path::Component::Prefix(_) => return true,
                _ => {}
            }
        }
        if components.len() == 2 {
            if matches!(components[0], std::path::Component::Prefix(_))
                && matches!(components[1], std::path::Component::RootDir)
            {
                return true;
            }
        }
        false
    }

    /// Validates path strings against directory traversal attacks and invalid characters
    pub fn validate_path<P: AsRef<Path>>(path: P) -> Result<PathBuf, std::io::Error> {
        let p = path.as_ref();
        let path_str = p.to_string_lossy();

        if path_str.trim().is_empty() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Path cannot be empty",
            ));
        }

        if path_str.contains("..") || path_str.contains("../") || path_str.contains("..\\") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Path traversal sequences ('..') are strictly prohibited",
            ));
        }

        // Check for forbidden characters in filename components
        for component in p.components() {
            let comp_str = component.as_os_str().to_string_lossy();
            if comp_str.contains('<')
                || comp_str.contains('>')
                || comp_str.contains('|')
                || comp_str.contains('?')
                || comp_str.contains('*')
            {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Path contains illegal filesystem characters",
                ));
            }
        }

        Ok(p.to_path_buf())
    }

    /// Validates that a storage root directory is safe, non-root, and accessible
    pub fn validate_storage_root<P: AsRef<Path>>(root: P) -> Result<PathBuf, std::io::Error> {
        let validated = Self::validate_path(root)?;

        if Self::is_filesystem_root(&validated) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Filesystem root cannot be used as project storage root",
            ));
        }

        let s = validated.to_string_lossy().to_lowercase();
        if s.contains(r"windows\system32") || s.contains(r"windows/system32") || s == "c:\\windows"
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "System directories are strictly prohibited as storage roots",
            ));
        }

        Ok(validated)
    }

    /// Resolves the trusted authorized storage root for a project.
    /// If storage_root is non-empty, validates it.
    /// If storage_root is empty (legacy project), validates that project_dir_path is inside default_authorized_root.
    pub fn resolve_trusted_storage_root<P: AsRef<Path>>(
        project_dir_path: P,
        storage_root: &str,
    ) -> Result<PathBuf, std::io::Error> {
        let p_dir = project_dir_path.as_ref();
        if !storage_root.trim().is_empty() {
            let root_path = PathBuf::from(storage_root);
            Self::validate_storage_root(&root_path)
        } else {
            // Legacy record fallback: only allow if project_dir_path is actually inside default_authorized_root
            let default_root = Self::default_authorized_root();
            fs::create_dir_all(&default_root)?;
            let (canon_target, canon_root) = Self::verify_containment(p_dir, &default_root)?;
            if canon_target.starts_with(&canon_root) {
                return Ok(default_root);
            }
            Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Legacy project has unverified storage root and does not reside within default storage root",
            ))
        }
    }

    /// Verifies that target_dir is strictly contained within authorized_root and not the root itself
    pub fn verify_containment<P: AsRef<Path>, R: AsRef<Path>>(
        target_dir: P,
        authorized_root: R,
    ) -> Result<(PathBuf, PathBuf), std::io::Error> {
        let target = target_dir.as_ref();
        let root = authorized_root.as_ref();

        let clean_root = Self::validate_storage_root(root)?;
        if !clean_root.exists() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Authorized storage root does not exist: {:?}", clean_root),
            ));
        }
        let canonical_root = Self::strip_unc_prefix(&fs::canonicalize(&clean_root)?);

        let clean_target = Self::validate_path(target)?;
        let canonical_target = if clean_target.exists() {
            Self::strip_unc_prefix(&fs::canonicalize(&clean_target)?)
        } else {
            // If target does not exist yet, canonicalize parent and join filename
            if let Some(parent) = clean_target.parent() {
                if parent.exists() {
                    let canon_parent = Self::strip_unc_prefix(&fs::canonicalize(parent)?);
                    canon_parent.join(clean_target.file_name().unwrap_or_default())
                } else {
                    clean_target.clone()
                }
            } else {
                clean_target.clone()
            }
        };

        if Self::is_filesystem_root(&canonical_target) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Target path cannot be a filesystem root",
            ));
        }

        let target_str = canonical_target.to_string_lossy().to_lowercase();
        let root_str = canonical_root.to_string_lossy().to_lowercase();

        if target_str == root_str {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Target path cannot be identical to authorized root directory",
            ));
        }

        if !canonical_target.starts_with(&canonical_root) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                format!(
                    "Target path {:?} escapes authorized root {:?}",
                    canonical_target, canonical_root
                ),
            ));
        }

        Ok((canonical_target, canonical_root))
    }

    /// Scaffolds the complete physical directory vault for a project. Returns (project_dir, canonical_storage_root).
    pub fn create_project_vault<P: AsRef<Path>>(
        base_dir: P,
        slug: &str,
    ) -> Result<(PathBuf, PathBuf), std::io::Error> {
        let clean_slug = slug.trim();
        if clean_slug.is_empty() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Project slug cannot be empty",
            ));
        }

        if clean_slug.contains('/') || clean_slug.contains('\\') || clean_slug.contains("..") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Project slug cannot contain path separator or traversal characters",
            ));
        }

        if !clean_slug
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Project slug must only contain alphanumeric characters and hyphens",
            ));
        }

        let clean_base = Self::validate_storage_root(base_dir)?;
        fs::create_dir_all(&clean_base)?;
        let canonical_base = Self::strip_unc_prefix(&fs::canonicalize(&clean_base)?);
        let project_dir = canonical_base.join(clean_slug);

        if project_dir.exists()
            && (project_dir.join("project.manifest.json").exists()
                || fs::read_dir(&project_dir)?.next().is_some())
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                format!("A project directory already exists at {:?}", project_dir),
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

        Ok((project_dir, canonical_base))
    }

    /// Atomically writes project metadata: writes to .tmp, flushes to disk, and renames atomically
    pub fn save_metadata_atomic<P: AsRef<Path>>(
        project_dir: P,
        meta: &ProjectMetadata,
    ) -> Result<(), std::io::Error> {
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
            let _ = fs::remove_file(&temp_path);
            return Err(e);
        }

        Ok(())
    }

    /// Reads and parses project.manifest.json, returning an error if corrupted or missing
    pub fn read_manifest<P: AsRef<Path>>(
        project_dir: P,
    ) -> Result<ProjectMetadata, std::io::Error> {
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

        let meta: ProjectMetadata = serde_json::from_str(&content).map_err(|e| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Invalid manifest JSON: {}", e),
            )
        })?;

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

    /// Safely deletes a project vault folder within an authorized root directory.
    /// Handles symlinks, dangling symlinks, and verified missing directories.
    pub fn safe_delete_vault<P: AsRef<Path>, R: AsRef<Path>>(
        project_dir: P,
        authorized_root: R,
    ) -> Result<VaultDeletionOutcome, std::io::Error> {
        let raw_target = project_dir.as_ref();
        let raw_root = authorized_root.as_ref();

        // 1. Inspect symlink status using symlink_metadata to catch dangling symlinks
        match fs::symlink_metadata(raw_target) {
            Ok(meta) => {
                if meta.file_type().is_symlink() {
                    // It is a symlink (dangling or pointing to target).
                    // Strictly remove ONLY the symlink itself; never recursively remove the target!
                    if raw_target.is_dir() {
                        let _ = fs::remove_dir(raw_target);
                    } else {
                        let _ = fs::remove_file(raw_target);
                    }
                    return Ok(VaultDeletionOutcome::Deleted);
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Directory is truly missing on disk.
                // Verify that the registered target was legitimately within the authorized root
                if let Ok((canon_target, canon_root)) =
                    Self::verify_containment(raw_target, raw_root)
                {
                    if canon_target.starts_with(&canon_root) {
                        return Ok(VaultDeletionOutcome::AlreadyMissing);
                    }
                }
                return Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "Missing project directory was registered outside authorized storage root",
                ));
            }
            Err(e) => return Err(e),
        }

        // 2. Target exists as a normal directory. Verify containment strictly within authorized root.
        let (canonical_target, _) = Self::verify_containment(raw_target, raw_root)?;

        // 3. Verify project.manifest.json exists inside to prevent deleting arbitrary directories
        let manifest_path = canonical_target.join("project.manifest.json");
        if !manifest_path.exists() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Directory does not contain project.manifest.json; deletion aborted for safety",
            ));
        }

        // 4. Perform recursive removal
        fs::remove_dir_all(&canonical_target)?;

        Ok(VaultDeletionOutcome::Deleted)
    }
}

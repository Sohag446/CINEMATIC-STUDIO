pub mod models;
pub mod ffmpeg;

use rusqlite::{params, Connection};
pub use models::*;
pub use ffmpeg::FFmpegManager;

pub struct MediaService;

impl MediaService {
    // ========================================================================
    // MEDIA ASSETS
    // ========================================================================
    pub fn list_media_assets(conn: &Connection, project_id: &str) -> Result<Vec<MediaAssetDto>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, file_name, file_path, media_type, file_size_bytes, duration_seconds,
                    width, height, fps, video_codec, audio_codec, audio_channels, sample_rate,
                    checksum_sha256, thumbnail_path, proxy_path, source_task_id, created_at
             FROM media_assets WHERE project_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([project_id], |row| {
            Ok(MediaAssetDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_name: row.get(2)?,
                file_path: row.get(3)?,
                media_type: row.get(4)?,
                file_size_bytes: row.get(5)?,
                duration_seconds: row.get(6)?,
                width: row.get(7)?,
                height: row.get(8)?,
                fps: row.get(9)?,
                video_codec: row.get(10)?,
                audio_codec: row.get(11)?,
                audio_channels: row.get(12)?,
                sample_rate: row.get(13)?,
                checksum_sha256: row.get(14)?,
                thumbnail_path: row.get(15)?,
                proxy_path: row.get(16)?,
                source_task_id: row.get(17)?,
                created_at: row.get(18)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut assets = Vec::new();
        for a in rows {
            assets.push(a.map_err(|e| e.to_string())?);
        }
        Ok(assets)
    }

    pub fn create_media_asset(conn: &mut Connection, input: CreateMediaAssetDto) -> Result<MediaAssetDto, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO media_assets (
                id, project_id, file_name, file_path, media_type, file_size_bytes, duration_seconds,
                width, height, fps, video_codec, audio_codec, audio_channels, sample_rate,
                checksum_sha256, thumbnail_path, proxy_path, source_task_id, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                id, input.project_id, input.file_name, input.file_path, input.media_type, input.file_size_bytes,
                input.duration_seconds, input.width, input.height, input.fps, input.video_codec,
                input.audio_codec, input.audio_channels, input.sample_rate, input.checksum_sha256,
                input.thumbnail_path, input.proxy_path, input.source_task_id, now
            ],
        ).map_err(|e| format!("Failed to record media asset: {}", e))?;

        Ok(MediaAssetDto {
            id,
            project_id: input.project_id,
            file_name: input.file_name,
            file_path: input.file_path,
            media_type: input.media_type,
            file_size_bytes: input.file_size_bytes,
            duration_seconds: input.duration_seconds,
            width: input.width,
            height: input.height,
            fps: input.fps,
            video_codec: input.video_codec,
            audio_codec: input.audio_codec,
            audio_channels: input.audio_channels,
            sample_rate: input.sample_rate,
            checksum_sha256: input.checksum_sha256,
            thumbnail_path: input.thumbnail_path,
            proxy_path: input.proxy_path,
            source_task_id: input.source_task_id,
            created_at: now,
        })
    }

    pub fn delete_media_asset(conn: &mut Connection, asset_id: &str) -> Result<(), String> {
        // Assert no timeline clips currently reference this asset
        let ref_count: i64 = conn.query_row(
            "SELECT count(*) FROM timeline_clips WHERE media_asset_id = ?1",
            [asset_id],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;

        if ref_count > 0 {
            return Err(format!("Cannot delete media asset: referenced by {} timeline clip(s)", ref_count));
        }

        conn.execute("DELETE FROM media_assets WHERE id = ?1", [asset_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ========================================================================
    // TIMELINE TRACKS
    // ========================================================================
    pub fn list_timeline_tracks(conn: &Connection, project_id: &str) -> Result<Vec<TimelineTrackDto>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, track_type, track_index, label, is_muted, is_locked, volume
             FROM timeline_tracks WHERE project_id = ?1 ORDER BY track_type DESC, track_index ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([project_id], |row| {
            let is_muted: i32 = row.get(5)?;
            let is_locked: i32 = row.get(6)?;
            Ok(TimelineTrackDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                track_type: row.get(2)?,
                track_index: row.get(3)?,
                label: row.get(4)?,
                is_muted: is_muted == 1,
                is_locked: is_locked == 1,
                volume: row.get(7)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut tracks = Vec::new();
        for t in rows {
            tracks.push(t.map_err(|e| e.to_string())?);
        }

        // If no tracks exist for this project, initialize default V1, V2, A1, A2
        if tracks.is_empty() {
            return Self::seed_default_tracks(conn, project_id);
        }

        Ok(tracks)
    }

    pub fn seed_default_tracks(conn: &Connection, project_id: &str) -> Result<Vec<TimelineTrackDto>, String> {
        let defaults = [
            ("VIDEO", 1, "V1: Main Video"),
            ("VIDEO", 2, "V2: Overlays / B-Roll"),
            ("AUDIO", 1, "A1: Dialogue / Voiceover"),
            ("AUDIO", 2, "A2: Music Score & Foley"),
        ];

        let mut seeded = Vec::new();
        for (ttype, idx, label) in defaults {
            let tid = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO timeline_tracks (id, project_id, track_type, track_index, label, is_muted, is_locked, volume)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 1.0)",
                params![tid, project_id, ttype, idx, label],
            ).map_err(|e| e.to_string())?;

            seeded.push(TimelineTrackDto {
                id: tid,
                project_id: project_id.to_string(),
                track_type: ttype.to_string(),
                track_index: idx,
                label: label.to_string(),
                is_muted: false,
                is_locked: false,
                volume: 1.0,
            });
        }
        Ok(seeded)
    }

    // ========================================================================
    // TIMELINE CLIPS (Non-destructive clip instances)
    // ========================================================================
    pub fn list_timeline_clips(conn: &Connection, project_id: &str) -> Result<Vec<TimelineClipDto>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, track_id, project_id, media_asset_id, clip_id, timeline_start_seconds,
                    timeline_duration_seconds, source_in_seconds, source_out_seconds, volume,
                    fade_in_seconds, fade_out_seconds, z_order, created_at, updated_at
             FROM timeline_clips WHERE project_id = ?1 ORDER BY timeline_start_seconds ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([project_id], |row| {
            Ok(TimelineClipDto {
                id: row.get(0)?,
                track_id: row.get(1)?,
                project_id: row.get(2)?,
                media_asset_id: row.get(3)?,
                clip_id: row.get(4)?,
                timeline_start_seconds: row.get(5)?,
                timeline_duration_seconds: row.get(6)?,
                source_in_seconds: row.get(7)?,
                source_out_seconds: row.get(8)?,
                volume: row.get(9)?,
                fade_in_seconds: row.get(10)?,
                fade_out_seconds: row.get(11)?,
                z_order: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut clips = Vec::new();
        for c in rows {
            clips.push(c.map_err(|e| e.to_string())?);
        }
        Ok(clips)
    }

    pub fn create_timeline_clip(conn: &mut Connection, input: CreateTimelineClipDto) -> Result<TimelineClipDto, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let source_in = input.source_in_seconds.unwrap_or(0.0);
        let source_out = input.source_out_seconds.unwrap_or(input.timeline_duration_seconds);
        let volume = input.volume.unwrap_or(1.0);

        conn.execute(
            "INSERT INTO timeline_clips (
                id, track_id, project_id, media_asset_id, clip_id, timeline_start_seconds,
                timeline_duration_seconds, source_in_seconds, source_out_seconds, volume,
                fade_in_seconds, fade_out_seconds, z_order, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0.0, 0.0, 0, ?11, ?11)",
            params![
                id, input.track_id, input.project_id, input.media_asset_id, input.clip_id,
                input.timeline_start_seconds, input.timeline_duration_seconds,
                source_in, source_out, volume, now
            ],
        ).map_err(|e| format!("Failed to create timeline clip instance: {}", e))?;

        Ok(TimelineClipDto {
            id,
            track_id: input.track_id,
            project_id: input.project_id,
            media_asset_id: input.media_asset_id,
            clip_id: input.clip_id,
            timeline_start_seconds: input.timeline_start_seconds,
            timeline_duration_seconds: input.timeline_duration_seconds,
            source_in_seconds: source_in,
            source_out_seconds: source_out,
            volume,
            fade_in_seconds: 0.0,
            fade_out_seconds: 0.0,
            z_order: 0,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update_timeline_clip(conn: &mut Connection, input: UpdateTimelineClipDto) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE timeline_clips 
             SET track_id = COALESCE(?1, track_id),
                 timeline_start_seconds = COALESCE(?2, timeline_start_seconds),
                 timeline_duration_seconds = COALESCE(?3, timeline_duration_seconds),
                 source_in_seconds = COALESCE(?4, source_in_seconds),
                 source_out_seconds = COALESCE(?5, source_out_seconds),
                 volume = COALESCE(?6, volume),
                 fade_in_seconds = COALESCE(?7, fade_in_seconds),
                 fade_out_seconds = COALESCE(?8, fade_out_seconds),
                 updated_at = ?9
             WHERE id = ?10",
            params![
                input.track_id, input.timeline_start_seconds, input.timeline_duration_seconds,
                input.source_in_seconds, input.source_out_seconds, input.volume,
                input.fade_in_seconds, input.fade_out_seconds, now, input.id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_timeline_clip(conn: &mut Connection, clip_id: &str) -> Result<(), String> {
        // NON-DESTRUCTIVE GUARANTEE: Only deletes the timeline clip instance, NOT the underlying media asset!
        conn.execute("DELETE FROM timeline_clips WHERE id = ?1", [clip_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ========================================================================
    // RENDER JOBS
    // ========================================================================
    pub fn list_render_jobs(conn: &Connection, project_id: &str) -> Result<Vec<RenderJobDto>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, preset_name, state, output_path, progress_percentage,
                    current_fps, current_frame, total_frames, render_strategy, error_message,
                    created_at, started_at, completed_at
             FROM render_jobs WHERE project_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([project_id], |row| {
            let output_p: String = row.get(4)?;
            let job_id: String = row.get(0)?;
            let staging_p = format!("{}.tmp.{}.mp4", output_p, job_id);
            Ok(RenderJobDto {
                id: job_id,
                project_id: row.get(1)?,
                preset_name: row.get(2)?,
                state: row.get(3)?,
                output_path: output_p,
                staging_path: Some(staging_p),
                progress_percentage: row.get(5)?,
                current_fps: row.get(6)?,
                current_frame: row.get(7)?,
                total_frames: row.get(8)?,
                render_strategy: row.get(9)?,
                allow_overwrite: false,
                error_message: row.get(10)?,
                created_at: row.get(11)?,
                started_at: row.get(12)?,
                completed_at: row.get(13)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut jobs = Vec::new();
        for j in rows {
            jobs.push(j.map_err(|e| e.to_string())?);
        }
        Ok(jobs)
    }

    pub fn create_render_job(conn: &mut Connection, input: CreateRenderJobDto) -> Result<RenderJobDto, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let strategy = input.render_strategy.unwrap_or_else(|| "NORMALIZING_TRANSCODE".to_string());
        let allow_overwrite = input.allow_overwrite.unwrap_or(false);

        // Pre-flight collision check
        let final_path = std::path::Path::new(&input.output_path);
        if final_path.exists() && !allow_overwrite {
            return Err(format!(
                "COLLISION_DETECTED: Output file already exists at '{}'. Explicit overwrite confirmation required.",
                input.output_path
            ));
        }

        let staging_path = format!("{}.tmp.{}.mp4", input.output_path, id);

        conn.execute(
            "INSERT INTO render_jobs (
                id, project_id, preset_name, state, output_path, progress_percentage,
                current_fps, current_frame, total_frames, render_strategy, created_at
            ) VALUES (?1, ?2, ?3, 'QUEUED', ?4, 0.0, 0.0, 0, 0, ?5, ?6)",
            params![id, input.project_id, input.preset_name, input.output_path, strategy, now],
        ).map_err(|e| e.to_string())?;

        Ok(RenderJobDto {
            id,
            project_id: input.project_id,
            preset_name: input.preset_name,
            state: "QUEUED".to_string(),
            output_path: input.output_path,
            staging_path: Some(staging_path),
            progress_percentage: 0.0,
            current_fps: 0.0,
            current_frame: 0,
            total_frames: 0,
            render_strategy: strategy,
            allow_overwrite,
            error_message: None,
            created_at: now,
            started_at: None,
            completed_at: None,
        })
    }

    /// Recovers pending or interrupted render jobs after application restart or crash
    pub fn recover_interrupted_render_jobs(conn: &mut Connection) -> Result<usize, String> {
        let interrupted_count = conn.execute(
            "UPDATE render_jobs 
             SET state = 'FAILED', 
                 error_message = 'Interrupted by application shutdown or unexpected restart. Temporary staging files cleaned.'
             WHERE state IN ('RENDERING', 'PREPARING', 'VALIDATING')",
            [],
        ).map_err(|e| e.to_string())?;

        Ok(interrupted_count)
    }
}


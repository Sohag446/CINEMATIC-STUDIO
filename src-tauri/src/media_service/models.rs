use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaAssetDto {
    pub id: String,
    pub project_id: String,
    pub file_name: String,
    pub file_path: String,
    pub media_type: String, // 'VIDEO', 'AUDIO', 'IMAGE'
    pub file_size_bytes: i64,
    pub duration_seconds: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub fps: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_channels: Option<i32>,
    pub sample_rate: Option<i32>,
    pub checksum_sha256: Option<String>,
    pub thumbnail_path: Option<String>,
    pub proxy_path: Option<String>,
    pub source_task_id: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateMediaAssetDto {
    pub project_id: String,
    pub file_name: String,
    pub file_path: String,
    pub media_type: String,
    pub file_size_bytes: i64,
    pub duration_seconds: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub fps: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_channels: Option<i32>,
    pub sample_rate: Option<i32>,
    pub checksum_sha256: Option<String>,
    pub thumbnail_path: Option<String>,
    pub proxy_path: Option<String>,
    pub source_task_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineTrackDto {
    pub id: String,
    pub project_id: String,
    pub track_type: String, // 'VIDEO', 'AUDIO', 'OVERLAY'
    pub track_index: i32,
    pub label: String,
    pub is_muted: bool,
    pub is_locked: bool,
    pub volume: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimelineTrackDto {
    pub project_id: String,
    pub track_type: String,
    pub track_index: i32,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimelineClipDto {
    pub id: String,
    pub track_id: String,
    pub project_id: String,
    pub media_asset_id: String,
    pub clip_id: Option<String>,
    pub timeline_start_seconds: f64,
    pub timeline_duration_seconds: f64,
    pub source_in_seconds: f64,
    pub source_out_seconds: f64,
    pub volume: f64,
    pub fade_in_seconds: f64,
    pub fade_out_seconds: f64,
    pub z_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimelineClipDto {
    pub track_id: String,
    pub project_id: String,
    pub media_asset_id: String,
    pub clip_id: Option<String>,
    pub timeline_start_seconds: f64,
    pub timeline_duration_seconds: f64,
    pub source_in_seconds: Option<f64>,
    pub source_out_seconds: Option<f64>,
    pub volume: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimelineClipDto {
    pub id: String,
    pub track_id: Option<String>,
    pub timeline_start_seconds: Option<f64>,
    pub timeline_duration_seconds: Option<f64>,
    pub source_in_seconds: Option<f64>,
    pub source_out_seconds: Option<f64>,
    pub volume: Option<f64>,
    pub fade_in_seconds: Option<f64>,
    pub fade_out_seconds: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderJobDto {
    pub id: String,
    pub project_id: String,
    pub preset_name: String,
    pub state: String,
    pub output_path: String,
    pub staging_path: Option<String>,
    pub progress_percentage: f64,
    pub current_fps: f64,
    pub current_frame: i32,
    pub total_frames: i32,
    pub render_strategy: String,
    pub allow_overwrite: bool,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRenderJobDto {
    pub project_id: String,
    pub preset_name: String,
    pub output_path: String,
    pub render_strategy: Option<String>,
    pub allow_overwrite: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConcatCompatibilityDto {
    pub is_stream_copy_safe: bool,
    pub recommended_strategy: String, // 'STREAM_COPY' | 'NORMALIZING_TRANSCODE'
    pub reasons: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FFmpegStatusDto {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub is_bundled: bool,
    pub ffmpeg_version: Option<String>,
    pub ffprobe_version: Option<String>,
    pub resolved_ffmpeg_path: Option<String>,
    pub resolved_ffprobe_path: Option<String>,
    pub supports_h264_nvenc: bool,
    pub supports_hevc_nvenc: bool,
    pub encoders_available: Vec<String>,
    pub resource_integrity_verified: bool,
    pub security_policy_error: Option<String>,
    pub status_message: String,
}

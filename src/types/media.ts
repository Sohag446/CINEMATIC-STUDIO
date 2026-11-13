/**
 * CINEMATIC STUDIO — Phase 4 Media Management, Multitrack Timeline & FFmpeg Types
 */

export type MediaType = 'VIDEO' | 'AUDIO' | 'IMAGE';

export interface MediaAsset {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  media_type: MediaType;
  file_size_bytes: number;
  duration_seconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  video_codec?: string;
  audio_codec?: string;
  audio_channels?: number;
  sample_rate?: number;
  checksum_sha256?: string;
  thumbnail_path?: string;
  proxy_path?: string;
  source_task_id?: string;
  created_at: number;
}

export interface CreateMediaAssetInput {
  project_id: string;
  file_name: string;
  file_path: string;
  media_type: MediaType;
  file_size_bytes: number;
  duration_seconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  video_codec?: string;
  audio_codec?: string;
  audio_channels?: number;
  sample_rate?: number;
  checksum_sha256?: string;
  thumbnail_path?: string;
  proxy_path?: string;
  source_task_id?: string;
}

export type TrackType = 'VIDEO' | 'AUDIO' | 'OVERLAY';

export interface TimelineTrack {
  id: string;
  project_id: string;
  track_type: TrackType;
  track_index: number;
  label: string;
  is_muted: boolean;
  is_locked: boolean;
  volume: number;
}

export interface TimelineClip {
  id: string;
  track_id: string;
  project_id: string;
  media_asset_id: string;
  clip_id?: string;
  timeline_start_seconds: number;
  timeline_duration_seconds: number;
  source_in_seconds: number;
  source_out_seconds: number;
  volume: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  z_order: number;
  created_at: number;
  updated_at: number;
}

export interface CreateTimelineClipInput {
  track_id: string;
  project_id: string;
  media_asset_id: string;
  clip_id?: string;
  timeline_start_seconds: number;
  timeline_duration_seconds: number;
  source_in_seconds?: number;
  source_out_seconds?: number;
  volume?: number;
}

export interface UpdateTimelineClipInput {
  id: string;
  track_id?: string;
  timeline_start_seconds?: number;
  timeline_duration_seconds?: number;
  source_in_seconds?: number;
  source_out_seconds?: number;
  volume?: number;
  fade_in_seconds?: number;
  fade_out_seconds?: number;
}

export type RenderJobState = 
  | 'QUEUED'
  | 'PREPARING'
  | 'VALIDATING'
  | 'RENDERING'
  | 'FINALIZING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface RenderJob {
  id: string;
  project_id: string;
  preset_name: string;
  state: RenderJobState;
  output_path: string;
  staging_path?: string;
  progress_percentage: number;
  current_fps: number;
  current_frame: number;
  total_frames: number;
  render_strategy: 'STREAM_COPY' | 'NORMALIZING_TRANSCODE';
  allow_overwrite?: boolean;
  error_message?: string;
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

export interface CreateRenderJobInput {
  project_id: string;
  preset_name: string;
  output_path: string;
  render_strategy?: 'STREAM_COPY' | 'NORMALIZING_TRANSCODE';
  allow_overwrite?: boolean;
}

export interface FFmpegStatus {
  ffmpeg_available: boolean;
  ffprobe_available: boolean;
  is_bundled: boolean;
  ffmpeg_version?: string;
  ffprobe_version?: string;
  resolved_ffmpeg_path?: string;
  resolved_ffprobe_path?: string;
  supports_h264_nvenc: boolean;
  supports_hevc_nvenc: boolean;
  encoders_available: string[];
  resource_integrity_verified: boolean;
  security_policy_error?: string;
  status_message: string;
}

export interface OutputPresetConfig {
  id: string;
  name: string;
  aspect_ratio: '16:9' | '9:16' | '1:1' | '2.39:1';
  width: number;
  height: number;
  fps: number;
  video_codec: 'libx264' | 'libx265' | 'prores';
  audio_codec: 'aac' | 'pcm_s16le';
  crf: number;
  description: string;
}


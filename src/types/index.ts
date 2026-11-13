export type AspectRatio = '16:9' | '9:16' | '2.39:1' | '1:1';
export type ProjectStatus = 'PLANNING' | 'IN_PRODUCTION' | 'ASSEMBLY' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  slug: string;
  synopsis: string;
  target_aspect_ratio: AspectRatio;
  target_fps: number;
  target_duration_seconds: number;
  project_dir_path: string;
  status: ProjectStatus;
  created_at: number;
  updated_at: number;
}

export interface CreateProjectInput {
  name: string;
  synopsis?: string;
  target_aspect_ratio?: AspectRatio;
  target_fps?: number;
  target_duration_seconds?: number;
  custom_directory?: string;
}

export interface Scene {
  id: string;
  project_id: string;
  sequence_number: number;
  title: string;
  dramatic_beat: string;
  estimated_duration_seconds: number;
  continuity_rules?: string;
  created_at: number;
  updated_at: number;
}

export type CameraFraming = 'WIDE' | 'MEDIUM' | 'CLOSE_UP' | 'EXTREME_CLOSE_UP' | 'OVER_THE_SHOULDER';
export type CameraAngle = 'EYE_LEVEL' | 'LOW_ANGLE' | 'HIGH_ANGLE' | 'DUTCH' | 'BIRDS_EYE';
export type CameraMovement = 'STATIC' | 'PAN_LEFT' | 'PAN_RIGHT' | 'DOLLY_IN' | 'DOLLY_OUT' | 'ORBIT' | 'TRACKING';
export type ClipStatus = 'PLANNED' | 'PROMPT_READY' | 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export interface Clip {
  id: string;
  scene_id: string;
  project_id: string;
  clip_number: number;
  target_duration_seconds: number;
  camera_framing: CameraFraming;
  camera_angle: CameraAngle;
  camera_movement: CameraMovement;
  subject_action: string;
  lighting_setup?: string;
  status: ClipStatus;
  assigned_provider: string;
  thumbnail_path?: string;
  proxy_path?: string;
  output_video_path?: string;
  created_at: number;
  updated_at: number;
}

export type TaskState = 
  | 'CREATED'
  | 'QUEUED'
  | 'PREPARING'
  | 'WAITING_FOR_PROFILE'
  | 'WAITING_FOR_USER'
  | 'RUNNING'
  | 'GENERATING'
  | 'COLLECTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'NEEDS_ATTENTION';

export interface ProductionTask {
  id: string;
  project_id: string;
  clip_id?: string;
  task_type: string;
  target_provider: string;
  state: TaskState;
  priority: number;
  progress_percentage: number;
  error_message?: string;
  created_at: number;
}

export interface SystemTelemetry {
  app_process_memory_mb: number;
  total_system_memory_mb: number;
  used_system_memory_mb: number;
  memory_percent: number;
  cpu_percent: number;
  active_tasks_count: number;
  active_project_id: string | null;
  active_project_name: string | null;
  is_memory_pressure: boolean;
}

export interface AppSettings {
  default_project_storage_path: string;
  max_concurrent_tasks: number;
  sequential_processing_default: boolean;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  theme: 'dark' | 'cinematic';
  hardware_thread_cap: number;
}

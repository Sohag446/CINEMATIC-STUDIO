import { 
  Project, 
  CreateProjectInput, 
  Scene, 
  Clip, 
  SystemTelemetry, 
  AppSettings 
} from '../types';

// Detect if running inside a Tauri native desktop context
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Local storage keys for standalone browser preview mode
const STORAGE_PROJECTS_KEY = 'cinematic_studio_projects';
const STORAGE_ACTIVE_PROJECT_KEY = 'cinematic_studio_active_project';
const STORAGE_SCENES_KEY = 'cinematic_studio_scenes';
const STORAGE_CLIPS_KEY = 'cinematic_studio_clips';
const STORAGE_SETTINGS_KEY = 'cinematic_studio_settings';

const DEFAULT_SETTINGS: AppSettings = {
  default_project_storage_path: 'C:\\CinematicStudio\\Projects',
  max_concurrent_tasks: 1,
  sequential_processing_default: true,
  log_level: 'INFO',
  theme: 'cinematic',
  hardware_thread_cap: 4,
};

export const apiService = {
  // ==========================================
  // PROJECT MANAGEMENT
  // ==========================================
  async listProjects(): Promise<Project[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Project[]>('list_projects');
    }
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Project>('create_project', { input });
    }

    const projects = await this.listProjects();
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    if (!slug) {
      throw new Error('Project name must contain alphanumeric characters.');
    }

    if (projects.some(p => p.slug === slug)) {
      throw new Error(`A project with slug "${slug}" already exists.`);
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      slug,
      synopsis: input.synopsis || '',
      target_aspect_ratio: input.target_aspect_ratio || '16:9',
      target_fps: input.target_fps || 24.0,
      target_duration_seconds: input.target_duration_seconds || 600,
      project_dir_path: `${input.custom_directory || DEFAULT_SETTINGS.default_project_storage_path}\\${slug}`,
      status: 'PLANNING',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    projects.unshift(newProject);
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, newProject.id);

    // Seed default Scene 1
    const defaultScene: Scene = {
      id: crypto.randomUUID(),
      project_id: newProject.id,
      sequence_number: 1,
      title: 'Scene 01: Opening Sequence',
      dramatic_beat: 'Establish protagonist and dramatic tone',
      estimated_duration_seconds: 60,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    const scenes = this.getLocalScenes();
    scenes.push(defaultScene);
    localStorage.setItem(STORAGE_SCENES_KEY, JSON.stringify(scenes));

    return newProject;
  },

  async openProject(projectId: string): Promise<Project> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Project>('open_project', { projectId });
    }
    const projects = await this.listProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error(`Project with ID ${projectId} not found.`);
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, project.id);
    return project;
  },

  async renameProject(projectId: string, newName: string): Promise<Project> {
    if (!newName.trim()) throw new Error('Project title cannot be empty.');
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Project>('rename_project', { projectId, newName });
    }
    const projects = await this.listProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    project.name = newName.trim();
    project.updated_at = Date.now();
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    return project;
  },

  async saveProject(project: Project): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<void>('save_project', { project });
    }
    const projects = await this.listProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      project.updated_at = Date.now();
      projects[index] = project;
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    }
  },

  async closeProject(): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<void>('close_project');
    }
    localStorage.removeItem(STORAGE_ACTIVE_PROJECT_KEY);
  },

  async deleteProject(projectId: string, confirmationName: string): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<void>('delete_project', { projectId, confirmationName });
    }

    const projects = await this.listProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found.');

    if (confirmationName.trim() !== project.name.trim()) {
      throw new Error(`Confirmation name "${confirmationName}" does not match project name "${project.name}".`);
    }

    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(filtered));

    // Clear active if currently active
    if (localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY) === projectId) {
      localStorage.removeItem(STORAGE_ACTIVE_PROJECT_KEY);
    }

    // Cascade delete scenes and clips
    const scenes = this.getLocalScenes().filter(s => s.project_id !== projectId);
    localStorage.setItem(STORAGE_SCENES_KEY, JSON.stringify(scenes));

    const clips = this.getLocalClips().filter(c => c.project_id !== projectId);
    localStorage.setItem(STORAGE_CLIPS_KEY, JSON.stringify(clips));
  },

  async getActiveProject(): Promise<Project | null> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Project | null>('get_active_project');
    }
    const activeId = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
    if (!activeId) return null;
    const projects = await this.listProjects();
    return projects.find(p => p.id === activeId) || null;
  },

  // ==========================================
  // SCENE & CLIP MANAGEMENT
  // ==========================================
  async getScenes(projectId: string): Promise<Scene[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Scene[]>('get_scenes', { projectId });
    }
    const scenes = this.getLocalScenes();
    return scenes.filter(s => s.project_id === projectId);
  },

  async getClips(projectId: string): Promise<Clip[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Clip[]>('get_clips', { projectId });
    }
    const clips = this.getLocalClips();
    return clips.filter(c => c.project_id === projectId);
  },

  // Generate a test benchmark suite of 360 clips (simulating a 60-minute featurette)
  async seedTestClips(projectId: string, count: number = 360): Promise<Clip[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<Clip[]>('seed_test_clips', { projectId, count });
    }

    const scenes = await this.getScenes(projectId);
    const sceneId = scenes[0]?.id || crypto.randomUUID();
    const newClips: Clip[] = [];

    const framings: Clip['camera_framing'][] = ['WIDE', 'MEDIUM', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_THE_SHOULDER'];
    const movements: Clip['camera_movement'][] = ['STATIC', 'DOLLY_IN', 'DOLLY_OUT', 'PAN_LEFT', 'PAN_RIGHT', 'TRACKING'];
    const angles: Clip['camera_angle'][] = ['EYE_LEVEL', 'LOW_ANGLE', 'HIGH_ANGLE', 'DUTCH'];

    for (let i = 1; i <= count; i++) {
      newClips.push({
        id: crypto.randomUUID(),
        scene_id: sceneId,
        project_id: projectId,
        clip_number: i,
        target_duration_seconds: 10.0,
        camera_framing: framings[i % framings.length],
        camera_angle: angles[i % angles.length],
        camera_movement: movements[i % movements.length],
        subject_action: `Cinematic action sequence shot ${i} demonstrating character continuity beat.`,
        lighting_setup: i % 2 === 0 ? 'Volumetric neon night key' : 'Warm tungsten golden rim',
        status: i === 1 ? 'COMPLETED' : i === 2 ? 'PROMPT_READY' : 'PLANNED',
        assigned_provider: 'Google Veo',
        created_at: Date.now() - (count - i) * 1000,
        updated_at: Date.now(),
      });
    }

    const allClips = this.getLocalClips().filter(c => c.project_id !== projectId);
    allClips.push(...newClips);
    localStorage.setItem(STORAGE_CLIPS_KEY, JSON.stringify(allClips));
    return newClips;
  },

  // ==========================================
  // SYSTEM TELEMETRY & RESOURCES
  // ==========================================
  async getTelemetry(): Promise<SystemTelemetry> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<SystemTelemetry>('get_telemetry');
    }

    // Accurate browser estimation for development mode
    const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const usedMb = memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024)) : 78;

    return {
      app_process_memory_mb: usedMb + 160, // Estimated Tauri Rust + WebView2 tree
      total_system_memory_mb: 20480, // 20 GB Workstation Baseline
      used_system_memory_mb: 5800 + usedMb,
      memory_percent: Math.round(((5800 + usedMb) / 20480) * 100),
      cpu_percent: 2.4,
      active_tasks_count: 0,
      active_project_id: localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY),
      active_project_name: (await this.getActiveProject())?.name || null,
      is_memory_pressure: false,
    };
  },

  // ==========================================
  // SETTINGS
  // ==========================================
  async getSettings(): Promise<AppSettings> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<AppSettings>('get_settings');
    }
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  },

  async updateSettings(settings: AppSettings): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<void>('update_settings', { settings });
    }
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  },

  // Local helper utilities
  getLocalScenes(): Scene[] {
    const raw = localStorage.getItem(STORAGE_SCENES_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getLocalClips(): Clip[] {
    const raw = localStorage.getItem(STORAGE_CLIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
};

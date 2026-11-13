import { create } from 'zustand';
import {
  Project,
  CreateProjectInput,
  Scene,
  Clip,
  ProductionTask,
  SystemTelemetry,
  AppSettings,
  DiscoveredChromeProfile,
  RegisteredChromeProfile,
  RegisterProfileInput,
  UpdateProfileInput,
  PairingChallenge,
  MediaAsset,
  CreateMediaAssetInput,
  TimelineTrack,
  TimelineClip,
  CreateTimelineClipInput,
  UpdateTimelineClipInput,
  RenderJob,
  CreateRenderJobInput,
  FFmpegStatus,
  CharacterProfile,
  EnvironmentProfile
} from '../types';
import { apiService } from '../services/api';

export type MainStudioView = 'PRODUCTIONS' | 'STUDIO' | 'AI_PROVIDERS' | 'MEDIA_VAULT';

export type WorkspaceSection =
  | 'OVERVIEW'
  | 'STORY'
  | 'CHARACTERS'
  | 'ENVIRONMENTS'
  | 'STORYBOARD'
  | 'GENERATION'
  | 'CONTINUITY'
  | 'TIMELINE'
  | 'EXPORT';

interface StudioState {
  // Navigation & Workflow Mode
  mainView: MainStudioView;
  currentView: 'DASHBOARD' | 'WORKSPACE';
  currentWorkspaceSection: WorkspaceSection;
  isBeginnerMode: boolean;
  isAboutModalOpen: boolean;
  isInspectorOpen: boolean;
  selectedCharacterId: string | null;
  selectedEnvironmentId: string | null;

  // Characters & Environments
  characters: CharacterProfile[];
  environments: EnvironmentProfile[];

  // Projects
  projects: Project[];
  activeProject: Project | null;
  isLoadingProjects: boolean;

  // Workspace Scene/Clip Data
  scenes: Scene[];
  clips: Clip[];
  selectedClipId: string | null;
  selectedSceneId: string | null;
  isLoadingClips: boolean;

  // UI Dialog States
  isNewProjectModalOpen: boolean;
  isOpenProjectModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isRenameModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isChromeProfileModalOpen: boolean;
  projectToDelete: Project | null;

  // Telemetry & Settings
  telemetry: SystemTelemetry | null;
  settings: AppSettings | null;

  // Phase 2 Chrome Profiles
  discoveredProfiles: DiscoveredChromeProfile[];
  registeredProfiles: RegisteredChromeProfile[];
  isDiscoveringProfiles: boolean;
  activePairingChallenge: PairingChallenge | null;

  // Phase 3 Task Queue & Execution Engine
  tasks: ProductionTask[];
  activeHumanPromptTask: ProductionTask | null;

  // Phase 4 Media, Multitrack Timeline & Rendering
  mediaAssets: MediaAsset[];
  timelineTracks: TimelineTrack[];
  timelineClips: TimelineClip[];
  selectedTimelineClipId: string | null;
  renderJobs: RenderJob[];
  ffmpegStatus: FFmpegStatus | null;
  isExportModalOpen: boolean;
  isMediaLibraryModalOpen: boolean;
  playheadTimeSeconds: number;
  isPlaying: boolean;

  // Actions
  setMainView: (view: MainStudioView) => void;
  setCurrentView: (view: 'DASHBOARD' | 'WORKSPACE') => void;
  setCurrentWorkspaceSection: (section: WorkspaceSection) => void;
  setBeginnerMode: (enabled: boolean) => void;
  toggleBeginnerMode: () => void;
  setIsAboutModalOpen: (open: boolean) => void;
  setIsInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  setSelectedCharacterId: (id: string | null) => void;
  setSelectedEnvironmentId: (id: string | null) => void;

  addCharacter: (char: Omit<CharacterProfile, 'id'>) => Promise<CharacterProfile>;
  updateCharacter: (char: CharacterProfile) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

  addEnvironment: (env: Omit<EnvironmentProfile, 'id'>) => Promise<EnvironmentProfile>;
  updateEnvironment: (env: EnvironmentProfile) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;

  fetchProjects: () => Promise<void>;
  createProject: (inputOrName: CreateProjectInput | string, synopsis?: string) => Promise<Project>;
  openProject: (projectId: string) => Promise<void>;
  closeProject: () => Promise<void>;
  renameProject: (newName: string) => Promise<void>;
  deleteProject: (projectId: string, confirmName: string) => Promise<void>;
  saveCurrentProject: () => Promise<void>;

  fetchWorkspaceData: (projectId: string) => Promise<void>;
  selectClip: (clipId: string | null) => void;
  selectScene: (sceneId: string | null) => void;
  seed360Clips: () => Promise<void>;

  refreshTelemetry: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;

  // Phase 2 Actions
  discoverProfiles: () => Promise<void>;
  fetchRegisteredProfiles: () => Promise<void>;
  registerProfile: (input: RegisterProfileInput) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  unregisterProfile: (profileId: string) => Promise<void>;
  launchProfile: (userDataDir: string, profileDirKey: string) => Promise<void>;
  initiatePairing: (profileId: string) => Promise<PairingChallenge>;
  revokePairing: (profileId: string) => Promise<void>;
  installNativeHost: () => Promise<string>;

  // Phase 3 Actions
  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (input: {
    project_id: string;
    clip_id?: string;
    profile_id?: string;
    task_type: string;
    target_provider: string;
    priority?: number;
    prompt: string;
  }) => Promise<ProductionTask>;
  cancelTask: (taskId: string) => Promise<void>;
  resumeHumanTask: (taskId: string) => Promise<void>;
  setActiveHumanPromptTask: (task: ProductionTask | null) => void;

  // Phase 4 Actions
  fetchMediaAssets: (projectId: string) => Promise<void>;
  createMediaAsset: (input: CreateMediaAssetInput) => Promise<MediaAsset>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
  fetchTimeline: (projectId: string) => Promise<void>;
  addClipToTimeline: (input: CreateTimelineClipInput) => Promise<TimelineClip>;
  updateTimelineClip: (input: UpdateTimelineClipInput) => Promise<void>;
  deleteTimelineClip: (clipId: string) => Promise<void>;
  fetchRenderJobs: (projectId: string) => Promise<void>;
  createRenderJob: (input: CreateRenderJobInput) => Promise<RenderJob>;
  checkFFmpegStatus: (customFFmpeg?: string, customFFprobe?: string) => Promise<void>;
  setExportModalOpen: (open: boolean) => void;
  setMediaLibraryModalOpen: (open: boolean) => void;
  setPlayheadTimeSeconds: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedTimelineClipId: (id: string | null) => void;

  setNewProjectModalOpen: (open: boolean) => void;
  setOpenProjectModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setRenameModalOpen: (open: boolean) => void;
  setDeleteModalOpen: (open: boolean, project?: Project | null) => void;
  setChromeProfileModalOpen: (open: boolean) => void;
  clearActivePairingChallenge: () => void;
}

const getDefaultCharacters = (projectId: string): CharacterProfile[] => [
  {
    id: `char-elena-${projectId}`,
    project_id: projectId,
    name: 'Elena Vance',
    role: 'Protagonist / Neural Archivist',
    gender: 'Female',
    age: '34',
    physical_description: 'Mid-30s, athletic lean build, sharp jawline, messy dark hair with cyan streaks, cybernetic optic lens over left eye.',
    wardrobe: 'Weathered high-collar brown leather jacket with brass hardware, dark utility trousers, heavy boots.',
    visual_prompt_lock: '35mm cinematic photograph, Elena Vance, weathered brown leather jacket, glowing cyan left eye, athletic build, messy dark hair, anamorphic lens',
    assigned_scenes: ['1']
  },
  {
    id: `char-kaelen-${projectId}`,
    project_id: projectId,
    name: 'Kaelen Morse',
    role: 'Antagonist / Syndicate Enforcer',
    gender: 'Male',
    age: '42',
    physical_description: 'Tall imposing figure, scarred cheek, slicked silver-streaked dark hair, cold observant gaze.',
    wardrobe: 'Floor-length matte black armored trench coat, high structured collar, minimalist titanium gloves.',
    visual_prompt_lock: '35mm cinematic photograph, Kaelen Morse, matte black armored trench coat, silver-streaked hair, scarred cheek, dramatic shadows',
    assigned_scenes: ['1']
  }
];

const getDefaultEnvironments = (projectId: string): EnvironmentProfile[] => [
  {
    id: `env-vault-${projectId}`,
    project_id: projectId,
    name: 'Submerged Archive Vault',
    location_type: 'Interior / Underground',
    time_of_day: 'Perpetual Twilight',
    weather: 'Subterranean condensation',
    atmosphere: 'Flooded brutalist concrete hall with floating cyan holographic data monoliths and rusted steel walkways.',
    lighting_rules: 'Volumetric underwater cyan caustics reflected on damp walls, sharp amber emergency beacon backlights.',
    visual_prompt_lock: 'cinematic establishing shot, brutalist flooded underground concrete vault, glowing floating cyan data crystals, amber emergency beacons, volumetric mist'
  },
  {
    id: `env-bridge-${projectId}`,
    project_id: projectId,
    name: 'Neo-Venice Suspension Bridge',
    location_type: 'Exterior / High Altitude',
    time_of_day: 'Midnight',
    weather: 'Heavy downpour & fog',
    atmosphere: 'Sprawling rain-drenched suspension bridge spanning between megatowers, dense fog, streaming vehicle light trails.',
    lighting_rules: 'High contrast wet asphalt reflections, saturated magenta and cobalt neon signage diffuse through rainy mist.',
    visual_prompt_lock: 'cinematic wide angle shot, rain-soaked futuristic suspension bridge at night, glowing magenta and blue neon signs reflecting on puddles, heavy atmospheric fog'
  }
];

export const useStudioStore = create<StudioState>((set, get) => ({
  mainView: 'PRODUCTIONS',
  currentView: 'DASHBOARD',
  currentWorkspaceSection: 'OVERVIEW',
  isBeginnerMode: true,
  isAboutModalOpen: false,
  isInspectorOpen: true,
  selectedCharacterId: null,
  selectedEnvironmentId: null,

  characters: [],
  environments: [],

  setMainView: (view: MainStudioView) => set({
    mainView: view,
    currentView: view === 'STUDIO' ? 'WORKSPACE' : 'DASHBOARD'
  }),
  setCurrentView: (view: 'DASHBOARD' | 'WORKSPACE') => set({
    currentView: view,
    mainView: view === 'WORKSPACE' ? 'STUDIO' : 'PRODUCTIONS'
  }),
  setCurrentWorkspaceSection: (section: WorkspaceSection) => set({ currentWorkspaceSection: section }),
  setBeginnerMode: (enabled: boolean) => set({ isBeginnerMode: enabled }),
  toggleBeginnerMode: () => set(state => ({ isBeginnerMode: !state.isBeginnerMode })),
  setIsAboutModalOpen: (open: boolean) => set({ isAboutModalOpen: open }),
  setIsInspectorOpen: (open: boolean) => set({ isInspectorOpen: open }),
  toggleInspector: () => set(state => ({ isInspectorOpen: !state.isInspectorOpen })),
  setSelectedCharacterId: (id: string | null) => set({ selectedCharacterId: id }),
  setSelectedEnvironmentId: (id: string | null) => set({ selectedEnvironmentId: id }),

  addCharacter: async (char) => {
    const newChar: CharacterProfile = {
      ...char,
      id: crypto.randomUUID(),
      created_at: Date.now()
    };
    const updated = [...get().characters, newChar];
    set({ characters: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_chars_${activeProject.id}`, JSON.stringify(updated));
    }
    return newChar;
  },

  updateCharacter: async (char) => {
    const updated = get().characters.map(c => c.id === char.id ? char : c);
    set({ characters: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_chars_${activeProject.id}`, JSON.stringify(updated));
    }
  },

  deleteCharacter: async (id) => {
    const updated = get().characters.filter(c => c.id !== id);
    set({ characters: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_chars_${activeProject.id}`, JSON.stringify(updated));
    }
  },

  addEnvironment: async (env) => {
    const newEnv: EnvironmentProfile = {
      ...env,
      id: crypto.randomUUID(),
      created_at: Date.now()
    };
    const updated = [...get().environments, newEnv];
    set({ environments: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_envs_${activeProject.id}`, JSON.stringify(updated));
    }
    return newEnv;
  },

  updateEnvironment: async (env) => {
    const updated = get().environments.map(e => e.id === env.id ? env : e);
    set({ environments: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_envs_${activeProject.id}`, JSON.stringify(updated));
    }
  },

  deleteEnvironment: async (id) => {
    const updated = get().environments.filter(e => e.id !== id);
    set({ environments: updated });
    const { activeProject } = get();
    if (activeProject) {
      localStorage.setItem(`cinematic_envs_${activeProject.id}`, JSON.stringify(updated));
    }
  },

  projects: [],
  activeProject: null,
  isLoadingProjects: false,

  scenes: [],
  clips: [],
  selectedClipId: null,
  selectedSceneId: null,
  isLoadingClips: false,

  isNewProjectModalOpen: false,
  isOpenProjectModalOpen: false,
  isSettingsModalOpen: false,
  isRenameModalOpen: false,
  isDeleteModalOpen: false,
  isChromeProfileModalOpen: false,
  projectToDelete: null,

  telemetry: null,
  settings: null,

  discoveredProfiles: [],
  registeredProfiles: [],
  isDiscoveringProfiles: false,
  activePairingChallenge: null,

  // Phase 3 Task Queue & Execution Engine
  tasks: [],
  activeHumanPromptTask: null,

  // Phase 4 Media, Multitrack Timeline & Rendering
  mediaAssets: [],
  timelineTracks: [],
  timelineClips: [],
  selectedTimelineClipId: null,
  renderJobs: [],
  ffmpegStatus: null,
  isExportModalOpen: false,
  isMediaLibraryModalOpen: false,
  playheadTimeSeconds: 0,
  isPlaying: false,

  fetchProjects: async () => {
    set({ isLoadingProjects: true });
    try {
      const projects = await apiService.listProjects();
      const active = await apiService.getActiveProject();
      set({ projects, activeProject: active, isLoadingProjects: false });
      if (active) {
        await get().fetchWorkspaceData(active.id);
      }
    } catch (err) {
      console.error('Failed to list projects:', err);
      set({ isLoadingProjects: false });
    }
  },

  createProject: async (inputOrName: CreateProjectInput | string, synopsis?: string) => {
    let input: CreateProjectInput;
    if (typeof inputOrName === 'string') {
      input = { name: inputOrName, synopsis };
    } else {
      input = inputOrName;
    }
    const project = await apiService.createProject(input);
    set(state => ({
      projects: [project, ...state.projects],
      activeProject: project,
      isNewProjectModalOpen: false,
      mainView: 'STUDIO',
      currentView: 'WORKSPACE',
      currentWorkspaceSection: 'OVERVIEW',
    }));
    await get().fetchWorkspaceData(project.id);
    return project;
  },

  openProject: async (projectId: string) => {
    const project = await apiService.openProject(projectId);
    set({
      activeProject: project,
      isOpenProjectModalOpen: false,
      mainView: 'STUDIO',
      currentView: 'WORKSPACE',
      currentWorkspaceSection: 'OVERVIEW',
    });
    await get().fetchWorkspaceData(project.id);
  },

  closeProject: async () => {
    await apiService.closeProject();
    set({
      activeProject: null,
      scenes: [],
      clips: [],
      selectedClipId: null,
      selectedSceneId: null,
      characters: [],
      environments: [],
      mainView: 'PRODUCTIONS',
      currentView: 'DASHBOARD',
    });
  },

  renameProject: async (newName: string) => {
    const { activeProject } = get();
    if (!activeProject) return;
    const updated = await apiService.renameProject(activeProject.id, newName);
    set(state => ({
      activeProject: updated,
      projects: state.projects.map(p => p.id === updated.id ? updated : p),
      isRenameModalOpen: false,
    }));
  },

  deleteProject: async (projectId: string, confirmName: string) => {
    await apiService.deleteProject(projectId, confirmName);
    const { activeProject } = get();
    set(state => ({
      projects: state.projects.filter(p => p.id !== projectId),
      activeProject: activeProject?.id === projectId ? null : activeProject,
      scenes: activeProject?.id === projectId ? [] : state.scenes,
      clips: activeProject?.id === projectId ? [] : state.clips,
      selectedClipId: activeProject?.id === projectId ? null : state.selectedClipId,
      selectedSceneId: activeProject?.id === projectId ? null : state.selectedSceneId,
      isDeleteModalOpen: false,
      projectToDelete: null,
    }));
  },

  saveCurrentProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;
    await apiService.saveProject(activeProject);
  },

  fetchWorkspaceData: async (projectId: string) => {
    set({ isLoadingClips: true });
    try {
      const [scenes, clips, mediaAssets, timelineTracks, timelineClips, renderJobs] = await Promise.all([
        apiService.getScenes(projectId),
        apiService.getClips(projectId),
        apiService.listMediaAssets(projectId),
        apiService.listTimelineTracks(projectId),
        apiService.listTimelineClips(projectId),
        apiService.listRenderJobs(projectId),
      ]);
      const rawChars = localStorage.getItem(`cinematic_chars_${projectId}`);
      const characters: CharacterProfile[] = rawChars ? JSON.parse(rawChars) : getDefaultCharacters(projectId);
      const rawEnvs = localStorage.getItem(`cinematic_envs_${projectId}`);
      const environments: EnvironmentProfile[] = rawEnvs ? JSON.parse(rawEnvs) : getDefaultEnvironments(projectId);

      set({
        scenes,
        clips,
        mediaAssets,
        timelineTracks,
        timelineClips,
        renderJobs,
        characters,
        environments,
        selectedSceneId: scenes[0]?.id || null,
        selectedClipId: clips[0]?.id || null,
        isLoadingClips: false
      });
    } catch (err) {
      console.error('Failed to load workspace data:', err);
      set({ isLoadingClips: false });
    }
  },

  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectScene: (sceneId) => set({ selectedSceneId: sceneId }),

  seed360Clips: async () => {
    const { activeProject } = get();
    if (!activeProject) return;
    set({ isLoadingClips: true });
    const clips = await apiService.seedTestClips(activeProject.id, 360);
    set({ clips, selectedClipId: clips[0]?.id || null, isLoadingClips: false });
  },

  refreshTelemetry: async () => {
    try {
      const telemetry = await apiService.getTelemetry();
      set({ telemetry });
    } catch (err) {
      console.error('Telemetry refresh failed:', err);
    }
  },

  fetchSettings: async () => {
    const settings = await apiService.getSettings();
    set({ settings });
  },

  updateSettings: async (settings) => {
    await apiService.updateSettings(settings);
    set({ settings, isSettingsModalOpen: false });
  },

  discoverProfiles: async () => {
    set({ isDiscoveringProfiles: true });
    try {
      const discovered = await apiService.discoverChromeProfiles();
      set({ discoveredProfiles: discovered, isDiscoveringProfiles: false });
    } catch (err) {
      console.error('Failed to discover Chrome profiles:', err);
      set({ isDiscoveringProfiles: false });
    }
  },

  fetchRegisteredProfiles: async () => {
    try {
      const registered = await apiService.getRegisteredChromeProfiles();
      set({ registeredProfiles: registered });
    } catch (err) {
      console.error('Failed to fetch registered profiles:', err);
    }
  },

  registerProfile: async (input) => {
    const profile = await apiService.registerChromeProfile(input);
    const { registeredProfiles } = get();
    set({ registeredProfiles: [...registeredProfiles, profile] });
  },

  updateProfile: async (input) => {
    const updated = await apiService.updateChromeProfile(input);
    const { registeredProfiles } = get();
    set({
      registeredProfiles: registeredProfiles.map(p => p.id === updated.id ? updated : p)
    });
  },

  unregisterProfile: async (profileId) => {
    await apiService.unregisterChromeProfile(profileId);
    const { registeredProfiles } = get();
    set({
      registeredProfiles: registeredProfiles.filter(p => p.id !== profileId)
    });
  },

  launchProfile: async (userDataDir, profileDirKey) => {
    await apiService.launchChromeProfile(userDataDir, profileDirKey);
  },

  initiatePairing: async (profileId) => {
    const challenge = await apiService.initiateProfilePairing(profileId);
    set({ activePairingChallenge: challenge });
    await get().fetchRegisteredProfiles();
    return challenge;
  },

  revokePairing: async (profileId) => {
    await apiService.revokeProfilePairing(profileId);
    await get().fetchRegisteredProfiles();
  },

  installNativeHost: async () => {
    return apiService.installNativeHost();
  },

  // Phase 3 Actions
  fetchTasks: async (projectId) => {
    const tasks = await apiService.getProjectTasks(projectId);
    set({ tasks });
  },

  createTask: async (input) => {
    const task = await apiService.createProductionTask(input);
    const { tasks } = get();
    set({ tasks: [task, ...tasks] });
    return task;
  },

  cancelTask: async (taskId) => {
    await apiService.cancelProductionTask(taskId);
    const { tasks } = get();
    set({
      tasks: tasks.map(t => t.id === taskId ? { ...t, state: 'CANCELLED' } : t)
    });
  },

  resumeHumanTask: async (taskId) => {
    await apiService.resumeHumanActionTask(taskId);
    const { tasks } = get();
    set({
      tasks: tasks.map(t => t.id === taskId ? { ...t, state: 'QUEUED', error_message: undefined } : t),
      activeHumanPromptTask: null
    });
  },

  setActiveHumanPromptTask: (task) => set({ activeHumanPromptTask: task }),

  // Phase 4 Actions
  fetchMediaAssets: async (projectId) => {
    const mediaAssets = await apiService.listMediaAssets(projectId);
    set({ mediaAssets });
  },

  createMediaAsset: async (input) => {
    const asset = await apiService.createMediaAsset(input);
    const { mediaAssets } = get();
    set({ mediaAssets: [asset, ...mediaAssets] });
    return asset;
  },

  deleteMediaAsset: async (assetId) => {
    await apiService.deleteMediaAsset(assetId);
    const { mediaAssets } = get();
    set({ mediaAssets: mediaAssets.filter(a => a.id !== assetId) });
  },

  fetchTimeline: async (projectId) => {
    const [timelineTracks, timelineClips] = await Promise.all([
      apiService.listTimelineTracks(projectId),
      apiService.listTimelineClips(projectId)
    ]);
    set({ timelineTracks, timelineClips });
  },

  addClipToTimeline: async (input) => {
    const clip = await apiService.createTimelineClip(input);
    const { timelineClips } = get();
    set({ timelineClips: [...timelineClips, clip] });
    return clip;
  },

  updateTimelineClip: async (input) => {
    await apiService.updateTimelineClip(input);
    const { timelineClips } = get();
    set({
      timelineClips: timelineClips.map(c => c.id === input.id ? { ...c, ...input, updated_at: Date.now() } : c)
    });
  },

  deleteTimelineClip: async (clipId) => {
    await apiService.deleteTimelineClip(clipId);
    const { timelineClips, selectedTimelineClipId } = get();
    set({
      timelineClips: timelineClips.filter(c => c.id !== clipId),
      selectedTimelineClipId: selectedTimelineClipId === clipId ? null : selectedTimelineClipId
    });
  },

  fetchRenderJobs: async (projectId) => {
    const renderJobs = await apiService.listRenderJobs(projectId);
    set({ renderJobs });
  },

  createRenderJob: async (input) => {
    const job = await apiService.createRenderJob(input);
    const { renderJobs } = get();
    set({ renderJobs: [job, ...renderJobs] });
    return job;
  },

  checkFFmpegStatus: async (customFFmpeg, customFFprobe) => {
    const status = await apiService.detectFFmpegStatus(customFFmpeg, customFFprobe);
    set({ ffmpegStatus: status });
  },

  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setMediaLibraryModalOpen: (open) => set({ isMediaLibraryModalOpen: open }),
  setPlayheadTimeSeconds: (time) => set({ playheadTimeSeconds: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSelectedTimelineClipId: (id) => set({ selectedTimelineClipId: id }),

  setNewProjectModalOpen: (open) => set({ isNewProjectModalOpen: open }),
  setOpenProjectModalOpen: (open) => set({ isOpenProjectModalOpen: open }),
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setRenameModalOpen: (open) => set({ isRenameModalOpen: open }),
  setDeleteModalOpen: (open, project = null) => set({ isDeleteModalOpen: open, projectToDelete: project }),
  setChromeProfileModalOpen: (open) => set({ isChromeProfileModalOpen: open }),
  clearActivePairingChallenge: () => set({ activePairingChallenge: null }),
}));


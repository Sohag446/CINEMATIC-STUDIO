import { create } from 'zustand';
import {
  Project,
  CreateProjectInput,
  Scene,
  Clip,
  ClipStatus,
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
  EnvironmentProfile,
  MainStudioView
} from '../types';
import { apiService } from '../services/api';
import { storyAgent, StoryAnalysisResult } from '../services/storyAgent';

export type { MainStudioView };

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

  // Master Rebuild: Story & AI Video Workflow State
  storyText: string;
  storyDurationInput: string;
  isAnalyzingStory: boolean;
  storyAnalysis: StoryAnalysisResult | null;
  activeAIPlatform: 'chatgpt' | 'gemini' | 'claude';
  activeStoryProfileId: string | null;
  activeVideoProfileId: string | null;
  activeGoogleAccountIndex: number;
  googleAccounts: { id: string; label: string; email?: string }[];
  selectedShotId: string | null;
  shotQueueState: 'IDLE' | 'RUNNING' | 'PAUSED';
  isChromeWizardOpen: boolean;

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
  isDiagnosticsModalOpen: boolean;
  isFirstLaunchModalOpen: boolean;
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

  // Phase 4 Actions & CapCut-Style Timeline Operations
  fetchMediaAssets: (projectId: string) => Promise<void>;
  createMediaAsset: (input: CreateMediaAssetInput) => Promise<MediaAsset>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
  fetchTimeline: (projectId: string) => Promise<void>;
  addClipToTimeline: (input: CreateTimelineClipInput) => Promise<TimelineClip>;
  updateTimelineClip: (input: UpdateTimelineClipInput) => Promise<void>;
  deleteTimelineClip: (clipId: string) => Promise<void>;
  splitTimelineClip: (clipId: string, splitTimeSeconds: number) => Promise<void>;
  duplicateTimelineClip: (clipId: string) => Promise<TimelineClip | null>;
  trimTimelineClipStart: (clipId: string, newStartSeconds: number) => Promise<void>;
  trimTimelineClipEnd: (clipId: string, newDurationSeconds: number) => Promise<void>;
  timelineHistory: TimelineClip[][];
  timelineHistoryIndex: number;
  canUndoTimeline: boolean;
  canRedoTimeline: boolean;
  undoTimeline: () => void;
  redoTimeline: () => void;
  fetchRenderJobs: (projectId: string) => Promise<void>;
  createRenderJob: (input: CreateRenderJobInput) => Promise<RenderJob>;
  checkFFmpegStatus: (customFFmpeg?: string, customFFprobe?: string) => Promise<void>;
  setExportModalOpen: (open: boolean) => void;
  setMediaLibraryModalOpen: (open: boolean) => void;
  setPlayheadTimeSeconds: (time: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedTimelineClipId: (id: string | null) => void;

  setNewProjectModalOpen: (open: boolean) => void;
  setOpenProjectModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setRenameModalOpen: (open: boolean) => void;
  setDeleteModalOpen: (open: boolean, project?: Project | null) => void;
  setChromeProfileModalOpen: (open: boolean) => void;
  setDiagnosticsModalOpen: (open: boolean) => void;
  setFirstLaunchModalOpen: (open: boolean) => void;
  clearActivePairingChallenge: () => void;

  // Master Rebuild: Story & AI Video Actions
  setStoryText: (text: string) => void;
  setStoryDurationInput: (dur: string) => void;
  setActiveAIPlatform: (platform: 'chatgpt' | 'gemini' | 'claude') => void;
  setActiveStoryProfileId: (id: string | null) => void;
  setActiveVideoProfileId: (id: string | null) => void;
  setActiveGoogleAccountIndex: (idx: number) => void;
  addGoogleAccount: (label?: string) => void;
  setSelectedShotId: (id: string | null) => void;
  setChromeWizardOpen: (open: boolean) => void;
  analyzeAndBreakdownStory: (text: string, duration?: string) => Promise<void>;
  generateShotVideo: (clipId: string) => Promise<void>;
  startShotQueue: () => Promise<void>;
  pauseShotQueue: () => void;
  resumeShotQueue: () => void;
  retryFailedShot: (clipId: string) => Promise<void>;
  addClipDirectlyToTimeline: (clipId: string) => Promise<void>;
  assembleCompletedScenes: () => Promise<void>;
  markSceneStatus: (clipId: string, status: any) => Promise<void>;
  verifyAndCompleteClip: (clipId: string, filePath: string) => Promise<boolean>;
  attachDownloadedVideoToScene: (clipId: string, filePath: string, proxyUrl?: string) => Promise<void>;
  detachAudioFromClip: (timelineClipId: string) => Promise<void>;
  isChromeDocked: boolean;
  dockedChromeHwnd: number | null;
  dockChromeError: string | null;
  dockChrome: (url: string, userDataDir: string, profileDirKey: string, x: number, y: number, width: number, height: number) => Promise<number>;
  syncDockedBounds: (x: number, y: number, width: number, height: number) => Promise<void>;
  setDockedVisible: (visible: boolean) => Promise<void>;
  closeDocked: () => Promise<void>;
  toggleChromeDockMode: () => void;
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
  mainView: 'HOME',
  currentView: 'DASHBOARD',
  currentWorkspaceSection: 'OVERVIEW',
  isBeginnerMode: true,
  isAboutModalOpen: false,
  isInspectorOpen: true,
  selectedCharacterId: null,
  selectedEnvironmentId: null,

  // Master Rebuild: Story & AI Video Workflow State
  storyText: '',
  storyDurationInput: '1 minute',
  isAnalyzingStory: false,
  storyAnalysis: null,
  activeAIPlatform: 'chatgpt',
  activeStoryProfileId: null,
  activeVideoProfileId: null,
  activeGoogleAccountIndex: 0,
  googleAccounts: [
    { id: 'google-acc-1', label: 'Google Account 1 (Primary - Veo 2 / Flow)', email: 'primary.creator@gmail.com' },
    { id: 'google-acc-2', label: 'Google Account 2 (Fast Queue - Veo High-Rate)', email: 'secondary.render@gmail.com' },
    { id: 'google-acc-3', label: 'Google Account 3 (Reserve - Extended Quota)', email: 'reserve.takes@gmail.com' }
  ],
  selectedShotId: null,
  shotQueueState: 'IDLE',
  isChromeWizardOpen: false,

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
  isDiagnosticsModalOpen: false,
  isFirstLaunchModalOpen: false,
  projectToDelete: null,

  telemetry: null,
  settings: null,

  discoveredProfiles: [],
  registeredProfiles: [],
  isDiscoveringProfiles: false,
  activePairingChallenge: null,
  isChromeDocked: true,
  dockedChromeHwnd: null,
  dockChromeError: null,

  // Phase 3 Task Queue & Execution Engine
  tasks: [],
  activeHumanPromptTask: null,

  // Phase 4 Media, Multitrack Timeline & Rendering
  mediaAssets: [],
  timelineTracks: [],
  timelineClips: [],
  timelineHistory: [],
  timelineHistoryIndex: -1,
  canUndoTimeline: false,
  canRedoTimeline: false,
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
      mainView: 'AI_WORKSPACE',
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
      mainView: 'AI_WORKSPACE',
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

  dockChrome: async (url, userDataDir, profileDirKey, x, y, width, height) => {
    try {
      const hwnd = await apiService.dockChromeToWindow(url, userDataDir, profileDirKey, x, y, width, height);
      set({ dockedChromeHwnd: hwnd, isChromeDocked: true, dockChromeError: null });
      return hwnd;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error('[Docked Chrome] Native Win32 child-window docking failed:', errorMsg);
      set({ isChromeDocked: false, dockedChromeHwnd: null, dockChromeError: errorMsg });
      throw new Error(`Win32 Chrome docking failed: ${errorMsg}`);
    }
  },

  syncDockedBounds: async (x, y, width, height) => {
    await apiService.syncDockedChromeBounds(x, y, width, height);
  },

  setDockedVisible: async (visible) => {
    await apiService.setDockedChromeVisible(visible);
  },

  closeDocked: async () => {
    await apiService.closeDockedChrome();
    set({ dockedChromeHwnd: null });
  },

  toggleChromeDockMode: () => {
    set(state => ({ isChromeDocked: !state.isChromeDocked }));
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

  splitTimelineClip: async (clipId: string, splitTimeSeconds: number) => {
    const { timelineClips, updateTimelineClip, addClipToTimeline } = get();
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;

    if (
      splitTimeSeconds <= clip.timeline_start_seconds + 0.05 ||
      splitTimeSeconds >= clip.timeline_start_seconds + clip.timeline_duration_seconds - 0.05
    ) {
      return;
    }

    const splitOffset = splitTimeSeconds - clip.timeline_start_seconds;
    const originalDuration = clip.timeline_duration_seconds;
    const originalSourceIn = clip.source_in_seconds;
    const originalSourceOut = clip.source_out_seconds;

    // 1. Update left half
    await updateTimelineClip({
      id: clip.id,
      timeline_duration_seconds: splitOffset,
      source_out_seconds: originalSourceIn + splitOffset
    });

    // 2. Create right half
    const newClip = await addClipToTimeline({
      track_id: clip.track_id,
      project_id: clip.project_id,
      media_asset_id: clip.media_asset_id,
      clip_id: clip.clip_id,
      timeline_start_seconds: splitTimeSeconds,
      timeline_duration_seconds: originalDuration - splitOffset,
      source_in_seconds: originalSourceIn + splitOffset,
      source_out_seconds: originalSourceOut,
      volume: clip.volume,
      fade_in_seconds: 0,
      fade_out_seconds: clip.fade_out_seconds,
      z_order: clip.z_order
    });

    set({ selectedTimelineClipId: newClip.id });
  },

  duplicateTimelineClip: async (clipId: string) => {
    const { timelineClips, addClipToTimeline } = get();
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return null;

    const newStart = clip.timeline_start_seconds + clip.timeline_duration_seconds;
    const newClip = await addClipToTimeline({
      track_id: clip.track_id,
      project_id: clip.project_id,
      media_asset_id: clip.media_asset_id,
      clip_id: clip.clip_id,
      timeline_start_seconds: newStart,
      timeline_duration_seconds: clip.timeline_duration_seconds,
      source_in_seconds: clip.source_in_seconds,
      source_out_seconds: clip.source_out_seconds,
      volume: clip.volume,
      fade_in_seconds: clip.fade_in_seconds,
      fade_out_seconds: clip.fade_out_seconds,
      z_order: clip.z_order
    });

    set({ selectedTimelineClipId: newClip.id });
    return newClip;
  },

  trimTimelineClipStart: async (clipId: string, newStartSeconds: number) => {
    const { timelineClips, updateTimelineClip } = get();
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    const delta = newStartSeconds - clip.timeline_start_seconds;
    if (delta >= clip.timeline_duration_seconds - 0.1) return;

    await updateTimelineClip({
      id: clip.id,
      timeline_start_seconds: newStartSeconds,
      timeline_duration_seconds: clip.timeline_duration_seconds - delta,
      source_in_seconds: clip.source_in_seconds + delta
    });
  },

  trimTimelineClipEnd: async (clipId: string, newDurationSeconds: number) => {
    const { timelineClips, updateTimelineClip } = get();
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    if (newDurationSeconds < 0.1) return;

    await updateTimelineClip({
      id: clip.id,
      timeline_duration_seconds: newDurationSeconds,
      source_out_seconds: clip.source_in_seconds + newDurationSeconds
    });
  },

  undoTimeline: () => {
    const { timelineHistory, timelineHistoryIndex } = get();
    if (timelineHistoryIndex > 0) {
      const newIndex = timelineHistoryIndex - 1;
      set({
        timelineClips: timelineHistory[newIndex],
        timelineHistoryIndex: newIndex,
        canUndoTimeline: newIndex > 0,
        canRedoTimeline: true
      });
    }
  },

  redoTimeline: () => {
    const { timelineHistory, timelineHistoryIndex } = get();
    if (timelineHistoryIndex < timelineHistory.length - 1) {
      const newIndex = timelineHistoryIndex + 1;
      set({
        timelineClips: timelineHistory[newIndex],
        timelineHistoryIndex: newIndex,
        canUndoTimeline: true,
        canRedoTimeline: newIndex < timelineHistory.length - 1
      });
    }
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
  setPlayheadTimeSeconds: (time) =>
    set((s) => ({
      playheadTimeSeconds: typeof time === 'function' ? time(s.playheadTimeSeconds) : time,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSelectedTimelineClipId: (id) => set({ selectedTimelineClipId: id }),

  setNewProjectModalOpen: (open) => set({ isNewProjectModalOpen: open }),
  setOpenProjectModalOpen: (open) => set({ isOpenProjectModalOpen: open }),
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setRenameModalOpen: (open) => set({ isRenameModalOpen: open }),
  setDeleteModalOpen: (open, project = null) => set({ isDeleteModalOpen: open, projectToDelete: project }),
  setChromeProfileModalOpen: (open) => set({ isChromeProfileModalOpen: open }),
  setDiagnosticsModalOpen: (open) => set({ isDiagnosticsModalOpen: open }),
  setFirstLaunchModalOpen: (open) => set({ isFirstLaunchModalOpen: open }),
  clearActivePairingChallenge: () => set({ activePairingChallenge: null }),

  // Master Rebuild: Story & AI Video Actions
  setStoryText: (text) => set({ storyText: text }),
  setStoryDurationInput: (dur) => set({ storyDurationInput: dur }),
  setActiveAIPlatform: (platform) => set({ activeAIPlatform: platform }),
  setActiveStoryProfileId: (id) => set({ activeStoryProfileId: id }),
  setActiveVideoProfileId: (id) => set({ activeVideoProfileId: id }),
  setActiveGoogleAccountIndex: (idx) => set({ activeGoogleAccountIndex: idx }),
  addGoogleAccount: (label?: string) => {
    const { googleAccounts } = get();
    const newIdx = googleAccounts.length + 1;
    const newAcc = {
      id: `google-acc-${newIdx}-${Date.now().toString(36)}`,
      label: label || `Google Account ${newIdx} (Fast Veo Profile)`,
      email: `creator.acc${newIdx}@gmail.com`
    };
    set({
      googleAccounts: [...googleAccounts, newAcc],
      activeGoogleAccountIndex: googleAccounts.length
    });
  },
  setSelectedShotId: (id) => set({ selectedShotId: id }),
  setChromeWizardOpen: (open) => set({ isChromeWizardOpen: open }),

  analyzeAndBreakdownStory: async (text: string, duration?: string) => {
    const { activeProject, storyDurationInput } = get();
    if (!activeProject) return;
    const requestedDuration = duration || storyDurationInput || '1 minute';
    set({ isAnalyzingStory: true, storyText: text, storyDurationInput: requestedDuration });

    try {
      const analysis = storyAgent.analyzeStory(text, activeProject.name, requestedDuration);

      const newChars: CharacterProfile[] = analysis.characters.map((c, idx) => ({
        id: `char-${idx + 1}-${activeProject.id}`,
        project_id: activeProject.id,
        name: c.name,
        role: c.role,
        physical_description: c.appearance,
        wardrobe: c.wardrobe,
        visual_prompt_lock: c.promptLock,
        assigned_scenes: ['1']
      }));

      const newEnvs: EnvironmentProfile[] = analysis.environments.map((e, idx) => ({
        id: `env-${idx + 1}-${activeProject.id}`,
        project_id: activeProject.id,
        name: e.name,
        location_type: e.type,
        time_of_day: e.timeOfDay,
        weather: 'Cinematic Atmosphere',
        atmosphere: e.lightingRules,
        lighting_rules: e.lightingRules,
        visual_prompt_lock: e.promptLock
      }));

      const newScenes: Scene[] = [];
      const newClips: Clip[] = [];

      analysis.scenes.forEach((sc, scIdx) => {
        const sceneId = `scene-${scIdx + 1}-${activeProject.id}`;
        newScenes.push({
          id: sceneId,
          project_id: activeProject.id,
          sequence_number: sc.sceneNumber,
          title: `Scene ${sc.sceneNumber}: ${sc.title}`,
          dramatic_beat: sc.dramaticBeat,
          estimated_duration_seconds: sc.targetDurationSeconds || 10,
          created_at: Date.now(),
          updated_at: Date.now()
        });

        newClips.push({
          id: `clip-${sc.sceneNumber}-${activeProject.id}`,
          scene_id: sceneId,
          project_id: activeProject.id,
          clip_number: sc.sceneNumber,
          target_duration_seconds: sc.targetDurationSeconds || 10,
          camera_framing: sc.framing,
          camera_angle: sc.angle,
          camera_movement: sc.movement,
          subject_action: sc.subjectAction,
          lighting_setup: sc.lightingSetup,
          status: 'PROMPT_READY',
          assigned_provider: 'Google Veo',
          video_prompt: sc.videoPrompt,
          negative_prompt: sc.negativePrompt,
          first_frame_description: sc.firstFrameDescription,
          last_frame_description: sc.lastFrameDescription,
          character_references: [analysis.characters[0]?.name].filter(Boolean),
          continuity_instructions: sc.continuityInstructions,
          continuity_record: sc.continuityRecord,
          sound_effects: sc.soundEffects,
          music_cue: sc.musicCue,
          transition_instruction: sc.transitionInstruction,
          created_at: Date.now() + scIdx * 10,
          updated_at: Date.now() + scIdx * 10
        });
      });

      await apiService.saveScenesAndClips(activeProject.id, newScenes, newClips);

      localStorage.setItem(`cinematic_chars_${activeProject.id}`, JSON.stringify(newChars));
      localStorage.setItem(`cinematic_envs_${activeProject.id}`, JSON.stringify(newEnvs));
      localStorage.setItem(`cinematic_story_${activeProject.id}`, text);

      set({
        storyAnalysis: analysis,
        characters: newChars,
        environments: newEnvs,
        scenes: newScenes,
        clips: newClips,
        selectedSceneId: newScenes[0]?.id || null,
        selectedClipId: newClips[0]?.id || null,
        selectedShotId: newClips[0]?.id || null,
        isAnalyzingStory: false
      });
    } catch (err) {
      console.error('Failed to analyze story:', err);
      set({ isAnalyzingStory: false });
    }
  },

  generateShotVideo: async (clipId: string) => {
    const { clips, activeProject, registeredProfiles, activeVideoProfileId } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !activeProject) return;

    // Check if an active registered profile exists and is paired
    const activeProfile = registeredProfiles.find(p => p.id === activeVideoProfileId) || registeredProfiles[0];
    const isPaired = activeProfile && activeProfile.pairing_state === 'PAIRED';

    // Truthful lifecycle: transition to WAITING_FOR_PROVIDER or HUMAN_ACTION_REQUIRED
    const nextStatus: ClipStatus = isPaired ? 'HUMAN_ACTION_REQUIRED' : 'WAITING_FOR_PROVIDER';

    const updatedClip: Clip = {
      ...clip,
      status: nextStatus,
      assigned_provider: activeProfile?.assigned_provider || 'Google Veo',
      updated_at: Date.now()
    };
    await apiService.updateClip(updatedClip);
    set(state => ({
      clips: state.clips.map(c => c.id === clipId ? updatedClip : c),
      selectedClipId: clipId,
      selectedShotId: clipId
    }));
  },

  startShotQueue: async () => {
    const { clips, generateShotVideo, shotQueueState } = get();
    if (shotQueueState === 'RUNNING') return;
    set({ shotQueueState: 'RUNNING' });

    const pendingClips = clips.filter(c => ['NOT_STARTED', 'PLANNED', 'PROMPT_READY', 'IDLE'].includes(c.status));
    for (const clip of pendingClips) {
      if (get().shotQueueState !== 'RUNNING') {
        break;
      }
      await generateShotVideo(clip.id);
    }

    set({ shotQueueState: 'IDLE' });
  },

  pauseShotQueue: () => set({ shotQueueState: 'PAUSED' }),
  resumeShotQueue: () => {
    set({ shotQueueState: 'RUNNING' });
    get().startShotQueue();
  },

  retryFailedShot: async (clipId: string) => {
    await get().generateShotVideo(clipId);
  },

  verifyAndCompleteClip: async (clipId: string, filePath: string): Promise<boolean> => {
    const { clips } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return false;

    // Transition to VERIFYING status first
    const verifyingClip: Clip = {
      ...clip,
      status: 'VERIFYING',
      updated_at: Date.now()
    };
    await apiService.updateClip(verifyingClip);
    set(state => ({
      clips: state.clips.map(c => c.id === clipId ? verifyingClip : c)
    }));

    const probe = await apiService.probeMedia(filePath);
    if (probe.success && probe.file_size_bytes > 0) {
      const completedClip: Clip = {
        ...clip,
        status: 'COMPLETED',
        output_video_path: filePath,
        proxy_path: filePath,
        verified_duration_seconds: probe.duration_seconds || clip.target_duration_seconds,
        verified_width: probe.width || 1920,
        verified_height: probe.height || 1080,
        verified_fps: probe.fps || 24,
        verified_codec: probe.video_codec || 'h264',
        verified_file_size_bytes: probe.file_size_bytes,
        verified_sha256: probe.checksum_sha256,
        verification_error: undefined,
        updated_at: Date.now()
      };
      await apiService.updateClip(completedClip);
      set(state => ({
        clips: state.clips.map(c => c.id === clipId ? completedClip : c)
      }));
      return true;
    } else {
      const failedClip: Clip = {
        ...clip,
        status: 'FAILED',
        verification_error: probe.error || 'Media file could not be verified by FFprobe or is 0 bytes',
        updated_at: Date.now()
      };
      await apiService.updateClip(failedClip);
      set(state => ({
        clips: state.clips.map(c => c.id === clipId ? failedClip : c)
      }));
      return false;
    }
  },

  addClipDirectlyToTimeline: async (clipId: string) => {
    const { clips, activeProject, timelineTracks, timelineClips, addClipToTimeline } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !activeProject) return;

    const targetTrack = timelineTracks.find(t => t.track_type === 'VIDEO' && t.track_index === 1) || timelineTracks[0];
    if (!targetTrack) return;

    const trackClips = timelineClips.filter(tc => tc.track_id === targetTrack.id);
    const lastClipEnd = trackClips.reduce((max, c) => Math.max(max, c.timeline_start_seconds + c.timeline_duration_seconds), 0);

    await addClipToTimeline({
      track_id: targetTrack.id,
      project_id: activeProject.id,
      media_asset_id: clip.id,
      clip_id: clip.id,
      timeline_start_seconds: lastClipEnd,
      timeline_duration_seconds: clip.verified_duration_seconds || clip.target_duration_seconds || 10,
      source_in_seconds: 0,
      source_out_seconds: clip.verified_duration_seconds || clip.target_duration_seconds || 10
    });
  },

  assembleCompletedScenes: async () => {
    const { clips, activeProject, timelineTracks, addClipToTimeline, createMediaAsset } = get();
    if (!activeProject) return;

    let v1Track = timelineTracks.find(t => t.track_type === 'VIDEO' && t.track_index === 1);
    if (!v1Track) {
      v1Track = timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
    }
    if (!v1Track) return;

    // Only assemble genuinely verified, completed, imported, or downloaded clips that have valid media files
    const readyClips = clips.filter(c =>
      ['COMPLETED', 'IMPORTED', 'DOWNLOADED'].includes(c.status) &&
      Boolean(c.output_video_path || c.proxy_path)
    );

    if (readyClips.length === 0) {
      console.warn('[Timeline Assembly] No verified video clips available for assembly. Complete or import real media files first.');
      set({ mainView: 'VIDEO_EDITOR' });
      return;
    }

    const sortedClips = [...readyClips].sort((a, b) => a.clip_number - b.clip_number);

    let currentTimelineSeconds = 0;
    for (const clip of sortedClips) {
      const duration = clip.verified_duration_seconds || clip.target_duration_seconds || 10;
      const mediaPath = clip.output_video_path || clip.proxy_path || '';
      const fileSize = clip.verified_file_size_bytes || 1024;

      const asset = await createMediaAsset({
        project_id: activeProject.id,
        file_name: `Scene_${String(clip.clip_number).padStart(3, '0')}.mp4`,
        file_path: mediaPath,
        media_type: 'VIDEO',
        file_size_bytes: fileSize,
        duration_seconds: duration,
        fps: clip.verified_fps || activeProject.target_fps || 24,
        proxy_path: clip.proxy_path || mediaPath
      });

      await addClipToTimeline({
        track_id: v1Track.id,
        project_id: activeProject.id,
        media_asset_id: asset.id,
        clip_id: clip.id,
        timeline_start_seconds: currentTimelineSeconds,
        timeline_duration_seconds: duration,
        source_in_seconds: 0,
        source_out_seconds: duration,
        volume: 1.0,
        scale: 1.0,
        opacity: 1.0
      });

      currentTimelineSeconds += duration;
    }

    set({ mainView: 'VIDEO_EDITOR' });
  },

  markSceneStatus: async (clipId: string, status: any) => {
    const { clips } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    const updated: Clip = {
      ...clip,
      status,
      updated_at: Date.now()
    };
    await apiService.updateClip(updated);
    set(state => ({
      clips: state.clips.map(c => c.id === clipId ? updated : c)
    }));
  },

  attachDownloadedVideoToScene: async (clipId: string, filePath: string, proxyUrl?: string) => {
    const { clips, activeProject, verifyAndCompleteClip } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !activeProject) return;

    if (filePath) {
      const verified = await verifyAndCompleteClip(clipId, filePath);
      if (verified) return;
    }

    const updated: Clip = {
      ...clip,
      status: 'IMPORTED',
      output_video_path: filePath || undefined,
      proxy_path: proxyUrl || filePath || undefined,
      thumbnail_path: undefined,
      updated_at: Date.now()
    };
    await apiService.updateClip(updated);
    set(state => ({
      clips: state.clips.map(c => c.id === clipId ? updated : c)
    }));
  },

  detachAudioFromClip: async (timelineClipId: string) => {
    const { timelineClips, timelineTracks, addClipToTimeline, updateTimelineClip, activeProject } = get();
    if (!activeProject) return;
    const targetClip = timelineClips.find(c => c.id === timelineClipId);
    if (!targetClip) return;

    let a1Track = timelineTracks.find(t => t.track_type === 'AUDIO' && t.track_index === 1);
    if (!a1Track) {
      a1Track = timelineTracks.find(t => t.track_type === 'AUDIO');
    }
    if (!a1Track) return;

    await updateTimelineClip({
      id: targetClip.id,
      volume: 0.0,
      is_muted: true
    });

    await addClipToTimeline({
      track_id: a1Track.id,
      project_id: activeProject.id,
      media_asset_id: targetClip.media_asset_id,
      clip_id: targetClip.clip_id,
      timeline_start_seconds: targetClip.timeline_start_seconds,
      timeline_duration_seconds: targetClip.timeline_duration_seconds,
      source_in_seconds: targetClip.source_in_seconds,
      source_out_seconds: targetClip.source_out_seconds,
      volume: 1.0
    });
  },
}));


import { create } from 'zustand';
import { Project, Scene, Clip, SystemTelemetry, AppSettings } from '../types';
import { apiService } from '../services/api';

interface StudioState {
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
  
  // Telemetry & Settings
  telemetry: SystemTelemetry | null;
  settings: AppSettings | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, synopsis?: string) => Promise<Project>;
  openProject: (projectId: string) => Promise<void>;
  closeProject: () => Promise<void>;
  renameProject: (newName: string) => Promise<void>;
  saveCurrentProject: () => Promise<void>;
  
  fetchWorkspaceData: (projectId: string) => Promise<void>;
  selectClip: (clipId: string | null) => void;
  selectScene: (sceneId: string | null) => void;
  seed360Clips: () => Promise<void>;

  refreshTelemetry: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;

  setNewProjectModalOpen: (open: boolean) => void;
  setOpenProjectModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setRenameModalOpen: (open: boolean) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
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

  telemetry: null,
  settings: null,

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

  createProject: async (name: string, synopsis?: string) => {
    const project = await apiService.createProject({ name, synopsis });
    set(state => ({
      projects: [project, ...state.projects],
      activeProject: project,
      isNewProjectModalOpen: false,
    }));
    await get().fetchWorkspaceData(project.id);
    return project;
  },

  openProject: async (projectId: string) => {
    const project = await apiService.openProject(projectId);
    set({ activeProject: project, isOpenProjectModalOpen: false });
    await get().fetchWorkspaceData(project.id);
  },

  closeProject: async () => {
    await apiService.closeProject();
    set({ 
      activeProject: null, 
      scenes: [], 
      clips: [], 
      selectedClipId: null, 
      selectedSceneId: null 
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

  saveCurrentProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;
    await apiService.saveProject(activeProject);
  },

  fetchWorkspaceData: async (projectId: string) => {
    set({ isLoadingClips: true });
    try {
      const [scenes, clips] = await Promise.all([
        apiService.getScenes(projectId),
        apiService.getClips(projectId)
      ]);
      set({
        scenes,
        clips,
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

  setNewProjectModalOpen: (open) => set({ isNewProjectModalOpen: open }),
  setOpenProjectModalOpen: (open) => set({ isOpenProjectModalOpen: open }),
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setRenameModalOpen: (open) => set({ isRenameModalOpen: open }),
}));

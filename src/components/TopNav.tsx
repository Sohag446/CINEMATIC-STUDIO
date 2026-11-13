import React from 'react';
import { 
  Film, 
  FolderPlus, 
  FolderOpen, 
  Save, 
  Cpu, 
  Settings, 
  Layers, 
  CheckCircle2, 
  Edit3, 
  XSquare,
  Sparkles,
  Trash2,
  FolderTree,
  Share2
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const TopNav: React.FC = () => {
  const { 
    activeProject, 
    telemetry, 
    saveCurrentProject, 
    closeProject,
    setNewProjectModalOpen, 
    setOpenProjectModalOpen, 
    setSettingsModalOpen,
    setRenameModalOpen,
    setDeleteModalOpen,
    seed360Clips,
    clips,
    registeredProfiles,
    setChromeProfileModalOpen,
    setMediaLibraryModalOpen,
    setExportModalOpen
  } = useStudioStore();

  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  const handleSave = async () => {
    await saveCurrentProject();
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  return (
    <header className="h-14 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-4 select-none shrink-0 z-20">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-studio-accent font-bold tracking-wider text-base">
          <Film className="w-5 h-5 text-studio-accent animate-pulse" />
          <span className="text-slate-100 font-mono">CINEMATIC<span className="text-studio-accent">STUDIO</span></span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-studio-800 text-slate-300 border border-studio-700">
            Phase 1-4 Engine
          </span>
        </div>

        <div className="h-5 w-[1px] bg-studio-800 mx-2" />

        {/* Current Active Project */}
        {activeProject ? (
          <div className="flex items-center space-x-2 bg-studio-850 border border-studio-750 px-2.5 py-1 rounded">
            <span className="text-xs text-slate-400 font-mono">Project:</span>
            <span className="text-xs font-semibold text-slate-200">{activeProject.name}</span>
            <span className="text-[10px] text-studio-cyan font-mono px-1 bg-studio-800 rounded">
              {activeProject.target_aspect_ratio} • {activeProject.target_fps}fps
            </span>
            <button
              onClick={() => setRenameModalOpen(true)}
              title="Rename Project"
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeProject}
              title="Close Project"
              className="text-slate-400 hover:text-amber-400 transition-colors p-0.5"
            >
              <XSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteModalOpen(true, activeProject)}
              title="Delete Project Vault"
              className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic font-mono">
            No Project Active — Create or Open a Project to begin
          </div>
        )}
      </div>

      {/* Center Actions (Project & Benchmark) */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setNewProjectModalOpen(true)}
          className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5 text-studio-accent" />
          <span>New Project</span>
        </button>

        <button
          onClick={() => setOpenProjectModalOpen(true)}
          className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Open Project</span>
        </button>

        {activeProject && (
          <>
            <button
              onClick={handleSave}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${
                isSavedRecently 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' 
                  : 'bg-studio-800 hover:bg-studio-750 text-slate-200 border-studio-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavedRecently ? 'Saved!' : 'Save'}</span>
            </button>

            <button
              onClick={() => setMediaLibraryModalOpen(true)}
              title="Open Project Media Vault (Clips, Audio, Assets)"
              className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
            >
              <FolderTree className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Media Vault</span>
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              title="Render Timeline to Master MP4 with FFmpeg"
              className="flex items-center space-x-1.5 text-xs bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent px-3 py-1.5 rounded border border-studio-accent/40 transition-colors font-medium"
            >
              <Share2 className="w-3.5 h-3.5 text-studio-accent" />
              <span>Export Video</span>
            </button>

            {clips.length < 50 && (
              <button
                onClick={seed360Clips}
                title="Generates 360 clip records to benchmark virtualization and low-memory performance"
                className="flex items-center space-x-1.5 text-xs bg-studio-850 hover:bg-studio-800 text-amber-300 px-2.5 py-1.5 rounded border border-amber-800/60 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Benchmark (360 Clips)</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Right Status, Telemetry & Settings */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        {/* Chrome Profile Manager Button */}
        <button 
          onClick={() => setChromeProfileModalOpen(true)}
          className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-800 hover:border-studio-700 px-2.5 py-1 rounded text-slate-300 transition-colors cursor-pointer"
          title="Open Chrome Profiles & Extension Pairing Manager"
        >
          <Layers className="w-3.5 h-3.5 text-studio-cyan" />
          <span className="text-[11px] font-mono">Profiles:</span>
          <span className="text-[10px] text-studio-cyan bg-studio-900 border border-studio-750 px-1.5 py-0.5 rounded font-mono font-semibold">
            {registeredProfiles.length} Registered
          </span>
        </button>

        {/* Telemetry Pill */}
        {telemetry && (
          <div className="flex items-center space-x-2 bg-studio-950 border border-studio-800 px-2.5 py-1 rounded text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
            <span className="text-[11px]">RAM: <span className="text-studio-accent font-semibold">{telemetry.app_process_memory_mb} MB</span></span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px]">Sys: {telemetry.memory_percent}%</span>
          </div>
        )}

        {/* Production Status */}
        <div className="flex items-center space-x-1.5 bg-studio-850 border border-studio-800 px-2.5 py-1 rounded text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] text-emerald-300 uppercase">Ready</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          title="Open Settings"
          className="text-slate-400 hover:text-slate-200 bg-studio-850 hover:bg-studio-800 border border-studio-800 p-1.5 rounded transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};


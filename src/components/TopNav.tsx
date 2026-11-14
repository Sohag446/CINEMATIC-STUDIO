import React from 'react';
import { 
  FolderPlus, 
  Save, 
  Settings, 
  Sparkles,
  SlidersHorizontal,
  Home,
  Film,
  FolderTree,
  Sliders,
  ShieldCheck,
  Share2,
  Info
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const TopNav: React.FC = () => {
  const { 
    activeProject, 
    saveCurrentProject, 
    setNewProjectModalOpen, 
    setSettingsModalOpen,
    setIsAboutModalOpen,
    mainView,
    setMainView,
    isBeginnerMode,
    toggleBeginnerMode,
    registeredProfiles,
    isInspectorOpen,
    toggleInspector,
    setChromeWizardOpen,
    setExportModalOpen
  } = useStudioStore();

  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  const handleSave = async () => {
    await saveCurrentProject();
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const isHomeActive = mainView === 'HOME' || mainView === 'PRODUCTIONS';
  const isAIWorkspaceActive = mainView === 'AI_WORKSPACE' || mainView === 'AI_VIDEO';
  const isProjectsActive = mainView === 'PROJECTS';
  const isVideoEditorActive = mainView === 'VIDEO_EDITOR' || mainView === 'STUDIO';
  const isSettingsActive = mainView === 'SETTINGS';

  return (
    <header className="h-10 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-3 select-none shrink-0 z-20 font-sans text-xs">

      {/* 1. Left: Exact 5-Section Primary Desktop Navigation */}
      <div className="flex items-center space-x-2">
        <nav className="flex items-center bg-studio-950 p-0.5 rounded-lg border border-studio-800 text-[11px] space-x-0.5">
          {/* 1. Home */}
          <button
            onClick={() => setMainView('HOME')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isHomeActive
                ? 'bg-studio-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dashboard Overview & Getting Started (Ctrl+1)"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {/* 2. AI Workspace */}
          <button
            onClick={() => {
              if (activeProject) setMainView('AI_WORKSPACE');
              else setNewProjectModalOpen(true);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isAIWorkspaceActive
                ? 'bg-purple-900 text-white font-semibold shadow-sm border border-purple-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="AI Story & Video Generator (Ctrl+2)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Workspace</span>
          </button>

          {/* 3. Projects */}
          <button
            onClick={() => setMainView('PROJECTS')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isProjectsActive
                ? 'bg-blue-900 text-white font-semibold shadow-sm border border-blue-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Manage Projects & Canvas Settings (Ctrl+3)"
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-400" />
            <span>Projects</span>
          </button>

          {/* 4. Video Editor */}
          <button
            onClick={() => {
              if (activeProject) setMainView('VIDEO_EDITOR');
              else setNewProjectModalOpen(true);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isVideoEditorActive
                ? 'bg-studio-cyan text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="CapCut-Style Multitrack Video Editor (Ctrl+4)"
          >
            <Film className="w-3.5 h-3.5 text-slate-950" />
            <span>Video Editor</span>
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => {
              setMainView('SETTINGS');
              setSettingsModalOpen(true);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isSettingsActive
                ? 'bg-studio-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Settings, Storage & Engine Setup (Ctrl+5)"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Chrome Integration Pill */}
        <button
          onClick={() => setChromeWizardOpen(true)}
          className="flex items-center space-x-1.5 bg-studio-950 hover:bg-studio-850 px-2.5 py-1 rounded-lg border border-studio-800 text-[11px] text-slate-300 transition-colors"
          title="Open Chrome Pairing Wizard"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">Chrome:</span>
          <span className="text-emerald-400 font-semibold font-mono">
            {registeredProfiles.length > 0 ? `${registeredProfiles.length} Paired` : 'Connect'}
          </span>
        </button>
      </div>

      {/* 2. Center: Active Project Specs & Actions */}
      <div className="flex items-center space-x-2 text-[11px]">
        {activeProject && (
          <div className="hidden lg:flex items-center space-x-2 font-mono text-slate-400 mr-1">
            <span className="font-semibold text-white truncate max-w-[140px]">{activeProject.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-studio-950 text-studio-cyan border border-studio-800">
              {activeProject.target_aspect_ratio}
            </span>
          </div>
        )}

        <button
          onClick={() => setNewProjectModalOpen(true)}
          className="flex items-center space-x-1 bg-studio-850 hover:bg-studio-800 text-white px-2.5 py-1 rounded border border-studio-750 transition-colors font-medium text-[11px]"
        >
          <FolderPlus className="w-3 h-3 text-studio-accent" />
          <span>New</span>
        </button>

        {activeProject && (
          <button
            onClick={handleSave}
            className={`flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded border transition-colors ${
              isSavedRecently
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 font-semibold'
                : 'bg-studio-850 hover:bg-studio-800 text-slate-200 border-studio-750'
            }`}
          >
            <Save className="w-3 h-3" />
            <span>{isSavedRecently ? 'Saved!' : 'Save'}</span>
          </button>
        )}

        {/* Master Film Export Button */}
        {activeProject && (
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center space-x-1 bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent-light border border-studio-accent/40 px-2.5 py-1 rounded transition-colors font-medium text-[11px]"
          >
            <Share2 className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>

      {/* 3. Right: Inspector Toggle & Workspace Mode */}
      <div className="flex items-center space-x-1.5 text-[11px]">
        {/* Toggle Inspector Button */}
        <button
          onClick={toggleInspector}
          className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
            isInspectorOpen
              ? 'bg-studio-800 border-studio-700 text-white'
              : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Context Inspector Panel (Ctrl+I)"
        >
          <Sliders className="w-3 h-3 text-studio-accent" />
          <span className="hidden sm:inline">Inspector</span>
        </button>

        {/* Beginner vs Advanced Mode Toggle */}
        <button
          onClick={toggleBeginnerMode}
          className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
            isBeginnerMode
              ? 'bg-purple-950/50 border-purple-800/80 text-purple-300 font-medium'
              : 'bg-studio-850 border-studio-750 text-slate-300 font-medium'
          }`}
          title="Toggle Director / Engineer Mode (Ctrl+B)"
        >
          {isBeginnerMode ? (
            <>
              <Sparkles className="w-3 h-3 text-studio-accent" />
              <span>Director Mode</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-3 h-3 text-studio-cyan" />
              <span>Engineer Mode</span>
            </>
          )}
        </button>

        {/* About Shortcut */}
        <button
          onClick={() => setIsAboutModalOpen(true)}
          title="About Cinematic Studio"
          className="p-1 rounded text-slate-400 hover:text-white bg-studio-850 hover:bg-studio-800 border border-studio-800 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

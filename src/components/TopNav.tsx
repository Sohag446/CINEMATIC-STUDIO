import React from 'react';
import { 
  FolderPlus, 
  Save, 
  Settings, 
  Sparkles,
  SlidersHorizontal,
  Home,
  Compass,
  FolderTree,
  Info,
  Bot,
  Sliders
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
    toggleInspector
  } = useStudioStore();

  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  const handleSave = async () => {
    await saveCurrentProject();
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  return (
    <header className="h-9 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-3 select-none shrink-0 z-20 font-sans text-xs">

      {/* 1. Left: Workspace Page Switcher */}
      <div className="flex items-center space-x-1">
        <nav className="flex items-center bg-studio-950 p-0.5 rounded-lg border border-studio-800 text-[11px]">
          <button
            onClick={() => setMainView('PRODUCTIONS')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors font-medium ${
              mainView === 'PRODUCTIONS'
                ? 'bg-studio-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3 h-3" />
            <span>Productions</span>
          </button>

          {activeProject && (
            <button
              onClick={() => setMainView('STUDIO')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors font-medium ${
                mainView === 'STUDIO'
                  ? 'bg-studio-accent text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span className="truncate max-w-[160px]">Studio: {activeProject.name}</span>
            </button>
          )}

          <button
            onClick={() => setMainView('AI_PROVIDERS')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors font-medium ${
              mainView === 'AI_PROVIDERS'
                ? 'bg-studio-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3 h-3 text-purple-400" />
            <span>AI Providers</span>
            {registeredProfiles.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setMainView('MEDIA_VAULT')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors font-medium ${
              mainView === 'MEDIA_VAULT'
                ? 'bg-studio-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3 h-3 text-studio-cyan" />
            <span>Media Vault</span>
          </button>
        </nav>
      </div>

      {/* 2. Center: Active Project Specs & Actions */}
      <div className="flex items-center space-x-2 text-[11px]">
        {activeProject && mainView === 'STUDIO' && (
          <div className="hidden lg:flex items-center space-x-2 font-mono text-slate-400 mr-2">
            <span className="px-1.5 py-0.5 rounded bg-studio-950 text-studio-cyan border border-studio-800">
              {activeProject.target_aspect_ratio}
            </span>
            <span>•</span>
            <span>{activeProject.target_fps} fps</span>
          </div>
        )}

        <button
          onClick={() => setNewProjectModalOpen(true)}
          className="flex items-center space-x-1 bg-studio-850 hover:bg-studio-800 text-white px-2.5 py-1 rounded border border-studio-750 transition-colors font-medium text-[11px]"
        >
          <FolderPlus className="w-3 h-3 text-studio-accent" />
          <span>New Production</span>
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

        {/* Global Settings Shortcut */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          title="Studio Settings"
          className="p-1 rounded text-slate-400 hover:text-white bg-studio-850 hover:bg-studio-800 border border-studio-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
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

import React, { useState, useEffect } from 'react';
import {
  Film,
  Minus,
  Square,
  X,
  Copy,
  Sparkles,
  SlidersHorizontal,
  Lock,
  Save,
  FolderPlus,
  Settings,
  Info
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';
import { isTauriEnvironment } from '../services/api';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  icon?: any;
  disabled?: boolean;
  type?: 'separator';
}

interface MenuGroup {
  id: string;
  label: string;
  children: MenuItem[];
}

export const DesktopTitleBar: React.FC = () => {
  const {
    activeProject,
    saveCurrentProject,
    setNewProjectModalOpen,
    setSettingsModalOpen,
    setIsAboutModalOpen,
    setMainView,
    isBeginnerMode,
    toggleBeginnerMode,
    toggleInspector,
    setDiagnosticsModalOpen,
    setFirstLaunchModalOpen,
    undoTimeline,
    redoTimeline,
    canUndoTimeline,
    canRedoTimeline
  } = useStudioStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    const handleWindowClick = () => setActiveMenu(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const handleMinimize = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch (err) {
        console.warn('Native minimize call failed:', err);
      }
    }
  };

  const handleToggleMaximize = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.toggleMaximize();
        const max = await win.isMaximized();
        setIsMaximized(max);
      } catch (err) {
        console.warn('Native toggleMaximize call failed:', err);
      }
    } else {
      setIsMaximized(!isMaximized);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleClose = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (err) {
        console.warn('Native close call failed:', err);
      }
    } else {
      if (confirm('Close Cinematic Studio? Any unsaved edits will be discarded.')) {
        window.close();
      }
    }
  };

  const handleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await saveCurrentProject();
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const menuItems: MenuGroup[] = [
    {
      id: 'file',
      label: 'File',
      children: [
        { label: 'New Production...', shortcut: 'Ctrl+N', action: () => setNewProjectModalOpen(true), icon: FolderPlus },
        { label: 'Save Project', shortcut: 'Ctrl+S', action: () => { handleSave(); }, icon: Save, disabled: !activeProject },
        { type: 'separator' },
        { label: 'Preferences & Storage Settings...', action: () => setSettingsModalOpen(true), icon: Settings },
        { type: 'separator' },
        { label: 'Exit Cinematic Studio', shortcut: 'Alt+F4', action: () => { handleClose(); } }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      children: [
        { label: 'Undo Timeline Edit', shortcut: 'Ctrl+Z', disabled: !canUndoTimeline, action: () => undoTimeline() },
        { label: 'Redo Timeline Edit', shortcut: 'Ctrl+Y', disabled: !canRedoTimeline, action: () => redoTimeline() },
        { type: 'separator' },
        { label: 'Toggle Director / Engineer Mode', shortcut: 'Ctrl+B', action: () => toggleBeginnerMode(), icon: isBeginnerMode ? Sparkles : SlidersHorizontal },
        { label: 'Toggle Property Inspector', shortcut: 'Ctrl+I', action: () => toggleInspector() }
      ]
    },
    {
      id: 'view',
      label: 'View',
      children: [
        { label: '1. Home Dashboard', shortcut: 'Ctrl+1', action: () => setMainView('HOME') },
        { label: '2. AI Workspace (Story & Video)', shortcut: 'Ctrl+2', action: () => { if (activeProject) setMainView('AI_WORKSPACE'); else setNewProjectModalOpen(true); } },
        { label: '3. Projects & Canvas Settings', shortcut: 'Ctrl+3', action: () => setMainView('PROJECTS') },
        { label: '4. Video Editor (CapCut Multitrack)', shortcut: 'Ctrl+4', action: () => { if (activeProject) setMainView('VIDEO_EDITOR'); else setNewProjectModalOpen(true); } },
        { label: '5. Settings & Diagnostics', shortcut: 'Ctrl+5', action: () => { setMainView('SETTINGS'); setSettingsModalOpen(true); } },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', shortcut: 'F11', action: () => { handleToggleMaximize(); } }
      ]
    },
    {
      id: 'pipeline',
      label: 'Workflow',
      children: [
        { label: '1. Project Home', action: () => setMainView('HOME') },
        { label: '2. AI Assistant & Video Generator', action: () => { if (activeProject) setMainView('AI_WORKSPACE'); else setNewProjectModalOpen(true); } },
        { label: '3. Projects Manager', action: () => setMainView('PROJECTS') },
        { label: '4. CapCut Multitrack Video Editor', action: () => { if (activeProject) setMainView('VIDEO_EDITOR'); else setNewProjectModalOpen(true); } },
        { label: '5. Engine Settings', action: () => { setMainView('SETTINGS'); setSettingsModalOpen(true); } }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      children: [
        { label: 'Installation & Chrome Diagnostics...', action: () => setDiagnosticsModalOpen(true) },
        { label: 'First-Launch Setup Wizard...', action: () => setFirstLaunchModalOpen(true) },
        { type: 'separator' },
        { label: 'Check for Updates...', action: () => window.open('https://github.com/Sohag446/CINEMATIC-STUDIO/releases', '_blank') },
        { type: 'separator' },
        { label: 'About Cinematic Studio (v3.0.0)...', action: () => setIsAboutModalOpen(true), icon: Info },
        { label: 'Developer: Md. Sohag Hossen', action: () => window.open('https://github.com/Sohag446', '_blank') },
        { label: 'Official GitHub Repository', action: () => window.open('https://github.com/Sohag446/CINEMATIC-STUDIO', '_blank') }
      ]
    }
  ];

  return (
    <div
      className="h-8 bg-studio-950 border-b border-studio-850 flex items-center justify-between select-none shrink-0 z-50 text-xs font-sans"
      data-tauri-drag-region
    >
      {/* 1. Left: Brand Icon + Desktop Menu Bar */}
      <div className="flex items-center space-x-1 pl-2">
        <div
          onClick={() => setMainView('HOME')}
          className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-studio-850 cursor-pointer transition-colors"
          title="Cinematic Studio — Home"
        >
          <div className="w-4 h-4 rounded bg-purple-950/80 border border-purple-700 flex items-center justify-center text-studio-accent">
            <Film className="w-2.5 h-2.5" />
          </div>
          <span className="font-mono text-[11px] font-bold tracking-wider text-slate-200">
            CINEMATIC<span className="text-studio-accent">STUDIO</span>
          </span>
        </div>

        {/* Menu Bar Items */}
        <div className="flex items-center space-x-0.5 text-[11px] text-slate-300">
          {menuItems.map(menu => (
            <div key={menu.id} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === menu.id ? null : menu.id);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === menu.id ? 'bg-studio-800 text-white' : 'hover:bg-studio-850 hover:text-white'
                }`}
              >
                {menu.label}
              </button>

              {activeMenu === menu.id && (
                <div
                  className="absolute left-0 top-full mt-0.5 w-60 bg-studio-900 border border-studio-750 rounded-lg shadow-2xl py-1 z-50 text-xs font-sans text-slate-200 animate-in fade-in duration-75"
                  onClick={(e) => e.stopPropagation()}
                >
                  {menu.children.map((item, idx) => {
                    if (item.type === 'separator') {
                      return <div key={idx} className="my-1 border-t border-studio-800" />;
                    }

                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          if (!item.disabled && item.action) {
                            item.action();
                            setActiveMenu(null);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                          item.disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-studio-accent hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.shortcut && (
                          <span className="text-[10px] font-mono text-slate-400 group-hover:text-white ml-2">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Center: Document Window Title & Drag Region */}
      <div
        className="flex-1 flex items-center justify-center space-x-2 text-[11px] font-mono text-slate-400 px-4 truncate cursor-default"
        data-tauri-drag-region
      >
        {activeProject ? (
          <>
            <span className="text-white font-semibold truncate">{activeProject.name}</span>
            <span className="text-slate-600">—</span>
            <span className="text-studio-cyan">{activeProject.target_aspect_ratio}</span>
            <span className="text-slate-600">•</span>
            <span>{activeProject.target_fps} fps</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400/90 text-[10px]">SQLite v3</span>
            {isSavedRecently && (
              <span className="text-[10px] text-emerald-400 font-sans ml-1">● Saved</span>
            )}
          </>
        ) : (
          <span className="text-slate-500">CINEMATIC STUDIO — Professional AI Video Production Suite</span>
        )}
      </div>

      {/* 3. Right: Desktop System Indicators + Window Control Buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        <div
          className="hidden md:flex items-center space-x-1 px-2 py-0.5 rounded bg-studio-900 border border-studio-800 text-[10px] font-mono text-studio-cyan mr-1"
          title="RAM Protection: Sequential browser execution policy enforced"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>1 TASK LOCK</span>
        </div>

        <button
          onClick={toggleBeginnerMode}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors mr-1 ${
            isBeginnerMode
              ? 'bg-purple-950/60 border-purple-800/80 text-purple-300'
              : 'bg-studio-900 border-studio-800 text-slate-300'
          }`}
          title="Toggle Director / Engineer Mode (Ctrl+B)"
        >
          {isBeginnerMode ? <Sparkles className="w-2.5 h-2.5 text-studio-accent" /> : <SlidersHorizontal className="w-2.5 h-2.5 text-studio-cyan" />}
          <span>{isBeginnerMode ? 'DIRECTOR' : 'ENGINEER'}</span>
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
            title={isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-11 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

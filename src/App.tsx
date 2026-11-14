import React, { useEffect } from 'react';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { TopNav } from './components/TopNav';
import { DesktopStatusBar } from './components/DesktopStatusBar';
import { SimpleProjectHome } from './features/home/SimpleProjectHome';
import { AIVideoWorkspace } from './features/aivideo/AIVideoWorkspace';
import { StudioNLEWorkspace } from './features/studio/StudioNLEWorkspace';
import { ProjectsManagerView } from './features/projects/ProjectsManagerView';
import { AIProviderCenter } from './features/providers/AIProviderCenter';
import { MediaVaultView } from './features/media/MediaVaultView';
import { NewProjectModal } from './features/projects/NewProjectModal';
import { OpenProjectModal } from './features/projects/OpenProjectModal';
import { RenameProjectModal } from './features/projects/RenameProjectModal';
import { DeleteProjectModal } from './features/projects/DeleteProjectModal';
import { SettingsModal } from './features/settings/SettingsModal';
import { ChromeProfileManagerModal } from './features/profiles/ChromeProfileManagerModal';
import { ChromeSetupWizardModal } from './features/profiles/ChromeSetupWizardModal';
import { InstallationDiagnosticsModal } from './features/settings/InstallationDiagnosticsModal';
import { FirstLaunchSetupModal } from './features/setup/FirstLaunchSetupModal';
import { AboutModal } from './components/AboutModal';
import { MediaLibraryModal } from './features/media/MediaLibraryModal';
import { ExportModal } from './features/export/ExportModal';
import { useStudioStore } from './stores/useStudioStore';

export const App: React.FC = () => {
  const {
    mainView,
    setMainView,
    activeProject,
    saveCurrentProject,
    setNewProjectModalOpen,
    toggleBeginnerMode,
    toggleInspector,
    fetchProjects,
    fetchSettings,
    refreshTelemetry,
    fetchRegisteredProfiles,
    checkFFmpegStatus,
    undoTimeline,
    redoTimeline,
    setSettingsModalOpen,
    isDiagnosticsModalOpen,
    setDiagnosticsModalOpen,
    isFirstLaunchModalOpen,
    setFirstLaunchModalOpen
  } = useStudioStore();

  useEffect(() => {
    fetchProjects();
    fetchSettings();
    refreshTelemetry();
    fetchRegisteredProfiles();
    checkFFmpegStatus();

    // Check first-time setup
    if (!localStorage.getItem('cinematic_studio_setup_complete')) {
      setFirstLaunchModalOpen(true);
    }

    // Low-frequency telemetry interval (5 seconds - low CPU/memory impact)
    const interval = setInterval(() => {
      refreshTelemetry();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProjects, fetchSettings, refreshTelemetry, fetchRegisteredProfiles, checkFFmpegStatus]);

  // Global Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveCurrentProject();
            break;
          case 'n':
            e.preventDefault();
            setNewProjectModalOpen(true);
            break;
          case 'b':
            e.preventDefault();
            toggleBeginnerMode();
            break;
          case 'i':
            e.preventDefault();
            toggleInspector();
            break;
          case 'z':
            e.preventDefault();
            undoTimeline();
            break;
          case 'y':
            e.preventDefault();
            redoTimeline();
            break;
          case '1':
            e.preventDefault();
            setMainView('HOME');
            break;
          case '2':
            if (activeProject) {
              e.preventDefault();
              setMainView('AI_WORKSPACE');
            } else {
              setNewProjectModalOpen(true);
            }
            break;
          case '3':
            e.preventDefault();
            setMainView('PROJECTS');
            break;
          case '4':
            if (activeProject) {
              e.preventDefault();
              setMainView('VIDEO_EDITOR');
            } else {
              setNewProjectModalOpen(true);
            }
            break;
          case '5':
            e.preventDefault();
            setMainView('SETTINGS');
            setSettingsModalOpen(true);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentProject, setNewProjectModalOpen, toggleBeginnerMode, toggleInspector, setMainView, activeProject, undoTimeline, redoTimeline, setSettingsModalOpen]);

  // Main Studio View routing: Strict 5-Section Architecture + Backward Compatibility
  const renderMainView = () => {
    switch (mainView) {
      case 'HOME':
      case 'PRODUCTIONS':
        return <SimpleProjectHome />;
      case 'AI_WORKSPACE':
      case 'AI_VIDEO':
        return activeProject ? <AIVideoWorkspace /> : <SimpleProjectHome />;
      case 'PROJECTS':
        return <ProjectsManagerView />;
      case 'VIDEO_EDITOR':
      case 'STUDIO':
        return activeProject ? <StudioNLEWorkspace /> : <SimpleProjectHome />;
      case 'SETTINGS':
        return <ProjectsManagerView />;
      case 'AI_PROVIDERS':
        return <AIProviderCenter />;
      case 'MEDIA_VAULT':
        return <MediaVaultView />;
      default:
        return <SimpleProjectHome />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Windows Native Desktop Title Bar */}
      <DesktopTitleBar />

      {/* 2. Compact Desktop Workspace Toolbar */}
      <TopNav />

      {/* 3. Central Production Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {renderMainView()}
      </main>

      {/* 4. Desktop Status & Telemetry Bar */}
      <DesktopStatusBar />

      {/* Global Modals */}
      <NewProjectModal />
      <OpenProjectModal />
      <RenameProjectModal />
      <DeleteProjectModal />
      <SettingsModal />
      <ChromeProfileManagerModal />
      <ChromeSetupWizardModal />
      <InstallationDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setDiagnosticsModalOpen(false)}
      />
      <FirstLaunchSetupModal
        isOpen={isFirstLaunchModalOpen}
        onClose={() => setFirstLaunchModalOpen(false)}
      />
      <AboutModal />
      <MediaLibraryModal />
      <ExportModal />
    </div>
  );
};

export default App;

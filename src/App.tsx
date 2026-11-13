import React, { useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { AIModelWorkspace } from './features/workspace/AIModelWorkspace';
import { VideoGenerationWorkspace } from './features/workspace/VideoGenerationWorkspace';
import { BottomProductionPanel } from './features/production/BottomProductionPanel';
import { NewProjectModal } from './features/projects/NewProjectModal';
import { OpenProjectModal } from './features/projects/OpenProjectModal';
import { RenameProjectModal } from './features/projects/RenameProjectModal';
import { DeleteProjectModal } from './features/projects/DeleteProjectModal';
import { SettingsModal } from './features/settings/SettingsModal';
import { ChromeProfileManagerModal } from './features/profiles/ChromeProfileManagerModal';
import { MediaLibraryModal } from './features/media/MediaLibraryModal';
import { ExportModal } from './features/export/ExportModal';
import { useStudioStore } from './stores/useStudioStore';

export const App: React.FC = () => {
  const { fetchProjects, fetchSettings, refreshTelemetry, fetchRegisteredProfiles } = useStudioStore();

  useEffect(() => {
    fetchProjects();
    fetchSettings();
    refreshTelemetry();
    fetchRegisteredProfiles();

    // Low-frequency telemetry interval (5 seconds - low CPU/memory impact)
    const interval = setInterval(() => {
      refreshTelemetry();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProjects, fetchSettings, refreshTelemetry, fetchRegisteredProfiles]);

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Top Navigation Bar */}
      <TopNav />

      {/* 2. Main Two-Panel Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: AI Model Workspace */}
        <AIModelWorkspace />

        {/* Right Panel: Video Generation Workspace */}
        <VideoGenerationWorkspace />
      </main>

      {/* 3. Bottom Production Management Panel & Virtualized Timeline */}
      <BottomProductionPanel />

      {/* Global Modals */}
      <NewProjectModal />
      <OpenProjectModal />
      <RenameProjectModal />
      <DeleteProjectModal />
      <SettingsModal />
      <ChromeProfileManagerModal />
      <MediaLibraryModal />
      <ExportModal />
    </div>
  );
};

export default App;


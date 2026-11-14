import React, { useState } from 'react';
import {
  FolderPlus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Film,
  FolderTree,
  CheckCircle2
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AspectRatio, Project } from '../../types';

export const ProjectsManagerView: React.FC = () => {
  const {
    projects,
    activeProject,
    openProject,
    saveCurrentProject,
    setNewProjectModalOpen,
    setRenameModalOpen,
    setDeleteModalOpen,
    setMainView
  } = useStudioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aspectFilter, setAspectFilter] = useState<'ALL' | AspectRatio>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject?.id || null);

  const selectedProj = projects.find(p => p.id === (selectedProjectId || activeProject?.id)) || activeProject || projects[0] || null;

  const sortedProjects = [...projects].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));

  const filteredProjects = sortedProjects.filter(p => {
    if (aspectFilter !== 'ALL' && p.target_aspect_ratio !== aspectFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSynopsis = (p.synopsis || '').toLowerCase().includes(q);
      if (!matchName && !matchSynopsis) return false;
    }
    return true;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '5m 00s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleSelectAndOpen = async (proj: Project, targetView: 'AI_WORKSPACE' | 'VIDEO_EDITOR') => {
    await openProject(proj.id);
    setSelectedProjectId(proj.id);
    setMainView(targetView);
  };

  const handleChangeAspectRatio = async (ratio: AspectRatio) => {
    if (!selectedProj) return;
    selectedProj.target_aspect_ratio = ratio;
    await saveCurrentProject();
  };

  const handleChangeFps = async (fps: number) => {
    if (!selectedProj) return;
    selectedProj.target_fps = fps;
    await saveCurrentProject();
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <div className="h-12 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-700/60 flex items-center justify-center text-blue-400">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              PROJECTS & CANVAS CONFIGURATION
            </h1>
            <p className="text-[11px] text-slate-400">
              Manage video productions, aspect ratios, target framerate and canvas dimensions
            </p>
          </div>
        </div>

        <button
          onClick={() => setNewProjectModalOpen(true)}
          className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow transition-all"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Main Split View: Left Project List (50%) + Right Canvas & Project Inspector (50%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Project Catalog */}
        <div className="w-1/2 border-r border-studio-800 flex flex-col bg-studio-925">
          {/* Filter Bar */}
          <div className="p-3 border-b border-studio-800 bg-studio-900/60 flex items-center space-x-2 shrink-0">
            <div className="flex-1 flex items-center bg-studio-950 border border-studio-800 rounded-lg px-2.5 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <select
              value={aspectFilter}
              onChange={(e) => setAspectFilter(e.target.value as any)}
              className="bg-studio-950 border border-studio-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Ratios</option>
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Reels</option>
              <option value="1:1">1:1 Square</option>
              <option value="2.39:1">2.39:1 Cinema</option>
            </select>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No projects match the search filter.
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isSelected = selectedProj?.id === proj.id;
                const isActive = activeProject?.id === proj.id;

                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      openProject(proj.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-studio-850 border-studio-accent shadow-md shadow-purple-950/20'
                        : 'bg-studio-900 border-studio-800 hover:border-studio-750'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs truncate max-w-[200px]">
                          {proj.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded font-mono font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                        <span className="bg-studio-950 px-1.5 py-0.5 rounded text-studio-cyan border border-studio-800">
                          {proj.target_aspect_ratio}
                        </span>
                        <span className="text-slate-500">
                          {proj.target_fps || 24}fps
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                      {proj.synopsis || 'AI video screenplay project'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-studio-800/60 text-[10px] text-slate-500 font-mono">
                      <span>Updated: {formatDate(proj.updated_at)}</span>
                      <span>Target: {formatDuration(proj.target_duration_seconds)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Project Inspector & Canvas Configuration */}
        <div className="w-1/2 flex flex-col bg-studio-950 p-6 overflow-y-auto">
          {selectedProj ? (
            <div className="space-y-6 max-w-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-studio-accent font-semibold">
                  Active Production Configuration
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedProj.name}</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedProj.synopsis || 'Configure video canvas resolution, aspect ratio, frame rate, and workspace workflows.'}
                </p>
              </div>

              {/* Quick Launch Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleSelectAndOpen(selectedProj, 'AI_WORKSPACE')}
                  className="flex items-center justify-center space-x-2 bg-purple-900/60 hover:bg-purple-900 border border-purple-700/80 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Open in AI Workspace</span>
                </button>

                <button
                  onClick={() => handleSelectAndOpen(selectedProj, 'VIDEO_EDITOR')}
                  className="flex items-center justify-center space-x-2 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow"
                >
                  <Film className="w-4 h-4" />
                  <span>Open in Video Editor</span>
                </button>
              </div>

              {/* Canvas Aspect Ratio Setting */}
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-white">
                  Canvas Aspect Ratio & Delivery Format
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { id: '16:9', label: '16:9 Landscape', res: '1920x1080 (YouTube/Vimeo)' },
                    { id: '9:16', label: '9:16 Vertical', res: '1080x1920 (Shorts/TikTok/Reels)' },
                    { id: '1:1', label: '1:1 Square', res: '1080x1080 (Feed/Instagram)' },
                    { id: '2.39:1', label: '2.39:1 Anamorphic', res: '1920x803 (Cinematic Film)' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleChangeAspectRatio(option.id as AspectRatio)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedProj.target_aspect_ratio === option.id
                          ? 'bg-studio-800 border-studio-cyan text-white shadow-sm'
                          : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{option.label}</span>
                        {selectedProj.target_aspect_ratio === option.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-studio-cyan" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{option.res}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Framerate Setting */}
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-white">
                  Target Framerate (FPS)
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {[
                    { fps: 24, label: '24 FPS', desc: 'Cinematic Standard' },
                    { fps: 30, label: '30 FPS', desc: 'Web & Broadcast' },
                    { fps: 60, label: '60 FPS', desc: 'High Motion / Smooth' }
                  ].map(item => (
                    <button
                      key={item.fps}
                      onClick={() => handleChangeFps(item.fps)}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        (selectedProj.target_fps || 24) === item.fps
                          ? 'bg-studio-800 border-studio-cyan text-white shadow-sm'
                          : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-bold block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Storage Details */}
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-2 text-xs font-mono">
                <span className="text-[10px] text-slate-500 uppercase">Project Path on Disk:</span>
                <p className="text-[11px] text-slate-300 bg-studio-950 p-2 rounded border border-studio-800 break-all select-all">
                  {selectedProj.project_dir_path || 'C:\\CinematicStudio\\Projects\\' + selectedProj.slug}
                </p>
              </div>

              {/* Management Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setRenameModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-studio-900 hover:bg-studio-850 border border-studio-800 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Rename Project</span>
                </button>

                <button
                  onClick={() => setDeleteModalOpen(true, selectedProj)}
                  className="flex items-center space-x-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950 border border-red-800/60 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <FolderTree className="w-10 h-10 text-slate-600" />
              <p>Select a project from the left or create a new one.</p>
              <button
                onClick={() => setNewProjectModalOpen(true)}
                className="bg-studio-accent text-white font-semibold px-4 py-2 rounded-lg text-xs"
              >
                Create Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

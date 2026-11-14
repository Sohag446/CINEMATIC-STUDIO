import React, { useState } from 'react';
import {
  FolderPlus,
  Play,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Film,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AspectRatio } from '../../types';

export const SimpleProjectHome: React.FC = () => {
  const {
    projects,
    activeProject,
    openProject,
    setNewProjectModalOpen,
    setRenameModalOpen,
    setDeleteModalOpen,
    setMainView,
    registeredProfiles,
    setChromeWizardOpen
  } = useStudioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aspectFilter, setAspectFilter] = useState<'ALL' | AspectRatio>('ALL');

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

  const handleOpenProject = async (projectId: string) => {
    await openProject(projectId);
    setMainView('AI_WORKSPACE');
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-y-auto font-sans select-none">

      {/* 1. Header Banner */}
      <div className="border-b border-studio-800 bg-studio-900/90 px-8 py-7 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-studio-accent to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
                <Film className="w-4 h-4 text-white" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
                  <span>CINEMATIC STUDIO</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-800 text-purple-300 border border-purple-800/50 uppercase tracking-widest">
                    Desktop v3.0.0
                  </span>
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  AI Cinematic Video Production Application • Story to Multitrack Master
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setChromeWizardOpen(true)}
              className="flex items-center space-x-2 bg-studio-900 hover:bg-studio-850 text-slate-300 border border-studio-750 text-xs px-3.5 py-2 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chrome Pairing ({registeredProfiles.length})</span>
            </button>

            <button
              onClick={() => setNewProjectModalOpen(true)}
              className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-md transition-all hover:scale-[1.01]"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Create New Project</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-8">

        {/* 2. Hero Action Card: Create New Project */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => setNewProjectModalOpen(true)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-studio-900 via-purple-950/20 to-studio-900 border border-studio-750 hover:border-studio-accent p-6 transition-all duration-200 hover:shadow-xl hover:shadow-purple-950/30 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FolderPlus className="w-6 h-6 text-studio-accent-light" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1 group-hover:text-studio-accent-light transition-colors">
                Create New Project
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Start a new AI video project with custom aspect ratio, target FPS, and storage directory.
              </p>
            </div>

            <div className="mt-6 flex items-center space-x-1.5 text-xs font-semibold text-studio-accent-light group-hover:translate-x-1 transition-transform">
              <span>Start Project Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Guide Card: 3 Simple Steps */}
          <div className="md:col-span-2 rounded-2xl bg-studio-900 border border-studio-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Complete Production Workflow</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Zero Technical Setup</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-studio-950 border border-studio-800/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-purple-400 font-bold block mb-1">01 • STORY</span>
                  <p className="text-xs font-semibold text-white mb-0.5">AI Story Agent</p>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Paste script or idea. Agent decomposes text into ~10s cinematic shot directives.
                  </p>
                </div>

                <div className="bg-studio-950 border border-studio-800/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">02 • GENERATE</span>
                  <p className="text-xs font-semibold text-white mb-0.5">Chrome Video Takes</p>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Real Google Veo/Flow sessions generate each shot sequentially with visual locks.
                  </p>
                </div>

                <div className="bg-studio-950 border border-studio-800/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">03 • ASSEMBLE</span>
                  <p className="text-xs font-semibold text-white mb-0.5">Desktop NLE Studio</p>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Edit clips on multitrack timeline (V1/V2/A1-A3) and export high-res master video.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-studio-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Author: Md. Sohag Hossen</span>
              <a
                href="https://github.com/Sohag446/CINEMATIC-STUDIO"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                github.com/Sohag446/CINEMATIC-STUDIO
              </a>
            </div>
          </div>
        </div>

        {/* 3. Recent Projects Header & Search */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Recent Projects</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-studio-850 text-slate-300 border border-studio-750">
                  {filteredProjects.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Open a project to resume story analysis, shot generation, or timeline editing.
              </p>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Search */}
              <div className="flex items-center space-x-2 bg-studio-900 border border-studio-800 rounded-lg px-3 py-1.5 w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects..."
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>

              {/* Aspect Ratio Filter */}
              <select
                value={aspectFilter}
                onChange={(e) => setAspectFilter(e.target.value as any)}
                className="bg-studio-900 border border-studio-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
              >
                <option value="ALL">All Ratios</option>
                <option value="16:9">16:9 Widescreen</option>
                <option value="2.39:1">2.39:1 Cinema</option>
                <option value="9:16">9:16 Reels</option>
              </select>
            </div>
          </div>

          {/* Project List / Grid */}
          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-studio-800 bg-studio-900/40 p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-studio-850 border border-studio-750 flex items-center justify-center">
                <Film className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">No Projects Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery ? 'Try clearing your search query.' : 'Create your first cinematic video project to begin story generation.'}
                </p>
              </div>
              <button
                onClick={() => setNewProjectModalOpen(true)}
                className="inline-flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create New Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const isCurrent = activeProject?.id === project.id;
                return (
                  <div
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                    className={`group cursor-pointer rounded-xl bg-studio-900 border transition-all duration-200 hover:shadow-lg p-5 flex flex-col justify-between ${
                      isCurrent
                        ? 'border-studio-accent shadow-md shadow-purple-950/40 bg-gradient-to-b from-studio-900 to-studio-850'
                        : 'border-studio-800 hover:border-studio-750 hover:bg-studio-850'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-950 text-studio-cyan border border-studio-750">
                          {project.target_aspect_ratio}
                        </span>
                        <div className="flex items-center space-x-1 text-slate-500 text-xs">
                          <button
                            title="Rename Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProject(project.id);
                              setRenameModalOpen(true);
                            }}
                            className="p-1 hover:text-slate-200 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Project"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalOpen(true, project);
                            }}
                            className="p-1 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Synopsis */}
                      <h3 className="text-base font-bold text-white group-hover:text-studio-accent-light transition-colors line-clamp-1 mb-1.5">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                        {project.synopsis || 'Ready for screenplay analysis and continuous shot generation.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-studio-800/80 text-[11px] font-mono text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Runtime:</span>
                        </span>
                        <span className="text-slate-300">{formatDuration(project.target_duration_seconds)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>Updated:</span>
                        </span>
                        <span className="text-slate-300">{formatDate(project.updated_at)}</span>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]" title={project.project_dir_path}>
                          {project.project_dir_path || 'C:\\CinematicStudio\\Projects'}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProject(project.id);
                          }}
                          className="flex items-center space-x-1 text-xs font-semibold text-studio-accent-light bg-studio-accent/10 hover:bg-studio-accent/20 px-3 py-1.5 rounded transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Open Film</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

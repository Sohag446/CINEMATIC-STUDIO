import React, { useState } from 'react';
import {
  FolderPlus,
  Play,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  Search,
  ArrowRight,
  Clapperboard
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AspectRatio } from '../../types';

export const HomeDashboard: React.FC = () => {
  const {
    projects,
    activeProject,
    openProject,
    setNewProjectModalOpen,
    setRenameModalOpen,
    setDeleteModalOpen,
    setMainView
  } = useStudioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aspectFilter, setAspectFilter] = useState<'ALL' | AspectRatio>('ALL');

  const sortedProjects = [...projects].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  const latestProject = sortedProjects[0] || null;

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
    if (!timestamp) return 'Recently';
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

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-y-auto font-sans select-none">

      {/* 1. Header Toolbar */}
      <div className="border-b border-studio-800 bg-studio-900/90 px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <span>Cinematic Productions</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-studio-800 text-slate-300 border border-studio-700 font-normal">
                {projects.length} {projects.length === 1 ? 'Film' : 'Films'}
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Direct and assemble long-form AI videos across story development, characters, environments, and multitrack editing.
            </p>
          </div>

          <button
            onClick={() => setNewProjectModalOpen(true)}
            className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all hover:scale-[1.01]"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ New Production</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-8">

        {/* 2. Spotlight: Continue Active Production */}
        {latestProject && (
          <section className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Continue Production
            </span>

            <div
              onClick={() => {
                openProject(latestProject.id);
                setMainView('STUDIO');
              }}
              className="group relative overflow-hidden bg-gradient-to-r from-studio-900 to-studio-850 hover:from-studio-850 hover:to-studio-800 border border-studio-800 hover:border-studio-accent/60 rounded-2xl p-6 cursor-pointer transition-all shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-white group-hover:text-studio-accent-light transition-colors">
                    {latestProject.name}
                  </h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-studio-950 text-studio-cyan border border-studio-750">
                    {latestProject.target_aspect_ratio}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {latestProject.target_fps} fps
                  </span>
                </div>

                <p className="text-slate-300 text-xs line-clamp-2 max-w-3xl leading-relaxed">
                  {latestProject.synopsis || 'No synopsis provided. Open studio to flesh out screenplay beats, character vault, and storyboard.'}
                </p>

                <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 pt-1">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last Edited: {formatDate(latestProject.updated_at)}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Runtime: {formatDuration(latestProject.target_duration_seconds)}</span>
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openProject(latestProject.id);
                    setMainView('STUDIO');
                  }}
                  className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Open Studio</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 3. Search & Filter Bar */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 bg-studio-900 border border-studio-800 rounded-xl px-3.5 py-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search productions by title or logline..."
                className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
              />
            </div>

            <div className="flex items-center bg-studio-900 border border-studio-800 rounded-xl p-0.5 text-xs font-mono">
              {(['ALL', '16:9', '9:16', '2.39:1', '1:1'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectFilter(ratio)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    aspectFilter === ratio
                      ? 'bg-studio-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ratio === 'ALL' ? 'All Formats' : ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Productions Grid */}
          {filteredProjects.length === 0 ? (
            <div className="bg-studio-900/40 border border-dashed border-studio-800 rounded-2xl p-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-center mx-auto text-studio-accent">
                <Clapperboard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Productions Found</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  {searchQuery ? 'No productions match your search query.' : 'Create your first production to start directing your cinematic AI film.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setNewProjectModalOpen(true)}
                  className="inline-flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create Production</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map(p => {
                const isSelected = activeProject?.id === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      openProject(p.id);
                      setMainView('STUDIO');
                    }}
                    className={`group bg-studio-900 border ${
                      isSelected ? 'border-studio-accent shadow-md shadow-purple-950/40' : 'border-studio-800 hover:border-studio-700'
                    } rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-4 hover:scale-[1.01]`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-white text-base group-hover:text-studio-accent-light transition-colors line-clamp-1">
                            {p.name}
                          </h3>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Updated: {formatDate(p.updated_at)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              openProject(p.id);
                              setRenameModalOpen(true);
                            }}
                            title="Rename Production"
                            className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteModalOpen(true, p)}
                            title="Delete Production"
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed min-h-[32px]">
                        {p.synopsis || 'Click to open studio and direct story scenes, characters, and storyboard shots.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-studio-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-studio-950 text-studio-cyan border border-studio-800 text-[11px]">
                        {p.target_aspect_ratio} • {p.target_fps}fps
                      </span>

                      <span className="text-studio-accent group-hover:translate-x-0.5 transition-transform flex items-center space-x-1 font-semibold text-[11px]">
                        <span>Enter Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

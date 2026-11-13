import React from 'react';
import { X, FolderOpen, Film, Calendar, Trash2 } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const OpenProjectModal: React.FC = () => {
  const { 
    isOpenProjectModalOpen, 
    setOpenProjectModalOpen, 
    projects, 
    openProject, 
    activeProject,
    setDeleteModalOpen
  } = useStudioStore();

  if (!isOpenProjectModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-full max-w-xl bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <FolderOpen className="w-4 h-4 text-studio-cyan" />
            <span>Open Existing Project</span>
          </div>
          <button 
            onClick={() => setOpenProjectModalOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
              No existing projects discovered in local storage.
            </div>
          ) : (
            projects.map((p) => {
              const isActive = activeProject?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className={`p-3 rounded border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    isActive 
                      ? 'bg-studio-850 border-studio-accent/60 text-slate-100' 
                      : 'bg-studio-950/70 border-studio-800 text-slate-300 hover:border-studio-700 hover:bg-studio-850'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Film className="w-3.5 h-3.5 text-studio-accent" />
                      <span className="font-semibold text-slate-100">{p.name}</span>
                      {isActive && (
                        <span className="text-[10px] bg-studio-accent/20 text-studio-accent px-1.5 py-0.5 rounded font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {p.synopsis && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{p.synopsis}</p>
                    )}
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </span>
                      <span>{p.target_aspect_ratio} • {p.target_fps}fps</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(p.id);
                      }}
                      className="px-3 py-1 bg-studio-800 hover:bg-studio-750 text-slate-200 rounded font-mono text-xs border border-studio-700"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalOpen(true, p);
                      }}
                      title="Delete Project Vault"
                      className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-950/40 border border-transparent hover:border-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-studio-850 border-t border-studio-800 flex justify-end">
          <button
            onClick={() => setOpenProjectModalOpen(false)}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

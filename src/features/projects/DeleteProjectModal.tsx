import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const DeleteProjectModal: React.FC = () => {
  const { 
    isDeleteModalOpen, 
    setDeleteModalOpen, 
    projectToDelete, 
    activeProject, 
    deleteProject 
  } = useStudioStore();

  const targetProject = projectToDelete || activeProject;
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isDeleteModalOpen || !targetProject) return null;

  const isConfirmed = confirmInput.trim() === targetProject.name.trim();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteProject(targetProject.id, confirmInput.trim());
      setConfirmInput('');
      setDeleteModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmInput('');
    setError(null);
    setDeleteModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-full max-w-md bg-studio-900 border border-red-900/60 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 bg-red-950/40 border-b border-red-900/40 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-400 font-semibold text-sm">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Delete Project Vault</span>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleDelete} className="p-5 space-y-4">
          <div className="flex items-start space-x-3 bg-red-950/30 border border-red-900/40 p-3 rounded text-xs text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Permanent Action</p>
              <p className="text-[11px] text-red-300/80 mt-1">
                This will permanently delete the project vault for <strong className="text-white">"{targetProject.name}"</strong>, including all scenes, clip metadata, prompt generations, and local disk folders. This cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-950/80 border border-red-800 rounded text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 block">
              Type <span className="font-bold text-amber-300 select-all font-mono">"{targetProject.name}"</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={targetProject.name}
              autoFocus
              className="w-full bg-studio-950 border border-studio-750 focus:border-red-500 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className={`px-4 py-1.5 text-xs font-mono rounded border flex items-center space-x-1.5 transition-colors ${
                isConfirmed && !isDeleting
                  ? 'bg-red-900/80 hover:bg-red-800 text-red-100 border-red-700 cursor-pointer shadow-lg shadow-red-950/50'
                  : 'bg-studio-800/50 text-slate-500 border-studio-750 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


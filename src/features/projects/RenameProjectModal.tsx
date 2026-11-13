import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const RenameProjectModal: React.FC = () => {
  const { isRenameModalOpen, setRenameModalOpen, activeProject, renameProject } = useStudioStore();
  const [name, setName] = useState('');

  useEffect(() => {
    if (activeProject) setName(activeProject.name);
  }, [activeProject]);

  if (!isRenameModalOpen || !activeProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await renameProject(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-full max-w-sm bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="h-10 bg-studio-850 border-b border-studio-800 px-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-100 font-semibold">
            <Edit3 className="w-3.5 h-3.5 text-studio-accent" />
            <span>Rename Project</span>
          </div>
          <button onClick={() => setRenameModalOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">New Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-studio-accent font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-studio-800">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 font-mono text-[11px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-studio-accent hover:bg-studio-accent-hover text-slate-950 font-semibold rounded font-mono text-[11px]"
            >
              Update Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

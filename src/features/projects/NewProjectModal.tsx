import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AspectRatio } from '../../types';

export const NewProjectModal: React.FC = () => {
  const { isNewProjectModalOpen, setNewProjectModalOpen, createProject } = useStudioStore();
  
  const [name, setName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [fps, setFps] = useState(24.0);
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNewProjectModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createProject(name.trim(), synopsis.trim());
      setName('');
      setSynopsis('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden font-sans">
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <FolderPlus className="w-4 h-4 text-studio-accent" />
            <span>Create New Cinematic Project</span>
          </div>
          <button 
            onClick={() => setNewProjectModalOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-300 p-2.5 rounded text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neo-Tokyo 2099, The Last Station"
              className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded px-3 py-2 text-xs focus:outline-none focus:border-studio-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
              Narrative Synopsis / Theme
            </label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="High-level narrative theme, dramatic arc, and world-building notes..."
              className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded p-2.5 text-xs focus:outline-none focus:border-studio-accent resize-none font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="2.39:1">2.39:1 (Anamorphic)</option>
                <option value="9:16">9:16 (Vertical)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Framerate</label>
              <select
                value={fps}
                onChange={(e) => setFps(parseFloat(e.target.value))}
                className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
              >
                <option value={24.0}>24.0 fps (Film)</option>
                <option value={25.0}>25.0 fps (PAL)</option>
                <option value={30.0}>30.0 fps (Video)</option>
                <option value={60.0}>60.0 fps (HFR)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Target Runtime</label>
              <select
                value={targetDurationMinutes}
                onChange={(e) => setTargetDurationMinutes(parseInt(e.target.value))}
                className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
              >
                <option value={5}>5 Min (~30 shots)</option>
                <option value={10}>10 Min (~60 shots)</option>
                <option value={20}>20 Min (~120 shots)</option>
                <option value={60}>60 Min (~360 shots)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-studio-800">
            <button
              type="button"
              onClick={() => setNewProjectModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-slate-950 font-semibold rounded text-xs font-mono transition-colors"
            >
              {isSubmitting ? 'Initializing...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

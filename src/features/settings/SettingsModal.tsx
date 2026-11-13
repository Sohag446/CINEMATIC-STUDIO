import React, { useState, useEffect } from 'react';
import { X, Settings, HardDrive, Cpu, Terminal, Palette } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AppSettings } from '../../types';

export const SettingsModal: React.FC = () => {
  const { isSettingsModalOpen, setSettingsModalOpen, settings, updateSettings, fetchSettings } = useStudioStore();

  const [form, setForm] = useState<AppSettings>({
    default_project_storage_path: 'C:\\CinematicStudio\\Projects',
    max_concurrent_tasks: 1,
    sequential_processing_default: true,
    log_level: 'INFO',
    theme: 'cinematic',
    hardware_thread_cap: 4,
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!isSettingsModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-full max-w-lg bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden text-xs">
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <Settings className="w-4 h-4 text-studio-cyan" />
            <span>Studio Global Settings</span>
          </div>
          <button onClick={() => setSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Storage Directory */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-studio-accent" />
              <span>Default Project Directory</span>
            </label>
            <input
              type="text"
              value={form.default_project_storage_path}
              onChange={(e) => setForm({ ...form, default_project_storage_path: e.target.value })}
              className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-studio-cyan font-mono"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Each new project creates its own isolated asset vault in this path.
            </span>
          </div>

          {/* Resource Constraints & RAM Protection */}
          <div className="bg-studio-950 border border-studio-800 p-3 rounded space-y-3">
            <span className="text-[11px] font-mono text-studio-cyan uppercase font-semibold flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>RAM Protection & Hardware Constraints</span>
            </span>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Max Concurrent Tasks</label>
                <select
                  value={form.max_concurrent_tasks}
                  onChange={(e) => setForm({ ...form, max_concurrent_tasks: parseInt(e.target.value) })}
                  className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
                >
                  <option value={1}>1 Task (Recommended - Low RAM)</option>
                  <option value={2}>2 Tasks (Moderate RAM)</option>
                  <option value={3}>3 Tasks (High RAM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">FFmpeg Thread Pool Cap</label>
                <select
                  value={form.hardware_thread_cap}
                  onChange={(e) => setForm({ ...form, hardware_thread_cap: parseInt(e.target.value) })}
                  className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
                >
                  <option value={2}>2 Threads (Low CPU/RAM)</option>
                  <option value={4}>4 Threads (Balanced)</option>
                  <option value={6}>6 Threads (Fast)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-slate-300 font-mono text-[11px] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.sequential_processing_default}
                onChange={(e) => setForm({ ...form, sequential_processing_default: e.target.checked })}
                className="rounded border-studio-750 text-studio-accent"
              />
              <span>Enable Sequential Production Mode by default (1 Profile at a time)</span>
            </label>
          </div>

          {/* Logging & Diagnostics */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1 flex items-center space-x-1">
                <Terminal className="w-3 h-3 text-slate-500" />
                <span>Logging Verbosity</span>
              </label>
              <select
                value={form.log_level}
                onChange={(e) => setForm({ ...form, log_level: e.target.value as AppSettings['log_level'] })}
                className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
              >
                <option value="DEBUG">DEBUG (Verbose Trace)</option>
                <option value="INFO">INFO (Standard Production)</option>
                <option value="WARN">WARN (Warnings & Errors)</option>
                <option value="ERROR">ERROR (Errors Only)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1 flex items-center space-x-1">
                <Palette className="w-3 h-3 text-slate-500" />
                <span>UI Aesthetic</span>
              </label>
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value as AppSettings['theme'] })}
                className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded p-1.5 text-xs"
              >
                <option value="cinematic">Dark Cinematic (Default)</option>
                <option value="dark">Studio Dark</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-studio-800 font-mono">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="px-3 py-1 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-semibold rounded"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

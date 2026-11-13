import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  HardDrive, 
  Cpu, 
  Film, 
  Info,
  ExternalLink,
  Code2,
  User,
  Github
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AppSettings } from '../../types';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsModalOpen, 
    setSettingsModalOpen, 
    isAboutModalOpen,
    setIsAboutModalOpen,
    settings, 
    updateSettings, 
    fetchSettings,
    ffmpegStatus,
    checkFFmpegStatus 
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'ABOUT'>('SETTINGS');
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
    checkFFmpegStatus();
  }, [fetchSettings, checkFFmpegStatus]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (isAboutModalOpen) {
      setActiveTab('ABOUT');
    }
  }, [isAboutModalOpen]);

  const isOpen = isSettingsModalOpen || isAboutModalOpen;

  if (!isOpen) return null;

  const handleClose = () => {
    setSettingsModalOpen(false);
    setIsAboutModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    handleClose();
  };

  const handleOpenGithub = async () => {
    const url = 'https://github.com/Sohag446';
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        return;
      } catch {
        window.open(url, '_blank');
        return;
      }
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-studio-900 border border-studio-800 rounded-xl shadow-2xl overflow-hidden text-xs">

        {/* Header with Tabs */}
        <div className="h-14 bg-studio-850 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-studio-950 p-1 rounded-lg border border-studio-800">
              <button
                type="button"
                onClick={() => setActiveTab('SETTINGS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'SETTINGS' ? 'bg-studio-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configuration</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ABOUT')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'ABOUT' ? 'bg-studio-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About Cinematic Studio</span>
              </button>
            </div>
          </div>

          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Storage Directory */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-studio-accent" />
                <span>Default Production Directory</span>
              </label>
              <input
                type="text"
                value={form.default_project_storage_path}
                onChange={(e) => setForm({ ...form, default_project_storage_path: e.target.value })}
                className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-studio-accent font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Each film project creates its own isolated SQLite database and media vault in this directory.
              </span>
            </div>

            {/* Hardware Constraints & RAM Protection */}
            <div className="bg-studio-950 border border-studio-800 p-4 rounded-xl space-y-3">
              <span className="text-[11px] font-mono text-studio-cyan uppercase font-semibold flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>RAM Protection & Concurrency Limits</span>
              </span>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Max Concurrent Tasks</label>
                  <select
                    value={form.max_concurrent_tasks}
                    onChange={(e) => setForm({ ...form, max_concurrent_tasks: parseInt(e.target.value) })}
                    className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded-lg p-2 text-xs"
                  >
                    <option value={1}>1 Task (Sequential - Safe RAM)</option>
                    <option value={2}>2 Tasks (Moderate RAM)</option>
                    <option value={3}>3 Tasks (High RAM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">FFmpeg Thread Pool Cap</label>
                  <select
                    value={form.hardware_thread_cap}
                    onChange={(e) => setForm({ ...form, hardware_thread_cap: parseInt(e.target.value) })}
                    className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded-lg p-2 text-xs"
                  >
                    <option value={2}>2 Threads (Low CPU/RAM)</option>
                    <option value={4}>4 Threads (Balanced 4-Core)</option>
                    <option value={8}>8 Threads (High Performance)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FFmpeg Engine Diagnostics */}
            <div className="bg-studio-950 border border-studio-800 p-4 rounded-xl space-y-2 font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-xs flex items-center space-x-1.5">
                  <Film className="w-3.5 h-3.5 text-studio-accent" />
                  <span>FFmpeg Audio/Video Assembly Engine</span>
                </span>
                <span className="text-[10px] text-emerald-400">
                  {ffmpegStatus?.ffmpeg_available ? 'Available' : 'Host Subprocess Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Responsible for stream-copy concatenation, audio sidechain ducking, crossfades, and 4K master rendering.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-studio-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold rounded-lg shadow transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: ABOUT CINEMATIC STUDIO */}
        {activeTab === 'ABOUT' && (
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-studio-accent">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wider font-mono">CINEMATIC STUDIO</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-studio-850 text-studio-cyan border border-studio-750">
                    Version 1.0.0
                  </span>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                A desktop AI cinematic video production studio for planning stories, managing characters and environments, orchestrating AI video generation, maintaining production continuity, assembling timelines, and exporting finished videos.
              </p>
            </div>

            <div className="bg-studio-950 border border-studio-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-studio-800/80">
                <span className="text-slate-400 flex items-center space-x-2">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Developer / Creator:</span>
                </span>
                <span className="font-bold text-white">Md. Sohag Hossen</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-studio-800/80">
                <span className="text-slate-400 flex items-center space-x-2">
                  <Github className="w-3.5 h-3.5 text-slate-300" />
                  <span>GitHub Repository:</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenGithub}
                  className="text-studio-cyan hover:text-cyan-300 flex items-center space-x-1 font-semibold underline decoration-dotted"
                >
                  <span>https://github.com/Sohag446</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-2">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Architecture:</span>
                </span>
                <span className="text-slate-300">Tauri 2 • Rust • React • SQLite • FFmpeg</span>
              </div>
            </div>

            <div className="p-3 bg-studio-950/60 rounded-xl border border-studio-800/80 text-[11px] text-slate-400 leading-relaxed">
              Designed for professional creators to direct multi-shot, long-form cinematic films using coordinated browser-based AI video platforms safely and reproducibly.
            </div>

            <div className="flex justify-end pt-2 border-t border-studio-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold rounded-lg shadow transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

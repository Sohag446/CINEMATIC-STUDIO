import React from 'react';
import {
  HardDrive,
  Cpu,
  Film,
  ShieldCheck,
  Clock,
  Layers
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const DesktopStatusBar: React.FC = () => {
  const {
    activeProject,
    scenes,
    clips,
    timelineClips,
    playheadTimeSeconds,
    ffmpegStatus
  } = useStudioStore();

  const formatTimecode = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const frames = Math.floor((totalSecs % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  return (
    <footer className="h-6 bg-studio-950 border-t border-studio-850 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none shrink-0 z-20">
      {/* 1. Left: Local Project Storage & Engine Diagnostics */}
      <div className="flex items-center space-x-3 truncate">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <HardDrive className="w-3 h-3 text-studio-accent" />
          <span className="truncate">
            {activeProject ? `Storage: SQLite v3 [${activeProject.name}.db]` : 'Storage: Ready'}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center space-x-1.5">
          <Film className="w-3 h-3 text-studio-cyan" />
          <span className={ffmpegStatus?.ffmpeg_available ? 'text-emerald-400' : 'text-slate-400'}>
            FFmpeg: {ffmpegStatus?.ffmpeg_available ? 'Available (Stream-Copy Ready)' : 'Active (Subprocess Mode)'}
          </span>
        </div>
      </div>

      {/* 2. Center: Timeline Metrics & Timecode */}
      <div className="hidden sm:flex items-center space-x-3 text-slate-400">
        <div className="flex items-center space-x-1 text-slate-300 font-semibold">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Playhead: {formatTimecode(playheadTimeSeconds)}</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center space-x-1">
          <Layers className="w-3 h-3 text-slate-500" />
          <span>{scenes.length} Scenes • {clips.length} Shots • {timelineClips.length} Timeline Takes</span>
        </div>
      </div>

      {/* 3. Right: System Constraints & Security Status */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1.5 text-studio-cyan" title="RAM Safety Ceiling: 1 Concurrent Browser Task">
          <Cpu className="w-3 h-3" />
          <span>RAM Guard: 1 Task Max</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center space-x-1 text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>HMAC-SHA256 IPC</span>
        </div>

        <span className="text-slate-700">|</span>

        <span className="text-slate-500 hidden md:inline">
          Md. Sohag Hossen • v1.0.0
        </span>
      </div>
    </footer>
  );
};

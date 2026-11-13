import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Film,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const PreviewMonitor: React.FC = () => {
  const {
    activeProject,
    clips,
    timelineClips,
    selectedTimelineClipId,
    selectedClipId,
    playheadTimeSeconds,
    setPlayheadTimeSeconds,
    isPlaying,
    setIsPlaying,
    addClipToTimeline
  } = useStudioStore();

  const [isMuted, setIsMuted] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(true);

  // Find active clip or the clip under playhead
  const activeTimelineClip = timelineClips.find(c =>
    playheadTimeSeconds >= c.timeline_start_seconds &&
    playheadTimeSeconds <= (c.timeline_start_seconds + c.timeline_duration_seconds)
  ) || timelineClips.find(c => c.id === selectedTimelineClipId);

  const activeClip = clips.find(c => c.id === selectedClipId) || clips[0];

  const formatTimecode = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const frames = Math.floor((totalSecs % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayheadTimeSeconds((playheadTimeSeconds + 0.1) % 60);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playheadTimeSeconds, setPlayheadTimeSeconds]);

  const handleStepBack = () => {
    setPlayheadTimeSeconds(Math.max(0, playheadTimeSeconds - (1 / 24)));
  };

  const handleStepForward = () => {
    setPlayheadTimeSeconds(playheadTimeSeconds + (1 / 24));
  };

  const isScope = activeProject?.target_aspect_ratio === '2.39:1';

  return (
    <div className="h-64 bg-studio-950 border-b border-studio-800 flex overflow-hidden shrink-0 select-none font-sans">

      {/* 1. Left: Quick Media Bin (Clips Available for Timeline) */}
      <div className="w-56 bg-studio-900 border-r border-studio-800 flex flex-col shrink-0 text-xs">
        <div className="h-7 bg-studio-850 border-b border-studio-800 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
          <span className="flex items-center space-x-1">
            <Film className="w-3 h-3 text-studio-cyan" />
            <span>Project Bin</span>
          </span>
          <span className="text-[9px] text-slate-500 font-bold">{clips.length} Takes</span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {clips.map((clip) => {
            const isSelected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                onClick={() => useStudioStore.getState().selectClip(clip.id)}
                className={`p-1.5 rounded cursor-pointer border transition-colors ${
                  isSelected
                    ? 'bg-studio-800 border-studio-accent text-white'
                    : 'bg-studio-950/80 border-studio-850 hover:border-studio-750 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-semibold truncate">Shot {clip.clip_number}</span>
                  <span className={`text-[9px] px-1 rounded uppercase ${
                    clip.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-950' : 'text-slate-400'
                  }`}>
                    {clip.target_duration_seconds}s
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                  <span>{clip.camera_framing}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeProject) {
                        addClipToTimeline({
                          project_id: activeProject.id,
                          media_asset_id: clip.id,
                          track_id: 'V1',
                          timeline_start_seconds: playheadTimeSeconds,
                          timeline_duration_seconds: clip.target_duration_seconds || 5,
                          volume: 1.0
                        });
                      }
                    }}
                    className="text-studio-cyan hover:underline text-[9px]"
                  >
                    + To Timeline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Center: Monitor Canvas */}
      <div className="flex-1 flex flex-col bg-black relative justify-between">

        {/* Monitor Top Toolbar */}
        <div className="h-6 bg-black/60 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold">PROGRAM MONITOR</span>
            <span className="text-slate-600">|</span>
            <span className="text-studio-cyan">{activeProject?.target_aspect_ratio || '16:9'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSafeAreas(!showSafeAreas)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                showSafeAreas ? 'bg-studio-800 text-studio-cyan' : 'text-slate-600'
              }`}
            >
              Safe Areas
            </button>
            <span className="text-emerald-400 font-bold">{formatTimecode(playheadTimeSeconds)}</span>
          </div>
        </div>

        {/* Video Canvas Stage with Aspect Ratio Framing */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-studio-950/90">
          <div
            className={`relative bg-studio-900 border border-studio-800 shadow-2xl flex items-center justify-center overflow-hidden transition-all ${
              isScope ? 'w-[420px] h-[176px]' : 'w-[360px] h-[202px]'
            }`}
          >
            {/* Aspect Ratio Mattes (Top/Bottom Letterbox if applicable) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-10">
              <div className="w-full h-1 bg-black/80" />
              <div className="w-full h-1 bg-black/80" />
            </div>

            {/* Safe Area Guides */}
            {showSafeAreas && (
              <div className="absolute inset-4 border border-cyan-500/20 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-2 h-2 border-t border-l border-cyan-400/40" />
              </div>
            )}

            {/* Simulated Live Frame / Visual Prompt Preview */}
            <div className="text-center p-3 space-y-1">
              <div className="w-8 h-8 rounded-full bg-studio-accent/20 border border-studio-accent/50 mx-auto flex items-center justify-center text-studio-accent">
                <Film className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white tracking-wide">
                {activeTimelineClip ? `Timeline Take [Track ${activeTimelineClip.track_id}]` : activeClip ? `Shot ${activeClip.clip_number}` : 'No Clip Selected'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono max-w-xs truncate">
                {activeClip?.camera_framing} • {activeClip?.camera_movement} • {activeProject?.target_fps || 24}fps
              </p>
            </div>
          </div>
        </div>

        {/* Monitor Transport Bar */}
        <div className="h-7 bg-studio-900 border-t border-studio-800 px-3 flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleStepBack}
              title="Step 1 Frame Back (Left Arrow)"
              className="p-1 rounded hover:bg-studio-800 text-slate-400 hover:text-white"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="p-1 rounded bg-studio-800 hover:bg-studio-750 text-studio-cyan"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            <button
              onClick={handleStepForward}
              title="Step 1 Frame Forward (Right Arrow)"
              className="p-1 rounded hover:bg-studio-800 text-slate-400 hover:text-white"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setPlayheadTimeSeconds(0)}
              title="Return to Start"
              className="p-1 rounded hover:bg-studio-800 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="text-[11px] font-bold text-white tracking-wider">
            {formatTimecode(playheadTimeSeconds)}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-slate-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

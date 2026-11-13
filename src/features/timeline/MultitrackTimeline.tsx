import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  Scissors, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Layers
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const MultitrackTimeline: React.FC = () => {
  const { 
    timelineTracks, 
    timelineClips, 
    mediaAssets, 
    selectedTimelineClipId, 
    setSelectedTimelineClipId,
    deleteTimelineClip,
    updateTimelineClip,
    playheadTimeSeconds,
    setPlayheadTimeSeconds,
    isPlaying,
    setIsPlaying
  } = useStudioStore();

  const [zoomLevel, setZoomLevel] = useState<number>(20); // 20px per second

  // Calculate total duration from latest clip end
  const totalDuration = Math.max(
    60,
    ...timelineClips.map(c => c.timeline_start_seconds + c.timeline_duration_seconds)
  );

  const formatTimecode = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const frames = Math.floor((totalSecs % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    setPlayheadTimeSeconds(newTime);
  };

  const handleSplitClip = async () => {
    if (!selectedTimelineClipId) return;
    const clip = timelineClips.find(c => c.id === selectedTimelineClipId);
    if (!clip) return;

    if (playheadTimeSeconds > clip.timeline_start_seconds && playheadTimeSeconds < clip.timeline_start_seconds + clip.timeline_duration_seconds) {
      const splitOffset = playheadTimeSeconds - clip.timeline_start_seconds;

      // Update first half
      await updateTimelineClip({
        id: clip.id,
        timeline_duration_seconds: splitOffset,
        source_out_seconds: clip.source_in_seconds + splitOffset
      });

      // Second half would be added via addClipToTimeline if required
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-200 select-none overflow-hidden font-sans">
      {/* Timeline Controls & Transport Bar */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 px-3 flex items-center justify-between text-xs">
        {/* Playback Controls & Timecode */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-studio-800 hover:bg-studio-700 text-studio-accent transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="font-mono text-sm font-semibold bg-studio-950 px-2.5 py-0.5 rounded border border-studio-800 text-studio-cyan">
            {formatTimecode(playheadTimeSeconds)}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            / {formatTimecode(totalDuration)}
          </span>
        </div>

        {/* Editing Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSplitClip}
            disabled={!selectedTimelineClipId}
            title="Split selected clip at playhead"
            className="p-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-40 text-slate-300 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedTimelineClipId && deleteTimelineClip(selectedTimelineClipId)}
            disabled={!selectedTimelineClipId}
            title="Remove clip from timeline (Preserves original media)"
            className="p-1 rounded bg-studio-850 hover:bg-red-900/50 disabled:opacity-40 text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-studio-800 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoomLevel(Math.max(5, zoomLevel - 5))}
              className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-8 text-center">{zoomLevel}x</span>
            <button
              onClick={() => setZoomLevel(Math.min(60, zoomLevel + 5))}
              className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multitrack Workspace: Left Headers + Right Scrollable Tracks */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Column (Fixed 180px) */}
        <div className="w-44 bg-studio-900 border-r border-studio-800 flex flex-col shrink-0 z-10">
          {/* Header Spacer for Ruler */}
          <div className="h-6 bg-studio-850 border-b border-studio-800 px-2 flex items-center text-[10px] font-mono text-slate-400 uppercase">
            <Layers className="w-3 h-3 mr-1.5 text-studio-cyan" />
            <span>Tracks</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 flex flex-col">
            {timelineTracks.map(track => (
              <div 
                key={track.id} 
                className="h-16 border-b border-studio-800/80 px-2 flex flex-col justify-center bg-studio-900 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 truncate text-[11px] font-mono">
                    {track.label}
                  </span>
                  <span className={`text-[9px] px-1 rounded uppercase font-mono ${
                    track.track_type === 'VIDEO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {track.track_type}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-slate-400">
                  <button className="hover:text-slate-200">
                    {track.is_muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button className="hover:text-slate-200">
                    {track.is_locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    defaultValue={track.volume}
                    className="w-16 h-1 accent-studio-cyan bg-studio-800 rounded appearance-none cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-studio-950" onClick={handleTrackClick}>
          {/* Time Ruler */}
          <div className="h-6 bg-studio-850 border-b border-studio-800 relative font-mono text-[10px] text-slate-400" style={{ width: `${totalDuration * zoomLevel}px` }}>
            {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => {
              const sec = i * 5;
              return (
                <div 
                  key={sec} 
                  className="absolute top-0 bottom-0 border-l border-studio-700/60 pl-1 pt-0.5"
                  style={{ left: `${sec * zoomLevel}px` }}
                >
                  {sec}s
                </div>
              );
            })}
          </div>

          {/* Track Canvas Rows */}
          <div className="relative" style={{ width: `${totalDuration * zoomLevel}px` }}>
            {timelineTracks.map(track => {
              const trackClips = timelineClips.filter(c => c.track_id === track.id);

              return (
                <div 
                  key={track.id} 
                  className="h-16 border-b border-studio-800/40 relative bg-studio-950/50"
                >
                  {trackClips.map(clip => {
                    const asset = mediaAssets.find(a => a.id === clip.media_asset_id);
                    const isSelected = clip.id === selectedTimelineClipId;
                    const leftPx = clip.timeline_start_seconds * zoomLevel;
                    const widthPx = Math.max(20, clip.timeline_duration_seconds * zoomLevel);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineClipId(clip.id);
                        }}
                        className={`absolute top-1 bottom-1 rounded px-2 flex flex-col justify-between cursor-pointer transition-shadow border text-[11px] overflow-hidden ${
                          track.track_type === 'VIDEO'
                            ? 'bg-indigo-950/80 border-indigo-700/80 text-indigo-200'
                            : 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                        } ${isSelected ? 'ring-2 ring-studio-cyan shadow-lg shadow-studio-cyan/20 border-white' : ''}`}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                      >
                        <div className="flex items-center justify-between font-mono truncate pt-0.5">
                          <span className="truncate font-semibold">{asset ? asset.file_name : 'Clip'}</span>
                          <span className="text-[9px] opacity-75">{clip.timeline_duration_seconds.toFixed(1)}s</span>
                        </div>

                        {/* Visual waveform or strip pattern */}
                        <div className="h-2 w-full bg-black/30 rounded-sm mb-1 overflow-hidden flex items-center">
                          <div className="h-full bg-white/20 w-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead Vertical Line */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-sm shadow-red-500"
              style={{ left: `${playheadTimeSeconds * zoomLevel}px`, height: `${timelineTracks.length * 64}px` }}
            >
              {/* Playhead Top Knob */}
              <div className="w-3 h-3 bg-red-500 rotate-45 -ml-[5px] -mt-1 shadow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  Scissors, 
  Trash2, 
  Copy,
  Undo2,
  Redo2,
  ZoomIn, 
  ZoomOut, 
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const MultitrackTimeline: React.FC = () => {
  const { 
    activeProject,
    timelineTracks, 
    timelineClips, 
    mediaAssets, 
    selectedTimelineClipId, 
    setSelectedTimelineClipId,
    deleteTimelineClip,
    splitTimelineClip,
    duplicateTimelineClip,
    trimTimelineClipStart,
    trimTimelineClipEnd,
    updateTimelineClip,
    addClipToTimeline,
    undoTimeline,
    redoTimeline,
    canUndoTimeline,
    canRedoTimeline,
    playheadTimeSeconds,
    setPlayheadTimeSeconds,
    isPlaying,
    setIsPlaying
  } = useStudioStore();

  const [zoomLevel, setZoomLevel] = useState<number>(20); // 20px per second

  // Interactive mouse drag & trim state
  const [dragState, setDragState] = useState<{
    type: 'MOVE' | 'TRIM_LEFT' | 'TRIM_RIGHT';
    clipId: string;
    startX: number;
    origStart: number;
    origDuration: number;
    origIn: number;
  } | null>(null);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaSeconds = (e.clientX - dragState.startX) / zoomLevel;
      const clip = timelineClips.find(c => c.id === dragState.clipId);
      if (!clip) return;

      if (dragState.type === 'MOVE') {
        const newStart = Math.max(0, Math.round((dragState.origStart + deltaSeconds) * 10) / 10);
        updateTimelineClip({ id: clip.id, timeline_start_seconds: newStart });
      } else if (dragState.type === 'TRIM_RIGHT') {
        const newDuration = Math.max(0.5, Math.round((dragState.origDuration + deltaSeconds) * 10) / 10);
        updateTimelineClip({
          id: clip.id,
          timeline_duration_seconds: newDuration,
          source_out_seconds: (clip.source_in_seconds || 0) + newDuration
        });
      } else if (dragState.type === 'TRIM_LEFT') {
        const maxDelta = dragState.origDuration - 0.5;
        const clampedDelta = Math.min(maxDelta, Math.max(-dragState.origStart, deltaSeconds));
        const newStart = Math.round((dragState.origStart + clampedDelta) * 10) / 10;
        const newDuration = Math.round((dragState.origDuration - clampedDelta) * 10) / 10;
        const newIn = Math.round(((dragState.origIn || 0) + clampedDelta) * 10) / 10;
        updateTimelineClip({
          id: clip.id,
          timeline_start_seconds: newStart,
          timeline_duration_seconds: newDuration,
          source_in_seconds: Math.max(0, newIn)
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoomLevel, timelineClips, updateTimelineClip]);

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

  const handleTimelineRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    setPlayheadTimeSeconds(newTime);
  };

  const selectedClip = timelineClips.find(c => c.id === selectedTimelineClipId);

  const handleSplit = async () => {
    if (!selectedTimelineClipId) return;
    await splitTimelineClip(selectedTimelineClipId, playheadTimeSeconds);
  };

  const handleDuplicate = async () => {
    if (!selectedTimelineClipId) return;
    await duplicateTimelineClip(selectedTimelineClipId);
  };

  const handleTrimStartToPlayhead = async () => {
    if (!selectedTimelineClipId || !selectedClip) return;
    if (playheadTimeSeconds > selectedClip.timeline_start_seconds && playheadTimeSeconds < selectedClip.timeline_start_seconds + selectedClip.timeline_duration_seconds) {
      await trimTimelineClipStart(selectedTimelineClipId, playheadTimeSeconds);
    }
  };

  const handleTrimEndToPlayhead = async () => {
    if (!selectedTimelineClipId || !selectedClip) return;
    if (playheadTimeSeconds > selectedClip.timeline_start_seconds && playheadTimeSeconds < selectedClip.timeline_start_seconds + selectedClip.timeline_duration_seconds) {
      const newDuration = playheadTimeSeconds - selectedClip.timeline_start_seconds;
      await trimTimelineClipEnd(selectedTimelineClipId, newDuration);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-200 select-none overflow-hidden font-sans">
      {/* Timeline Controls & CapCut-Style Editing Toolbar */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 px-3 flex items-center justify-between text-xs shrink-0">
        {/* Playback Controls & Timecode */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-studio-800 hover:bg-studio-700 text-studio-cyan transition-colors"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="font-mono text-xs font-semibold bg-studio-950 px-2 py-0.5 rounded border border-studio-800 text-studio-cyan">
            {formatTimecode(playheadTimeSeconds)}
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            / {formatTimecode(totalDuration)}
          </span>

          <div className="h-4 w-[1px] bg-studio-800" />

          {/* Undo / Redo */}
          <button
            onClick={undoTimeline}
            disabled={!canUndoTimeline}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redoTimeline}
            disabled={!canRedoTimeline}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CapCut-Style Clip Editing Actions */}
        <div className="flex items-center space-x-1.5">
          {/* Split at Playhead */}
          <button
            onClick={handleSplit}
            disabled={!selectedTimelineClipId}
            title="Split Clip at Playhead (Scissors)"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 border border-studio-750 transition-colors text-[11px]"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Trim Start */}
          <button
            onClick={handleTrimStartToPlayhead}
            disabled={!selectedTimelineClipId}
            title="Trim Start to Playhead"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 border border-studio-750 transition-colors text-[11px]"
          >
            <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Trim Start</span>
          </button>

          {/* Trim End */}
          <button
            onClick={handleTrimEndToPlayhead}
            disabled={!selectedTimelineClipId}
            title="Trim End to Playhead"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 border border-studio-750 transition-colors text-[11px]"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Trim End</span>
          </button>

          {/* Duplicate Clip */}
          <button
            onClick={handleDuplicate}
            disabled={!selectedTimelineClipId}
            title="Duplicate Selected Clip"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-studio-850 hover:bg-studio-800 disabled:opacity-30 text-slate-300 border border-studio-750 transition-colors text-[11px]"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Delete Clip */}
          <button
            onClick={() => selectedTimelineClipId && deleteTimelineClip(selectedTimelineClipId)}
            disabled={!selectedTimelineClipId}
            title="Remove from Timeline (Preserves Media Library)"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-studio-850 hover:bg-red-950/60 disabled:opacity-30 text-red-400 border border-studio-750 transition-colors text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="h-4 w-[1px] bg-studio-800 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoomLevel(Math.max(8, zoomLevel - 4))}
              className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-7 text-center">{zoomLevel}x</span>
            <button
              onClick={() => setZoomLevel(Math.min(80, zoomLevel + 4))}
              className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multitrack Workspace: Left Track Headers (Fixed) + Right Scrollable Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Column (Fixed 180px) */}
        <div className="w-44 bg-studio-900 border-r border-studio-800 flex flex-col shrink-0 z-10 select-none">
          {/* Header Spacer for Ruler */}
          <div className="h-7 bg-studio-850 border-b border-studio-800 px-2 flex items-center text-[10px] font-mono text-slate-400 uppercase">
            <Layers className="w-3 h-3 mr-1.5 text-studio-cyan" />
            <span>Tracks ({timelineTracks.length})</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 flex flex-col">
            {timelineTracks.map(track => (
              <div 
                key={track.id} 
                className="h-16 border-b border-studio-800/80 px-2.5 flex flex-col justify-center bg-studio-900 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-200 truncate text-[11px] font-mono">
                    {track.label}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase ${
                    track.track_type === 'VIDEO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {track.track_type}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        track.is_muted = !track.is_muted;
                        useStudioStore.setState({});
                      }}
                      className="p-0.5 hover:text-white rounded"
                      title={track.is_muted ? 'Unmute track' : 'Mute track'}
                    >
                      {track.is_muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        track.is_locked = !track.is_locked;
                        useStudioStore.setState({});
                      }}
                      className="p-0.5 hover:text-white rounded"
                      title={track.is_locked ? 'Unlock track' : 'Lock track'}
                    >
                      {track.is_locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                    </button>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    defaultValue={track.volume}
                    onChange={(e) => {
                      track.volume = parseFloat(e.target.value);
                      useStudioStore.setState({});
                    }}
                    className="w-14 h-1 accent-studio-cyan bg-studio-800 rounded appearance-none cursor-pointer"
                    title={`Track Volume: ${Math.round(track.volume * 100)}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Canvas */}
        <div
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-studio-950"
          onClick={handleTimelineRulerClick}
        >
          {/* Time Ruler */}
          <div
            className="h-7 bg-studio-850 border-b border-studio-800 relative font-mono text-[10px] text-slate-400 cursor-pointer"
            style={{ width: `${totalDuration * zoomLevel}px` }}
          >
            {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => {
              const sec = i * 5;
              return (
                <div 
                  key={sec} 
                  className="absolute top-0 bottom-0 border-l border-studio-700/60 pl-1 pt-1"
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!activeProject) return;
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (!data || !data.assetId) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dropX = e.clientX - rect.left;
                      const dropSeconds = Math.max(0, dropX / zoomLevel);
                      addClipToTimeline({
                        track_id: track.id,
                        project_id: activeProject.id,
                        media_asset_id: data.assetId,
                        clip_id: data.assetId,
                        timeline_start_seconds: Math.round(dropSeconds * 10) / 10,
                        timeline_duration_seconds: data.duration || 5,
                        source_in_seconds: 0,
                        source_out_seconds: data.duration || 5,
                        volume: 1.0
                      });
                    } catch (err) {
                      console.warn('Drop error:', err);
                    }
                  }}
                  className="h-16 border-b border-studio-800/40 relative bg-studio-950/40"
                >
                  {trackClips.map(clip => {
                    const asset = mediaAssets.find(a => a.id === clip.media_asset_id);
                    const isSelected = clip.id === selectedTimelineClipId;
                    const leftPx = clip.timeline_start_seconds * zoomLevel;
                    const widthPx = Math.max(24, clip.timeline_duration_seconds * zoomLevel);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineClipId(clip.id);
                        }}
                        onMouseDown={(e) => {
                          if ((e.target as HTMLElement).dataset.handle) return;
                          e.stopPropagation();
                          setSelectedTimelineClipId(clip.id);
                          setDragState({
                            type: 'MOVE',
                            clipId: clip.id,
                            startX: e.clientX,
                            origStart: clip.timeline_start_seconds,
                            origDuration: clip.timeline_duration_seconds,
                            origIn: clip.source_in_seconds || 0
                          });
                        }}
                        className={`absolute top-1 bottom-1 rounded px-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-shadow border text-[11px] overflow-hidden select-none group ${
                          track.track_type === 'VIDEO'
                            ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-indigo-700/80 text-indigo-100 shadow-sm'
                            : 'bg-gradient-to-r from-emerald-950 to-emerald-900 border-emerald-700/80 text-emerald-100 shadow-sm'
                        } ${isSelected ? 'ring-2 ring-studio-cyan shadow-lg shadow-cyan-900/40 border-white' : 'hover:border-slate-400'}`}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                      >
                        {/* Interactive Left Trim Handle */}
                        <div
                          data-handle="trim-left"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedTimelineClipId(clip.id);
                            setDragState({
                              type: 'TRIM_LEFT',
                              clipId: clip.id,
                              startX: e.clientX,
                              origStart: clip.timeline_start_seconds,
                              origDuration: clip.timeline_duration_seconds,
                              origIn: clip.source_in_seconds || 0
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-cyan-400/60 transition-colors z-20"
                          title="Drag to trim start"
                        />

                        {/* Interactive Right Trim Handle */}
                        <div
                          data-handle="trim-right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedTimelineClipId(clip.id);
                            setDragState({
                              type: 'TRIM_RIGHT',
                              clipId: clip.id,
                              startX: e.clientX,
                              origStart: clip.timeline_start_seconds,
                              origDuration: clip.timeline_duration_seconds,
                              origIn: clip.source_in_seconds || 0
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-cyan-400/60 transition-colors z-20"
                          title="Drag to trim end"
                        />

                        {/* Clip Top Bar */}
                        <div className="flex items-center justify-between font-mono truncate pt-0.5 pointer-events-none">
                          <span className="truncate font-bold text-[11px]">
                            {asset ? asset.file_name : 'Take Clip'}
                          </span>
                          <span className="text-[9px] px-1 rounded bg-black/40 font-mono text-cyan-300">
                            {clip.timeline_duration_seconds.toFixed(1)}s
                          </span>
                        </div>

                        {/* Visual Film Strip / Audio Waveform Pattern */}
                        <div className="h-3.5 w-full bg-black/40 rounded-sm mb-1 overflow-hidden flex items-center px-1 space-x-1 pointer-events-none">
                          {track.track_type === 'VIDEO' ? (
                            <div className="flex space-x-1 w-full opacity-60">
                              {Array.from({ length: Math.max(1, Math.floor(widthPx / 30)) }).map((_, idx) => (
                                <div key={idx} className="h-2 w-4 bg-indigo-400/30 rounded-xs border border-indigo-400/40" />
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-0.5 w-full opacity-70">
                              {Array.from({ length: Math.max(1, Math.floor(widthPx / 6)) }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="w-1 bg-emerald-400 rounded-full"
                                  style={{ height: `${Math.max(2, (idx % 5 + 1) * 2)}px` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead Vertical Scrub Line */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-md shadow-red-500/50"
              style={{ left: `${playheadTimeSeconds * zoomLevel}px`, height: `${Math.max(128, timelineTracks.length * 64)}px` }}
            >
              {/* Playhead Top Scrub Marker */}
              <div className="w-3.5 h-3.5 bg-red-500 rotate-45 -ml-[6px] -mt-1 shadow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

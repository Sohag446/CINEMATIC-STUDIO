import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Film,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Plus,
  Video as VideoIcon
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export const PreviewMonitor: React.FC = () => {
  const {
    activeProject,
    clips,
    mediaAssets,
    timelineTracks,
    timelineClips,
    selectedTimelineClipId,
    selectedClipId,
    playheadTimeSeconds,
    setPlayheadTimeSeconds,
    isPlaying,
    setIsPlaying,
    addClipToTimeline
  } = useStudioStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // 1. Identify the active timeline clip at current playhead
  const activeTimelineClip = timelineClips.find(c => {
    const end = c.timeline_start_seconds + c.timeline_duration_seconds;
    return playheadTimeSeconds >= c.timeline_start_seconds && playheadTimeSeconds < end;
  }) || timelineClips.find(c => c.id === selectedTimelineClipId);

  // 2. Identify corresponding media asset
  const activeAsset = activeTimelineClip
    ? mediaAssets.find(a => a.id === activeTimelineClip.media_asset_id)
    : mediaAssets.find(a => a.id === selectedClipId) || mediaAssets[0];

  // 3. Fallback to story clip if no media asset found
  const fallbackStoryClip = clips.find(c => c.id === selectedClipId) || clips[0];

  // Resolve source URL
  const videoSrc = resolveMediaUrl(
    activeAsset?.file_path || fallbackStoryClip?.output_video_path || null,
    activeAsset?.proxy_path || fallbackStoryClip?.proxy_path || null
  );

  // Calculate total timeline duration
  const totalTimelineDuration = Math.max(
    30,
    ...timelineClips.map(c => c.timeline_start_seconds + c.timeline_duration_seconds)
  );

  const formatTimecode = (totalSecs: number) => {
    const safeSecs = Math.max(0, isNaN(totalSecs) ? 0 : totalSecs);
    const mins = Math.floor(safeSecs / 60);
    const secs = Math.floor(safeSecs % 60);
    const frames = Math.floor((safeSecs % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Sync playhead seek with video currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoLoaded) return;

    let targetTime = playheadTimeSeconds;
    if (activeTimelineClip) {
      const clipOffset = playheadTimeSeconds - activeTimelineClip.timeline_start_seconds;
      targetTime = (activeTimelineClip.source_in_seconds || 0) + Math.max(0, clipOffset);
    }

    if (Math.abs(video.currentTime - targetTime) > 0.12) {
      video.currentTime = Math.max(0, Math.min(video.duration || 9999, targetTime));
    }
  }, [playheadTimeSeconds, activeTimelineClip, isVideoLoaded]);

  // Sync isPlaying state with real HTML5 video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback prevented by browser:', err);
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Master timeline playback clock: smoothly advances playhead across all clips & gaps
  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;

    if (isPlaying) {
      const tick = (now: number) => {
        if (lastTime !== null) {
          const delta = (now - lastTime) / 1000;
          setPlayheadTimeSeconds(prev => {
            const next = prev + delta;
            if (next >= totalTimelineDuration) {
              setIsPlaying(false);
              return totalTimelineDuration;
            }
            return next;
          });
        }
        lastTime = now;
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, totalTimelineDuration, setIsPlaying, setPlayheadTimeSeconds]);

  // Sync volume & mute & playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const clipVolume = activeTimelineClip?.volume !== undefined ? activeTimelineClip.volume : volume;
    const clipMuted = isMuted || !!activeTimelineClip?.is_muted;
    video.volume = clipMuted ? 0 : Math.min(1.0, clipVolume);
    video.muted = clipMuted;
    if (activeTimelineClip?.playback_speed) {
      video.playbackRate = activeTimelineClip.playback_speed;
    }
  }, [volume, isMuted, activeTimelineClip?.volume, activeTimelineClip?.is_muted, activeTimelineClip?.playback_speed]);

  // Handle active video time update during playback
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    if (activeTimelineClip) {
      const clipElapsed = video.currentTime - (activeTimelineClip.source_in_seconds || 0);
      const newPlayhead = activeTimelineClip.timeline_start_seconds + Math.max(0, clipElapsed);

      if (clipElapsed >= activeTimelineClip.timeline_duration_seconds) {
        // Clip finished, advance to clip end
        setPlayheadTimeSeconds(activeTimelineClip.timeline_start_seconds + activeTimelineClip.timeline_duration_seconds);
        // Look for next clip
        const nextClip = timelineClips.find(c => c.timeline_start_seconds >= activeTimelineClip.timeline_start_seconds + activeTimelineClip.timeline_duration_seconds);
        if (!nextClip) {
          setIsPlaying(false);
        }
      } else {
        setPlayheadTimeSeconds(newPlayhead);
      }
    } else {
      setPlayheadTimeSeconds(video.currentTime);
      if (video.ended) {
        setIsPlaying(false);
      }
    }
  };

  const handleStepBack = () => {
    setPlayheadTimeSeconds(Math.max(0, playheadTimeSeconds - (1 / 24)));
  };

  const handleStepForward = () => {
    setPlayheadTimeSeconds(Math.min(totalTimelineDuration, playheadTimeSeconds + (1 / 24)));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayheadTimeSeconds(val);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.warn);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  const isScope = activeProject?.target_aspect_ratio === '2.39:1';
  const isVertical = activeProject?.target_aspect_ratio === '9:16';
  const isSquare = activeProject?.target_aspect_ratio === '1:1';

  // CapCut interactive transform & color filter styles
  const transformStyle: React.CSSProperties = {
    transform: `translate(${activeTimelineClip?.position_x || 0}px, ${activeTimelineClip?.position_y || 0}px) scale(${activeTimelineClip?.scale ?? 1.0}) rotate(${activeTimelineClip?.rotation || 0}deg) ${activeTimelineClip?.flip_h ? 'scaleX(-1)' : ''} ${activeTimelineClip?.flip_v ? 'scaleY(-1)' : ''}`,
    opacity: ((activeTimelineClip?.opacity ?? 100) / 100),
    filter: `brightness(${activeTimelineClip?.brightness ?? 100}%) contrast(${activeTimelineClip?.contrast ?? 100}%) saturate(${activeTimelineClip?.saturation ?? 100}%)`,
    transition: 'transform 0.05s ease-out'
  };

  return (
    <div
      ref={containerRef}
      className="h-72 bg-studio-950 border-b border-studio-800 flex overflow-hidden shrink-0 select-none font-sans"
    >
      {/* 1. Left: Quick Media Bin (Takes & Assets) */}
      <div className="w-56 bg-studio-900 border-r border-studio-800 flex flex-col shrink-0 text-xs">
        <div className="h-7 bg-studio-850 border-b border-studio-800 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
          <span className="flex items-center space-x-1">
            <Film className="w-3 h-3 text-studio-cyan" />
            <span>Media Assets ({mediaAssets.length + clips.length})</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {mediaAssets.map((asset) => {
            const isSelected = asset.id === selectedClipId;
            return (
              <div
                key={asset.id}
                onClick={() => useStudioStore.getState().selectClip(asset.id)}
                className={`p-1.5 rounded cursor-pointer border transition-colors ${
                  isSelected
                    ? 'bg-studio-800 border-studio-accent text-white'
                    : 'bg-studio-950/80 border-studio-850 hover:border-studio-750 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-semibold truncate">{asset.file_name}</span>
                  <span className="text-[9px] px-1 rounded uppercase text-cyan-400 bg-cyan-950">
                    {asset.media_type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>{asset.duration_seconds || 5}s</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeProject) {
                        const targetTrack = timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
                        addClipToTimeline({
                          project_id: activeProject.id,
                          media_asset_id: asset.id,
                          track_id: targetTrack?.id || 'V1',
                          timeline_start_seconds: playheadTimeSeconds,
                          timeline_duration_seconds: asset.duration_seconds || 5,
                          source_in_seconds: 0,
                          source_out_seconds: asset.duration_seconds || 5,
                          volume: 1.0
                        });
                      }
                    }}
                    className="text-studio-cyan hover:underline flex items-center space-x-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>To Timeline</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Story Takes if any */}
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
                    {clip.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                  <span>{clip.camera_framing}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeProject) {
                        const targetTrack = timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
                        addClipToTimeline({
                          project_id: activeProject.id,
                          media_asset_id: clip.id,
                          track_id: targetTrack?.id || 'V1',
                          timeline_start_seconds: playheadTimeSeconds,
                          timeline_duration_seconds: clip.target_duration_seconds || 5,
                          source_in_seconds: 0,
                          source_out_seconds: clip.target_duration_seconds || 5,
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

      {/* 2. Center: Real HTML5 Video Program Monitor */}
      <div className="flex-1 flex flex-col bg-black relative justify-between overflow-hidden">

        {/* Monitor Top Toolbar */}
        <div className="h-6 bg-black/80 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PROGRAM MONITOR</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-studio-cyan">{activeProject?.target_aspect_ratio || '16:9'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{activeProject?.target_fps || 24} FPS</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSafeAreas(!showSafeAreas)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                showSafeAreas ? 'bg-studio-800 text-studio-cyan border border-studio-700' : 'text-slate-500'
              }`}
            >
              Safe Areas
            </button>
            <span className="text-emerald-400 font-bold">{formatTimecode(playheadTimeSeconds)}</span>
          </div>
        </div>

        {/* Video Canvas Stage with Aspect Ratio Framing */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-studio-950/95 p-2">
          <div
            className={`relative bg-black border border-studio-800 shadow-2xl flex items-center justify-center overflow-hidden transition-all ${
              isVertical
                ? 'h-full aspect-[9/16]'
                : isSquare
                ? 'h-full aspect-square'
                : isScope
                ? 'w-full max-w-[560px] aspect-[2.39/1]'
                : 'w-full max-w-[480px] aspect-video'
            }`}
          >
            {/* Real HTML5 Video Player */}
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                preload="metadata"
                style={transformStyle}
                onLoadedMetadata={() => {
                  setIsVideoLoaded(true);
                  setVideoLoadError(null);
                }}
                onError={(e) => {
                  console.warn('Video preview stream error:', e);
                  setVideoLoadError('Media decoding failed or format unsupported');
                }}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <div className="text-center p-4 space-y-2 select-none">
                <div className="w-10 h-10 rounded-full bg-studio-900 border border-studio-800 mx-auto flex items-center justify-center text-slate-500">
                  <VideoIcon className="w-5 h-5 text-studio-cyan" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {activeTimelineClip ? 'Timeline Clip Playing' : 'Monitor Standby'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 max-w-xs mx-auto">
                    Import media or drag takes to timeline to begin live decoding preview.
                  </p>
                </div>
              </div>
            )}

            {/* Error Overlay if any */}
            {videoLoadError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center p-2 z-20">
                <p className="text-xs text-rose-400 font-mono">{videoLoadError}</p>
              </div>
            )}

            {/* Safe Area Guides */}
            {showSafeAreas && (
              <div className="absolute inset-4 border border-cyan-500/20 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-2 h-2 border-t border-l border-cyan-400/40" />
                <div className="absolute inset-2 border border-dashed border-cyan-500/10" />
              </div>
            )}
          </div>
        </div>

        {/* Scrubbing Seek Slider */}
        <div className="px-3 py-0.5 bg-studio-900/90 border-t border-studio-800/80 flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max={totalTimelineDuration}
            step="0.04"
            value={playheadTimeSeconds}
            onChange={handleSeek}
            className="flex-1 h-1 bg-studio-800 accent-studio-cyan rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Monitor Transport Bar */}
        <div className="h-8 bg-studio-900 border-t border-studio-800 px-3 flex items-center justify-between text-xs font-mono text-slate-300 shrink-0">
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
              className="p-1.5 rounded bg-studio-800 hover:bg-studio-750 text-studio-cyan"
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
              title="Return to Start (Home)"
              className="p-1 rounded hover:bg-studio-800 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="text-[11px] font-bold text-white tracking-wider flex items-center space-x-1.5">
            <span className="text-emerald-400">{formatTimecode(playheadTimeSeconds)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTimecode(totalTimelineDuration)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-slate-400 hover:text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 accent-studio-cyan bg-studio-800 rounded appearance-none cursor-pointer"
            />
            <button
              onClick={toggleFullscreen}
              className="p-1 text-slate-400 hover:text-white ml-1"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Upload,
  Share2,
  FolderTree,
  Music,
  Video as VideoIcon,
  ArrowLeft
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { PreviewMonitor } from '../timeline/PreviewMonitor';
import { MultitrackTimeline } from '../timeline/MultitrackTimeline';
import { DesktopInspector } from '../../components/DesktopInspector';

export const StudioNLEWorkspace: React.FC = () => {
  const {
    activeProject,
    clips,
    mediaAssets,
    createMediaAsset,
    addClipToTimeline,
    timelineTracks,
    timelineClips,
    setExportModalOpen,
    setMainView,
    selectClip,
    selectedClipId
  } = useStudioStore();

  const [filterType, setFilterType] = useState<'ALL' | 'VIDEO' | 'AUDIO' | 'IMAGE'>('ALL');

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-studio-950 text-slate-400 font-sans">
        <p>No project loaded. Please select or create a project from Home.</p>
      </div>
    );
  }

  // Handle local user media import via file input
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const mediaType = isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE';

      await createMediaAsset({
        project_id: activeProject.id,
        file_name: file.name,
        file_path: (file as any).path || `C:\\CinematicStudio\\Imports\\${file.name}`,
        media_type: mediaType,
        file_size_bytes: file.size,
        duration_seconds: 10,
        fps: activeProject.target_fps || 24,
        proxy_path: URL.createObjectURL(file)
      });
    }
  };

  const handleAddMediaToTimeline = async (assetId: string, duration: number = 10) => {
    const track = timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
    if (!track) return;

    const trackClips = timelineClips.filter(c => c.track_id === track.id);
    const lastEnd = trackClips.reduce((max, c) => Math.max(max, c.timeline_start_seconds + c.timeline_duration_seconds), 0);

    await addClipToTimeline({
      track_id: track.id,
      project_id: activeProject.id,
      media_asset_id: assetId,
      clip_id: assetId,
      timeline_start_seconds: lastEnd,
      timeline_duration_seconds: duration,
      source_in_seconds: 0,
      source_out_seconds: duration
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">

      {/* 1. Studio Top Bar */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMainView('AI_VIDEO')}
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>AI Video Shots</span>
          </button>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-studio-cyan" />
            <span>STUDIO MULTITRACK NLE EDITOR</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            {activeProject.name} • {activeProject.target_aspect_ratio} • {activeProject.target_fps}fps
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-3.5 py-1.5 rounded transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Export Master Film (FFmpeg)</span>
          </button>
        </div>
      </div>

      {/* 2. Middle Row: Media Pool (Left), Large Preview Monitor (Center), Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-studio-800">

        {/* Media Pool Bin */}
        <div className="w-64 bg-studio-900 flex flex-col shrink-0 select-none overflow-hidden">
          {/* Bin Header */}
          <div className="h-9 bg-studio-850 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-1.5">
              <FolderTree className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Media Pool</span>
            </span>

            {/* Hidden File Input for Native File Dialog */}
            <label className="cursor-pointer flex items-center space-x-1 text-[10px] bg-studio-800 hover:bg-studio-750 text-slate-200 border border-studio-700 px-2 py-0.5 rounded transition-colors">
              <Upload className="w-3 h-3" />
              <span>Import</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Filter Pills */}
          <div className="p-2 border-b border-studio-800 bg-studio-925 flex items-center space-x-1 text-[10px] font-mono">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-0.5 rounded ${filterType === 'ALL' ? 'bg-studio-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('VIDEO')}
              className={`px-2 py-0.5 rounded ${filterType === 'VIDEO' ? 'bg-studio-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Video
            </button>
            <button
              onClick={() => setFilterType('AUDIO')}
              className={`px-2 py-0.5 rounded ${filterType === 'AUDIO' ? 'bg-studio-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Audio
            </button>
          </div>

          {/* Media Items List (AI Takes + Imported Media) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {/* AI Video Takes */}
            {clips.map(clip => {
              const isSelected = clip.id === selectedClipId;
              const isReady = clip.status === 'COMPLETED';

              return (
                <div
                  key={clip.id}
                  onClick={() => selectClip(clip.id)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-studio-800 border-studio-accent text-white'
                      : 'bg-studio-950 border-studio-800/80 hover:border-studio-750 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="font-bold flex items-center space-x-1">
                      <VideoIcon className="w-3 h-3 text-cyan-400" />
                      <span>Shot #{clip.clip_number} Take 1</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isReady ? 'bg-emerald-950 text-emerald-400' : 'bg-studio-900 text-slate-500'
                    }`}>
                      {isReady ? 'Ready' : 'Draft'}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">
                    {clip.subject_action}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{clip.target_duration_seconds}s • 1080p</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMediaToTimeline(clip.id, clip.target_duration_seconds);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      + Insert
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Imported Assets */}
            {mediaAssets.map(asset => (
              <div
                key={asset.id}
                className="p-2 rounded-lg bg-studio-950 border border-studio-800 text-xs text-slate-300 hover:border-studio-750 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="font-bold flex items-center space-x-1 truncate max-w-[130px]">
                    {asset.media_type === 'AUDIO' ? (
                      <Music className="w-3 h-3 text-purple-400" />
                    ) : (
                      <VideoIcon className="w-3 h-3 text-emerald-400" />
                    )}
                    <span className="truncate">{asset.file_name}</span>
                  </span>
                  <span className="text-[9px] text-slate-500">{asset.duration_seconds || 10}s</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span>{asset.media_type}</span>
                  <button
                    onClick={() => handleAddMediaToTimeline(asset.id, asset.duration_seconds || 10)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    + Insert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Preview Monitor */}
        <div className="flex-1 flex flex-col bg-studio-950 overflow-hidden">
          <PreviewMonitor />
        </div>

        {/* Right: Desktop Inspector */}
        <DesktopInspector />
      </div>

      {/* 3. Bottom Row: Multitrack Timeline */}
      <div className="h-64 border-t border-studio-800 flex flex-col shrink-0">
        <MultitrackTimeline />
      </div>
    </div>
  );
};

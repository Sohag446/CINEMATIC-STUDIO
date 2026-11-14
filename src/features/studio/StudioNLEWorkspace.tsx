import React, { useState } from 'react';
import {
  Upload,
  Share2,
  FolderTree,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles
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
    deleteMediaAsset,
    addClipToTimeline,
    timelineTracks,
    timelineClips,
    setExportModalOpen,
    setMainView,
    selectClip,
    selectedClipId
  } = useStudioStore();

  const [filterType, setFilterType] = useState<'ALL' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'TEXT'>('ALL');
  const [isImporting, setIsImporting] = useState(false);

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-studio-950 text-slate-400 font-sans space-y-3">
        <VideoIcon className="w-10 h-10 text-slate-600" />
        <p className="text-sm">No project loaded. Please select or create a project from Home.</p>
        <button
          onClick={() => setMainView('HOME')}
          className="bg-studio-accent text-white px-4 py-2 rounded-lg text-xs font-semibold"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Handle local user media import with real metadata extraction
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const mediaType = isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE';

      const objectUrl = URL.createObjectURL(file);
      let detectedDuration = 5;

      // Extract real duration for video/audio
      if (isVideo || isAudio) {
        try {
          detectedDuration = await new Promise<number>((resolve) => {
            const mediaElem = document.createElement(isVideo ? 'video' : 'audio');
            mediaElem.preload = 'metadata';
            mediaElem.onloadedmetadata = () => {
              resolve(mediaElem.duration && !isNaN(mediaElem.duration) ? mediaElem.duration : 5);
            };
            mediaElem.onerror = () => resolve(5);
            mediaElem.src = objectUrl;
          });
        } catch {
          detectedDuration = 5;
        }
      }

      const filePath = (file as any).path || `C:\\CinematicStudio\\Imports\\${file.name}`;

      const newAsset = await createMediaAsset({
        project_id: activeProject.id,
        file_name: file.name,
        file_path: filePath,
        media_type: mediaType,
        file_size_bytes: file.size,
        duration_seconds: Math.round(detectedDuration * 10) / 10,
        fps: activeProject.target_fps || 24,
        proxy_path: objectUrl
      });

      // Auto-insert to timeline if timeline is empty
      if (timelineClips.length === 0 && (isVideo || isAudio)) {
        const targetTrack = timelineTracks.find(t => isVideo ? t.track_type === 'VIDEO' : t.track_type === 'AUDIO') || timelineTracks[0];
        if (targetTrack) {
          await addClipToTimeline({
            track_id: targetTrack.id,
            project_id: activeProject.id,
            media_asset_id: newAsset.id,
            clip_id: newAsset.id,
            timeline_start_seconds: 0,
            timeline_duration_seconds: newAsset.duration_seconds || 5,
            source_in_seconds: 0,
            source_out_seconds: newAsset.duration_seconds || 5,
            volume: 1.0
          });
        }
      }
    }

    setIsImporting(false);
  };

  const handleAddMediaToTimeline = async (assetId: string, duration: number = 5, isAudio: boolean = false) => {
    const track = isAudio
      ? timelineTracks.find(t => t.track_type === 'AUDIO') || timelineTracks[0]
      : timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
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
      source_out_seconds: duration,
      volume: 1.0
    });
  };

  // Filter media assets
  const filteredAssets = mediaAssets.filter(a => {
    if (filterType === 'ALL') return true;
    return a.media_type === filterType;
  });

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">

      {/* 1. CapCut-Style Top Action Bar */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMainView('AI_WORKSPACE')}
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>AI Workspace</span>
          </button>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-studio-cyan" />
            <span>CAPCUT-STYLE VIDEO EDITOR</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
            {activeProject.name} • {activeProject.target_aspect_ratio} • {activeProject.target_fps}fps
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold text-xs px-3.5 py-1.5 rounded transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Export Master (FFmpeg MP4)</span>
          </button>
        </div>
      </div>

      {/* 2. Middle Row: Media Library (Left), Large Program Player (Center), Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-studio-800">

        {/* Media Library Bin (CapCut Left Pane) */}
        <div className="w-72 bg-studio-900 flex flex-col shrink-0 select-none overflow-hidden">
          {/* Bin Header & Import Button */}
          <div className="h-10 bg-studio-850 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-1.5">
              <FolderTree className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Media Library</span>
            </span>

            {/* Hidden File Input for Native File Dialog */}
            <label className="cursor-pointer flex items-center space-x-1 text-[11px] bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold px-2.5 py-1 rounded transition-colors shadow">
              <Upload className="w-3 h-3" />
              <span>{isImporting ? 'Importing...' : 'Import'}</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleImportFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>

          {/* Media Type Tabs */}
          <div className="p-2 border-b border-studio-800 bg-studio-925 flex items-center space-x-1 text-[10px] font-mono">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'VIDEO', label: 'Video', icon: VideoIcon },
              { id: 'AUDIO', label: 'Audio', icon: Music },
              { id: 'IMAGE', label: 'Image', icon: ImageIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                  filterType === tab.id ? 'bg-studio-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Media Library Asset Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* AI Generated Takes */}
            {clips.map(clip => {
              const isSelected = clip.id === selectedClipId;
              const isReady = clip.status === 'COMPLETED';

              return (
                <div
                  key={clip.id}
                  onClick={() => selectClip(clip.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-studio-800 border-studio-accent text-white'
                      : 'bg-studio-950 border-studio-800/80 hover:border-studio-750 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="font-bold flex items-center space-x-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Shot #{clip.clip_number} Take</span>
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
                    <span>{clip.target_duration_seconds}s</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMediaToTimeline(clip.id, clip.target_duration_seconds, false);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to V1</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* User Imported Media Files */}
            {filteredAssets.map(asset => {
              const isAudio = asset.media_type === 'AUDIO';

              return (
                <div
                  key={asset.id}
                  className="p-2.5 rounded-lg bg-studio-950 border border-studio-800 text-xs text-slate-300 hover:border-studio-750 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold flex items-center space-x-1.5 truncate max-w-[170px]">
                      {isAudio ? (
                        <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : (
                        <VideoIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{asset.file_name}</span>
                    </span>
                    <button
                      onClick={() => deleteMediaAsset(asset.id)}
                      title="Delete asset"
                      className="text-slate-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                    <span>{asset.duration_seconds || 5}s • {asset.media_type}</span>
                    <button
                      onClick={() => handleAddMediaToTimeline(asset.id, asset.duration_seconds || 5, isAudio)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {mediaAssets.length === 0 && clips.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <Upload className="w-6 h-6 mx-auto text-slate-600" />
                <p>No media files imported yet.</p>
                <p className="text-[10px] text-slate-600">Click &quot;Import&quot; above to add MP4, MOV, MP3, or images.</p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Real Program Preview Monitor */}
        <div className="flex-1 flex flex-col bg-studio-950 overflow-hidden">
          <PreviewMonitor />
        </div>

        {/* Right: Desktop Inspector Panel */}
        <DesktopInspector />
      </div>

      {/* 3. Bottom Row: CapCut Multitrack Timeline */}
      <div className="h-64 border-t border-studio-800 flex flex-col shrink-0">
        <MultitrackTimeline />
      </div>
    </div>
  );
};

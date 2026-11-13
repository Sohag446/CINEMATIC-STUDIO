import React, { useState } from 'react';
import { 
  X, 
  Folder, 
  Film, 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Plus, 
  Trash2, 
  Search
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { MediaType } from '../../types';

interface MediaLibraryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { 
    activeProject, 
    mediaAssets, 
    timelineTracks, 
    addClipToTimeline, 
    deleteMediaAsset, 
    createMediaAsset,
    playheadTimeSeconds,
    isMediaLibraryModalOpen,
    setMediaLibraryModalOpen
  } = useStudioStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isMediaLibraryModalOpen;
  const onClose = propOnClose !== undefined ? propOnClose : () => setMediaLibraryModalOpen(false);

  const [activeFilter, setActiveFilter] = useState<'ALL' | MediaType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredAssets = mediaAssets.filter(asset => {
    if (activeFilter !== 'ALL' && asset.media_type !== activeFilter) return false;
    if (searchQuery && !asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddAssetToTimeline = async (asset: typeof mediaAssets[0]) => {
    if (!activeProject) return;

    // Pick target track based on media type
    const targetType = asset.media_type === 'AUDIO' ? 'AUDIO' : 'VIDEO';
    const targetTrack = timelineTracks.find(t => t.track_type === targetType) || timelineTracks[0];

    if (!targetTrack) return;

    const duration = asset.duration_seconds || 5.0;

    await addClipToTimeline({
      project_id: activeProject.id,
      track_id: targetTrack.id,
      media_asset_id: asset.id,
      timeline_start_seconds: playheadTimeSeconds,
      timeline_duration_seconds: duration,
      source_in_seconds: 0.0,
      source_out_seconds: duration,
    });

    onClose();
  };

  const handleSimulateImport = async () => {
    if (!activeProject) return;

    const dummyName = `imported_shot_${mediaAssets.length + 1}.mp4`;
    await createMediaAsset({
      project_id: activeProject.id,
      file_name: dummyName,
      file_path: `${activeProject.project_dir_path}\\media\\video\\${dummyName}`,
      media_type: 'VIDEO',
      file_size_bytes: 14_250_000,
      duration_seconds: 10.0,
      width: 1920,
      height: 1080,
      fps: 24.0,
      video_codec: 'h264',
      audio_codec: 'aac',
      audio_channels: 2,
      sample_rate: 48000,
      checksum_sha256: crypto.randomUUID().replace(/-/g, ''),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-3xl bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <Folder className="w-4 h-4 text-studio-cyan" />
            <span>Project Media Library</span>
            <span className="text-[11px] text-slate-500 font-mono">({mediaAssets.length} Assets)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search, Filters, and Import Button */}
        <div className="p-3 bg-studio-950 border-b border-studio-800 flex items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search assets by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-studio-cyan font-mono"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            {(['ALL', 'VIDEO', 'AUDIO', 'IMAGE'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeFilter === filter 
                    ? 'bg-studio-800 text-studio-cyan border border-studio-700' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Import Media Button */}
          <button
            onClick={handleSimulateImport}
            className="flex items-center space-x-1.5 bg-studio-800 hover:bg-studio-750 text-slate-100 px-3 py-1.5 rounded border border-studio-700 font-mono text-xs transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-studio-accent" />
            <span>Import Media</span>
          </button>
        </div>

        {/* Media Asset List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic font-mono">
              No media assets match current filter. Click "Import Media" to add videos, audio, or images.
            </div>
          ) : (
            filteredAssets.map(asset => (
              <div
                key={asset.id}
                className="bg-studio-950 border border-studio-800/80 hover:border-studio-700 p-2.5 rounded-lg flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                    asset.media_type === 'VIDEO' ? 'bg-indigo-950 text-indigo-400' :
                    asset.media_type === 'AUDIO' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {asset.media_type === 'VIDEO' ? <Film className="w-4 h-4" /> :
                     asset.media_type === 'AUDIO' ? <Music className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>

                  <div className="truncate">
                    <span className="font-semibold text-slate-200 text-xs block truncate font-mono">
                      {asset.file_name}
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      {asset.duration_seconds && <span>{asset.duration_seconds.toFixed(1)}s</span>}
                      {asset.width && <span>{asset.width}x{asset.height}</span>}
                      {asset.fps && <span>{asset.fps}fps</span>}
                      {asset.video_codec && <span>{asset.video_codec}</span>}
                      <span>{(asset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAddAssetToTimeline(asset)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-studio-800 hover:bg-studio-700 text-studio-cyan rounded text-[11px] font-mono transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add to Timeline</span>
                  </button>

                  <button
                    onClick={() => deleteMediaAsset(asset.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove asset from project library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

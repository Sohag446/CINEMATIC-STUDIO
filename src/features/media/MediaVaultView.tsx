import React, { useState } from 'react';
import {
  FolderTree,
  Film,
  Music,
  Image as ImageIcon,
  Plus,
  Trash2,
  Search
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { MediaType } from '../../types';

export const MediaVaultView: React.FC = () => {
  const {
    activeProject,
    mediaAssets,
    timelineTracks,
    addClipToTimeline,
    deleteMediaAsset,
    createMediaAsset,
    playheadTimeSeconds
  } = useStudioStore();

  const [activeFilter, setActiveFilter] = useState<'ALL' | MediaType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const filteredAssets = mediaAssets.filter(asset => {
    if (activeFilter !== 'ALL' && asset.media_type !== activeFilter) return false;
    if (searchQuery && !asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddAssetToTimeline = async (asset: typeof mediaAssets[0]) => {
    if (!activeProject) return;

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
      source_in_seconds: 0,
      source_out_seconds: duration,
      volume: 1.0,
    });
  };

  const handleSimulateImport = async (type: MediaType) => {
    if (!activeProject) return;
    setIsUploading(true);
    try {
      const ext = type === 'VIDEO' ? 'mp4' : type === 'AUDIO' ? 'wav' : 'png';
      const name = `${activeProject.slug}_${type.toLowerCase()}_${Date.now().toString().slice(-4)}.${ext}`;

      await createMediaAsset({
        project_id: activeProject.id,
        file_name: name,
        file_path: `${activeProject.project_dir_path}\\media\\${name}`,
        media_type: type,
        file_size_bytes: type === 'VIDEO' ? 14200000 : 3500000,
        duration_seconds: type === 'IMAGE' ? undefined : 6.0,
        width: type === 'AUDIO' ? undefined : 1920,
        height: type === 'AUDIO' ? undefined : 1080,
        fps: type === 'AUDIO' ? undefined : 24.0,
        video_codec: type === 'VIDEO' ? 'h264' : undefined,
        audio_codec: type === 'AUDIO' ? 'aac' : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-y-auto font-sans select-none">

      {/* Header */}
      <div className="border-b border-studio-800 bg-studio-900/90 px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-studio-cyan/20 border border-studio-cyan/40 flex items-center justify-center text-studio-cyan">
                <FolderTree className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Central Media Vault</h1>
              {activeProject && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-studio-800 text-slate-300 border border-studio-700">
                  {activeProject.name}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Manage all generated video takes, character concept references, environment mood boards, voiceovers, sound effects, and master renders.
            </p>
          </div>

          {activeProject && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSimulateImport('VIDEO')}
                disabled={isUploading}
                className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 border border-studio-700 px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <Film className="w-3.5 h-3.5 text-studio-cyan" />
                <span>+ Import Video</span>
              </button>

              <button
                onClick={() => handleSimulateImport('AUDIO')}
                disabled={isUploading}
                className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 border border-studio-700 px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <Music className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Import Audio</span>
              </button>

              <button
                onClick={() => handleSimulateImport('IMAGE')}
                disabled={isUploading}
                className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors shadow-sm"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>+ Import Image Reference</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-6">

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-studio-900 border border-studio-800 rounded-xl p-3">
          <div className="flex items-center space-x-2 bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by filename..."
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
            />
          </div>

          <div className="flex items-center bg-studio-950 border border-studio-800 rounded-lg p-0.5 text-xs font-mono">
            {(['ALL', 'VIDEO', 'AUDIO', 'IMAGE'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-md transition-colors ${activeFilter === tab ? 'bg-studio-800 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                {tab === 'ALL' ? `All (${mediaAssets.length})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        {!activeProject ? (
          <div className="bg-studio-900/40 border border-dashed border-studio-800 rounded-xl p-12 text-center space-y-3">
            <FolderTree className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-white font-bold text-sm">No Active Production</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Select or open a production from the Productions tab to browse its isolated media vault.
            </p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="bg-studio-900/40 border border-dashed border-studio-800 rounded-xl p-12 text-center space-y-3">
            <FolderTree className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-white font-bold text-sm">Media Vault is Empty</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              Generated video takes from Google Veo or Runway, audio tracks, and uploaded concept references will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(asset => {
              const isVideo = asset.media_type === 'VIDEO';
              const isAudio = asset.media_type === 'AUDIO';
              const isImage = asset.media_type === 'IMAGE';

              return (
                <div key={asset.id} className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-studio-700 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`p-1.5 rounded-lg ${
                          isVideo ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          isAudio ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {isVideo && <Film className="w-4 h-4" />}
                          {isAudio && <Music className="w-4 h-4" />}
                          {isImage && <ImageIcon className="w-4 h-4" />}
                        </span>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-white truncate max-w-[180px]">{asset.file_name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatBytes(asset.file_size_bytes)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteMediaAsset(asset.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1">
                      {asset.duration_seconds && (
                        <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                          Duration: {asset.duration_seconds.toFixed(1)}s
                        </span>
                      )}
                      {asset.width && asset.height && (
                        <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                          {asset.width}x{asset.height}
                        </span>
                      )}
                      {asset.video_codec && (
                        <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                          Codec: {asset.video_codec}
                        </span>
                      )}
                      {asset.audio_codec && (
                        <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                          Audio: {asset.audio_codec}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-studio-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleAddAssetToTimeline(asset)}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-studio-cyan font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place on Timeline Track</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

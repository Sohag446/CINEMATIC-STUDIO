import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Play, 
  Sliders,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const ExportModal: React.FC = () => {
  const { 
    isExportModalOpen, 
    setExportModalOpen, 
    activeProject, 
    renderJobs, 
    createRenderJob 
  } = useStudioStore();

  const [selectedPreset, setSelectedPreset] = useState<'SOCIAL_9_16' | 'LANDSCAPE_1080P' | 'HIGH_QUALITY_1440P' | 'UHD_4K' | 'CUSTOM'>('LANDSCAPE_1080P');
  const [customFps, setCustomFps] = useState(24.0);
  const [customCrf, setCustomCrf] = useState(18);
  const [versionSuffix, setVersionSuffix] = useState<string>('');
  const [collisionWarning, setCollisionWarning] = useState<{ path: string } | null>(null);

  if (!isExportModalOpen || !activeProject) return null;

  const getTargetOutputPath = (suffix = versionSuffix) => {
    const filename = `${activeProject.slug}_master_${selectedPreset.toLowerCase()}${suffix}.mp4`;
    return `${activeProject.project_dir_path}\\renders\\${filename}`;
  };

  const handleStartRender = async (allowOverwrite = false) => {
    const outputPath = getTargetOutputPath();

    // Check collision with existing completed output
    const isCollision = renderJobs.some(j => j.output_path === outputPath && j.state === 'COMPLETED');
    if (isCollision && !allowOverwrite) {
      setCollisionWarning({ path: outputPath });
      return;
    }

    setCollisionWarning(null);

    try {
      await createRenderJob({
        project_id: activeProject.id,
        preset_name: selectedPreset,
        output_path: outputPath,
        render_strategy: 'NORMALIZING_TRANSCODE',
        allow_overwrite: allowOverwrite
      });
    } catch (err: any) {
      if (err.message?.includes('COLLISION_DETECTED')) {
        setCollisionWarning({ path: outputPath });
      } else {
        console.error('Failed to create render job:', err);
      }
    }
  };

  const handleAutoVersion = () => {
    const existingCount = renderJobs.filter(j => j.preset_name === selectedPreset).length;
    const nextVersion = `_v${existingCount + 1}`;
    setVersionSuffix(nextVersion);
    setCollisionWarning(null);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-studio-900 border border-studio-800 rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <Share2 className="w-4 h-4 text-studio-cyan" />
            <span>Export & FFmpeg Render Master</span>
          </div>
          <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Preset Selector Grid */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-2">
              Select Output Profile Preset
            </label>

            <div className="grid grid-cols-2 gap-2.5 font-mono">
              {[
                { id: 'LANDSCAPE_1080P', name: 'Standard Landscape', res: '1920x1080 (16:9)', desc: 'Full HD H.264 / AAC 24fps' },
                { id: 'SOCIAL_9_16', name: 'Social Vertical', res: '1080x1920 (9:16)', desc: 'Shorts, TikTok, Reels 24fps' },
                { id: 'HIGH_QUALITY_1440P', name: '2K QHD Master', res: '2560x1440 (16:9)', desc: 'Cinematic High Bitrate 24fps' },
                { id: 'UHD_4K', name: '4K UHD Archive', res: '3840x2160 (16:9)', desc: 'Ultra High Res H.265 / ProRes' }
              ].map(preset => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id as any)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'bg-studio-800 border-studio-cyan text-slate-100 ring-1 ring-studio-cyan'
                      : 'bg-studio-950 border-studio-800 text-slate-400 hover:border-studio-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200 text-xs">{preset.name}</span>
                    <span className="text-[10px] text-studio-cyan bg-studio-900 px-1.5 py-0.5 rounded">{preset.res}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">{preset.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Encoding Settings */}
          <div className="bg-studio-950 border border-studio-800 p-3 rounded space-y-3 font-mono">
            <span className="text-[11px] text-studio-cyan uppercase font-semibold flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Encoding Parameters (CRF & Framing)</span>
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Rate Control (CRF)</span>
                  <span className="text-slate-200">{customCrf} (High Quality)</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="28"
                  value={customCrf}
                  onChange={(e) => setCustomCrf(parseInt(e.target.value))}
                  className="w-full accent-studio-cyan bg-studio-800 rounded appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Frame Rate Conformation</span>
                  <span className="text-slate-200">{customFps.toFixed(1)} fps CFR</span>
                </div>
                <select
                  value={customFps}
                  onChange={(e) => setCustomFps(parseFloat(e.target.value))}
                  className="w-full bg-studio-900 border border-studio-750 text-slate-200 rounded p-1 text-xs"
                >
                  <option value={24.0}>24.000 fps (Cinematic Standard)</option>
                  <option value={25.0}>25.000 fps (PAL)</option>
                  <option value={30.0}>30.000 fps (Web Video)</option>
                  <option value={60.0}>60.000 fps (High Motion)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Collision Warning Banner */}
          {collisionWarning && (
            <div className="bg-amber-950/80 border border-amber-600/70 p-3 rounded-lg text-amber-200 font-mono space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Output File Collision Detected</span>
              </div>
              <p className="text-[11px] text-amber-300/90">
                A completed master render already exists at: <code className="bg-amber-900/60 px-1 rounded text-amber-100">{collisionWarning.path}</code>
              </p>
              <div className="flex items-center space-x-2 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleStartRender(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded font-bold transition-colors"
                >
                  Overwrite & Replace
                </button>
                <button
                  type="button"
                  onClick={handleAutoVersion}
                  className="bg-studio-800 hover:bg-studio-750 text-slate-200 border border-studio-700 px-2.5 py-1 rounded flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3 text-studio-cyan" />
                  <span>Render as New Version</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollisionWarning(null)}
                  className="text-slate-400 hover:text-slate-200 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              Output Vault: <span className="text-slate-300">{getTargetOutputPath()}</span>
            </span>

            <button
              onClick={() => handleStartRender(false)}
              className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent/90 text-slate-950 font-bold px-4 py-2 rounded text-xs transition-colors shadow-lg shadow-studio-accent/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Enqueue Render Job</span>
            </button>
          </div>

          {/* Render Queue History */}
          {renderJobs.length > 0 && (
            <div className="border-t border-studio-800 pt-3 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">Active & Recent Render Jobs</span>
              {renderJobs.map(job => (
                <div key={job.id} className="bg-studio-950 border border-studio-800/80 p-2.5 rounded font-mono text-[11px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200">{job.preset_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      job.state === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      job.state === 'RENDERING' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-studio-800 text-slate-400'
                    }`}>
                      {job.state}
                    </span>
                  </div>

                  <div className="w-full bg-studio-800 h-1.5 rounded-full overflow-hidden mb-1">
                    <div 
                      className="bg-studio-cyan h-full transition-all duration-300" 
                      style={{ width: `${job.progress_percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Strategy: {job.render_strategy}</span>
                    <span>{job.progress_percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

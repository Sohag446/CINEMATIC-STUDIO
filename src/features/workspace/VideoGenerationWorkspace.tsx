import React, { useState } from 'react';
import { 
  Video, 
  Play, 
  Image as ImageIcon, 
  Lock, 
  ChevronDown, 
  Layers, 
  Film,
  Camera
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const VideoGenerationWorkspace: React.FC = () => {
  const { scenes, clips, selectedClipId, selectClip } = useStudioStore();
  const [selectedProvider, setSelectedProvider] = useState('Google Veo');

  const activeClip = clips.find(c => c.id === selectedClipId) || clips[0];

  return (
    <div className="flex-1 flex flex-col bg-studio-900 overflow-hidden">
      {/* Panel Header */}
      <div className="h-10 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold uppercase tracking-wider font-mono">
          <Video className="w-4 h-4 text-studio-cyan" />
          <span>Right Panel: Video Generation Workspace</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>Generation Pipeline Standby</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider & Profile Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
              Video Generator
            </label>
            <div className="relative">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-studio-950 border border-studio-750 text-xs text-slate-200 rounded px-2.5 py-1.5 appearance-none focus:outline-none focus:border-studio-cyan"
              >
                <option value="Google Veo">Google Veo (1080p Cinematic)</option>
                <option value="Google Flow">Google Flow (Experimental)</option>
                <option value="Runway Gen-3">Runway Gen-3 Alpha</option>
                <option value="Luma Dream Machine">Luma Dream Machine</option>
                <option value="Kling AI">Kling AI (10s Camera Motion)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1 flex items-center justify-between">
              <span>Assigned Chrome Profile</span>
              <span className="text-[10px] text-amber-400 flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Phase 2</span>
              </span>
            </label>
            <div className="relative">
              <select
                disabled
                className="w-full bg-studio-950/60 border border-studio-800 text-xs text-slate-500 rounded px-2.5 py-1.5 appearance-none cursor-not-allowed"
              >
                <option>Profile 3: Google Veo Studio (Offline)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scene and Clip Navigation Bar */}
        <div className="bg-studio-950 border border-studio-800 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase flex items-center space-x-1.5">
              <Film className="w-3.5 h-3.5 text-studio-accent" />
              <span>Active Target Shot Selection</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {clips.length} Total Clips Indexed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">Target Scene</span>
              <select className="w-full bg-studio-900 border border-studio-750 text-xs text-slate-200 rounded px-2 py-1.5 font-mono">
                {scenes.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">Target Shot</span>
              <select 
                value={activeClip?.id || ''}
                onChange={(e) => selectClip(e.target.value)}
                className="w-full bg-studio-900 border border-studio-750 text-xs text-slate-200 rounded px-2 py-1.5 font-mono"
              >
                {clips.slice(0, 50).map(c => (
                  <option key={c.id} value={c.id}>Shot {c.clip_number} ({c.target_duration_seconds}s - {c.camera_framing})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Shot Cinematography Details */}
        {activeClip && (
          <div className="bg-studio-950 border border-studio-800 rounded p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-mono border-b border-studio-850 pb-1.5">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-studio-cyan" />
                <span className="font-semibold text-slate-100">Shot {activeClip.clip_number} Parameters</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-850 text-studio-cyan border border-studio-750">
                {activeClip.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
              <div><span className="text-slate-500">Framing:</span> <span className="text-slate-200">{activeClip.camera_framing}</span></div>
              <div><span className="text-slate-500">Angle:</span> <span className="text-slate-200">{activeClip.camera_angle}</span></div>
              <div><span className="text-slate-500">Motion:</span> <span className="text-slate-200">{activeClip.camera_movement}</span></div>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 block mb-0.5">Action Directive:</span>
              <div className="text-slate-200 bg-studio-900 p-2 rounded border border-studio-800">
                {activeClip.subject_action}
              </div>
            </div>
          </div>
        )}

        {/* Reference Image & Continuity Anchors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-studio-950 border border-studio-800 rounded p-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase flex items-center space-x-1.5 mb-2">
              <ImageIcon className="w-3.5 h-3.5 text-studio-accent" />
              <span>Start-Frame Continuity</span>
            </span>
            <div className="h-28 border border-dashed border-studio-750 rounded flex flex-col items-center justify-center text-slate-500 text-xs p-2 text-center bg-studio-900/40">
              <span className="text-[10px] font-mono text-slate-400">Clip {activeClip ? activeClip.clip_number - 1 : 0} End Frame</span>
              <span className="text-[9px] text-slate-600 mt-1">Extracted via FFmpeg upon previous take approval</span>
            </div>
          </div>

          <div className="bg-studio-950 border border-studio-800 rounded p-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase flex items-center space-x-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Character Master Seed</span>
            </span>
            <div className="h-28 border border-dashed border-studio-750 rounded flex flex-col items-center justify-center text-slate-500 text-xs p-2 text-center bg-studio-900/40">
              <span className="text-[10px] font-mono text-slate-400">Marcus Cole (Locked Vault)</span>
              <span className="text-[9px] text-slate-600 mt-1">Injected automatically into generation payload</span>
            </div>
          </div>
        </div>

        {/* Compiled Generation Prompt Preview */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            Compiled Dialect Prompt (Google Veo Format)
          </label>
          <div className="w-full bg-studio-950 border border-studio-750 text-xs text-slate-300 rounded p-2.5 font-mono leading-relaxed">
            A cinematic 35mm film shot at 24fps. Low-angle tracking camera rapidly dollies forward, following Marcus Cole in rain-slicked industrial duster coat leaping across a ten-foot alleyway gap between industrial rooftops. Cold cyan neon backlighting with volumetric rain fog. Photorealistic 35mm film grain.
          </div>
        </div>

        {/* Dispatch Action Button */}
        <div className="pt-2">
          <button
            disabled
            title="Video Generation dispatch unlocks in Phase 4 with Chrome Extension integration"
            className="w-full py-2.5 bg-studio-800 text-slate-500 rounded font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border border-studio-750 cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 text-slate-500" />
            <span>Dispatch Video Generation (Unlocks in Phase 4)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

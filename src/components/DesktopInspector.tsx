import React from 'react';
import {
  X,
  Film,
  Sliders,
  User,
  MapPin,
  Lock,
  Copy,
  ChevronRight,
  Video
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const DesktopInspector: React.FC = () => {
  const {
    isInspectorOpen,
    toggleInspector,
    activeProject,
    clips,
    characters,
    environments,
    timelineClips,
    selectedClipId,
    selectedTimelineClipId,
    selectedCharacterId,
    selectedEnvironmentId,
    updateTimelineClip,
    setCurrentWorkspaceSection
  } = useStudioStore();

  if (!isInspectorOpen) {
    return (
      <button
        onClick={toggleInspector}
        title="Open Inspector (Ctrl+I)"
        className="w-6 bg-studio-900 border-l border-studio-800 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:bg-studio-850 transition-colors shrink-0 select-none py-4"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest -rotate-90 whitespace-nowrap mb-2">
          INSPECTOR
        </span>
        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
      </button>
    );
  }

  // Find active entities
  const activeClip = clips.find(c => c.id === selectedClipId);
  const activeTimelineClip = timelineClips.find(c => c.id === selectedTimelineClipId);
  const activeChar = characters.find(c => c.id === selectedCharacterId);
  const activeEnv = environments.find(e => e.id === selectedEnvironmentId);

  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <aside className="w-72 bg-studio-900 border-l border-studio-800 flex flex-col shrink-0 overflow-y-auto select-none font-sans text-xs text-slate-200">
      {/* Inspector Header */}
      <div className="h-8 bg-studio-850 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-1.5">
          <Sliders className="w-3 h-3 text-studio-accent" />
          <span>Property Inspector</span>
        </span>

        <button
          onClick={toggleInspector}
          className="text-slate-400 hover:text-white transition-colors p-0.5"
          title="Collapse Inspector (Ctrl+I)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4 flex-1 overflow-y-auto">

        {/* 1. INSPECT TIMELINE CLIP */}
        {activeTimelineClip && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2">
              <span className="text-[10px] font-mono text-studio-cyan uppercase font-semibold">
                Timeline Take Clip
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Track {activeTimelineClip.track_id}
              </span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between bg-studio-950 p-2 rounded border border-studio-800">
                <span className="text-slate-400">Timeline Start:</span>
                <span className="text-white font-semibold">{activeTimelineClip.timeline_start_seconds.toFixed(2)}s</span>
              </div>
              <div className="flex items-center justify-between bg-studio-950 p-2 rounded border border-studio-800">
                <span className="text-slate-400">Duration:</span>
                <span className="text-studio-cyan font-semibold">{activeTimelineClip.timeline_duration_seconds.toFixed(2)}s</span>
              </div>
              <div className="flex items-center justify-between bg-studio-950 p-2 rounded border border-studio-800">
                <span className="text-slate-400">Trim In / Out:</span>
                <span className="text-slate-300">{activeTimelineClip.source_in_seconds}s → {activeTimelineClip.source_out_seconds}s</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
                <span>Audio Gain / Volume:</span>
                <span className="text-studio-cyan">{(activeTimelineClip.volume * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={activeTimelineClip.volume}
                onChange={(e) => updateTimelineClip({ id: activeTimelineClip.id, volume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 2. INSPECT STORYBOARD CLIP */}
        {activeClip && !activeTimelineClip && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2">
              <div>
                <h4 className="font-bold text-white text-xs truncate">Shot {activeClip.clip_number}</h4>
                <span className="text-[10px] font-mono text-slate-400">Target Duration: {activeClip.target_duration_seconds}s</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                activeClip.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-studio-950 text-amber-400 border border-amber-800'
              }`}>
                {activeClip.status}
              </span>
            </div>

            {/* Camera Controls */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Camera Optics & Movement</span>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-studio-950 p-2 rounded border border-studio-800">
                  <span className="text-slate-500 block mb-0.5">Framing</span>
                  <span className="text-white font-semibold">{activeClip.camera_framing}</span>
                </div>

                <div className="bg-studio-950 p-2 rounded border border-studio-800">
                  <span className="text-slate-500 block mb-0.5">Movement</span>
                  <span className="text-white font-semibold">{activeClip.camera_movement}</span>
                </div>
              </div>
            </div>

            {/* Visual Continuity Prompt Directive */}
            <div className="space-y-1.5 bg-studio-950 p-2.5 rounded-lg border border-studio-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 text-purple-400" />
                  <span>Subject Action Directive:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(activeClip.subject_action)}
                  className="text-studio-cyan hover:text-white"
                >
                  {copiedPrompt ? 'Copied!' : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-mono line-clamp-4 select-all">
                {activeClip.subject_action}
              </p>
            </div>

            <button
              onClick={() => setCurrentWorkspaceSection('GENERATION')}
              className="w-full py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white rounded font-medium text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Queue Shot in AI Hub</span>
            </button>
          </div>
        )}

        {/* 3. INSPECT CHARACTER */}
        {activeChar && !activeClip && !activeTimelineClip && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2">
              <div>
                <h4 className="font-bold text-white text-xs truncate">{activeChar.name}</h4>
                <span className="text-[10px] font-mono text-purple-400">{activeChar.role}</span>
              </div>
              <User className="w-4 h-4 text-purple-400" />
            </div>

            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Physical Appearance</span>
                <p className="text-slate-300 leading-normal bg-studio-950 p-2 rounded border border-studio-800 text-[10px]">
                  {activeChar.physical_description}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Wardrobe Lock Token</span>
                <p className="text-amber-300 leading-normal bg-studio-950 p-2 rounded border border-studio-800 font-mono text-[10px]">
                  {activeChar.wardrobe}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Character Visual Lock</span>
                <p className="text-studio-cyan leading-normal bg-studio-950 p-2 rounded border border-studio-800 font-mono text-[10px]">
                  {activeChar.visual_prompt_lock}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. INSPECT ENVIRONMENT */}
        {activeEnv && !activeClip && !activeTimelineClip && !activeChar && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2">
              <div>
                <h4 className="font-bold text-white text-xs truncate">{activeEnv.name}</h4>
                <span className="text-[10px] font-mono text-amber-300">{activeEnv.location_type} • {activeEnv.time_of_day}</span>
              </div>
              <MapPin className="w-4 h-4 text-studio-cyan" />
            </div>

            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Architectural Atmosphere</span>
                <p className="text-slate-300 leading-normal bg-studio-950 p-2 rounded border border-studio-800 text-[10px]">
                  {activeEnv.atmosphere}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Lighting & Caustic Rules</span>
                <p className="text-emerald-400 leading-normal bg-studio-950 p-2 rounded border border-studio-800 font-mono text-[10px]">
                  {activeEnv.lighting_rules}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. DEFAULT: MASTER PRODUCTION BLUEPRINT */}
        {!activeClip && !activeTimelineClip && !activeChar && !activeEnv && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                Project Master Blueprint
              </span>
              <Film className="w-4 h-4 text-studio-accent" />
            </div>

            {activeProject ? (
              <div className="space-y-2 font-mono text-[11px]">
                <div className="bg-studio-950 p-2.5 rounded border border-studio-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">Production Title</span>
                  <span className="font-bold text-white block text-xs">{activeProject.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-studio-950 p-2 rounded border border-studio-800">
                    <span className="text-slate-500 uppercase block">Aspect Ratio</span>
                    <span className="text-studio-cyan font-bold">{activeProject.target_aspect_ratio}</span>
                  </div>
                  <div className="bg-studio-950 p-2 rounded border border-studio-800">
                    <span className="text-slate-500 uppercase block">Framerate</span>
                    <span className="text-emerald-400 font-bold">{activeProject.target_fps} FPS</span>
                  </div>
                </div>

                <div className="bg-studio-950 p-2.5 rounded border border-studio-800 space-y-1 text-[10px]">
                  <span className="text-slate-500 uppercase block">Audio Sidechain Ducking</span>
                  <span className="text-slate-300 block">-12 dB Dialogue Ducking (FFmpeg Filter)</span>
                </div>

                <div className="bg-studio-950 p-2.5 rounded border border-studio-800 space-y-1 text-[10px]">
                  <span className="text-slate-500 uppercase block">RAM Safety Rule</span>
                  <span className="text-studio-cyan block">Max 1 Browser Automation Task</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Select a clip, character, or location in the production pipeline to inspect its properties.
              </p>
            )}
          </div>
        )}

      </div>
    </aside>
  );
};

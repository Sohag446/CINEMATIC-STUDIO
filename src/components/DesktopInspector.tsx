import React, { useState } from 'react';
import {
  X,
  Sliders,
  User,
  MapPin,
  ChevronRight,
  Maximize2,
  Volume2,
  Gauge,
  Sun,
  Scissors
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const DesktopInspector: React.FC = () => {
  const {
    isInspectorOpen,
    toggleInspector,
    clips,
    characters,
    environments,
    timelineClips,
    selectedClipId,
    selectedTimelineClipId,
    selectedCharacterId,
    selectedEnvironmentId,
    updateTimelineClip,
    detachAudioFromClip
  } = useStudioStore();

  const [activeInspectorTab, setActiveInspectorTab] = useState<'TRANSFORM' | 'SPEED' | 'AUDIO' | 'COLOR'>('TRANSFORM');

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

  return (
    <aside className="w-80 bg-studio-900 border-l border-studio-800 flex flex-col shrink-0 overflow-hidden select-none font-sans text-xs text-slate-200">
      {/* Inspector Header */}
      <div className="h-9 bg-studio-850 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-1.5">
          <Sliders className="w-3 h-3 text-studio-accent" />
          <span>CapCut Property Inspector</span>
        </span>

        <button
          onClick={toggleInspector}
          className="text-slate-400 hover:text-white transition-colors p-0.5"
          title="Collapse Inspector (Ctrl+I)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* When a Timeline Clip is selected: CapCut Tab Switcher */}
      {activeTimelineClip && (
        <div className="flex items-center bg-studio-950 border-b border-studio-800 text-[10px] font-mono shrink-0">
          {[
            { id: 'TRANSFORM', label: 'Transform', icon: Maximize2 },
            { id: 'SPEED', label: 'Speed', icon: Gauge },
            { id: 'AUDIO', label: 'Audio', icon: Volume2 },
            { id: 'COLOR', label: 'Color', icon: Sun },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveInspectorTab(tab.id as any)}
              className={`flex-1 py-1.5 text-center border-b-2 transition-colors ${
                activeInspectorTab === tab.id
                  ? 'border-studio-cyan text-studio-cyan font-bold bg-studio-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {/* 1. INSPECT TIMELINE CLIP */}
        {activeTimelineClip && (
          <div className="space-y-3.5">
            {/* Basic Clip Info */}
            <div className="flex items-center justify-between border-b border-studio-800 pb-2 text-[10px] font-mono">
              <span className="text-studio-cyan font-bold uppercase">
                Clip {activeTimelineClip.id.slice(0, 8)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Start: {activeTimelineClip.timeline_start_seconds.toFixed(2)}s | Dur: {activeTimelineClip.timeline_duration_seconds.toFixed(2)}s
              </span>
            </div>

            {/* TAB 1: TRANSFORM (Position X, Y, Scale, Rotation, Opacity, Flip) */}
            {activeInspectorTab === 'TRANSFORM' && (
              <div className="space-y-3 text-[11px] font-mono">
                {/* Scale Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Scale:</span>
                    <span className="text-white font-bold">{((activeTimelineClip.scale ?? 1.0) * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={activeTimelineClip.scale ?? 1.0}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, scale: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Position X Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Position X:</span>
                    <span className="text-white font-bold">{activeTimelineClip.position_x || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="5"
                    value={activeTimelineClip.position_x || 0}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, position_x: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Position Y Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Position Y:</span>
                    <span className="text-white font-bold">{activeTimelineClip.position_y || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    step="5"
                    value={activeTimelineClip.position_y || 0}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, position_y: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Rotation Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Rotation:</span>
                    <span className="text-white font-bold">{activeTimelineClip.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeTimelineClip.rotation || 0}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, rotation: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Opacity:</span>
                    <span className="text-white font-bold">{activeTimelineClip.opacity ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={activeTimelineClip.opacity ?? 100}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, opacity: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                {/* Flip Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => updateTimelineClip({ id: activeTimelineClip.id, flip_h: !activeTimelineClip.flip_h })}
                    className={`py-1 rounded text-center border font-mono transition-colors ${
                      activeTimelineClip.flip_h ? 'bg-cyan-950 text-cyan-300 border-cyan-600' : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flip Horizontal
                  </button>
                  <button
                    onClick={() => updateTimelineClip({ id: activeTimelineClip.id, flip_v: !activeTimelineClip.flip_v })}
                    className={`py-1 rounded text-center border font-mono transition-colors ${
                      activeTimelineClip.flip_v ? 'bg-cyan-950 text-cyan-300 border-cyan-600' : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flip Vertical
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SPEED (0.25x - 4x) */}
            {activeInspectorTab === 'SPEED' && (
              <div className="space-y-3 text-[11px] font-mono">
                <span className="text-slate-400 block">Playback Speed Multiplier:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0.25, 0.5, 1.0, 1.5, 2.0, 4.0].map(speed => (
                    <button
                      key={speed}
                      onClick={() => updateTimelineClip({ id: activeTimelineClip.id, playback_speed: speed })}
                      className={`py-1.5 rounded text-center border transition-all ${
                        (activeTimelineClip.playback_speed || 1.0) === speed
                          ? 'bg-studio-cyan text-slate-950 font-bold border-cyan-400'
                          : 'bg-studio-950 border-studio-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: AUDIO (Volume, Fade, Mute, Detach Audio) */}
            {activeInspectorTab === 'AUDIO' && (
              <div className="space-y-3 text-[11px] font-mono">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gain / Volume:</span>
                    <span className="text-studio-cyan font-bold">{Math.round((activeTimelineClip.volume ?? 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.05"
                    value={activeTimelineClip.volume ?? 1.0}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Mute Clip Audio:</span>
                  <input
                    type="checkbox"
                    checked={!!activeTimelineClip.is_muted}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, is_muted: e.target.checked })}
                    className="accent-studio-cyan"
                  />
                </div>

                {/* Detach Audio Button */}
                <div className="pt-2 border-t border-studio-800">
                  <button
                    onClick={() => detachAudioFromClip(activeTimelineClip.id)}
                    className="w-full py-1.5 rounded bg-studio-850 hover:bg-studio-800 border border-studio-750 text-cyan-300 font-bold transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Detach Audio to Track A1</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: COLOR CORRECTION */}
            {activeInspectorTab === 'COLOR' && (
              <div className="space-y-3 text-[11px] font-mono">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Brightness:</span>
                    <span className="text-white font-bold">{activeTimelineClip.brightness ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="1"
                    value={activeTimelineClip.brightness ?? 100}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, brightness: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Contrast:</span>
                    <span className="text-white font-bold">{activeTimelineClip.contrast ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="1"
                    value={activeTimelineClip.contrast ?? 100}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, contrast: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Saturation:</span>
                    <span className="text-white font-bold">{activeTimelineClip.saturation ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="2"
                    value={activeTimelineClip.saturation ?? 100}
                    onChange={e => updateTimelineClip({ id: activeTimelineClip.id, saturation: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-studio-950 accent-studio-cyan rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
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

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Cinematography Directives</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="bg-studio-950 p-1.5 rounded border border-studio-800">
                  <span className="text-slate-500 block">Framing</span>
                  <span className="text-slate-200">{activeClip.camera_framing}</span>
                </div>
                <div className="bg-studio-950 p-1.5 rounded border border-studio-800">
                  <span className="text-slate-500 block">Movement</span>
                  <span className="text-slate-200">{activeClip.camera_movement}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Prompt Spec</span>
              <p className="text-[11px] text-slate-300 font-mono bg-studio-950 p-2.5 rounded border border-studio-800 leading-relaxed">
                {activeClip.video_prompt || activeClip.subject_action}
              </p>
            </div>
          </div>
        )}

        {/* 3. INSPECT ACTIVE CHARACTER */}
        {activeChar && (
          <div className="space-y-3 pt-2 border-t border-studio-800">
            <div className="flex items-center space-x-1.5 text-purple-400 font-semibold text-[11px]">
              <User className="w-3.5 h-3.5" />
              <span>{activeChar.name}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{activeChar.physical_description}</p>
          </div>
        )}

        {/* 4. INSPECT ACTIVE ENVIRONMENT */}
        {activeEnv && (
          <div className="space-y-3 pt-2 border-t border-studio-800">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px]">
              <MapPin className="w-3.5 h-3.5" />
              <span>{activeEnv.name}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{activeEnv.lighting_rules}</p>
          </div>
        )}

        {!activeTimelineClip && !activeClip && !activeChar && !activeEnv && (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 text-xs p-4 space-y-2">
            <Sliders className="w-6 h-6 text-slate-600 mb-1" />
            <p>Select a clip on the timeline or media card to inspect and adjust its properties.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesktopInspector;

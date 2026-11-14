import React, { useState } from 'react';
import {
  Bot,
  Video,
  Sparkles,
  Play,
  Pause,
  CheckCircle2,
  ExternalLink,
  Film,
  Camera,
  Compass,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Loader2,
  Plus
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const AIVideoWorkspace: React.FC = () => {
  const {
    activeProject,
    clips,
    characters,
    environments,
    storyText,
    isAnalyzingStory,
    storyAnalysis,
    analyzeAndBreakdownStory,
    activeAIPlatform,
    setActiveAIPlatform,
    selectedShotId,
    setSelectedShotId,
    generateShotVideo,
    startShotQueue,
    pauseShotQueue,
    shotQueueState,
    addClipDirectlyToTimeline,
    registeredProfiles,
    activeVideoProfileId,
    setActiveVideoProfileId,
    setChromeWizardOpen,
    setMainView
  } = useStudioStore();

  const [inputScript, setInputScript] = useState(
    storyText ||
    `TITLE: THE NEON PROTOCOL
LOGLINE: In a drowned cyberpunk metropolis, rogue neural archivist Elena Vance infiltrates a high-security server core to retrieve a forbidden memory before enforcer Kaelen Morse intercepts her.

SCENE 1: THE FLOODED PERIMETER
Elena navigates the rain-slicked lower sector alleyways under saturated neon lights. She activates her optic scanner, detecting syndicate patrol drones hovering in the misty distance.

SCENE 2: THE DATA CORE BREACH
Elena slips through sliding blast doors into the central server cavern. Pulsing amber security lighting sweeps across towering columns. She connects directly to the core terminal and downloads the encrypted archive as footsteps echo behind her.`
  );

  const selectedClip = clips.find(c => c.id === selectedShotId) || clips[0] || null;

  const completedClipsCount = clips.filter(c => c.status === 'COMPLETED').length;
  const isQueueActive = shotQueueState === 'RUNNING';

  const handleStartAnalysis = async () => {
    if (!inputScript.trim()) return;
    await analyzeAndBreakdownStory(inputScript);
  };

  const handlePlatformChange = (platform: 'chatgpt' | 'gemini' | 'claude') => {
    setActiveAIPlatform(platform);
  };

  const openPlatformInChrome = () => {
    const urls = {
      chatgpt: 'https://chatgpt.com',
      gemini: 'https://gemini.google.com',
      claude: 'https://claude.ai'
    };
    window.open(urls[activeAIPlatform], '_blank');
  };

  const openVeoInChrome = () => {
    window.open('https://deepmind.google/technologies/veo/', '_blank');
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-studio-950 text-slate-400 font-sans">
        <p>No project loaded. Please select or create a project from Home.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">

      {/* Workspace Top Toolbar */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-studio-accent animate-pulse" />
            <span>AI VIDEO PRODUCTION WORKSPACE</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-400 text-[11px] truncate max-w-xs">
            {activeProject.name} ({activeProject.target_aspect_ratio})
          </span>
        </div>

        {/* Workflow Progress Stepper */}
        <div className="hidden md:flex items-center space-x-3 text-[11px] font-mono">
          <span className="text-purple-400 font-semibold flex items-center space-x-1">
            <span>1. Story Analysis</span>
            <CheckCircle2 className="w-3 h-3 text-purple-400" />
          </span>
          <span className="text-slate-600">→</span>
          <span className={`${clips.length > 0 ? 'text-cyan-400 font-semibold' : 'text-slate-500'} flex items-center space-x-1`}>
            <span>2. 10s Shot Generation</span>
            {completedClipsCount > 0 && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
          </span>
          <span className="text-slate-600">→</span>
          <button
            onClick={() => setMainView('STUDIO')}
            className="text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
          >
            <span>3. Studio Timeline ({completedClipsCount})</span>
            <Compass className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Split-Screen Main Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-studio-800 overflow-hidden min-h-0">

        {/* ======================================================== */}
        {/* LEFT PANEL: AI STORY BROWSER (ChatGPT / Gemini / Claude) */}
        {/* ======================================================== */}
        <div className="flex flex-col bg-studio-925 overflow-hidden">
          {/* Panel Header & Platform Switcher */}
          <div className="h-11 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1 bg-studio-950 p-1 rounded-lg border border-studio-800 text-[11px]">
              <button
                onClick={() => handlePlatformChange('chatgpt')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeAIPlatform === 'chatgpt'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ChatGPT
              </button>
              <button
                onClick={() => handlePlatformChange('gemini')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeAIPlatform === 'gemini'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gemini
              </button>
              <button
                onClick={() => handlePlatformChange('claude')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeAIPlatform === 'claude'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Claude
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={openPlatformInChrome}
                title="Open real web session in Google Chrome"
                className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-studio-850 hover:bg-studio-800 border border-studio-750 px-2.5 py-1 rounded transition-colors"
              >
                <span>Chrome Session</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Story Script & Decomposition Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Story Input Card */}
            <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center space-x-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Story Input & Screenplay Script</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {inputScript.split(/\s+/).length} Words
                </span>
              </div>

              <textarea
                value={inputScript}
                onChange={(e) => setInputScript(e.target.value)}
                placeholder="Type or paste screenplay scenes, narrative pitch, or dialogue..."
                rows={7}
                className="w-full bg-studio-950 border border-studio-750 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-studio-accent resize-none placeholder-slate-600"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">Templates:</span>
                  <button
                    onClick={() => setInputScript('TITLE: CYBER INFILTRATION\n\nElena Vance runs through neon-lit alleys in pouring rain, dodging syndicate drones, and hacks the central terminal.')}
                    className="text-[10px] bg-studio-950 hover:bg-studio-850 text-slate-300 border border-studio-800 px-2 py-0.5 rounded transition-colors"
                  >
                    Cyberpunk
                  </button>
                  <button
                    onClick={() => setInputScript('TITLE: ORBITAL DEPARTURE\n\nCommander Aris prepares the interstellar colony ship on the launchpad as warning sirens flare across the lunar base.')}
                    className="text-[10px] bg-studio-950 hover:bg-studio-850 text-slate-300 border border-studio-800 px-2 py-0.5 rounded transition-colors"
                  >
                    Sci-Fi Space
                  </button>
                </div>

                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzingStory}
                  className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow transition-all"
                >
                  {isAnalyzingStory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Story...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Story & Generate Shots</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Results / Character & Environment Vault */}
            {storyAnalysis && (
              <div className="space-y-4">
                {/* Detected Characters */}
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Character Visual Continuity Locks ({characters.length})</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {characters.map(char => (
                      <div key={char.id} className="bg-studio-950 border border-studio-800 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{char.name}</span>
                          <span className="text-[10px] font-mono text-purple-300 px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800/40">
                            {char.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{char.wardrobe}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate" title={char.visual_prompt_lock}>
                          🔒 {char.visual_prompt_lock}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detected Environments */}
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Environment & Lighting Rules ({environments.length})</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {environments.map(env => (
                      <div key={env.id} className="bg-studio-950 border border-studio-800 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{env.name}</span>
                          <span className="text-[10px] font-mono text-emerald-300 px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40">
                            {env.time_of_day}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{env.lighting_rules}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT PANEL: VIDEO GENERATION BROWSER (Google Veo / Flow Session) */}
        {/* ==================================================================== */}
        <div className="flex flex-col bg-studio-925 overflow-hidden">
          {/* Panel Header & Profile Selector */}
          <div className="h-11 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Veo 1080p Cinematic</span>
              </span>
            </div>

            {/* Profile Dropdown & Chrome Status */}
            <div className="flex items-center space-x-2">
              <label className="text-[11px] text-slate-400">Chrome Profile:</label>
              <select
                value={activeVideoProfileId || (registeredProfiles[0]?.id || '')}
                onChange={(e) => setActiveVideoProfileId(e.target.value)}
                className="bg-studio-950 border border-studio-750 text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
              >
                {registeredProfiles.length === 0 ? (
                  <option value="">Default Chrome Session</option>
                ) : (
                  registeredProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} ({p.profile_dir_key})
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => setChromeWizardOpen(true)}
                title="Open Chrome Pairing Wizard"
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={openVeoInChrome}
                title="Open Google DeepMind Veo in Chrome"
                className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-studio-850 hover:bg-studio-800 border border-studio-750 px-2 py-1 rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active Generation Preview & Monitor */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between space-y-4">

            {/* Take Monitor / Video Screen */}
            <div className="relative aspect-video w-full rounded-xl bg-black border border-studio-800 overflow-hidden flex items-center justify-center shadow-inner group">
              {selectedClip?.status === 'COMPLETED' && selectedClip.proxy_path ? (
                <div className="relative w-full h-full">
                  <video
                    src={selectedClip.proxy_path}
                    controls
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-studio-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-studio-750 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Take Downloaded ✓ (1080p ProRes Proxy)</span>
                  </div>
                </div>
              ) : selectedClip?.status === 'GENERATING' ? (
                <div className="text-center space-y-3 p-6">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-white">Generating 10s Cinematic Take...</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Communicating with Chrome Extension • Google Veo Session
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 p-6">
                  <div className="w-12 h-12 rounded-full bg-studio-900 border border-studio-800 flex items-center justify-center mx-auto text-slate-500">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      {selectedClip ? `Shot #${selectedClip.clip_number} Selected` : 'No Shot Selected'}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Click &quot;Generate Shot&quot; below or run the Sequential Queue to create continuous 10s video clips.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Shot Prompt Directive Card */}
            {selectedClip && (
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white font-mono bg-studio-800 px-2 py-0.5 rounded">
                      Shot #{selectedClip.clip_number}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-950 text-cyan-400 border border-studio-750">
                      {selectedClip.camera_framing} • {selectedClip.camera_movement}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Target: ~{selectedClip.target_duration_seconds}s
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    selectedClip.status === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : selectedClip.status === 'GENERATING'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800 animate-pulse'
                      : 'bg-studio-800 text-slate-300'
                  }`}>
                    {selectedClip.status === 'COMPLETED' ? 'Downloaded ✓' : selectedClip.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-studio-950 p-2.5 rounded border border-studio-800/80">
                  {selectedClip.subject_action}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Provider: Google Veo (Chrome Profile: {registeredProfiles[0]?.display_name || 'Active'})
                  </span>

                  <div className="flex items-center space-x-2">
                    {selectedClip.status === 'COMPLETED' ? (
                      <button
                        onClick={() => addClipDirectlyToTimeline(selectedClip.id)}
                        className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded transition-colors shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Send to Studio Timeline</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => generateShotVideo(selectedClip.id)}
                        disabled={selectedClip.status === 'GENERATING'}
                        className="flex items-center space-x-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition-colors shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Generate Shot #{selectedClip.clip_number}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM PANEL: NUMBERED SHOT QUEUE (1..N)                 */}
      {/* ======================================================== */}
      <div className="h-56 bg-studio-900 border-t border-studio-800 flex flex-col shrink-0 select-none">

        {/* Queue Control Header */}
        <div className="h-10 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Numbered Shot Queue (1..{clips.length})</span>
            </span>

            <span className="text-[11px] font-mono text-slate-400 bg-studio-950 px-2.5 py-0.5 rounded border border-studio-800">
              {completedClipsCount} of {clips.length} Downloaded ✓
            </span>
          </div>

          {/* Sequential Queue Playback Controls */}
          <div className="flex items-center space-x-2">
            {isQueueActive ? (
              <button
                onClick={pauseShotQueue}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3.5 py-1 rounded transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Queue</span>
              </button>
            ) : (
              <button
                onClick={startShotQueue}
                disabled={clips.length === 0}
                className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-1 rounded transition-colors shadow"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Generate All (Sequential Queue)</span>
              </button>
            )}

            {completedClipsCount > 0 && (
              <button
                onClick={() => setMainView('STUDIO')}
                className="flex items-center space-x-1.5 bg-studio-800 hover:bg-studio-750 text-slate-200 border border-studio-700 text-xs px-3 py-1 rounded transition-colors"
              >
                <span>Open in Studio Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scrollable Shot Cards (1..N) */}
        <div className="flex-1 overflow-x-auto p-3 flex items-center space-x-3">
          {clips.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              <span>No shots generated yet. Enter your story on the left and click &quot;Analyze Story &amp; Generate Shots&quot;.</span>
            </div>
          ) : (
            clips.map((clip) => {
              const isSelected = clip.id === (selectedClip?.id || selectedShotId);
              const isCompleted = clip.status === 'COMPLETED';
              const isGenerating = clip.status === 'GENERATING';

              return (
                <div
                  key={clip.id}
                  onClick={() => setSelectedShotId(clip.id)}
                  className={`cursor-pointer shrink-0 w-64 h-full rounded-xl border p-3 flex flex-col justify-between transition-all select-none ${
                    isSelected
                      ? 'bg-studio-800 border-studio-accent shadow-md shadow-purple-950/30'
                      : 'bg-studio-950 border-studio-800 hover:border-studio-750 hover:bg-studio-900'
                  }`}
                >
                  <div>
                    {/* Header: Shot Number & Status Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white font-mono flex items-center space-x-1">
                        <span>Shot #{clip.clip_number}</span>
                      </span>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : isGenerating
                          ? 'bg-purple-950 text-purple-400 border border-purple-800 animate-pulse'
                          : 'bg-studio-900 text-slate-400 border border-studio-800'
                      }`}>
                        {isCompleted ? 'Downloaded ✓' : isGenerating ? 'Generating...' : 'Ready'}
                      </span>
                    </div>

                    {/* Camera Framing & Duration */}
                    <div className="text-[10px] font-mono text-cyan-400 mb-1">
                      {clip.camera_framing} • {clip.camera_movement} • ~{clip.target_duration_seconds}s
                    </div>

                    {/* Short Prompt Snippet */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                      {clip.subject_action}
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-studio-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Veo 1080p</span>

                    {isCompleted ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addClipDirectlyToTimeline(clip.id);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        + Add to Timeline
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateShotVideo(clip.id);
                        }}
                        disabled={isGenerating}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        {isGenerating ? 'Generating...' : 'Generate Take'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

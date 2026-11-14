import React, { useState } from 'react';
import {
  Bot,
  Video,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  Camera,
  UserCheck,
  Loader2,
  Plus,
  Globe,
  Copy,
  Check,
  Monitor,
  Layers
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const AIVideoWorkspace: React.FC = () => {
  const {
    activeProject,
    clips,
    characters,
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
    registeredProfiles,
    activeVideoProfileId,
    setMainView,
    launchProfile,
    createMediaAsset,
    addClipToTimeline,
    timelineTracks
  } = useStudioStore();

  // Exactly TWO primary browser tabs: Tab 1 = AI Assistant, Tab 2 = AI Video Generator
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'ASSISTANT' | 'GENERATOR'>('ASSISTANT');

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

  // Omnibox and browser surface state for Tab 1 (AI Assistant)
  const assistantUrls = {
    chatgpt: 'https://chatgpt.com',
    gemini: 'https://gemini.google.com',
    claude: 'https://claude.ai'
  };
  const [assistantUrl, setAssistantUrl] = useState<string>(assistantUrls[activeAIPlatform] || 'https://chatgpt.com');
  const [assistantInputUrl, setAssistantInputUrl] = useState<string>(assistantUrls[activeAIPlatform] || 'https://chatgpt.com');

  // Omnibox and browser surface state for Tab 2 (AI Video Generator)
  const [generatorUrl, setGeneratorUrl] = useState<string>('https://deepmind.google/technologies/veo/');
  const [generatorSubView, setGeneratorSubView] = useState<'BROWSER' | 'TAKE_MONITOR'>('BROWSER');

  const [isCopiedPrompt, setIsCopiedPrompt] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  const handleStartAnalysis = async () => {
    if (!inputScript.trim()) return;
    await analyzeAndBreakdownStory(inputScript);
  };

  const handlePlatformChange = (platform: 'chatgpt' | 'gemini' | 'claude') => {
    setActiveAIPlatform(platform);
    const target = assistantUrls[platform];
    setAssistantUrl(target);
    setAssistantInputUrl(target);
  };

  const handleLaunchCompanionChrome = async (targetUrl: string) => {
    const profile = registeredProfiles.find(p => p.id === activeVideoProfileId) || registeredProfiles[0];
    const userDir = profile?.user_data_dir || '';
    const key = profile?.profile_dir_key || 'Default';
    try {
      await launchProfile(userDir, key);
    } catch (e) {
      console.warn('Failed to launch companion Chrome:', e);
      window.open(targetUrl, '_blank');
    }
  };

  const handleCopyPrompt = () => {
    if (!selectedClip) return;
    const promptText = `${selectedClip.subject_action} | Framing: ${selectedClip.camera_framing}, Movement: ${selectedClip.camera_movement}, Lighting: ${selectedClip.lighting_setup}`;
    navigator.clipboard.writeText(promptText);
    setIsCopiedPrompt(true);
    setTimeout(() => setIsCopiedPrompt(false), 2000);
  };

  const handleCopyStoryPrompt = () => {
    const promptText = `Act as an expert Hollywood director and cinematographer. Please analyze this screenplay narrative and produce a cinematic shot breakdown for video production:\n\n${inputScript}`;
    navigator.clipboard.writeText(promptText);
    setIsCopiedPrompt(true);
    setTimeout(() => setIsCopiedPrompt(false), 2000);
  };

  // Direct import of completed take to Video Editor
  const handleImportTakeToEditor = async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !activeProject) return;

    // Create media asset
    const newAsset = await createMediaAsset({
      project_id: activeProject.id,
      file_name: `Take_Shot_${clip.clip_number}.mp4`,
      file_path: clip.output_video_path || clip.proxy_path || `C:\\CinematicStudio\\Projects\\${activeProject.slug}\\takes\\shot_${clip.clip_number}.mp4`,
      media_type: 'VIDEO',
      file_size_bytes: 12500000,
      duration_seconds: clip.target_duration_seconds || 5,
      fps: activeProject.target_fps || 24,
      proxy_path: clip.proxy_path || clip.output_video_path
    });

    // Insert into Timeline Track V1
    const v1Track = timelineTracks.find(t => t.track_type === 'VIDEO') || timelineTracks[0];
    if (v1Track) {
      await addClipToTimeline({
        track_id: v1Track.id,
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

    // Switch view to Video Editor
    setMainView('VIDEO_EDITOR');
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

      {/* Top Workspace Bar: TWO PRIMARY BROWSER TABS */}
      <div className="h-11 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          {/* Toggle Story Drawer Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`p-1.5 rounded border transition-colors ${
              isDrawerOpen ? 'bg-studio-800 border-studio-700 text-white' : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Story-to-Shot Breakdown Drawer"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </button>

          {/* EXACTLY TWO PRIMARY BROWSER TABS */}
          <div className="flex items-center bg-studio-950 p-0.5 rounded-lg border border-studio-800">
            {/* Tab 1: AI Assistant */}
            <button
              onClick={() => setActiveWorkspaceTab('ASSISTANT')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeWorkspaceTab === 'ASSISTANT'
                  ? 'bg-purple-900 text-white border border-purple-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-300" />
              <span>Tab 1: AI Story Assistant</span>
            </button>

            {/* Tab 2: AI Video Generator */}
            <button
              onClick={() => setActiveWorkspaceTab('GENERATOR')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeWorkspaceTab === 'GENERATOR'
                  ? 'bg-cyan-900 text-white border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-cyan-300" />
              <span>Tab 2: AI Video Generator</span>
              {completedClipsCount > 0 && (
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                  {completedClipsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Companion Chrome & Video Editor Navigation */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleLaunchCompanionChrome(activeWorkspaceTab === 'ASSISTANT' ? assistantUrl : generatorUrl)}
            className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            title="Open in Dedicated Google Chrome Window"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span>Companion Chrome</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={() => setMainView('VIDEO_EDITOR')}
            className="flex items-center space-x-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow"
          >
            <span>Open in Video Editor &rarr;</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Optional Left 5-Stage Story Drawer + Main Browser Tab Surface */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* 5-STAGE STORY-TO-SHOT DRAWER (Collapsible) */}
        {isDrawerOpen && (
          <div className="w-80 md:w-96 bg-studio-925 border-r border-studio-800 flex flex-col shrink-0 overflow-hidden">
            {/* Drawer Header */}
            <div className="h-10 bg-studio-900 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Story-to-Shot Breakdown (5 Stages)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{clips.length} Takes</span>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-3 py-2 bg-studio-950 border-b border-studio-800 text-[10px] font-mono grid grid-cols-5 gap-1 text-center">
              <span className="text-purple-400 font-bold">1. Story</span>
              <span className={storyAnalysis ? 'text-cyan-400 font-bold' : 'text-slate-600'}>2. Analysis</span>
              <span className={clips.length > 0 ? 'text-blue-400 font-bold' : 'text-slate-600'}>3. Shots</span>
              <span className={completedClipsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-600'}>4. Direct</span>
              <span className="text-emerald-400 font-bold">5. Assemble</span>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Stage 1: Story Script Input */}
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span>Stage 1: Screenplay Script</span>
                  </span>
                  <button
                    onClick={handleCopyStoryPrompt}
                    title="Copy story prompt to clipboard for AI Assistant"
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-mono"
                  >
                    Copy to AI
                  </button>
                </div>

                <textarea
                  value={inputScript}
                  onChange={(e) => setInputScript(e.target.value)}
                  placeholder="Paste story script or narrative beats..."
                  rows={5}
                  className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                />

                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzingStory}
                  className="w-full flex items-center justify-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg shadow transition-all"
                >
                  {isAnalyzingStory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Screenplay...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Story & Generate Shots</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stage 2 & 3: Character Continuity & Shot List */}
              {characters.length > 0 && (
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Visual Consistency Locks ({characters.length})</span>
                  </span>
                  <div className="space-y-1.5">
                    {characters.map(char => (
                      <div key={char.id} className="bg-studio-950 border border-studio-800 rounded p-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-white mb-0.5">
                          <span>{char.name}</span>
                          <span className="text-[9px] text-purple-300 font-mono">{char.role}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{char.visual_prompt_lock}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage 4: Shot Sequence List */}
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cinematic Shots ({clips.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">10s Takes</span>
                </div>

                <div className="space-y-2">
                  {clips.map(clip => {
                    const isSelected = clip.id === (selectedClip?.id || clips[0]?.id);
                    const isReady = clip.status === 'COMPLETED';

                    return (
                      <div
                        key={clip.id}
                        onClick={() => setSelectedShotId(clip.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-studio-800 border-cyan-400 shadow-sm'
                            : 'bg-studio-950 border-studio-800 hover:border-studio-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono mb-1">
                          <span className="font-bold text-white">Shot #{clip.clip_number}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isReady ? 'bg-emerald-950 text-emerald-400' : 'bg-studio-900 text-slate-400'
                          }`}>
                            {isReady ? 'Ready' : clip.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-2 mb-2">
                          {clip.subject_action}
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-studio-800/60">
                          <span>{clip.camera_framing} • {clip.camera_movement}</span>
                          {isReady ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImportTakeToEditor(clip.id);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-bold"
                            >
                              + Add to V1
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateShotVideo(clip.id);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 font-bold"
                            >
                              Generate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BROWSER TAB SURFACE */}
        <div className="flex-1 flex flex-col bg-studio-950 overflow-hidden min-w-0">

          {/* ========================================================================= */}
          {/* TAB 1: AI ASSISTANT (ChatGPT / Google Gemini / Claude)                    */}
          {/* ========================================================================= */}
          {activeWorkspaceTab === 'ASSISTANT' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Omnibox / Assistant Platform Switcher */}
              <div className="h-10 bg-studio-900 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
                {/* Platform Switcher Buttons */}
                <div className="flex items-center space-x-1 bg-studio-950 p-0.5 rounded-lg border border-studio-800 text-[11px]">
                  <button
                    onClick={() => handlePlatformChange('chatgpt')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeAIPlatform === 'chatgpt'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ChatGPT Plus
                  </button>
                  <button
                    onClick={() => handlePlatformChange('gemini')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeAIPlatform === 'gemini'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    onClick={() => handlePlatformChange('claude')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeAIPlatform === 'claude'
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Claude 3.7
                  </button>
                </div>

                {/* Omnibox URL */}
                <div className="flex-1 max-w-md mx-3 flex items-center bg-studio-950 border border-studio-800 rounded px-2.5 py-1 text-xs">
                  <span className="text-[10px] text-emerald-400 font-mono mr-1.5 select-none">🔒</span>
                  <input
                    type="text"
                    value={assistantInputUrl}
                    onChange={(e) => setAssistantInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAssistantUrl(assistantInputUrl);
                      }
                    }}
                    className="flex-1 bg-transparent text-slate-200 font-mono focus:outline-none text-[11px]"
                  />
                  <button
                    onClick={() => {
                      setAssistantUrl(assistantInputUrl);
                    }}
                    className="text-[10px] bg-studio-800 hover:bg-studio-700 text-slate-300 px-1.5 py-0.5 rounded transition-colors"
                  >
                    Go
                  </button>
                </div>

                {/* Direct Action: Copy Prompt */}
                <button
                  onClick={handleCopyStoryPrompt}
                  className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-200 px-3 py-1 rounded text-xs transition-colors"
                >
                  {isCopiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{isCopiedPrompt ? 'Copied Prompt!' : 'Copy Script Prompt'}</span>
                </button>
              </div>

              {/* Interactive Assistant Surface Body */}
              <div className="flex-1 relative flex flex-col bg-studio-950 p-4 overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  {/* Status Banner */}
                  <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-300">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Active AI Story Assistant: {activeAIPlatform.toUpperCase()}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Generate screenplay ideas, dialogue, shot breakdowns, and continuous narrative arcs
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchCompanionChrome(assistantUrl)}
                      className="flex items-center space-x-1.5 text-xs bg-purple-900 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Chrome</span>
                    </button>
                  </div>

                  {/* Interactive Prompt & Screenplay Assistant Box */}
                  <div className="bg-studio-900 border border-studio-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Recommended Screenplay Prompts</span>
                      <span className="text-[10px] font-mono text-slate-500">Click to load into editor</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { title: 'Cyberpunk Neon Protocol', desc: 'Rogue archivist Elena Vance breaches high-security server core in flooded dystopian city.' },
                        { title: 'Sci-Fi Interstellar Launch', desc: 'Commander Aris prepares the interstellar colony ship on lunar base launchpad.' },
                        { title: 'Cinematic Thriller Heist', desc: 'Vault specialists execute precision timing under flashing emergency lights.' },
                        { title: 'Dystopian Wasteland Caravan', desc: 'Armored transport vehicle traverses salt flats as dust storms gather on the horizon.' }
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setInputScript(`TITLE: ${item.title.toUpperCase()}\n\n${item.desc}`)}
                          className="p-3 rounded-lg bg-studio-950 border border-studio-800 hover:border-purple-600/80 cursor-pointer transition-all"
                        >
                          <h4 className="text-xs font-bold text-purple-300">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-studio-800">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ready to analyze: {inputScript.split(/\s+/).length} words
                      </span>
                      <button
                        onClick={handleStartAnalysis}
                        disabled={isAnalyzingStory}
                        className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Breakdown Story into 10s Takes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AI VIDEO GENERATOR (Google Flow / DeepMind Veo / Runway)           */}
          {/* ========================================================================= */}
          {activeWorkspaceTab === 'GENERATOR' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Omnibox / Generator Model Presets */}
              <div className="h-10 bg-studio-900 border-b border-studio-800 px-3 flex items-center justify-between shrink-0">
                {/* View Mode Switcher: Browser vs Take Monitor */}
                <div className="flex items-center space-x-1 bg-studio-950 p-0.5 rounded-lg border border-studio-800">
                  <button
                    onClick={() => setGeneratorSubView('BROWSER')}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                      generatorSubView === 'BROWSER'
                        ? 'bg-cyan-900 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Generator Surface</span>
                  </button>
                  <button
                    onClick={() => setGeneratorSubView('TAKE_MONITOR')}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                      generatorSubView === 'TAKE_MONITOR'
                        ? 'bg-studio-800 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Takes ({completedClipsCount})</span>
                  </button>
                </div>

                {/* Generator Presets */}
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <span className="text-slate-500 text-[10px] uppercase">Engine:</span>
                  {[
                    { name: 'Google Veo / Flow', url: 'https://deepmind.google/technologies/veo/' },
                    { name: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine' },
                    { name: 'Runway Gen-3', url: 'https://runwayml.com' }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setGeneratorUrl(preset.url);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                        generatorUrl.includes(preset.url.slice(8, 20)) ? 'bg-studio-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                {/* Copy Directive Button */}
                {selectedClip && (
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-200 px-3 py-1 rounded text-xs transition-colors"
                  >
                    {isCopiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{isCopiedPrompt ? 'Copied!' : 'Copy Shot Directive'}</span>
                  </button>
                )}
              </div>

              {/* Generator Body: Browser View vs Take Monitor */}
              {generatorSubView === 'BROWSER' ? (
                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                  <div className="max-w-3xl mx-auto w-full space-y-4">
                    {/* Active Shot Directive Box */}
                    {selectedClip ? (
                      <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Active Shot #{selectedClip.clip_number} Cinematic Prompt</span>
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                            {selectedClip.camera_framing} • {selectedClip.camera_movement}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-mono bg-studio-950 p-3 rounded-lg border border-studio-800 leading-relaxed">
                          {selectedClip.subject_action} | Lighting: {selectedClip.lighting_setup || 'Cinematic High Contrast'}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Target Duration: ~{selectedClip.target_duration_seconds}s • Model: Google Veo / Flow
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleCopyPrompt}
                              className="flex items-center space-x-1 text-xs bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-200 px-3 py-1.5 rounded transition-colors font-semibold"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Prompt</span>
                            </button>

                            <button
                              onClick={() => generateShotVideo(selectedClip.id)}
                              disabled={selectedClip.status === 'GENERATING'}
                              className="flex items-center space-x-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition-colors shadow"
                            >
                              <Play className="w-3.5 h-3.5 fill-slate-950" />
                              <span>{selectedClip.status === 'GENERATING' ? 'Generating...' : 'Generate Shot'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-studio-900 border border-studio-800 rounded-xl p-6 text-center text-slate-400 text-xs">
                        <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p>Analyze story in Tab 1 or click &quot;Analyze Story & Generate Shots&quot; to populate shot takes.</p>
                      </div>
                    )}

                    {/* Sequential Queue Bar */}
                    <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Sequential Generation Queue</h4>
                          <p className="text-[11px] text-slate-400">
                            Generates shots 1-by-1 sequentially to prevent GPU throttling and maintain visual continuity
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isQueueActive ? (
                          <button
                            onClick={pauseShotQueue}
                            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause Queue</span>
                          </button>
                        ) : (
                          <button
                            onClick={startShotQueue}
                            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Run Sequential Queue</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Take Monitor View */
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="max-w-3xl mx-auto w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Generated Video Takes ({completedClipsCount})</h3>
                      <button
                        onClick={() => setMainView('VIDEO_EDITOR')}
                        className="text-xs text-cyan-400 hover:underline font-semibold"
                      >
                        Go to Multitrack Video Editor &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clips.map(clip => {
                        const isReady = clip.status === 'COMPLETED';

                        return (
                          <div
                            key={clip.id}
                            className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="font-bold text-white">Shot #{clip.clip_number} Take</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                isReady ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-studio-950 text-slate-500'
                              }`}>
                                {isReady ? 'Ready' : clip.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {clip.subject_action}
                            </p>

                            <div className="pt-2 flex items-center justify-between border-t border-studio-800">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {clip.target_duration_seconds}s • 1080p
                              </span>

                              {isReady ? (
                                <button
                                  onClick={() => handleImportTakeToEditor(clip.id)}
                                  className="flex items-center space-x-1 text-xs bg-studio-cyan hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded font-bold transition-colors shadow"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Import to Video Editor</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => generateShotVideo(clip.id)}
                                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                                >
                                  Generate Take
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

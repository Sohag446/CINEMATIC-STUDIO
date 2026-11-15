import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Video,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  Camera,
  Layers,
  Copy,
  Check,
  Monitor,
  Film,
  Plus,
  Clock,
  FolderOpen,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { parseRequestedDuration } from '../../services/storyAgent';
import { ClipStatus } from '../../types';

export const AIVideoWorkspace: React.FC = () => {
  const {
    activeProject,
    clips,
    characters,
    storyText,
    storyDurationInput,
    setStoryDurationInput,
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
    launchProfile,
    activeGoogleAccountIndex,
    setActiveGoogleAccountIndex,
    googleAccounts,
    addGoogleAccount,
    assembleCompletedScenes,
    markSceneStatus,
    attachDownloadedVideoToScene,
    addClipDirectlyToTimeline,
    isChromeDocked,
    dockedChromeHwnd,
    dockChromeError,
    dockChrome,
    syncDockedBounds,
    setDockedVisible,
    closeDocked,
    toggleChromeDockMode
  } = useStudioStore();

  const browserViewportRef = useRef<HTMLDivElement>(null);
  const [browserCurrentUrl, setBrowserCurrentUrl] = useState<string>('https://deepmind.google/technologies/veo/');

  // Exactly TWO primary tabs: Tab 1 = AI Story Assistant, Tab 2 = AI Video Assistant
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'STORY' | 'VIDEO'>('STORY');

  // Story Tab State
  const [pitchText, setPitchText] = useState<string>(
    storyText ||
    `TITLE: THE NEON PROTOCOL
LOGLINE: In a drowned cyberpunk metropolis, rogue neural archivist Elena Vance infiltrates a high-security server core to retrieve a forbidden memory before enforcer Kaelen Morse intercepts her.

SCENE 1: THE FLOODED PERIMETER
Elena navigates the rain-slicked lower sector alleyways under saturated neon lights. She activates her optic scanner, detecting syndicate patrol drones hovering in the misty distance.

SCENE 2: THE DATA CORE BREACH
Elena slips through sliding blast doors into the central server cavern. Pulsing amber security lighting sweeps across towering columns. She connects directly to the core terminal and downloads the encrypted archive as footsteps echo behind her.`
  );

  const [customDuration, setCustomDuration] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sceneFilter, setSceneFilter] = useState<'ALL' | 'PROMPT_READY' | 'GENERATING' | 'READY' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentDurationString = customDuration.trim() || storyDurationInput || '1 minute';
  const durationSeconds = parseRequestedDuration(currentDurationString);
  const calculatedClipCount = Math.max(1, Math.round(durationSeconds / 10));

  const standardDurations = [
    { label: '30s', value: '30 seconds', clips: 3 },
    { label: '1m', value: '1 minute', clips: 6 },
    { label: '5m', value: '5 minutes', clips: 30 },
    { label: '10m', value: '10 minutes', clips: 60 },
    { label: '30m', value: '30 minutes', clips: 180 },
    { label: '2h', value: '2 hours', clips: 720 },
  ];

  const selectedClip = clips.find(c => c.id === selectedShotId) || clips[0] || null;
  const completedClipsCount = clips.filter(c => ['COMPLETED', 'IMPORTED', 'DOWNLOADED', 'GENERATED'].includes(c.status)).length;
  const isQueueActive = shotQueueState === 'RUNNING';

  const assistantUrls: Record<string, string> = {
    chatgpt: 'https://chatgpt.com',
    gemini: 'https://gemini.google.com',
    claude: 'https://claude.ai'
  };

  const handleLaunchOrDockChrome = async (targetUrl: string = 'https://deepmind.google/technologies/veo/') => {
    setBrowserCurrentUrl(targetUrl);
    const profile = registeredProfiles.find(p => p.id === activeVideoProfileId) || registeredProfiles[0];
    const userDir = profile?.user_data_dir || '';
    const key = profile?.profile_dir_key || 'Default';

    if (isChromeDocked && browserViewportRef.current) {
      const rect = browserViewportRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.round(rect.left));
      const y = Math.max(0, Math.round(rect.top));
      const w = Math.max(10, Math.round(rect.width));
      const h = Math.max(10, Math.round(rect.height));
      try {
        await dockChrome(targetUrl, userDir, key, x, y, w, h);
      } catch (err: any) {
        console.error('Docking error (Option B):', err);
        // Do not silently launch companion mode; error state is set on the store and displayed in viewport
      }
    } else {
      await launchProfile(userDir, key);
    }
  };

  const handleLaunchChrome = (targetUrl: string = 'https://deepmind.google/technologies/veo/') => {
    handleLaunchOrDockChrome(targetUrl);
  };

  // Synchronize docked Chrome bounds on viewport resize, window movement, monitor migration / DPI transitions, and window restore
  useEffect(() => {
    if (!browserViewportRef.current || !dockedChromeHwnd) return;

    let rafId: number | null = null;

    const scheduleSyncBounds = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!browserViewportRef.current) return;
        const rect = browserViewportRef.current.getBoundingClientRect();
        syncDockedBounds(
          Math.max(0, Math.round(rect.left)),
          Math.max(0, Math.round(rect.top)),
          Math.max(10, Math.round(rect.width)),
          Math.max(10, Math.round(rect.height))
        );
      });
    };

    // 1. Observe panel/DOM layout resizing
    const observer = new ResizeObserver(() => {
      scheduleSyncBounds();
    });
    observer.observe(browserViewportRef.current);

    // 2. Window resize events (resizing main application window)
    window.addEventListener('resize', scheduleSyncBounds);

    // 3. Dynamic DPI transitions & monitor migration via resolution matchMedia
    let currentDpiQuery: MediaQueryList | null = null;
    const registerDpiWatcher = () => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        currentDpiQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        const onDpiChange = () => {
          scheduleSyncBounds();
          registerDpiWatcher(); // Re-register for subsequent DPI changes
        };
        currentDpiQuery.addEventListener('change', onDpiChange, { once: true });
      }
    };
    registerDpiWatcher();

    // 4. Restore from minimized state or window activation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleSyncBounds();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      observer.disconnect();
      window.removeEventListener('resize', scheduleSyncBounds);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dockedChromeHwnd, syncDockedBounds]);

  // Synchronize docked visibility with active tab
  useEffect(() => {
    if (dockedChromeHwnd) {
      setDockedVisible(activeWorkspaceTab === 'VIDEO');
    }
  }, [activeWorkspaceTab, dockedChromeHwnd, setDockedVisible]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSelectDuration = (val: string) => {
    setCustomDuration('');
    setStoryDurationInput(val);
  };

  const handleAnalyzeStory = async () => {
    if (!pitchText.trim()) return;
    await analyzeAndBreakdownStory(pitchText, currentDurationString);
    setActiveWorkspaceTab('VIDEO');
  };

  // Filter clips for Tab 2
  const filteredClips = clips.filter(clip => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `Scene ${clip.clip_number}`.toLowerCase().includes(q) ||
        (clip.subject_action && clip.subject_action.toLowerCase().includes(q)) ||
        (clip.video_prompt && clip.video_prompt.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (sceneFilter === 'PROMPT_READY') return clip.status === 'PROMPT_READY';
    if (sceneFilter === 'GENERATING') return clip.status === 'GENERATING' || clip.status === 'QUEUED';
    if (sceneFilter === 'READY') return ['COMPLETED', 'IMPORTED', 'DOWNLOADED', 'GENERATED'].includes(clip.status);
    if (sceneFilter === 'PENDING') return clip.status === 'NOT_STARTED' || clip.status === 'PLANNED';
    return true;
  });

  const getStatusBadge = (status: ClipStatus) => {
    switch (status) {
      case 'COMPLETED':
      case 'IMPORTED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold font-mono">Verified / Imported</span>;
      case 'VERIFYING':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold font-mono animate-pulse">FFprobe Verifying</span>;
      case 'DOWNLOADED':
      case 'GENERATED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold font-mono">Generated</span>;
      case 'GENERATING':
      case 'QUEUED':
      case 'SUBMITTED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 font-semibold font-mono animate-pulse">Generating</span>;
      case 'HUMAN_ACTION_REQUIRED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-950 text-orange-300 border border-orange-700/60 font-semibold font-mono animate-pulse">Action Required</span>;
      case 'WAITING_FOR_PROVIDER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-700/60 font-semibold font-mono">Waiting for Provider</span>;
      case 'PROMPT_READY':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold font-mono">Prompt Ready</span>;
      case 'NEEDS_ATTENTION':
      case 'NEEDS_REVIEW':
      case 'FAILED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700/60 font-semibold font-mono">Attention</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-950 text-slate-400 border border-studio-800 font-mono">Planned</span>;
    }
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
      {/* 1. Header Navigation: EXACTLY TWO PRIMARY TABS */}
      <div className="h-11 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-studio-950 p-0.5 rounded-lg border border-studio-800">
            {/* Tab 1: AI Story Assistant */}
            <button
              onClick={() => setActiveWorkspaceTab('STORY')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeWorkspaceTab === 'STORY'
                  ? 'bg-purple-900 text-white border border-purple-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-300" />
              <span>Tab 1: AI Story Assistant</span>
            </button>

            {/* Tab 2: AI Video Assistant */}
            <button
              onClick={() => setActiveWorkspaceTab('VIDEO')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeWorkspaceTab === 'VIDEO'
                  ? 'bg-cyan-900 text-white border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-cyan-300" />
              <span>Tab 2: AI Video Assistant</span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded font-normal border border-cyan-800/60">
                {completedClipsCount}/{clips.length}
              </span>
            </button>
          </div>
        </div>

        {/* Center / Right Toolbar Controls */}
        <div className="flex items-center space-x-3">
          {/* Prominent Open Chrome Button */}
          <button
            onClick={() => handleLaunchChrome(activeWorkspaceTab === 'STORY' ? assistantUrls[activeAIPlatform] : 'https://deepmind.google/technologies/veo/')}
            className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-cyan-600/60 text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Launch Dedicated Chrome with CINEMATIC STUDIO Profile"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Chrome</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          {/* 1-Click Assemble Completed Scenes Button */}
          <button
            onClick={assembleCompletedScenes}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow"
            title="Arrange all completed takes in story order onto Timeline Track V1"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Assemble Completed Scenes ({completedClipsCount})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI STORY ASSISTANT                                                 */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === 'STORY' && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: Script Input & Guided Duration Controls */}
          <div className="w-full lg:w-1/2 p-4 flex flex-col border-r border-studio-800 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Story Development & Duration Setup
                </h3>
              </div>

              {/* AI Platform Switcher */}
              <div className="flex items-center space-x-1 bg-studio-950 p-0.5 rounded-lg border border-studio-800 text-[11px]">
                {(['chatgpt', 'gemini', 'claude'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setActiveAIPlatform(p)}
                    className={`px-2 py-0.5 rounded capitalize font-mono ${
                      activeAIPlatform === p ? 'bg-purple-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Language Screenplay / Pitch Input */}
            <div className="flex-1 flex flex-col space-y-1.5 min-h-[220px]">
              <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>Story Concept, Screenplay, or Natural Language Pitch:</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {pitchText.split(/\s+/).filter(Boolean).length} words
                </span>
              </label>
              <textarea
                value={pitchText}
                onChange={e => setPitchText(e.target.value)}
                placeholder="Describe your story idea or paste a full screenplay..."
                className="flex-1 w-full bg-studio-900 border border-studio-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-600 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Guided Total Video Duration Selector */}
            <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Target Video Duration</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                  {calculatedClipCount} ~10s clips ({Math.round(durationSeconds)}s total)
                </span>
              </div>

              {/* Standard Duration Preset Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {standardDurations.map(d => {
                  const isSelected = !customDuration && storyDurationInput === d.value;
                  return (
                    <button
                      key={d.label}
                      onClick={() => handleSelectDuration(d.value)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-purple-900 text-white border border-purple-600 shadow'
                          : 'bg-studio-950 text-slate-400 hover:text-white border border-studio-800'
                      }`}
                    >
                      <span className="font-bold">{d.label}</span>
                      <span className="text-[9px] opacity-70">{d.clips} clips</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Duration Input */}
              <div className="flex items-center space-x-2 pt-1 border-t border-studio-800">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Custom duration:</span>
                <input
                  type="text"
                  placeholder="e.g. 45s, 15 min, 1.5 hours"
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  className="flex-1 bg-studio-950 border border-studio-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-600 font-mono"
                />
              </div>
            </div>

            {/* Breakdown Story Action Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleLaunchChrome(assistantUrls[activeAIPlatform])}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-mono"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Open in Companion Chrome</span>
              </button>

              <button
                onClick={handleAnalyzeStory}
                disabled={isAnalyzingStory || !pitchText.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isAnalyzingStory ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing & Breaking Down...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Breakdown Story into {calculatedClipCount} Takes &rarr;</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: 23-Point Production Package & Cinematic Continuity Engine Viewer */}
          <div className="w-full lg:w-1/2 p-4 overflow-y-auto space-y-4 bg-studio-925">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>23-Point Production Package & Continuity</span>
              </h3>
              {storyAnalysis && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                  Active Package Generated
                </span>
              )}
            </div>

            {storyAnalysis ? (
              <div className="space-y-4 text-xs font-sans">
                {/* 1. Logline & Narrative Acts */}
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 font-mono text-[11px]">STORY LOGLINE</span>
                    <button
                      onClick={() => handleCopy(storyAnalysis.storyConcept, 'logline')}
                      className="text-slate-400 hover:text-white"
                      title="Copy Logline"
                    >
                      {copiedKey === 'logline' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-slate-200 leading-relaxed font-serif text-[12px]">
                    {storyAnalysis.storyConcept}
                  </p>
                  {storyAnalysis.acts && storyAnalysis.acts.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-studio-800 text-[10px] font-mono">
                      {storyAnalysis.acts.map((act, i) => (
                        <div key={i} className="p-2 bg-studio-950 rounded border border-studio-800">
                          <span className="text-purple-400 font-bold block">{act.title}</span>
                          <span className="text-slate-400 line-clamp-2 mt-0.5">{act.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Character Bible & Visual Prompt Locks */}
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-cyan-300 font-mono text-[11px] block">CHARACTER BIBLE & VISUAL LOCKS</span>
                  <div className="space-y-2">
                    {characters.map(char => (
                      <div key={char.id} className="p-2.5 bg-studio-950 rounded-lg border border-studio-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-mono text-xs">{char.name} ({char.role})</span>
                          <button
                            onClick={() => handleCopy(char.visual_prompt_lock, `char-${char.id}`)}
                            className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
                          >
                            {copiedKey === `char-${char.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copy Prompt Lock</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{char.physical_description}</p>
                        <p className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/40 p-1 rounded border border-cyan-900/50">
                          Lock: {char.visual_prompt_lock}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Cinematic Direction & Color Grading */}
                <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-amber-300 font-mono text-[11px] block">CINEMATOGRAPHY & LIGHTING RULES</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-studio-950 rounded border border-studio-800">
                      <span className="text-slate-400 font-mono block text-[10px]">Cinematography Style</span>
                      <span className="text-slate-200">{storyAnalysis.cinematographyGuide || '35mm Anamorphic, shallow depth of field'}</span>
                    </div>
                    <div className="p-2 bg-studio-950 rounded border border-studio-800">
                      <span className="text-slate-400 font-mono block text-[10px]">Color Grading</span>
                      <span className="text-slate-200">{storyAnalysis.colorGradingDirection || 'High contrast, cool shadows, warm highlights'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Cinematic Continuity Engine Status */}
                <div className="bg-studio-900 border border-emerald-900/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 font-mono text-[11px] flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CINEMATIC CONTINUITY ENGINE ACTIVE</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {clips.length} Scenes Linked
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    First Frame of each scene is mathematically and visually locked to the Last Frame of the preceding scene to preserve continuous character wardrobe, lighting state, and camera momentum.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-studio-800 rounded-xl text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-xs">Enter your story idea on the left and click &quot;Breakdown Story into Takes&quot; to generate the 23-point production package.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI VIDEO ASSISTANT                                                 */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === 'VIDEO' && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Sidebar: Virtualized / Scrollable Scene List (Scene 001, Scene 002, ... up to 720) */}
          <div className="w-72 sm:w-80 bg-studio-925 border-r border-studio-800 flex flex-col shrink-0 overflow-hidden">
            {/* Filter & Search Toolbar */}
            <div className="p-2.5 bg-studio-900 border-b border-studio-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white font-mono flex items-center space-x-1.5">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scenes ({filteredClips.length}/{clips.length})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {completedClipsCount} ready
                </span>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search scene prompts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-studio-950 border border-studio-800 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-600 font-mono"
              />

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto text-[10px] font-mono no-scrollbar">
                {(['ALL', 'PROMPT_READY', 'GENERATING', 'READY', 'PENDING'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSceneFilter(tab)}
                    className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors ${
                      sceneFilter === tab
                        ? 'bg-cyan-900 text-white font-bold'
                        : 'bg-studio-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab === 'PROMPT_READY' ? 'Prompts' : tab === 'READY' ? 'Ready' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Scene Cards */}
            <div className="flex-1 overflow-y-auto divide-y divide-studio-800/60">
              {filteredClips.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No scenes match the filter.
                </div>
              ) : (
                filteredClips.map(clip => {
                  const isSelected = selectedClip?.id === clip.id;
                  const sceneNum = String(clip.clip_number).padStart(3, '0');

                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedShotId(clip.id)}
                      className={`p-3 cursor-pointer transition-colors space-y-1.5 ${
                        isSelected
                          ? 'bg-studio-850 border-l-2 border-cyan-400'
                          : 'hover:bg-studio-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white font-mono">
                          Scene {sceneNum}
                        </span>
                        {getStatusBadge(clip.status)}
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                        {clip.video_prompt || clip.subject_action}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                        <span>~{clip.target_duration_seconds}s • {clip.camera_framing}</span>
                        <span>{clip.assigned_provider}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Content Area: Selected Scene Workspace & Multi-Account Switcher */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
            {/* Multi-Account Switcher & Sequential Queue Bar */}
            <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              {/* Multi-Account Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Account:</span>
                <div className="flex items-center space-x-1">
                  {googleAccounts.map((acc, idx) => (
                    <button
                      key={acc.id}
                      onClick={() => setActiveGoogleAccountIndex(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        activeGoogleAccountIndex === idx
                          ? 'bg-cyan-900 text-cyan-200 border border-cyan-600 font-bold shadow'
                          : 'bg-studio-950 text-slate-400 hover:text-white border border-studio-800'
                      }`}
                      title={acc.email || acc.label}
                    >
                      Google {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => addGoogleAccount()}
                    className="p-1 rounded bg-studio-950 hover:bg-studio-800 text-slate-400 hover:text-white border border-studio-800"
                    title="Add another Google Account profile"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sequential Queue Controls */}
              <div className="flex items-center space-x-2">
                {isQueueActive ? (
                  <button
                    onClick={pauseShotQueue}
                    className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Queue</span>
                  </button>
                ) : (
                  <button
                    onClick={startShotQueue}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Queue (1-by-1)</span>
                  </button>
                )}

                <button
                  onClick={assembleCompletedScenes}
                  className="flex items-center space-x-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Assemble Takes</span>
                </button>
              </div>
            </div>

            {/* IN-WORKSPACE BROWSER PANEL (OPTION B DOCKED WIN32 CONTAINER) */}
            <div className="bg-studio-900 border border-studio-800 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    AI Workspace Browser {isChromeDocked ? '(Option B Docked)' : '(Option A Companion)'}
                  </span>
                  {dockedChromeHwnd ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                      Active (HWND: {dockedChromeHwnd})
                    </span>
                  ) : null}
                </div>

                {/* AI Site Switcher Quick Links & Mode Toggle */}
                <div className="flex items-center space-x-1.5 text-xs">
                  {[
                    { label: 'Google Veo', url: 'https://deepmind.google/technologies/veo/' },
                    { label: 'ChatGPT', url: 'https://chatgpt.com' },
                    { label: 'Gemini', url: 'https://gemini.google.com' },
                    { label: 'Claude', url: 'https://claude.ai' }
                  ].map(site => (
                    <button
                      key={site.label}
                      onClick={() => handleLaunchOrDockChrome(site.url)}
                      className="px-2.5 py-1 rounded bg-studio-950 hover:bg-studio-800 border border-studio-800 text-slate-300 hover:text-white font-mono text-[11px] transition-colors"
                    >
                      {site.label}
                    </button>
                  ))}

                  <button
                    onClick={toggleChromeDockMode}
                    className="px-2.5 py-1 rounded bg-studio-850 hover:bg-studio-800 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] transition-colors"
                    title="Toggle between Option B (Docked in Workspace) and Option A (External Companion Window)"
                  >
                    {isChromeDocked ? 'Mode: Docked' : 'Mode: Companion'}
                  </button>
                </div>
              </div>

              {/* URL Address Bar & Controls */}
              <div className="flex items-center space-x-2 pt-1 border-t border-studio-800">
                <input
                  type="text"
                  value={browserCurrentUrl}
                  onChange={e => setBrowserCurrentUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleLaunchOrDockChrome(browserCurrentUrl);
                  }}
                  placeholder="Enter URL to navigate in Chrome..."
                  className="flex-1 bg-studio-950 border border-studio-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600 font-mono"
                />
                <button
                  onClick={() => handleLaunchOrDockChrome(browserCurrentUrl)}
                  className="px-3 py-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors font-mono"
                >
                  Navigate
                </button>
                {dockedChromeHwnd ? (
                  <button
                    onClick={closeDocked}
                    className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs rounded font-mono transition-colors"
                  >
                    Close
                  </button>
                ) : null}
              </div>

              {/* Viewport Mount Area */}
              <div
                ref={browserViewportRef}
                className="w-full h-[380px] bg-black rounded-lg border border-studio-800 relative flex items-center justify-center overflow-hidden"
              >
                {!dockedChromeHwnd && (
                  <div className="text-center p-6 space-y-3 max-w-md">
                    {dockChromeError ? (
                      <div className="bg-rose-950/70 border border-rose-700/80 rounded-lg p-3 text-left space-y-2">
                        <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs font-mono">
                          <span>Win32 Native Docking Error</span>
                        </div>
                        <p className="text-[11px] text-rose-200/90 font-mono break-words leading-relaxed">
                          {dockChromeError}
                        </p>
                        <p className="text-[10px] text-rose-300/70 font-mono">
                          Silent companion fallback is disabled. Choose an action below:
                        </p>
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => handleLaunchOrDockChrome(browserCurrentUrl)}
                            className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-white text-[11px] font-mono font-bold"
                          >
                            Retry Docking
                          </button>
                          <button
                            onClick={() => {
                              const profile = registeredProfiles.find(p => p.id === activeVideoProfileId) || registeredProfiles[0];
                              if (profile) launchProfile(profile.user_data_dir, profile.profile_dir_key);
                            }}
                            className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 text-slate-300 text-[11px] font-mono"
                          >
                            Launch Companion Window
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Monitor className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs font-mono text-slate-400">
                          {isChromeDocked
                            ? 'Google Chrome will dock inside this workspace viewport (Win32 child container).'
                            : 'Google Chrome will launch in a separate companion window.'}
                        </p>
                        <button
                          onClick={() => handleLaunchOrDockChrome(browserCurrentUrl)}
                          className="px-3.5 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 border border-cyan-600/60 text-cyan-300 text-xs font-semibold inline-flex items-center space-x-1.5"
                        >
                          <span>Launch In-Workspace Chrome (Option B)</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Scene Detailed Card */}
            {selectedClip ? (
              <div className="bg-studio-900 border border-studio-800 rounded-xl p-4 space-y-4">
                {/* Scene Header */}
                <div className="flex items-center justify-between pb-3 border-b border-studio-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white font-mono">
                      Scene {String(selectedClip.clip_number).padStart(3, '0')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (Duration: ~{selectedClip.target_duration_seconds}s)
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400 font-mono">Status:</span>
                    <select
                      value={selectedClip.status}
                      onChange={e => markSceneStatus(selectedClip.id, e.target.value as ClipStatus)}
                      className="bg-studio-950 border border-studio-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-600"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="PROMPT_READY">Prompt Ready</option>
                      <option value="WAITING_FOR_PROVIDER">Waiting for Provider</option>
                      <option value="HUMAN_ACTION_REQUIRED">Human Action Required</option>
                      <option value="GENERATING">Generating</option>
                      <option value="GENERATED">Generated</option>
                      <option value="DOWNLOADING">Downloading</option>
                      <option value="VERIFYING">Verifying</option>
                      <option value="COMPLETED">Completed / Verified</option>
                      <option value="IMPORTED">Imported</option>
                      <option value="FAILED">Failed</option>
                      <option value="NEEDS_ATTENTION">Needs Attention</option>
                    </select>
                  </div>
                </div>

                {/* Continuity Engine: Opening Frame (First Frame) & Closing Frame (Last Frame) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-studio-950 rounded-lg border border-studio-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 font-mono">
                        OPENING FRAME (First Frame)
                      </span>
                      {selectedClip.first_frame_description && (
                        <button
                          onClick={() => handleCopy(selectedClip.first_frame_description!, 'ff')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'ff' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      {selectedClip.first_frame_description || 'Opening state establishes setting and subjects.'}
                    </p>
                  </div>

                  <div className="p-3 bg-studio-950 rounded-lg border border-studio-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-400 font-mono">
                        CLOSING FRAME (Last Frame)
                      </span>
                      {selectedClip.last_frame_description && (
                        <button
                          onClick={() => handleCopy(selectedClip.last_frame_description!, 'lf')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'lf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      {selectedClip.last_frame_description || 'Closing state sets continuous handoff to subsequent scene.'}
                    </p>
                  </div>
                </div>

                {/* Primary Video Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cinematic Video Prompt</span>
                    </span>
                    <button
                      onClick={() => handleCopy(selectedClip.video_prompt || selectedClip.subject_action, 'vp')}
                      className="flex items-center space-x-1 text-xs bg-studio-850 hover:bg-studio-800 border border-studio-750 text-cyan-300 px-2.5 py-1 rounded font-mono transition-colors"
                    >
                      {copiedKey === 'vp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'vp' ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                  <div className="bg-studio-950 border border-studio-800 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed select-text">
                    {selectedClip.video_prompt || selectedClip.subject_action}
                  </div>
                </div>

                {/* Negative Prompt (if available) */}
                {selectedClip.negative_prompt && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-400 font-mono">Negative Prompt:</span>
                      <button
                        onClick={() => handleCopy(selectedClip.negative_prompt!, 'neg')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'neg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="bg-studio-950 border border-studio-800 rounded p-2 text-[11px] text-slate-400 font-mono select-text">
                      {selectedClip.negative_prompt}
                    </div>
                  </div>
                )}

                {/* Camera & Lighting Specs */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-studio-950 rounded border border-studio-800">
                    <span className="text-slate-500 block text-[10px]">Framing</span>
                    <span className="text-slate-200">{selectedClip.camera_framing}</span>
                  </div>
                  <div className="p-2 bg-studio-950 rounded border border-studio-800">
                    <span className="text-slate-500 block text-[10px]">Camera Movement</span>
                    <span className="text-slate-200">{selectedClip.camera_movement}</span>
                  </div>
                  <div className="p-2 bg-studio-950 rounded border border-studio-800">
                    <span className="text-slate-500 block text-[10px]">Lighting</span>
                    <span className="text-slate-200">{selectedClip.lighting_setup || 'Cinematic Natural'}</span>
                  </div>
                </div>

                {/* Action Buttons: Generate, Open Chrome, Attach Media */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-studio-800">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLaunchChrome('https://deepmind.google/technologies/veo/')}
                      className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Open in Companion Chrome</span>
                    </button>

                    <button
                      onClick={() => {
                        const fakeTake = `C:\\CinematicStudio\\Projects\\${activeProject.slug}\\takes\\scene_${String(selectedClip.clip_number).padStart(3, '0')}.mp4`;
                        attachDownloadedVideoToScene(selectedClip.id, fakeTake);
                      }}
                      className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      title="Attach downloaded MP4 file to this scene"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Attach Video File</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => addClipDirectlyToTimeline(selectedClip.id)}
                      className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 border border-studio-750 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Timeline</span>
                    </button>

                    <button
                      onClick={() => generateShotVideo(selectedClip.id)}
                      disabled={selectedClip.status === 'GENERATING'}
                      className="flex items-center space-x-1.5 bg-studio-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg transition-colors shadow disabled:opacity-50"
                    >
                      {selectedClip.status === 'GENERATING' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Take...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Generate Video Take</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-studio-800 rounded-xl text-slate-500 space-y-2">
                <Video className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-xs">No scenes generated yet. Go to Tab 1: AI Story Assistant to generate your production package.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVideoWorkspace;

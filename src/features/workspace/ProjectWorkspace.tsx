import React, { useState } from 'react';
import {
  Film,
  FileText,
  Users,
  MapPin,
  LayoutGrid,
  Video,
  SlidersHorizontal,
  Share2,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FolderTree
} from 'lucide-react';
import { useStudioStore, WorkspaceSection } from '../../stores/useStudioStore';
import { ContinuityWarning } from '../../types';
import { MultitrackTimeline } from '../timeline/MultitrackTimeline';
import { PreviewMonitor } from '../timeline/PreviewMonitor';
import { DesktopInspector } from '../../components/DesktopInspector';
import { AIModelWorkspace } from './AIModelWorkspace';
import { VideoGenerationWorkspace } from './VideoGenerationWorkspace';

export const ProjectWorkspace: React.FC = () => {
  const {
    activeProject,
    scenes,
    clips,
    characters,
    environments,
    currentWorkspaceSection,
    setCurrentWorkspaceSection,
    isBeginnerMode,
    selectClip,
    selectedClipId,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedEnvironmentId,
    setSelectedEnvironmentId,
    addCharacter,
    deleteCharacter,
    addEnvironment,
    deleteEnvironment,
    timelineClips,
    setExportModalOpen,
    setMediaLibraryModalOpen
  } = useStudioStore();

  // Character creation form modal state
  const [showAddChar, setShowAddChar] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('Protagonist');
  const [newCharAppearance, setNewCharAppearance] = useState('');
  const [newCharWardrobe, setNewCharWardrobe] = useState('');
  const [newCharPromptLock, setNewCharPromptLock] = useState('');

  // Environment creation form modal state
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvType, setNewEnvType] = useState('Interior');
  const [newEnvTime, setNewEnvTime] = useState('Twilight');
  const [newEnvAtmosphere, setNewEnvAtmosphere] = useState('');
  const [newEnvLighting, setNewEnvLighting] = useState('');
  const [newEnvPromptLock, setNewEnvPromptLock] = useState('');

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-studio-950 text-slate-400 font-sans">
        <p>No project loaded. Please select or create a project from the Productions library.</p>
      </div>
    );
  }

  // Continuity audits
  const continuityWarnings: ContinuityWarning[] = [
    {
      id: 'warn-1',
      shot_id: clips[0]?.id || 'shot-1',
      severity: 'NOTICE',
      category: 'CHARACTER_WARDROBE',
      message: 'Protagonist Elena Vance wardrobe key "weathered leather jacket" is bound to Shot 1.',
      remedy: 'Prompt compiler automatically locks jacket token for all Scene 1 shots.'
    },
    {
      id: 'warn-2',
      shot_id: clips[1]?.id || 'shot-2',
      severity: 'WARNING',
      category: 'ENVIRONMENT_LIGHTING',
      message: 'Camera pans toward exit tunnel in Shot 2; verify amber warning light direction.',
      remedy: 'Include "ambient cyan caustics with secondary amber tunnel rim light" in video prompt.'
    }
  ];

  const handleCreateChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;

    await addCharacter({
      project_id: activeProject.id,
      name: newCharName.trim(),
      role: newCharRole,
      physical_description: newCharAppearance.trim() || 'Distinctive cinematic character features.',
      wardrobe: newCharWardrobe.trim() || 'Standard production wardrobe.',
      visual_prompt_lock: newCharPromptLock.trim() || `cinematic portrait, ${newCharName.trim()}, 35mm lens, natural lighting`,
      assigned_scenes: ['1']
    });

    setNewCharName('');
    setNewCharAppearance('');
    setNewCharWardrobe('');
    setNewCharPromptLock('');
    setShowAddChar(false);
  };

  const handleCreateEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;

    await addEnvironment({
      project_id: activeProject.id,
      name: newEnvName.trim(),
      location_type: newEnvType,
      time_of_day: newEnvTime,
      weather: 'Atmospheric mist',
      atmosphere: newEnvAtmosphere.trim() || 'Cinematic location atmosphere.',
      lighting_rules: newEnvLighting.trim() || 'Volumetric natural lighting.',
      visual_prompt_lock: newEnvPromptLock.trim() || `cinematic establishing shot, ${newEnvName.trim()}, ${newEnvTime}`,
    });

    setNewEnvName('');
    setNewEnvAtmosphere('');
    setNewEnvLighting('');
    setNewEnvPromptLock('');
    setShowAddEnv(false);
  };

  const pipelineSections: { id: WorkspaceSection; label: string; icon: any; count?: number }[] = [
    { id: 'OVERVIEW', label: 'Production Overview', icon: Film },
    { id: 'STORY', label: 'Story & Screenplay', icon: FileText, count: scenes.length },
    { id: 'CHARACTERS', label: 'Character Vault', icon: Users, count: characters.length },
    { id: 'ENVIRONMENTS', label: 'Environment Vault', icon: MapPin, count: environments.length },
    { id: 'STORYBOARD', label: 'Storyboard & Shots', icon: LayoutGrid, count: clips.length },
    { id: 'GENERATION', label: 'AI Video Generation', icon: Video, count: clips.filter(c => c.status === 'COMPLETED').length },
    { id: 'CONTINUITY', label: 'Continuity Inspector', icon: ShieldCheck, count: continuityWarnings.length },
    { id: 'TIMELINE', label: 'Timeline & Assembly', icon: SlidersHorizontal, count: timelineClips.length },
    { id: 'EXPORT', label: 'Master Render', icon: Share2 },
  ];

  return (
    <div className="flex-1 flex bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">

      {/* Left Pipeline Sidebar */}
      <aside className="w-60 bg-studio-900 border-r border-studio-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-studio-800/80">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
            Active Production
          </span>
          <h2 className="font-bold text-sm text-white truncate" title={activeProject.name}>
            {activeProject.name}
          </h2>
          <div className="text-[11px] font-mono text-studio-cyan mt-0.5">
            {activeProject.target_aspect_ratio} • {activeProject.target_fps}fps
          </div>
        </div>

        <nav className="p-2 space-y-1 text-xs flex-1">
          {pipelineSections.map(item => {
            const Icon = item.icon;
            const isSelected = currentWorkspaceSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentWorkspaceSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-studio-accent text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-studio-850 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-studio-950 text-slate-400 border border-studio-800'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Hint */}
        <div className="p-3 bg-studio-950/60 border-t border-studio-800 text-[11px] text-slate-400">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>MODE: {isBeginnerMode ? 'DIRECTOR (BEGINNER)' : 'ENGINEER (ADVANCED)'}</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Stage Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-studio-950">

        {/* 1. OVERVIEW */}
        {currentWorkspaceSection === 'OVERVIEW' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="bg-studio-900 border border-studio-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 max-w-3xl">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-850 text-studio-cyan border border-studio-750 uppercase">
                    Production Blueprint
                  </span>
                  <h2 className="text-2xl font-bold text-white pt-1">{activeProject.name}</h2>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {activeProject.synopsis || 'No premise entered yet. Navigate to Story & Screenplay to write your scene breakdown.'}
                  </p>
                </div>

                <button
                  onClick={() => setCurrentWorkspaceSection('STORY')}
                  className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  <span>Open Screenplay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Specs & Pipeline Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-studio-800 text-xs font-mono">
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Screenplay Scenes</span>
                  <span className="text-lg font-bold text-white">{scenes.length} Scenes</span>
                </div>
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Storyboard Shots</span>
                  <span className="text-lg font-bold text-studio-cyan">{clips.length} Shots</span>
                </div>
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Generated Takes</span>
                  <span className="text-lg font-bold text-emerald-400">{clips.filter(c => c.status === 'COMPLETED').length} Clips</span>
                </div>
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Timeline Cuts</span>
                  <span className="text-lg font-bold text-purple-400">{timelineClips.length} Cuts</span>
                </div>
              </div>
            </div>

            {/* Production Pipeline Roadmap */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Studio Pipeline Stages
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div
                  onClick={() => setCurrentWorkspaceSection('STORY')}
                  className="bg-studio-900 border border-studio-800 hover:border-studio-700 p-4 rounded-xl cursor-pointer space-y-2 group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">1. Story & Script</span>
                    <FileText className="w-4 h-4 text-studio-accent" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Organize acts, scenes, dialogue, and dramatic beats.
                  </p>
                </div>

                <div
                  onClick={() => setCurrentWorkspaceSection('CHARACTERS')}
                  className="bg-studio-900 border border-studio-800 hover:border-studio-700 p-4 rounded-xl cursor-pointer space-y-2 group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">2. Character Vault</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Lock physical descriptions, wardrobes, and face continuity.
                  </p>
                </div>

                <div
                  onClick={() => setCurrentWorkspaceSection('STORYBOARD')}
                  className="bg-studio-900 border border-studio-800 hover:border-studio-700 p-4 rounded-xl cursor-pointer space-y-2 group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">3. Storyboard Deck</span>
                    <LayoutGrid className="w-4 h-4 text-studio-cyan" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Frame camera angles, movements, and compile multi-model prompts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. STORY & SCRIPT */}
        {currentWorkspaceSection === 'STORY' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-studio-accent" />
                  <span>Story Development & Screenplay</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Write screenplays, dramatic beats, dialogue blocks, and organize your three-act structure.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentWorkspaceSection('CHARACTERS')}
                  className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors"
                >
                  <span>Next: Characters →</span>
                </button>
              </div>
            </div>

            {/* Scenes List */}
            <div className="space-y-4">
              {scenes.map(scene => (
                <div key={scene.id} className="bg-studio-900 border border-studio-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-lg bg-studio-800 text-studio-accent font-bold flex items-center justify-center text-xs font-mono">
                        #{scene.sequence_number}
                      </span>
                      <h4 className="font-bold text-white text-base">{scene.title}</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400 bg-studio-950 px-2 py-1 rounded border border-studio-800">
                      {scene.estimated_duration_seconds}s Estimated
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {scene.dramatic_beat || 'Dramatic beat: Elena discovers the corrupted memory cube inside the underwater terminal.'}
                  </p>

                  <div className="bg-studio-950 p-3 rounded-lg border border-studio-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Screenplay Dialogue & Continuity Note:
                    </span>
                    <p className="text-xs text-slate-300 italic font-serif leading-relaxed">
                      "If the syndicate traced this signal, we don't have five minutes. Seal the hatch."
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-studio-800 text-xs font-mono text-slate-400">
                    <span>Continuity: {scene.continuity_rules || 'Wet clothing, flickering cyan caustics'}</span>
                    <button
                      onClick={() => setCurrentWorkspaceSection('STORYBOARD')}
                      className="text-studio-accent hover:text-studio-accent-light font-semibold"
                    >
                      View in Storyboard →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. CHARACTERS */}
        {currentWorkspaceSection === 'CHARACTERS' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Visual Character Vault ({characters.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define facial structures, wardrobe styles, and locked prompt directives to ensure cross-shot consistency.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddChar(true)}
                  className="flex items-center space-x-1.5 text-xs bg-studio-850 hover:bg-studio-800 text-white px-3.5 py-2 rounded-lg border border-studio-700 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5 text-studio-accent" />
                  <span>Add Character Profile</span>
                </button>

                <button
                  onClick={() => setCurrentWorkspaceSection('ENVIRONMENTS')}
                  className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors"
                >
                  <span>Next: Environments →</span>
                </button>
              </div>
            </div>

            {/* Character Form Modal */}
            {showAddChar && (
              <form onSubmit={handleCreateChar} className="bg-studio-900 border border-studio-750 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-studio-800 pb-2">
                  <span className="font-bold text-white text-xs font-mono uppercase">New Character Profile</span>
                  <button type="button" onClick={() => setShowAddChar(false)} className="text-slate-400 hover:text-white text-xs">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Character Name *</label>
                    <input
                      type="text"
                      required
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      placeholder="e.g. Dr. Maya Lin"
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Dramatic Role</label>
                    <input
                      type="text"
                      value={newCharRole}
                      onChange={(e) => setNewCharRole(e.target.value)}
                      placeholder="Protagonist, Antagonist, Mentor..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-400 mb-1">Physical Appearance & Face Features</label>
                    <textarea
                      rows={2}
                      value={newCharAppearance}
                      onChange={(e) => setNewCharAppearance(e.target.value)}
                      placeholder="Age, eye color, jawline, hair styling, distinctive scars or cyberware..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Wardrobe Style Lock</label>
                    <input
                      type="text"
                      value={newCharWardrobe}
                      onChange={(e) => setNewCharWardrobe(e.target.value)}
                      placeholder="e.g. Weathered leather jacket, brass hardware..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Locked Visual Prompt Token</label>
                    <input
                      type="text"
                      value={newCharPromptLock}
                      onChange={(e) => setNewCharPromptLock(e.target.value)}
                      placeholder="e.g. 35mm portrait, Elena Vance, leather jacket, cyan eye"
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChar(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold rounded-lg transition-colors"
                  >
                    Save Character
                  </button>
                </div>
              </form>
            )}

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map(char => {
                const isSelected = selectedCharacterId === char.id;
                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedCharacterId(char.id)}
                    className={`bg-studio-900 border rounded-xl p-5 space-y-3 flex flex-col justify-between cursor-pointer transition-colors ${
                      isSelected ? 'border-studio-accent bg-studio-850 shadow-lg ring-1 ring-studio-accent' : 'border-studio-800 hover:border-studio-750'
                    }`}
                  >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-300 font-bold text-base">
                          {char.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{char.name}</h4>
                          <span className="text-xs text-purple-300">{char.role}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteCharacter(char.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete character profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      {char.physical_description}
                    </p>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <span className="font-semibold text-slate-300">Wardrobe:</span> {char.wardrobe}
                    </div>

                    <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Locked Visual Prompt Directive:
                      </span>
                      <p className="text-xs font-mono text-studio-cyan select-all">
                        "{char.visual_prompt_lock}"
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* 4. ENVIRONMENTS */}
        {currentWorkspaceSection === 'ENVIRONMENTS' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-studio-cyan" />
                  <span>World & Environment Vault ({environments.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Maintain architectural references, lighting atmospheres, and time-of-day setups across scenes.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddEnv(true)}
                  className="flex items-center space-x-1.5 text-xs bg-studio-850 hover:bg-studio-800 text-white px-3.5 py-2 rounded-lg border border-studio-700 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5 text-studio-cyan" />
                  <span>Add Location</span>
                </button>

                <button
                  onClick={() => setCurrentWorkspaceSection('STORYBOARD')}
                  className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors"
                >
                  <span>Next: Storyboard →</span>
                </button>
              </div>
            </div>

            {/* Environment Form Modal */}
            {showAddEnv && (
              <form onSubmit={handleCreateEnv} className="bg-studio-900 border border-studio-750 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-studio-800 pb-2">
                  <span className="font-bold text-white text-xs font-mono uppercase">New Location Profile</span>
                  <button type="button" onClick={() => setShowAddEnv(false)} className="text-slate-400 hover:text-white text-xs">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Location Name *</label>
                    <input
                      type="text"
                      required
                      value={newEnvName}
                      onChange={(e) => setNewEnvName(e.target.value)}
                      placeholder="e.g. Submerged Transit Terminal"
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Setting Type</label>
                    <select
                      value={newEnvType}
                      onChange={(e) => setNewEnvType(e.target.value)}
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    >
                      <option value="Interior">Interior</option>
                      <option value="Exterior">Exterior</option>
                      <option value="Virtual / VFX">Virtual / VFX</option>
                    </select>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Time of Day / Atmosphere</label>
                    <input
                      type="text"
                      value={newEnvTime}
                      onChange={(e) => setNewEnvTime(e.target.value)}
                      placeholder="e.g. Midnight, Golden Hour, Foggy Twilight..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Architectural Atmosphere</label>
                    <textarea
                      rows={2}
                      value={newEnvAtmosphere}
                      onChange={(e) => setNewEnvAtmosphere(e.target.value)}
                      placeholder="Brutalist concrete, flooded chambers, suspension bridges, neon signage..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent resize-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Lighting & Caustic Rules</label>
                    <input
                      type="text"
                      value={newEnvLighting}
                      onChange={(e) => setNewEnvLighting(e.target.value)}
                      placeholder="e.g. Underwater cyan caustics, warm amber warning lights..."
                      className="w-full bg-studio-950 border border-studio-750 rounded-lg p-2 text-white focus:outline-none focus:border-studio-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEnv(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold rounded-lg transition-colors"
                  >
                    Save Location
                  </button>
                </div>
              </form>
            )}

            {/* Locations Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {environments.map(env => {
                const isSelected = selectedEnvironmentId === env.id;
                return (
                  <div
                    key={env.id}
                    onClick={() => setSelectedEnvironmentId(env.id)}
                    className={`bg-studio-900 border rounded-xl p-5 space-y-3 flex flex-col justify-between cursor-pointer transition-colors ${
                      isSelected ? 'border-studio-accent bg-studio-850 shadow-lg ring-1 ring-studio-accent' : 'border-studio-800 hover:border-studio-750'
                    }`}
                  >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{env.name}</h4>
                        <span className="text-xs font-mono text-amber-300">{env.time_of_day} • {env.location_type}</span>
                      </div>

                      <button
                        onClick={() => deleteEnvironment(env.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      {env.atmosphere}
                    </p>

                    <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Lighting Rules:
                      </span>
                      <p className="text-xs font-mono text-emerald-400">
                        {env.lighting_rules}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* 5. STORYBOARD & SHOTS */}
        {currentWorkspaceSection === 'STORYBOARD' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <LayoutGrid className="w-5 h-5 text-studio-cyan" />
                  <span>Storyboard Shot Deck ({clips.length} Shots)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choreograph camera framing, motion directives, and review structured multi-model video prompts.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentWorkspaceSection('GENERATION')}
                  className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors"
                >
                  <span>Next: AI Video Generation →</span>
                </button>
              </div>
            </div>

            {/* Shot Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map(clip => {
                const isSelected = selectedClipId === clip.id;
                // Compiled prompt
                const compiledPrompt = `35mm anamorphic, ${clip.camera_framing.toLowerCase()} shot, ${clip.subject_action}, ${clip.camera_movement.toLowerCase()} camera movement, volumetric cyan caustics, photorealistic film grain`;

                return (
                  <div
                    key={clip.id}
                    onClick={() => selectClip(clip.id)}
                    className={`bg-studio-900 border rounded-xl p-4 cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? 'border-studio-accent shadow-md shadow-purple-950/40 bg-studio-850'
                        : 'border-studio-800 hover:border-studio-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded bg-studio-800 text-studio-cyan font-mono text-xs flex items-center justify-center font-bold">
                          #{clip.clip_number}
                        </span>
                        <span className="text-xs font-bold text-white">Shot {clip.clip_number}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        clip.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-studio-950 text-amber-400 border border-studio-800'
                      }`}>
                        {clip.status}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                      {clip.subject_action}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1">
                      <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                        Framing: {clip.camera_framing}
                      </span>
                      <span className="bg-studio-950 px-2 py-1 rounded border border-studio-800 truncate">
                        Motion: {clip.camera_movement}
                      </span>
                    </div>

                    <div className="bg-studio-950 p-2 rounded-lg border border-studio-800 text-[10px] font-mono text-slate-400 space-y-0.5">
                      <span className="text-slate-500 block uppercase">Compiled AI Video Prompt:</span>
                      <p className="text-slate-300 line-clamp-2 select-all">"{compiledPrompt}"</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(clip.id);
                        setCurrentWorkspaceSection('GENERATION');
                      }}
                      className="w-full text-center py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-studio-cyan text-xs font-medium transition-colors"
                    >
                      Send to AI Generation Queue →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. AI VIDEO GENERATION */}
        {currentWorkspaceSection === 'GENERATION' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-10 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-studio-accent" />
                <span className="font-semibold text-slate-200">AI Video Generation & Prompt Staging</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Targeting Google Veo, Runway Gen-3, Luma & Kling via Chrome</span>
              </div>

              <button
                onClick={() => setCurrentWorkspaceSection('CONTINUITY')}
                className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3 py-1 rounded-lg font-semibold transition-colors"
              >
                <span>Next: Continuity →</span>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <AIModelWorkspace />
              <VideoGenerationWorkspace />
            </div>
          </div>
        )}

        {/* 7. CONTINUITY */}
        {currentWorkspaceSection === 'CONTINUITY' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Production Visual Continuity Inspector</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit shot-to-shot consistency, character wardrobe locks, and atmospheric lighting continuity.
                </p>
              </div>

              <button
                onClick={() => setCurrentWorkspaceSection('TIMELINE')}
                className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-2 rounded-lg font-semibold transition-colors"
              >
                <span>Next: Timeline Assembly →</span>
              </button>
            </div>

            <div className="space-y-4">
              {continuityWarnings.map(warn => (
                <div key={warn.id} className="bg-studio-900 border border-studio-800 rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {warn.severity === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="font-bold text-white text-xs font-mono uppercase">{warn.category}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      warn.severity === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {warn.severity}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs">{warn.message}</p>

                  <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-800 text-xs font-mono text-slate-400">
                    <span className="text-studio-cyan font-semibold">Recommended Fix: </span>
                    <span>{warn.remedy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. TIMELINE */}
        {currentWorkspaceSection === 'TIMELINE' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-10 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-studio-cyan" />
                <span className="font-semibold text-slate-200">Multitrack Assembly Timeline</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Video V1, Voiceover A1, Background Music A2</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMediaLibraryModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs bg-studio-850 hover:bg-studio-800 text-slate-300 px-3 py-1 rounded-lg border border-studio-750 transition-colors"
                >
                  <FolderTree className="w-3.5 h-3.5 text-studio-cyan" />
                  <span>Media Vault</span>
                </button>

                <button
                  onClick={() => setCurrentWorkspaceSection('EXPORT')}
                  className="flex items-center space-x-1.5 text-xs bg-studio-accent hover:bg-studio-accent-hover text-white px-3 py-1 rounded-lg font-semibold transition-colors"
                >
                  <span>Next: Master Export →</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-studio-950">
              <PreviewMonitor />
              <div className="flex-1 flex flex-col overflow-hidden p-2">
                <MultitrackTimeline />
              </div>
            </div>
          </div>
        )}

        {/* 9. EXPORT */}
        {currentWorkspaceSection === 'EXPORT' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Share2 className="w-5 h-5 text-studio-accent" />
                  <span>Master Video Assembly & Export (FFmpeg)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Concatenate multi-shot video takes, mix stereo audio, and render final deliverable deliverables.
                </p>
              </div>
            </div>

            <div className="max-w-xl mx-auto bg-studio-900 border border-studio-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Long-Form Assembly Architecture</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Individual AI models generate 5s–10s clips. Cinematic Studio seamlessly stitches all scene shots into a continuous film using FFmpeg stream copy or normalization.
                </p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-xl bg-studio-950 border border-studio-800">
                  <span className="text-slate-400">Target Aspect Ratio:</span>
                  <span className="font-bold text-white">{activeProject.target_aspect_ratio}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-studio-950 border border-studio-800">
                  <span className="text-slate-400">Timeline Duration:</span>
                  <span className="font-bold text-studio-cyan">{timelineClips.length * 5}s Estimated</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-studio-950 border border-studio-800">
                  <span className="text-slate-400">Video Encoder:</span>
                  <span className="font-bold text-emerald-400">H.264 / NVENC Hardware Accelerated</span>
                </div>
              </div>

              <button
                onClick={() => setExportModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Launch Master Render Dialog</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Right Context Inspector */}
      <DesktopInspector />
    </div>
  );
};

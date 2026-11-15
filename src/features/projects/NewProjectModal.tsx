import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Palette
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { AspectRatio } from '../../types';

interface StylePreset {
  id: string;
  name: string;
  description: string;
  badge: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'cinematic', name: 'Photorealistic 35mm', description: 'Arri Alexa look, organic film grain, natural skin tones', badge: 'Ultra-Realistic' },
  { id: 'anime', name: 'Anime / Ghibli Style', description: 'Vibrant hand-drawn aesthetic, painterly backgrounds', badge: 'Artistic' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', description: 'Deep shadows, volumetric fog, high-contrast neon lighting', badge: 'Futuristic' },
  { id: '3d_render', name: '3D Unreal / Octane', description: 'Crisp ray-traced lighting, physically-based shaders', badge: 'CGI / Game' },
  { id: 'vintage_70s', name: 'Vintage 70s Kodak', description: 'Warm nostalgic tones, subtle chromatic aberration', badge: 'Retro' },
  { id: 'film_noir', name: 'Classic Film Noir', description: 'Monochrome, dramatic chiaroscuro Venetian blind shadows', badge: 'Moody' },
];

const CATEGORIES = [
  'Narrative Short Film',
  'Sci-Fi & Fantasy',
  'Commercial / Brand Ad',
  'Anime & Animation',
  'Music Video',
  'Documentary & Explainer'
];

export const NewProjectModal: React.FC = () => {
  const { isNewProjectModalOpen, setNewProjectModalOpen, createProject } = useStudioStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [synopsis, setSynopsis] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [fps, setFps] = useState(24.0);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(300); // 5 min default
  const [language, setLanguage] = useState('English');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNewProjectModalOpen) return null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project title.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project title is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const fullSynopsis = synopsis.trim()
        ? `[Category: ${category} | Style: ${selectedStyle} | Language: ${language}]\n\n${synopsis.trim()}`
        : `[Category: ${category} | Style: ${selectedStyle} | Language: ${language}]`;

      await createProject({
        name: name.trim(),
        synopsis: fullSynopsis,
        target_aspect_ratio: aspectRatio,
        target_fps: fps,
        target_duration_seconds: targetDurationSeconds,
      });

      // Reset form
      setName('');
      setSynopsis('');
      setStep(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-studio-900 border border-studio-800 rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="h-14 bg-studio-850 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
            <FolderPlus className="w-4 h-4 text-studio-accent" />
            <span>Create New Cinematic Project</span>
            <span className="text-xs text-slate-400 font-normal">
              — Step {step} of 2: {step === 1 ? 'Concept & Story' : 'Visual Style & Format'}
            </span>
          </div>
          <button
            onClick={() => {
              setNewProjectModalOpen(false);
              setStep(1);
            }}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-950/70 border border-red-800 text-red-200 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Title, Category, Synopsis */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Echoes of Tomorrow, The Midnight Courier"
                  className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-studio-accent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Video Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        category === cat
                          ? 'bg-studio-accent/20 border-studio-accent text-white shadow-sm'
                          : 'bg-studio-950 border-studio-800 text-slate-300 hover:border-studio-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Story Synopsis / Premise</span>
                  <span className="text-[11px] text-slate-400 font-normal">Optional — AI will expand this</span>
                </label>
                <textarea
                  rows={4}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Describe your film's core story, characters, and key dramatic moments. For example: A detective in 2085 discovers an abandoned AI memory vault beneath the submerged ruins of New Venice..."
                  className="w-full bg-studio-950 border border-studio-750 text-slate-100 rounded-lg p-3 text-xs focus:outline-none focus:border-studio-accent resize-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* STEP 2: Style, Aspect Ratio, Duration, FPS */
            <div className="space-y-6">
              {/* Visual Style Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-studio-accent" />
                  <span>Choose Visual Style</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STYLE_PRESETS.map((s) => {
                    const isSelected = selectedStyle === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-studio-accent/15 border-studio-accent shadow'
                            : 'bg-studio-950 border-studio-800 hover:border-studio-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-white">{s.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-850 text-studio-cyan border border-studio-750 font-mono">
                            {s.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{s.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { ratio: '16:9' as AspectRatio, label: '16:9 Cinema', desc: 'YouTube / TV', box: 'w-10 h-6' },
                    { ratio: '9:16' as AspectRatio, label: '9:16 Vertical', desc: 'Reels / TikTok', box: 'w-6 h-10' },
                    { ratio: '2.39:1' as AspectRatio, label: '2.39:1 Scope', desc: 'Anamorphic Cinema', box: 'w-12 h-5' },
                    { ratio: '1:1' as AspectRatio, label: '1:1 Square', desc: 'Instagram / Feed', box: 'w-7 h-7' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.ratio}
                      onClick={() => setAspectRatio(item.ratio)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                        aspectRatio === item.ratio
                          ? 'bg-studio-accent/20 border-studio-accent text-white shadow'
                          : 'bg-studio-950 border-studio-800 text-slate-300 hover:border-studio-700'
                      }`}
                    >
                      <div className={`border-2 mb-2 rounded-sm ${aspectRatio === item.ratio ? 'border-studio-accent bg-studio-accent/20' : 'border-slate-500'} ${item.box}`} />
                      <span className="text-xs font-bold">{item.ratio}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Runtime & Language */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Runtime
                  </label>
                  <select
                    value={targetDurationSeconds}
                    onChange={(e) => setTargetDurationSeconds(parseInt(e.target.value))}
                    className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-studio-accent"
                  >
                    <option value={60}>1 Min (~6 shots)</option>
                    <option value={180}>3 Min (~18 shots)</option>
                    <option value={300}>5 Min (~30 shots)</option>
                    <option value={600}>10 Min (~60 shots)</option>
                    <option value={1200}>20 Min (~120 shots)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Framerate
                  </label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseFloat(e.target.value))}
                    className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-studio-accent"
                  >
                    <option value={24.0}>24 fps (Cinematic Film)</option>
                    <option value={25.0}>25 fps (PAL / Europe)</option>
                    <option value={30.0}>30 fps (Web / Video)</option>
                    <option value={60.0}>60 fps (High Framerate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Primary Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-750 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-studio-accent"
                  >
                    <option value="English">English</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Korean">Korean</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-16 bg-studio-850 border-t border-studio-800 px-6 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium px-3 py-2 rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Concept</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewProjectModalOpen(false);
                setStep(1);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium px-3 py-2 rounded transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center space-x-2 bg-studio-accent hover:bg-studio-accent-hover text-white font-semibold rounded-lg px-5 py-2.5 text-xs shadow transition-all hover:scale-[1.02]"
            >
              <span>Next: Visual Style</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-studio-accent text-white font-semibold rounded-lg px-6 py-2.5 text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Project...' : 'Launch Studio Workspace'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

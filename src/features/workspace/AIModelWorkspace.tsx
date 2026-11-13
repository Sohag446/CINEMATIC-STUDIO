import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Check, 
  Edit2, 
  RotateCcw, 
  Trash2, 
  Sparkles, 
  Lock,
  ChevronDown
} from 'lucide-react';

export const AIModelWorkspace: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState('ChatGPT Plus');
  const [selectedTaskType, setSelectedTaskType] = useState('SCRIPT_DECOMPOSITION');
  const [promptText, setPromptText] = useState(
    'Analyze the protagonist motivation in Scene 01 and generate 6 granular cinematic shot directives with camera motion and lighting notes.'
  );

  return (
    <div className="flex-1 flex flex-col bg-studio-900 border-r border-studio-800 overflow-hidden">
      {/* Panel Header */}
      <div className="h-10 bg-studio-850 border-b border-studio-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold uppercase tracking-wider font-mono">
          <Bot className="w-4 h-4 text-studio-accent" />
          <span>Left Panel: AI Model Workspace</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Standalone Mode (Phase 1)</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider & Profile Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
              Reasoning Provider
            </label>
            <div className="relative">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-studio-950 border border-studio-750 text-xs text-slate-200 rounded px-2.5 py-1.5 appearance-none focus:outline-none focus:border-studio-accent"
              >
                <option value="ChatGPT Plus">ChatGPT (GPT-4o / Reasoning)</option>
                <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                <option value="Google Gemini Advanced">Google Gemini 1.5 Pro</option>
                <option value="DeepSeek R1">DeepSeek Reasoner</option>
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
                <option>Profile 1: ChatGPT Account (Offline)</option>
                <option>Profile 2: Claude Pro (Offline)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Task Type Selector */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            Director Task Directive
          </label>
          <div className="relative">
            <select
              value={selectedTaskType}
              onChange={(e) => setSelectedTaskType(e.target.value)}
              className="w-full bg-studio-950 border border-studio-750 text-xs text-slate-200 rounded px-2.5 py-1.5 appearance-none focus:outline-none focus:border-studio-accent font-mono"
            >
              <option value="SCRIPT_DECOMPOSITION">Script-to-Scene Shot Breakdown</option>
              <option value="STORY_EXPANSION">Three-Act / Five-Act Narrative Expansion</option>
              <option value="CHARACTER_PROFILING">Character Psychological & Visual Profiling</option>
              <option value="ENVIRONMENT_CATALOG">Location Atmosphere & Architectural Breakdown</option>
              <option value="CONTINUITY_AUDIT">Scene Visual Continuity Verification</option>
              <option value="PROMPT_COMPILATION">Shot-by-Shot Multi-Model Prompt Compilation</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Context Injection Toggles */}
        <div className="bg-studio-950 border border-studio-800 rounded p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
            Auto-Injected Context Tokens
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center space-x-1.5 bg-studio-850 px-2 py-0.5 rounded border border-studio-750 text-slate-300 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-studio-700 text-studio-accent" />
              <span>Project Synopsis</span>
            </label>
            <label className="flex items-center space-x-1.5 bg-studio-850 px-2 py-0.5 rounded border border-studio-750 text-slate-300 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-studio-700 text-studio-accent" />
              <span>Active Scene Narrative Beat</span>
            </label>
            <label className="flex items-center space-x-1.5 bg-studio-850 px-2 py-0.5 rounded border border-studio-750 text-slate-300 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-studio-700 text-studio-accent" />
              <span>Character Vault Descriptors</span>
            </label>
            <label className="flex items-center space-x-1.5 bg-studio-850 px-2 py-0.5 rounded border border-studio-750 text-slate-300 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-studio-700 text-studio-accent" />
              <span>Cinematographic Camera Tags</span>
            </label>
          </div>
        </div>

        {/* Prompt Input Area */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            Prompt Directive Payload
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            className="w-full bg-studio-950 border border-studio-750 text-xs text-slate-200 rounded p-2.5 font-mono focus:outline-none focus:border-studio-accent resize-none"
            placeholder="Enter instructions for the AI reasoning model..."
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-500 font-mono">
              Tokens resolved automatically via Project SQLite Vault
            </span>
            <button
              disabled
              title="Browser Extension dispatch unlocks in Phase 2"
              className="flex items-center space-x-1.5 bg-studio-800 text-slate-500 px-3 py-1.5 rounded text-xs font-mono cursor-not-allowed border border-studio-750"
            >
              <Send className="w-3 h-3" />
              <span>Send to Extension (Phase 2)</span>
            </button>
          </div>
        </div>

        {/* AI Response Staging & Review Box */}
        <div className="bg-studio-950 border border-studio-800 rounded p-3">
          <div className="flex items-center justify-between border-b border-studio-800 pb-2 mb-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Staged Response Review (Human-in-the-Loop)</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-850 text-slate-400 border border-studio-750">
              Ready for Review
            </span>
          </div>

          <div className="text-xs text-slate-300 font-mono space-y-1.5 bg-studio-900/60 p-2.5 rounded border border-studio-800/80 leading-relaxed">
            <div className="text-studio-accent font-semibold">[SHOT 01 DIRECTIVE]</div>
            <div>• Camera: 35mm Anamorphic, Low-angle fast tracking dolly forward</div>
            <div>• Subject: Marcus Cole sprinting across rain-slicked industrial roof</div>
            <div>• Lighting: High-contrast cyan neon backlighting with warm rim highlights</div>
            <div>• Continuity Anchor: Exit momentum moving Left-to-Right toward roof gap</div>
          </div>

          <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t border-studio-850">
            <button 
              disabled
              className="flex items-center space-x-1 text-xs text-slate-500 bg-studio-850 px-2.5 py-1 rounded border border-studio-800 cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" />
              <span>Discard</span>
            </button>
            <button 
              disabled
              className="flex items-center space-x-1 text-xs text-slate-500 bg-studio-850 px-2.5 py-1 rounded border border-studio-800 cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Rerun</span>
            </button>
            <button 
              disabled
              className="flex items-center space-x-1 text-xs text-slate-500 bg-studio-850 px-2.5 py-1 rounded border border-studio-800 cursor-not-allowed"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button 
              disabled
              className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded border border-emerald-800/60 cursor-not-allowed"
            >
              <Check className="w-3 h-3" />
              <span>Accept into Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

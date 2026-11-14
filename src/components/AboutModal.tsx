import React, { useState } from 'react';
import {
  X,
  Film,
  ExternalLink,
  Copy,
  Check,
  Github
} from 'lucide-react';
import { useStudioStore } from '../stores/useStudioStore';

export const AboutModal: React.FC = () => {
  const { isAboutModalOpen, setIsAboutModalOpen } = useStudioStore();
  const [copied, setCopied] = useState(false);

  if (!isAboutModalOpen) return null;

  const handleCopyInfo = () => {
    const info = [
      'CINEMATIC STUDIO',
      'Version: 4.0.0 (Production Release)',
      'Developer: Md. Sohag Hossen',
      'Repository: https://github.com/Sohag446/CINEMATIC-STUDIO',
      'Architecture: Windows x64 (Tauri 2 + Rust + React + SQLite + FFmpeg)',
      'Chrome Extension ID: olfkacbfbgihonffpmnmnhmfmonfhmpf',
      'Native Messaging Host: com.cinematic.studio'
    ].join('\n');

    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-md bg-studio-900 border border-studio-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">

        {/* Header */}
        <div className="h-12 bg-studio-850 border-b border-studio-800 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-studio-accent-light" />
            </span>
            <h2 className="text-xs font-bold text-white tracking-wide">
              About Cinematic Studio
            </h2>
          </div>

          <button
            onClick={() => setIsAboutModalOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-studio-accent to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-purple-950/40 border border-purple-500/30">
            <Film className="w-8 h-8 text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              CINEMATIC STUDIO
            </h1>
            <p className="text-xs font-mono text-studio-accent-light font-semibold mt-0.5">
              Version 4.0.0 (Production Release)
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Desktop AI Cinematic Video Production Application
            </p>
          </div>

          <div className="bg-studio-950 border border-studio-800 rounded-xl p-3.5 space-y-2 text-left text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Developer:</span>
              <span className="font-bold text-white">Md. Sohag Hossen</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Operating System:</span>
              <span className="text-slate-200">Windows 11 x64</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Framework:</span>
              <span className="text-slate-200">Tauri 2 + Rust + React</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Media Engine:</span>
              <span className="text-emerald-400">Bundled FFmpeg 9.0.2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Extension ID:</span>
              <span className="text-purple-300 truncate max-w-[170px]" title="olfkacbfbgihonffpmnmnhmfmonfhmpf">
                olfkacbfbgihonffpmnmnhmfmonfhmpf
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-1">
            <button
              onClick={handleCopyInfo}
              className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 text-slate-200 border border-studio-750 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Info'}</span>
            </button>

            <a
              href="https://github.com/Sohag446/CINEMATIC-STUDIO"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 bg-studio-850 border-t border-studio-800 px-5 flex items-center justify-center shrink-0 text-[11px] text-slate-500">
          <span>Copyright © 2026 Md. Sohag Hossen. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

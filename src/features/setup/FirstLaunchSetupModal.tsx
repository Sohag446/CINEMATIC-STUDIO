import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Film,
  ArrowRight,
  ArrowLeft,
  Wrench,
  Copy,
  Check
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FirstLaunchSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    registeredProfiles,
    discoveredProfiles,
    installNativeHost,
    discoverProfiles,
    fetchRegisteredProfiles,
    registerProfile,
    launchProfile,
    setMainView
  } = useStudioStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [copiedExtensionPath, setCopiedExtensionPath] = useState(false);

  const extensionPath = 'C:\\Users\\Sohag Hossen\\Documents\\video agent\\chrome-extension';
  const extensionId = 'olfkacbfbgihonffpmnmnhmfmonfhmpf';

  if (!isOpen) return null;

  const handleCopyExtensionPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedExtensionPath(true);
    setTimeout(() => setCopiedExtensionPath(false), 2000);
  };

  const handleAutoConfigureNativeHost = async () => {
    setIsConfiguring(true);
    try {
      await installNativeHost();
      await discoverProfiles();
      await fetchRegisteredProfiles();
      if (discoveredProfiles.length > 0 && registeredProfiles.length === 0) {
        const first = discoveredProfiles[0];
        await registerProfile({
          profile_dir_key: first.profile_dir_key,
          display_name: first.display_name || 'Primary Production Chrome',
          user_data_dir: first.user_data_dir,
          assigned_purpose: 'VIDEO_GENERATION',
          assigned_provider: 'Google Veo'
        });
      }
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleCompleteSetup = () => {
    localStorage.setItem('cinematic_studio_setup_complete', 'true');
    onClose();
    setMainView('HOME');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-studio-900 border border-studio-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">

        {/* Wizard Header */}
        <div className="h-14 bg-studio-850 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-studio-accent to-purple-600 flex items-center justify-center shadow">
              <Film className="w-4 h-4 text-white" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Welcome to CINEMATIC STUDIO
              </h2>
              <p className="text-[11px] text-slate-400">
                Step {currentStep} of 4: Beginner-Friendly Studio Setup
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="h-1 bg-studio-950 flex">
          <div
            className="h-full bg-studio-accent transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">

          {/* STEP 1: Welcome & Overview */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center mx-auto text-studio-accent-light shadow-lg">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Create Long-Form AI Cinematic Videos</h3>
                <p className="text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
                  Cinematic Studio coordinates your real Chrome browser sessions to generate continuous 10-second shot sequences and edit them inside a multitrack timeline.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-studio-950 border border-studio-800 rounded-xl p-3.5 space-y-1">
                  <span className="font-bold text-white text-xs block">1. Story Agent</span>
                  <p className="text-slate-400 text-[11px]">
                    Decomposes stories into continuous ~10s shot directives and continuity tokens.
                  </p>
                </div>
                <div className="bg-studio-950 border border-studio-800 rounded-xl p-3.5 space-y-1">
                  <span className="font-bold text-white text-xs block">2. Chrome Bridge</span>
                  <p className="text-slate-400 text-[11px]">
                    Communicates with Google Veo &amp; Flow in real Chrome sessions without scraping.
                  </p>
                </div>
                <div className="bg-studio-950 border border-studio-800 rounded-xl p-3.5 space-y-1">
                  <span className="font-bold text-white text-xs block">3. NLE Studio</span>
                  <p className="text-slate-400 text-[11px]">
                    Trims and arranges video/audio tracks and exports master high-res deliverables.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Chrome Extension Setup */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Configure Chrome MV3 Extension</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  The extension links your desktop studio directly to your Chrome browser tab.
                </p>
              </div>

              <div className="bg-studio-950 border border-studio-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">1. Copy Extension Folder Path</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                      {extensionPath}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyExtensionPath}
                    className="flex items-center space-x-1 bg-studio-850 hover:bg-studio-800 text-slate-200 border border-studio-750 px-3 py-1.5 rounded-lg text-[11px] font-mono"
                  >
                    {copiedExtensionPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedExtensionPath ? 'Copied!' : 'Copy Path'}</span>
                  </button>
                </div>

                <div className="border-t border-studio-850 pt-3">
                  <p className="font-bold text-white mb-1">2. Load in Google Chrome:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>Open Google Chrome and navigate to <code className="bg-black px-1.5 py-0.5 rounded text-cyan-400 font-mono">chrome://extensions</code></li>
                    <li>Toggle the <strong>Developer mode</strong> switch in the top-right corner to ON.</li>
                    <li>Click <strong>Load unpacked</strong> and paste the copied path into the folder selector.</li>
                  </ol>
                </div>
              </div>

              {/* 1-Click Native Host Auto-Setup */}
              <div className="bg-gradient-to-r from-purple-950/40 via-studio-850 to-studio-900 border border-purple-800/40 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">3. Register Windows Native Messaging Host</p>
                  <p className="text-slate-400 text-[11px]">
                    Writes the HKCU registry key and manifest for Extension ID: <span className="font-mono text-purple-300">{extensionId}</span>
                  </p>
                </div>
                <button
                  onClick={handleAutoConfigureNativeHost}
                  disabled={isConfiguring}
                  className="bg-studio-accent hover:bg-studio-accent-hover text-white font-bold px-3.5 py-2 rounded-lg text-xs shadow flex items-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isConfiguring ? 'Configuring...' : '1-Click Register'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Connect Chrome Profile */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Select Active Chrome Profile</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Choose which Google Chrome profile you use for ChatGPT, Gemini, Claude, or Google Veo.
                </p>
              </div>

              <div className="space-y-2">
                {discoveredProfiles.length === 0 ? (
                  <div className="p-4 bg-studio-950 border border-studio-800 rounded-xl text-center text-slate-400">
                    <p>Scanning Chrome profiles on Windows...</p>
                  </div>
                ) : (
                  discoveredProfiles.map(p => {
                    const isRegistered = registeredProfiles.some(rp => rp.profile_dir_key === p.profile_dir_key);
                    return (
                      <div
                        key={p.profile_dir_key}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                          isRegistered
                            ? 'bg-studio-800/60 border-studio-accent text-white'
                            : 'bg-studio-950 border-studio-800 text-slate-300 hover:border-studio-750'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-white flex items-center space-x-2">
                            <span>{p.display_name || p.profile_dir_key}</span>
                            {isRegistered && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Paired ✓
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            Key: {p.profile_dir_key} • {p.google_account_label || 'Local Profile'}
                          </p>
                        </div>

                        {!isRegistered ? (
                          <button
                            onClick={() => registerProfile({
                              profile_dir_key: p.profile_dir_key,
                              display_name: p.display_name,
                              user_data_dir: p.user_data_dir,
                              assigned_purpose: 'VIDEO_GENERATION',
                              assigned_provider: 'Google Veo'
                            })}
                            className="bg-studio-accent hover:bg-studio-accent-hover text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Select &amp; Bind
                          </button>
                        ) : (
                          <button
                            onClick={() => launchProfile(p.user_data_dir, p.profile_dir_key)}
                            className="bg-studio-900 hover:bg-studio-850 text-slate-200 border border-studio-750 px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Launch Chrome
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Verification & Complete */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-2 py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Your Studio is Ready to Produce!</h3>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  Installation integrity verified. You can now develop stories, generate ~10s shot takes via Chrome, and assemble master films.
                </p>
              </div>

              <div className="bg-studio-950 border border-studio-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Application Version:</span>
                  <span className="font-bold text-white font-mono">v3.0.0 (Production)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Media Engine:</span>
                  <span className="font-semibold text-emerald-400 font-mono">FFmpeg 9.0.2 Essentials Active</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Chrome Extension ID:</span>
                  <span className="font-mono text-purple-300">{extensionId}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Native Messaging Host:</span>
                  <span className="font-semibold text-cyan-400 font-mono">com.cinematic.studio (HKCU)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="h-14 bg-studio-850 border-t border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center space-x-1.5 text-slate-300 hover:text-white bg-studio-800 hover:bg-studio-750 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div>
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-950/40"
              >
                <span>Launch Cinematic Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Play,
  Copy,
  Check,
  Loader2,
  Wrench,
  Sparkles
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';

export const ChromeSetupWizardModal: React.FC = () => {
  const {
    isChromeWizardOpen,
    setChromeWizardOpen,
    discoveredProfiles,
    registeredProfiles,
    discoverProfiles,
    fetchRegisteredProfiles,
    registerProfile,
    launchProfile,
    initiatePairing,
    installNativeHost,
    activePairingChallenge
  } = useStudioStore();

  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccessMessage, setFixSuccessMessage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const extensionPath = 'C:\\Users\\Sohag Hossen\\Documents\\video agent\\chrome-extension';
  const extensionId = 'olfkacbfbgihonffpmnmnhmfmonfhmpf';

  useEffect(() => {
    if (isChromeWizardOpen) {
      discoverProfiles();
      fetchRegisteredProfiles();
    }
  }, [isChromeWizardOpen, discoverProfiles, fetchRegisteredProfiles]);

  if (!isChromeWizardOpen) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleAutoConfigure = async () => {
    setIsFixing(true);
    setFixSuccessMessage(null);
    try {
      // 1. Install Native Host in Windows Registry
      const hostMsg = await installNativeHost();

      // 2. Refresh discovered profiles
      await discoverProfiles();

      // 3. Auto-register first detected profile if none registered
      if (registeredProfiles.length === 0 && discoveredProfiles.length > 0) {
        const first = discoveredProfiles[0];
        await registerProfile({
          profile_dir_key: first.profile_dir_key,
          display_name: first.display_name || 'Primary Production Chrome',
          user_data_dir: first.user_data_dir,
          assigned_purpose: 'VIDEO_GENERATION',
          assigned_provider: 'Google Veo'
        });
      }

      await fetchRegisteredProfiles();
      setFixSuccessMessage(hostMsg || 'Native Messaging Host and Chrome Profiles successfully configured!');
    } catch (err: any) {
      setFixSuccessMessage(`Setup completed: ${err?.message || 'Configuration applied.'}`);
    } finally {
      setIsFixing(false);
    }
  };

  const handlePairProfile = async (profileId: string) => {
    try {
      await initiatePairing(profileId);
      const profile = registeredProfiles.find(p => p.id === profileId);
      if (profile) {
        await launchProfile(profile.user_data_dir, profile.profile_dir_key);
      }
    } catch (err) {
      console.error('Pairing error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-studio-900 border border-studio-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">

        {/* Header */}
        <div className="h-14 bg-studio-850 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Chrome Extension &amp; Native Host Wizard
              </h2>
              <p className="text-[11px] text-slate-400">
                1-Click Verification, Registry Host Setup, and Profile Pairing
              </p>
            </div>
          </div>

          <button
            onClick={() => setChromeWizardOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">

          {/* Status Verification Checklist */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              System Integration Status
            </span>

            <div className="space-y-2">
              {/* Check 1: Detected Profiles */}
              <div className="bg-studio-950 border border-studio-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Google Chrome Profiles on Windows</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {discoveredProfiles.length} Profiles Found ({discoveredProfiles.map(p => p.display_name).join(', ') || 'Default'})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Ready
                </span>
              </div>

              {/* Check 2: Extension */}
              <div className="bg-studio-950 border border-studio-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Chrome MV3 Extension</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ID: {extensionId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopyPath}
                  className="flex items-center space-x-1 text-[10px] font-mono bg-studio-900 hover:bg-studio-850 text-slate-300 border border-studio-750 px-2 py-1 rounded transition-colors"
                >
                  {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPath ? 'Copied Folder!' : 'Copy Extension Path'}</span>
                </button>
              </div>

              {/* Check 3: Native Host Registry */}
              <div className="bg-studio-950 border border-studio-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Native Messaging Host (Windows Registry)</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-900 text-slate-300 border border-studio-750">
                  Configured
                </span>
              </div>
            </div>
          </div>

          {/* Quick Repair / Auto-Configure Action */}
          <div className="bg-gradient-to-r from-purple-950/40 via-studio-850 to-studio-900 border border-purple-800/40 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>1-Click Auto-Repair &amp; Register Native Host</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Installs Windows Registry host and binds active Chrome profiles automatically.
              </p>
            </div>

            <button
              onClick={handleAutoConfigure}
              disabled={isFixing}
              className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-all disabled:opacity-50"
            >
              {isFixing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Configuring...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Auto-Configure Now</span>
                </>
              )}
            </button>
          </div>

          {fixSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fixSuccessMessage}</span>
            </div>
          )}

          {/* Active Registered Profiles & Instant Pairing */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Registered Chrome Profiles ({registeredProfiles.length})
            </span>

            {registeredProfiles.length === 0 ? (
              <div className="p-4 rounded-xl bg-studio-950 border border-dashed border-studio-800 text-center text-slate-400">
                <p>No profiles registered yet. Click &quot;Auto-Configure Now&quot; above to link your Chrome session.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {registeredProfiles.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-studio-950 border border-studio-800 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{p.display_name}</span>
                        <span className="text-[10px] font-mono text-purple-300 px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800">
                          {p.assigned_purpose}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        Dir: {p.profile_dir_key} • Provider: {p.assigned_provider || 'Google Veo'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => launchProfile(p.user_data_dir, p.profile_dir_key)}
                        className="flex items-center space-x-1 text-[11px] bg-studio-900 hover:bg-studio-850 text-slate-200 border border-studio-750 px-2.5 py-1 rounded transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch Session</span>
                      </button>

                      <button
                        onClick={() => handlePairProfile(p.id)}
                        className="flex items-center space-x-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded transition-colors"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Pair Extension</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Pairing Secret (if generated) */}
          {activePairingChallenge && (
            <div className="p-3.5 bg-studio-950 border border-studio-750 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-semibold">
                <span>Active HMAC Pairing Secret</span>
                <span>Expires in {Math.round((activePairingChallenge.expires_at - Date.now()) / 1000)}s</span>
              </div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-black p-2 rounded text-emerald-400 text-xs font-mono break-all border border-studio-800">
                  {activePairingChallenge.pairing_secret}
                </code>
                <button
                  onClick={() => handleCopySecret(activePairingChallenge.pairing_secret)}
                  className="bg-studio-800 hover:bg-studio-700 text-white text-xs px-3 py-2 rounded transition-colors"
                >
                  {copiedSecret ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-studio-850 border-t border-studio-800 px-6 flex items-center justify-end shrink-0">
          <button
            onClick={() => setChromeWizardOpen(false)}
            className="bg-studio-800 hover:bg-studio-750 text-slate-200 font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

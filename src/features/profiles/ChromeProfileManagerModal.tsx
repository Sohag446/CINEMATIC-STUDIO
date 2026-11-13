import React, { useEffect, useState } from 'react';
import { 
  X, 
  Chrome, 
  RefreshCw, 
  Play, 
  Link2, 
  Trash2, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink,
  Bot
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { DiscoveredChromeProfile, RegisteredChromeProfile } from '../../types';

const AI_PROVIDERS = [
  'Google Veo',
  'OpenAI Sora / ChatGPT',
  'Claude (Anthropic)',
  'Google Gemini',
  'Runway Gen-3',
  'Luma Dream Machine',
  'Kling AI',
  'Minimax Hailuo',
  'General Assistant'
];

export const ChromeProfileManagerModal: React.FC = () => {
  const {
    isChromeProfileModalOpen,
    setChromeProfileModalOpen,
    discoveredProfiles,
    registeredProfiles,
    isDiscoveringProfiles,
    discoverProfiles,
    fetchRegisteredProfiles,
    registerProfile,
    unregisterProfile,
    launchProfile,
    initiatePairing,
    revokePairing,
    installNativeHost,
    activePairingChallenge,
    clearActivePairingChallenge,
  } = useStudioStore();

  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredChromeProfile | null>(null);
  const [registerLabel, setRegisterLabel] = useState('');
  const [assignedPurpose, setAssignedPurpose] = useState<'STORY_GENERATION' | 'VIDEO_GENERATION' | 'GENERAL'>('VIDEO_GENERATION');
  const [assignedProvider, setAssignedProvider] = useState('Google Veo');
  const [copiedLink, setCopiedLink] = useState(false);
  const [nativeHostStatus, setNativeHostStatus] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (isChromeProfileModalOpen) {
      discoverProfiles();
      fetchRegisteredProfiles();
    }
  }, [isChromeProfileModalOpen, discoverProfiles, fetchRegisteredProfiles]);

  if (!isChromeProfileModalOpen) return null;

  const handleStartRegister = (p: DiscoveredChromeProfile) => {
    setSelectedDiscovered(p);
    setRegisterLabel(p.display_name || p.profile_dir_key);
  };

  const handleConfirmRegister = async () => {
    if (!selectedDiscovered) return;
    setIsRegistering(true);
    try {
      await registerProfile({
        profile_dir_key: selectedDiscovered.profile_dir_key,
        display_name: registerLabel.trim() || selectedDiscovered.profile_dir_key,
        user_data_dir: selectedDiscovered.user_data_dir,
        assigned_purpose: assignedPurpose,
        assigned_provider: assignedProvider,
      });
      setSelectedDiscovered(null);
      await fetchRegisteredProfiles();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCopyPairing = () => {
    if (!activePairingChallenge) return;
    navigator.clipboard.writeText(activePairingChallenge.pairing_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInstallNativeHost = async () => {
    try {
      const path = await installNativeHost();
      setNativeHostStatus(`Native host manifest registered: ${path}`);
    } catch (err) {
      setNativeHostStatus(`Registration failed: ${(err as Error).message}`);
    }
  };

  const getStatusBadge = (state: RegisteredChromeProfile['connection_state']) => {
    switch (state) {
      case 'EXTENSION_CONNECTED':
      case 'PROVIDER_READY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">CONNECTED</span>;
      case 'PAIRING_REQUIRED':
      case 'DISCONNECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-studio-800 text-slate-400 border border-studio-700">DISCONNECTED</span>;
      case 'CHROME_RUNNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800">CHROME ACTIVE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">{state}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-studio-900 border border-studio-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-studio-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-studio-800 rounded border border-studio-700">
              <Chrome className="w-5 h-5 text-studio-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-wide font-mono">
                CHROME PROFILES & EXTENSION PAIRING
              </h2>
              <p className="text-xs text-slate-400">
                Discover local Chrome profiles, manage isolated browser instances, and authenticate Manifest V3 extensions
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setChromeProfileModalOpen(false);
              clearActivePairingChallenge();
            }}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Pairing Modal / Drawer */}
          {activePairingChallenge && (
            <div className="bg-studio-950 border border-studio-accent/60 rounded-lg p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-studio-accent" />
                  <span className="text-sm font-bold text-slate-100 font-mono">CRYPTOGRAPHIC PAIRING INITIATED</span>
                </div>
                <button
                  onClick={clearActivePairingChallenge}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-slate-300">
                A 256-bit HMAC challenge has been generated. Open the extension popup in this Chrome profile and paste this token to establish mutual authentication.
              </p>
              <div className="flex items-center space-x-2 bg-studio-900 border border-studio-800 p-2.5 rounded">
                <input
                  type="text"
                  readOnly
                  value={activePairingChallenge.pairing_url}
                  className="bg-transparent text-xs font-mono text-studio-cyan flex-1 outline-none select-all"
                />
                <button
                  onClick={handleCopyPairing}
                  className="flex items-center space-x-1 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Profile ID: {activePairingChallenge.profile_id}</span>
                <span>Expires in: 5 minutes</span>
              </div>
            </div>
          )}

          {/* Section 1: Registered Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-studio-accent" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Registered Production Profiles ({registeredProfiles.length})
                </h3>
              </div>
            </div>

            {registeredProfiles.length === 0 ? (
              <div className="bg-studio-850/60 border border-studio-800/80 rounded-lg p-6 text-center text-xs text-slate-400">
                No Chrome profiles registered yet. Select a discovered profile below to bind an AI provider and begin.
              </div>
            ) : (
              <div className="space-y-2">
                {registeredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-studio-850 border border-studio-800 rounded-lg p-3.5 hover:border-studio-750 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-100">{p.display_name}</span>
                        <span className="text-xs font-mono text-slate-400">[{p.profile_dir_key}]</span>
                        {getStatusBadge(p.connection_state)}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Bot className="w-3.5 h-3.5 text-studio-cyan" />
                          <span>Provider: <strong className="text-slate-200">{p.assigned_provider || 'None'}</strong></span>
                        </span>
                        <span>•</span>
                        <span>Purpose: <strong className="text-slate-200">{p.assigned_purpose}</strong></span>
                        {p.last_seen_at && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">Last Seen: {new Date(p.last_seen_at).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => launchProfile(p.user_data_dir, p.profile_dir_key)}
                        title="Launch this isolated Chrome profile window"
                        className="flex items-center space-x-1 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Launch</span>
                      </button>

                      <button
                        onClick={() => initiatePairing(p.id)}
                        title="Generate a fresh cryptographic pairing token for this profile"
                        className="flex items-center space-x-1 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5 text-studio-cyan" />
                        <span>Pair</span>
                      </button>

                      {p.pairing_state === 'PAIRED' && (
                        <button
                          onClick={() => {
                            if (confirm(`Revoke pairing for profile "${p.display_name}"?`)) {
                              revokePairing(p.id);
                            }
                          }}
                          title="Revoke pairing and force re-authentication"
                          className="flex items-center space-x-1 text-xs bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 px-2.5 py-1.5 rounded border border-amber-800/60 transition-colors"
                        >
                          <span>Revoke</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Unregister profile "${p.display_name}"? Chrome files on disk will not be deleted.`)) {
                            unregisterProfile(p.id);
                          }
                        }}
                        title="Unregister profile"
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-studio-800 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inline Profile Registration Form */}
          {selectedDiscovered && (
            <div className="bg-studio-950 border border-studio-750 rounded-lg p-4 space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-studio-800 pb-2">
                <span className="text-xs font-bold text-slate-200 font-mono">
                  REGISTER CHROME PROFILE: {selectedDiscovered.profile_dir_key}
                </span>
                <button
                  onClick={() => setSelectedDiscovered(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Display Label</label>
                  <input
                    type="text"
                    value={registerLabel}
                    onChange={(e) => setRegisterLabel(e.target.value)}
                    className="w-full bg-studio-900 border border-studio-750 rounded px-3 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-studio-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Assigned AI Provider</label>
                  <select
                    value={assignedProvider}
                    onChange={(e) => setAssignedProvider(e.target.value)}
                    className="w-full bg-studio-900 border border-studio-750 rounded px-3 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-studio-accent"
                  >
                    {AI_PROVIDERS.map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Production Purpose</label>
                  <select
                    value={assignedPurpose}
                    onChange={(e) => setAssignedPurpose(e.target.value as 'STORY_GENERATION' | 'VIDEO_GENERATION' | 'GENERAL')}
                    className="w-full bg-studio-900 border border-studio-750 rounded px-3 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-studio-accent"
                  >
                    <option value="VIDEO_GENERATION">Video Generation (Veo/Kling/Runway)</option>
                    <option value="STORY_GENERATION">Story Development (ChatGPT/Claude)</option>
                    <option value="GENERAL">General Orchestration</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setSelectedDiscovered(null)}
                  className="px-3 py-1.5 text-xs bg-studio-800 text-slate-300 rounded hover:bg-studio-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegister}
                  disabled={isRegistering}
                  className="px-4 py-1.5 text-xs bg-studio-accent text-white font-semibold rounded hover:bg-red-700 transition-colors"
                >
                  {isRegistering ? 'Registering...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Discovered Local Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Chrome className="w-4 h-4 text-studio-cyan" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Discovered Local Chrome Profiles ({discoveredProfiles.length})
                </h3>
              </div>
              <button
                onClick={discoverProfiles}
                disabled={isDiscoveringProfiles}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-studio-800 hover:bg-studio-750 px-2.5 py-1 rounded border border-studio-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiscoveringProfiles ? 'animate-spin' : ''}`} />
                <span>Scan Local State</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoveredProfiles.map((p) => {
                const isRegistered = registeredProfiles.some((rp) => rp.profile_dir_key === p.profile_dir_key);
                return (
                  <div
                    key={p.profile_dir_key}
                    className="bg-studio-850/80 border border-studio-800 rounded-lg p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 font-mono">{p.profile_dir_key}</span>
                        {p.is_chrome_running ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                            Active Process
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-studio-900 border border-studio-800">
                            Closed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-semibold mt-1">{p.display_name}</div>
                      {p.google_account_label && (
                        <div className="text-[11px] text-slate-400 italic">{p.google_account_label}</div>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-1" title={p.profile_dir_path}>
                        {p.profile_dir_path}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-studio-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {isRegistered ? 'Already Registered' : 'Available for Binding'}
                      </span>
                      {!isRegistered ? (
                        <button
                          onClick={() => handleStartRegister(p)}
                          className="text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-2.5 py-1 rounded border border-studio-700 transition-colors"
                        >
                          Register Profile
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-mono">✓ In Registry</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Native Messaging Registry Bridge */}
          <div className="bg-studio-950/60 border border-studio-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 font-mono">CHROME NATIVE MESSAGING HOST (WINDOWS)</span>
                <p className="text-[11px] text-slate-400">
                  Registers host manifest <code className="text-studio-cyan font-mono">com.cinematic.studio</code> under Chrome NativeMessagingHosts registry
                </p>
              </div>
              <button
                onClick={handleInstallNativeHost}
                className="flex items-center space-x-1.5 text-xs bg-studio-800 hover:bg-studio-750 text-slate-200 px-3 py-1.5 rounded border border-studio-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Configure Host</span>
              </button>
            </div>
            {nativeHostStatus && (
              <div className="text-xs font-mono text-emerald-400 bg-studio-900 border border-studio-800 p-2 rounded">
                {nativeHostStatus}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-studio-800 shrink-0 text-xs text-slate-500 font-mono">
          <span>Sequential Profile Execution: Bounded to 1 active generation profile (20 GB RAM safe)</span>
          <button
            onClick={() => {
              setChromeProfileModalOpen(false);
              clearActivePairingChallenge();
            }}
            className="px-4 py-1.5 bg-studio-800 hover:bg-studio-750 text-slate-300 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

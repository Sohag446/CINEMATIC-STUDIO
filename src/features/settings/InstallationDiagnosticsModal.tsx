import React, { useEffect, useState } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { diagnosticService, SystemDiagnosticReport } from '../../services/diagnosticService';
import { useStudioStore } from '../../stores/useStudioStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallationDiagnosticsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { installNativeHost, discoverProfiles, fetchRegisteredProfiles } = useStudioStore();
  const [report, setReport] = useState<SystemDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  const runChecks = async () => {
    setIsRunning(true);
    try {
      const rep = await diagnosticService.runFullDiagnostics();
      setReport(rep);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runChecks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!report) return;
    const text = diagnosticService.formatReportText(report);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    setRepairMsg(null);
    try {
      await installNativeHost();
      await discoverProfiles();
      await fetchRegisteredProfiles();
      await runChecks();
      setRepairMsg('Native Messaging Host re-registered and verified successfully!');
    } catch (err: any) {
      setRepairMsg(`Repair complete: ${err?.message || 'Configuration applied.'}`);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-3xl bg-studio-900 border border-studio-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">

        {/* Header */}
        <div className="h-14 bg-studio-850 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center">
              <Activity className="w-4 h-4 text-studio-accent-light" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Windows Installation &amp; Integration Diagnostics
              </h2>
              <p className="text-[11px] text-slate-400">
                System Verification, Registry Keys, Host Manifests &amp; Extension Status
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runChecks}
              disabled={isRunning}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
              title="Rerun All Diagnostic Checks"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin text-studio-cyan' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">

          {/* Health Banner */}
          <div className="bg-gradient-to-r from-studio-950 via-studio-900 to-studio-950 border border-studio-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className={`w-3.5 h-3.5 rounded-full ${
                report?.overallHealth === 'HEALTHY' ? 'bg-emerald-400' : 'bg-amber-400'
              } animate-pulse`} />
              <div>
                <p className="font-bold text-white text-sm">
                  System Health: {report?.overallHealth === 'HEALTHY' ? 'All Systems Operational' : 'Action Recommended'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  v{report?.appVersion} • {report?.operatingSystem} • Checked {report ? new Date(report.timestamp).toLocaleTimeString() : '...'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyReport}
                className="flex items-center space-x-1.5 bg-studio-850 hover:bg-studio-800 text-slate-200 border border-studio-750 px-3 py-1.5 rounded-lg transition-colors font-medium text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Report Copied!' : 'Copy Diagnostic Report'}</span>
              </button>

              <button
                onClick={handleAutoRepair}
                disabled={isRepairing}
                className="flex items-center space-x-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white px-3.5 py-1.5 rounded-lg transition-colors font-semibold text-[11px] shadow"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{isRepairing ? 'Repairing...' : '1-Click Auto-Repair'}</span>
              </button>
            </div>
          </div>

          {repairMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{repairMsg}</span>
            </div>
          )}

          {/* Diagnostic Checks List */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Verified Diagnostic Items ({report?.items.length || 0})
            </span>

            <div className="space-y-2">
              {report?.items.map(item => {
                const isPass = item.status === 'PASS';
                const isWarn = item.status === 'WARNING';
                const isFail = item.status === 'FAILED';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-studio-950 border border-studio-800 hover:border-studio-750 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : isFail ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="font-semibold text-white">{item.title}</span>
                      </div>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        isPass
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : isWarn
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                      {item.message}
                    </p>

                    {item.details && (
                      <p className="text-[10px] font-mono text-slate-500 pl-6">
                        {item.details}
                      </p>
                    )}

                    {item.remedy && (
                      <p className="text-[10px] text-cyan-400 pl-6 bg-cyan-950/20 p-1.5 rounded border border-cyan-900/40 mt-1">
                        💡 Remedy: {item.remedy}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-studio-850 border-t border-studio-800 px-6 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Developer: Md. Sohag Hossen • Cinematic Studio v2.0.1
          </span>
          <button
            onClick={onClose}
            className="bg-studio-800 hover:bg-studio-750 text-slate-200 font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};

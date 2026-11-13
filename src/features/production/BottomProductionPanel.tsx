import React, { useRef, useState } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ListOrdered, 
  Film, 
  Terminal,
  Zap
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStudioStore } from '../../stores/useStudioStore';

export const BottomProductionPanel: React.FC = () => {
  const { clips, selectedClipId, selectClip } = useStudioStore();
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'LOGS'>('TIMELINE');
  const [isSequential, setIsSequential] = useState(true);

  // Virtualized horizontal timeline container
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: clips.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // 140px width per clip card
    overscan: 5,
  });

  return (
    <div className="h-56 bg-studio-950 border-t border-studio-800 flex flex-col shrink-0 select-none z-10">
      {/* Production Header Bar */}
      <div className="h-9 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between text-xs">
        {/* Status Counters */}
        <div className="flex items-center space-x-4 font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-studio-cyan" />
            <span className="font-semibold text-slate-100">PRODUCTION QUEUE:</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>0 Pending</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <Zap className="w-3 h-3 text-studio-cyan" />
            <span>0 Running</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>{clips.filter(c => c.status === 'COMPLETED').length} Completed</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span>0 Failed</span>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Sequential Mode Toggle */}
          <button
            onClick={() => setIsSequential(!isSequential)}
            title="Sequential execution mode limits active generation to 1 profile to preserve RAM"
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              isSequential 
                ? 'bg-studio-850 text-studio-accent border-studio-accent/40' 
                : 'bg-studio-900 text-slate-500 border-studio-800'
            }`}
          >
            <ListOrdered className="w-3 h-3" />
            <span>Sequential Mode: {isSequential ? 'ON' : 'OFF'}</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-studio-850 p-0.5 rounded border border-studio-800 text-[11px] font-mono">
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 transition-colors ${
                activeTab === 'TIMELINE' ? 'bg-studio-750 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Timeline ({clips.length} Shots)</span>
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 transition-colors ${
                activeTab === 'LOGS' ? 'bg-studio-750 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Execution Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-studio-950 p-2 overflow-hidden flex flex-col">
        {activeTab === 'TIMELINE' ? (
          <div 
            ref={parentRef} 
            className="flex-1 overflow-x-auto overflow-y-hidden relative select-none"
            style={{ contain: 'strict' }}
          >
            {clips.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono italic">
                No clips in project. Click "Benchmark (360 Clips)" in the top navigation to load a test dataset.
              </div>
            ) : (
              <div
                style={{
                  width: `${virtualizer.getTotalSize()}px`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const clip = clips[virtualItem.index];
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={virtualItem.key}
                      onClick={() => selectClip(clip.id)}
                      className={`absolute top-0 h-full p-1 cursor-pointer transition-transform`}
                      style={{
                        left: `${virtualItem.start}px`,
                        width: `${virtualItem.size}px`,
                      }}
                    >
                      <div className={`h-full rounded border p-2 flex flex-col justify-between text-xs font-mono transition-colors ${
                        isSelected 
                          ? 'bg-studio-850 border-studio-accent text-slate-100 shadow-md shadow-studio-accent/10' 
                          : 'bg-studio-900 border-studio-800 text-slate-400 hover:border-studio-700 hover:text-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">Shot {clip.clip_number}</span>
                          <span className="text-[10px] text-slate-500">{clip.target_duration_seconds}s</span>
                        </div>

                        {/* Thumbnail / Proxy Placeholder */}
                        <div className="h-16 bg-studio-950/80 rounded border border-studio-850 flex flex-col items-center justify-center text-slate-600 text-[10px] overflow-hidden">
                          <Film className="w-4 h-4 text-slate-700 mb-0.5" />
                          <span className="truncate px-1">{clip.camera_framing}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="truncate text-slate-500">{clip.camera_movement}</span>
                          <span className={`px-1 rounded text-[9px] ${
                            clip.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-studio-800 text-slate-500'
                          }`}>
                            {clip.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-studio-900/80 rounded border border-studio-800 p-2 font-mono text-xs overflow-y-auto space-y-1 text-slate-300">
            <div className="text-slate-500">[11:45:00] Studio production engine initialized in Phase 1 Standby mode.</div>
            <div className="text-slate-500">[11:45:02] Local SQLite database mounted with WAL mode enabled (temp_store=FILE).</div>
            <div className="text-slate-500">[11:45:04] Task Queue Finite State Machine ready. Concurrency semaphore bound to 1.</div>
            <div className="text-studio-cyan">[11:45:10] Project workspace mounted with {clips.length} clip descriptors indexed.</div>
          </div>
        )}
      </div>
    </div>
  );
};

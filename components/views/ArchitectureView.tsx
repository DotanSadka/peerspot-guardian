
import React from 'react';
import { HistoryEntry, FraudRule } from '../../types';

interface ArchitectureViewProps {
  history: HistoryEntry[];
  rules: FraudRule[];
  followUpHistory: HistoryEntry[];
}

const ArchitectureView: React.FC<ArchitectureViewProps> = ({ history, rules, followUpHistory }) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
       <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl space-y-12">
          {/* Header */}
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-network-wired text-white text-3xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">System Architecture</h2>
              <p className="text-slate-200 text-sm font-bold uppercase tracking-widest">Real-time System Topology & Health</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Logs</p>
                <p className="text-3xl font-black text-white">{history.length}</p>
                <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
             </div>
             <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Rules</p>
                <p className="text-3xl font-black text-indigo-400">{rules.length}</p>
                <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-indigo-500 w-full rounded-full"></div>
                </div>
             </div>
             <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Pending</p>
                <p className="text-3xl font-black text-amber-400">{followUpHistory.length}</p>
                <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (followUpHistory.length / (history.length || 1)) * 100)}%` }}></div>
                </div>
             </div>
             <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                   <p className="text-sm font-bold text-slate-200">Operational</p>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1">v2.4.0 • IndexedDB Active</p>
             </div>
          </div>

          {/* Architecture Diagram */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-10 relative overflow-hidden">
             <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 text-center">Data Flow Pipeline</p>
             
             <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 relative z-10">
                {/* Stage 1: Ingestion */}
                <div className="flex flex-col items-center gap-4">
                   <div className="w-32 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-lg group hover:border-indigo-500 transition-colors">
                      <i className="fas fa-file-audio text-indigo-400 mb-2"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Raw Input</span>
                   </div>
                   <div className="text-[9px] font-mono text-slate-500">Audio + Context</div>
                </div>

                <i className="fas fa-arrow-right text-slate-700 text-xl hidden md:block"></i>
                <i className="fas fa-arrow-down text-slate-700 text-xl md:hidden"></i>

                {/* Stage 2: Profiling */}
                <div className="flex flex-col items-center gap-4">
                   <div className="w-32 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-lg group hover:border-emerald-500 transition-colors">
                      <i className="fas fa-id-card text-emerald-400 mb-2"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Profile AI</span>
                   </div>
                   <div className="text-[9px] font-mono text-slate-500">Gemini Flash</div>
                </div>

                <i className="fas fa-arrow-right text-slate-700 text-xl hidden md:block"></i>
                <i className="fas fa-arrow-down text-slate-700 text-xl md:hidden"></i>

                {/* Stage 3: Core Analysis */}
                <div className="flex flex-col items-center gap-4">
                   <div className="w-36 h-24 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      <i className="fas fa-brain text-white mb-2 text-xl animate-pulse"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Guardian Core</span>
                   </div>
                   <div className="text-[9px] font-mono text-indigo-400 font-bold">Gemini Pro 1.5</div>
                </div>

                <i className="fas fa-arrow-right text-slate-700 text-xl hidden md:block"></i>
                <i className="fas fa-arrow-down text-slate-700 text-xl md:hidden"></i>

                 {/* Stage 4: Storage */}
                 <div className="flex flex-col items-center gap-4">
                   <div className="w-32 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-lg hover:border-amber-500 transition-colors">
                      <i className="fas fa-database text-amber-400 mb-2"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Memory</span>
                   </div>
                   <div className="text-[9px] font-mono text-slate-500">IndexedDB Blob</div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-4"><i className="fas fa-server mr-2 text-indigo-500"></i> Backend Services</h3>
                 <ul className="space-y-3">
                    <li className="flex justify-between items-center text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                       <span>Primary Model</span>
                       <span className="text-emerald-400">gemini-3-pro-preview</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                       <span>Fast Model</span>
                       <span className="text-emerald-400">gemini-3-flash-preview</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-mono text-slate-400 pt-1">
                       <span>Storage Engine</span>
                       <span className="text-amber-400">Browser IndexedDB</span>
                    </li>
                 </ul>
              </div>

              <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-4"><i className="fas fa-file-contract mr-2 text-rose-500"></i> Rule Engine</h3>
                 <div className="flex flex-wrap gap-2">
                     {rules.slice(0, 8).map((r, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-900 rounded border border-slate-800 text-[9px] font-mono text-slate-400">{r.code}</span>
                     ))}
                     {rules.length > 8 && <span className="px-2 py-1 bg-slate-900 rounded border border-slate-800 text-[9px] font-mono text-slate-500">+{rules.length - 8} more</span>}
                 </div>
              </div>
          </div>
       </div>
    </div>
  );
};

export default ArchitectureView;

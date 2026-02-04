
import React from 'react';
import { HistoryEntry, HistoryStatus } from '../types';

interface HistoryItemProps {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  onToggleFavorite: (id: string) => void;
  onSetStatus: (id: string, status: HistoryStatus) => void;
  onDelete: (id: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ 
  entry, 
  onSelect, 
  onToggleFavorite, 
  onSetStatus, 
  onDelete 
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 transition-all hover:border-indigo-500/50 group flex flex-col gap-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className={`w-14 h-14 rounded-xl flex flex-shrink-0 items-center justify-center font-black text-xl shadow-inner ${entry.result.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {Math.round(entry.result.riskScore)}
          </div>
          <div className="overflow-hidden">
            <h4 onClick={() => onSelect(entry)} className="font-bold text-slate-200 group-hover:text-indigo-400 cursor-pointer truncate max-w-sm">{entry.fileName}</h4>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-200 font-black uppercase tracking-widest">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${entry.result.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                {entry.result.verdict}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onToggleFavorite(entry.id)} title="Favorite" className={`p-2 rounded-lg hover:bg-slate-800 ${entry.isFavorite ? 'text-amber-400' : 'text-slate-300'}`}>
            <i className={`${entry.isFavorite ? 'fas' : 'far'} fa-star`}></i>
          </button>
          <button onClick={() => onSetStatus(entry.id, entry.status === 'follow_up' ? 'normal' : 'follow_up')} title="Flag for Follow-up" className={`p-2 rounded-lg hover:bg-slate-800 ${entry.status === 'follow_up' ? 'text-indigo-400' : 'text-slate-300'}`}>
            <i className="fas fa-flag"></i>
          </button>
          <button onClick={() => onDelete(entry.id)} title="Delete" className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-300 hover:text-rose-500">
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      {/* Profile Snapshot in Logs */}
      {entry.profile && (
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Profile Context</p>
          <p className="text-[11px] font-mono text-slate-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">{entry.profile}</p>
        </div>
      )}
    </div>
  );
};

export default HistoryItem;

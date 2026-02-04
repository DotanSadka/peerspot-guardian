
import React from 'react';
import { HistoryEntry, HistoryStatus } from '../../types';
import HistoryItem from '../HistoryItem';

interface LogsViewProps {
  history: HistoryEntry[];
  historyFilter: string;
  setHistoryFilter: (text: string) => void;
  historySort: 'newest' | 'oldest';
  setHistorySort: (sort: 'newest' | 'oldest') => void;
  historyFavoritesOnly: boolean;
  setHistoryFavoritesOnly: (val: boolean) => void;
  
  // Item actions
  toggleFavorite: (id: string) => void;
  setEntryStatus: (id: string, status: HistoryStatus) => void;
  deleteEntry: (id: string) => void;
  onSelect: (entry: HistoryEntry) => void;
}

const LogsView: React.FC<LogsViewProps> = (props) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl min-h-[600px] flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Archives & Logs</h2>
          <div className="flex gap-4 w-full md:w-auto items-center">
            <button 
              onClick={() => props.setHistoryFavoritesOnly(!props.historyFavoritesOnly)}
              className={`h-10 px-4 rounded-xl border flex items-center gap-2 transition-all ${
                props.historyFavoritesOnly 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <i className={`${props.historyFavoritesOnly ? 'fas' : 'far'} fa-star text-xs`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest">Favorites</span>
            </button>
            <div className="relative flex-1 md:flex-none">
               <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-200 text-xs"></i>
               <input 
                placeholder="Search logs..." 
                value={props.historyFilter} 
                onChange={(e) => props.setHistoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 w-full"
               />
            </div>
            <select value={props.historySort} onChange={(e) => props.setHistorySort(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-200 outline-none">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {props.history.length > 0 ? props.history.map(entry => (
             <HistoryItem 
                key={entry.id} 
                entry={entry} 
                onSelect={props.onSelect} 
                onToggleFavorite={props.toggleFavorite}
                onSetStatus={props.setEntryStatus}
                onDelete={props.deleteEntry}
             />
          )) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-800 space-y-4">
               <i className="fas fa-folder-open text-5xl opacity-20"></i>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Log Archive Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsView;

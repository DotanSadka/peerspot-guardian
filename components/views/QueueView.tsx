
import React from 'react';
import { HistoryEntry, HistoryStatus } from '../../types';
import HistoryItem from '../HistoryItem';

interface QueueViewProps {
  history: HistoryEntry[];
  queueFilter: string;
  setQueueFilter: (text: string) => void;
  queueSort: 'newest' | 'oldest';
  setQueueSort: (sort: 'newest' | 'oldest') => void;
  
  // Item actions
  toggleFavorite: (id: string) => void;
  setEntryStatus: (id: string, status: HistoryStatus) => void;
  deleteEntry: (id: string) => void;
  onSelect: (entry: HistoryEntry) => void;
}

const QueueView: React.FC<QueueViewProps> = (props) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
      <div className="bg-indigo-950/10 rounded-[2.5rem] border border-indigo-500/20 p-12 shadow-2xl min-h-[600px] flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-flag text-white"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">Review Queue</h2>
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Flagged for manual follow-up</p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
               <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-200 text-xs"></i>
               <input 
                placeholder="Search queue..." 
                value={props.queueFilter} 
                onChange={(e) => props.setQueueFilter(e.target.value)}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 w-full placeholder:text-slate-500"
               />
            </div>
            <select value={props.queueSort} onChange={(e) => props.setQueueSort(e.target.value as any)} className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-200 outline-none">
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
            <div className="h-64 flex flex-col items-center justify-center text-indigo-500/20 space-y-4">
               <i className="fas fa-clipboard-check text-5xl"></i>
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Queue Cleared</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueView;

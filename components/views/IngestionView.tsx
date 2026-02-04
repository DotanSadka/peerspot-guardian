
import React from 'react';
import { ContextData } from '../../services/geminiService';

interface IngestionViewProps {
  rawInfoText: string;
  setRawInfoText: (text: string) => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  contextFile: File | null;
  setContextFile: (file: File | null) => void;
  contextData: ContextData | null;
  setContextData: (data: ContextData | null) => void;
  userProfile: string;
  setUserProfile: (text: string) => void;
  aiInstructions: string;
  setAiInstructions: (text: string) => void;
  handleExtractProfile: () => void;
  handleStartAnalysis: () => void;
  handleClearAll: () => void;
  isExtractingProfile: boolean;
  isAnalyzing: boolean;
  dragActive: { audio: boolean; context: boolean };
  handleDrag: (e: React.DragEvent, type: 'audio' | 'context', active: boolean) => void;
  handleDrop: (e: React.DragEvent, type: 'audio' | 'context') => void;
  audioInputRef: React.RefObject<HTMLInputElement>;
  contextInputRef: React.RefObject<HTMLInputElement>;
  handleAudioFile: (file: File) => void;
  handleContextFile: (file: File) => void;
}

const IngestionView: React.FC<IngestionViewProps> = (props) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-10 space-y-10 shadow-2xl relative">
        
        {/* Clear All Button */}
        <div className="absolute top-10 right-10 z-10">
           <button 
             onClick={props.handleClearAll}
             className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2"
           >
             <i className="fas fa-trash"></i> Clear All
           </button>
        </div>

        {/* Media & Context Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Audio File</label>
            <div 
              onClick={() => props.audioInputRef.current?.click()}
              onDragOver={(e) => props.handleDrag(e, 'audio', true)}
              onDragLeave={(e) => props.handleDrag(e, 'audio', false)}
              onDrop={(e) => props.handleDrop(e, 'audio')}
              className={`relative h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group shadow-inner ${props.dragActive.audio ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-indigo-600/50'}`}
            >
              {props.audioFile ? (
                <div className="text-center p-4">
                  <i className={`fas ${props.audioFile.type.startsWith('video/') ? 'fa-video' : 'fa-music'} text-3xl text-indigo-500 mb-1`}></i>
                  <p className="text-[10px] font-black text-slate-200 line-clamp-1 px-4 uppercase tracking-tighter">{props.audioFile.name}</p>
                  <button onClick={(e) => { e.stopPropagation(); props.setAudioFile(null); }} className="mt-1 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400">Clear</button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <i className="fas fa-plus text-slate-200 text-sm"></i>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-200">Drag Audio Here</p>
                </>
              )}
              <input type="file" ref={props.audioInputRef} onChange={(e) => e.target.files && props.handleAudioFile(e.target.files[0])} className="hidden" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Context (CSV/Text/Screenshot)</label>
            <div 
              onClick={() => props.contextInputRef.current?.click()}
              onDragOver={(e) => props.handleDrag(e, 'context', true)}
              onDragLeave={(e) => props.handleDrag(e, 'context', false)}
              onDrop={(e) => props.handleDrop(e, 'context')}
              className={`relative h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group shadow-inner ${props.dragActive.context ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-emerald-600/50'}`}
            >
              {props.contextFile ? (
                <div className="text-center p-4">
                  <i className={`fas ${props.contextData?.type === 'image' ? 'fa-image' : 'fa-file-lines'} text-3xl text-emerald-500 mb-1`}></i>
                  <p className="text-[10px] font-black text-slate-200 line-clamp-1 px-4 uppercase tracking-tighter">{props.contextFile.name}</p>
                  <button onClick={(e) => { e.stopPropagation(); props.setContextFile(null); props.setContextData(null); }} className="mt-1 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400">Remove</button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <i className="fas fa-file-import text-slate-200 text-sm"></i>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-200 text-center leading-tight">Drop CSV, Text<br/>or Screenshot</p>
                </>
              )}
              <input type="file" ref={props.contextInputRef} onChange={(e) => e.target.files && props.handleContextFile(e.target.files[0])} className="hidden" accept=".csv,.txt,image/png,image/jpeg,image/webp" />
            </div>

            <div className="flex justify-center -mt-2 relative z-10">
               <button 
                 onClick={props.handleExtractProfile}
                 disabled={props.isExtractingProfile || !props.contextData}
                 className="w-8 h-8 rounded-full bg-slate-800 hover:bg-indigo-500 border border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-white transition-all shadow-lg flex items-center justify-center disabled:opacity-0 disabled:scale-75 cursor-pointer"
                 title="Generate Profile from Context File"
               >
                 <i className={`fas ${props.isExtractingProfile ? 'fa-spinner fa-spin' : 'fa-arrow-down'} text-xs`}></i>
               </button>
            </div>

          </div>
        </div>

        {/* Profile Extraction Row */}
        <div className="space-y-4">
           <div className="flex justify-between items-end ml-4">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">Target Profile Builder</label>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
             {/* RAW Info Column */}
             <div className="space-y-2 w-full self-stretch flex flex-col">
               <p className="text-[10px] font-bold text-slate-200 italic ml-2">RAW Info:</p>
               <textarea 
                 value={props.rawInfoText}
                 onChange={(e) => props.setRawInfoText(e.target.value)}
                 className="w-full h-56 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 outline-none shadow-inner resize-none leading-relaxed focus:ring-1 focus:ring-indigo-500/50"
                 placeholder="Paste unstructured notes, chat logs, or other raw text here..."
               />
             </div>

             {/* Center Arrow for Combined Extract */}
             <div className="flex flex-col items-center justify-center gap-2 py-4">
                <button 
                  onClick={props.handleExtractProfile}
                  disabled={props.isExtractingProfile || (!props.contextData && !props.rawInfoText)}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100 group border border-white/10"
                  title="Extract Profile from RAW Info & Context"
                >
                  <i className={`fas ${props.isExtractingProfile ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-white text-lg`}></i>
                </button>
             </div>

             {/* Result Column */}
             <div className="space-y-2 w-full self-stretch flex flex-col relative">
                <p className="text-[10px] font-bold text-slate-200 italic ml-2">Profile:</p>
                <textarea 
                  value={props.userProfile} 
                  onChange={(e) => props.setUserProfile(e.target.value)} 
                  className="w-full h-56 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm font-mono text-indigo-300 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner leading-relaxed" 
                  placeholder="Extracted data will appear here..."
                />
             </div>
           </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Directed Focus Instructions</label>
          <textarea 
            value={props.aiInstructions} 
            onChange={(e) => props.setAiInstructions(e.target.value)} 
            placeholder="E.g., 'Verify specifically for gift card fraud patterns'" 
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500/50 outline-none shadow-inner resize-none" 
          />
        </div>

        <div className="pt-8 border-t border-slate-800 flex justify-end">
          <button onClick={props.handleStartAnalysis} disabled={!props.audioFile || props.isAnalyzing} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-5 px-16 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all flex items-center gap-4 disabled:opacity-50 tracking-[0.2em] uppercase text-xs">
            {props.isAnalyzing ? <><i className="fas fa-dna fa-spin"></i> Analyzing</> : <>Run Multimodal Audit <i className="fas fa-bolt"></i></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngestionView;


import React from 'react';
import { FraudPacket, FraudRule } from '../../types';
import RiskMeter from '../RiskMeter';

interface VerdictViewProps {
  result: FraudPacket;
  analysisContext: { fileName: string; profile: string } | null;
  rules: FraudRule[];
  handleDeleteSignal: (index: number) => void;
  resetAudit: () => void;
}

const VerdictView: React.FC<VerdictViewProps> = ({ 
  result, 
  analysisContext, 
  rules, 
  handleDeleteSignal, 
  resetAudit 
}) => {
  return (
    <div className="animate-in zoom-in-95 fade-in duration-700 space-y-12 pb-32">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <RiskMeter score={result.riskScore} verdict={result.verdict} />
        <div className="md:col-span-2 bg-slate-900/40 rounded-[3rem] border border-slate-800/50 p-12 flex flex-col justify-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <i className="fas fa-shield-virus text-[10rem]"></i>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
            <div className="flex flex-col gap-1">
               <h2 className="text-3xl font-black uppercase tracking-tight text-white">Audit Verdict</h2>
               <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">{analysisContext?.fileName || 'Unknown Source'}</p>
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-[2rem] p-8 mb-10 relative shadow-inner">
            <i className="fas fa-quote-left absolute -top-4 -left-2 text-slate-800 text-5xl opacity-40"></i>
            <p className="text-lg leading-relaxed text-slate-200 italic font-medium">{result.summary}</p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">
              <span>Neural confidence level</span>
              <span className="text-indigo-400 font-bold">{Math.round(result.confidenceScore)}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-1 border border-slate-900">
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.4)]" style={{ width: `${result.confidenceScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="px-12 py-8 bg-slate-900/80 border-b border-slate-800/50 flex justify-between items-center">
           <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-200 flex items-center gap-4">
             <i className="fas fa-bolt-lightning text-amber-500"></i> Signals Identified
           </h3>
           <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-500/30 uppercase tracking-widest">{result.signaledReasons.length} Flags Detected</span>
        </div>
        <div className="divide-y divide-slate-800/50">
          {result.signaledReasons.map((signal, idx) => {
            const rule = rules.find(r => r.code === signal.ruleCode);
            const score = rule ? rule.weight : 0;
            const isBeneficial = score < 0; // Negative score is beneficial (good)
            
            return (
            <div key={idx} className={`p-10 flex gap-10 hover:bg-slate-900/60 transition-all group border-l-4 ${isBeneficial ? 'border-emerald-500 hover:border-emerald-400' : 'border-transparent hover:border-indigo-500'}`}>
               <div className={`w-16 h-16 rounded-[1.2rem] flex-shrink-0 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110 shadow-2xl border ${
                 isBeneficial 
                 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                 : (signal.confidence > 80 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20')
               }`}>
                 {score > 0 ? '+' : ''}{score}
               </div>
               <div className="space-y-4 flex-1">
                 <div className="flex justify-between items-start">
                   <h4 className={`font-black tracking-tight text-xl transition-colors uppercase ${isBeneficial ? 'text-emerald-400' : 'text-slate-100 group-hover:text-indigo-400'}`}>
                      {signal.ruleCode}
                   </h4>
                   <div className="flex items-center gap-4">
                     {signal.timestamp && <span className="text-[10px] font-black bg-slate-950 px-3 py-1.5 rounded-xl text-slate-200 border border-slate-800 uppercase tracking-widest">{signal.timestamp}</span>}
                     <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border ${signal.confidence > 80 ? 'text-rose-500 border-rose-500/20' : 'text-amber-500 border-amber-500/20'}`}>{Math.round(signal.confidence)}% Precision</span>
                     <button 
                       onClick={() => handleDeleteSignal(idx)}
                       className="w-8 h-8 rounded-full bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-colors border border-slate-800 hover:border-rose-500/30"
                       title="Remove this flag"
                     >
                       <i className="fas fa-trash-alt text-[10px]"></i>
                     </button>
                   </div>
                 </div>
                 <p className="text-slate-200 text-md leading-relaxed font-medium">{signal.reasoning}</p>
               </div>
            </div>
          )})}
          {result.signaledReasons.length === 0 && <div className="p-32 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-sm italic opacity-20">Clear Communication Channel Detected</div>}
        </div>
      </div>

      <div className="flex justify-center gap-8 pt-4">
         <button 
          onClick={resetAudit}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-black py-5 px-12 rounded-[1.5rem] border border-slate-800 transition-all flex items-center gap-4 shadow-xl uppercase text-xs tracking-widest"
         >
           <i className="fas fa-rotate-left"></i> Reset Audit
         </button>
      </div>

      {/* Read-Only Profile Context */}
      {analysisContext?.profile && (
         <div className="max-w-4xl mx-auto w-full space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Full Profile Snapshot</label>
            <textarea 
              readOnly
              value={analysisContext.profile}
              className="w-full h-48 bg-slate-950/50 border border-slate-800/50 rounded-[2rem] p-8 text-sm font-mono text-indigo-300 outline-none shadow-inner leading-relaxed resize-none cursor-text" 
            />
         </div>
      )}

    </div>
  );
};

export default VerdictView;

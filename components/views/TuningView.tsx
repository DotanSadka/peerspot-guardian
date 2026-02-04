
import React from 'react';
import { FraudRule } from '../../types';

interface TuningViewProps {
  naturalLanguageInput: string;
  setNaturalLanguageInput: (text: string) => void;
  handleNLConvertToLogic: () => void;
  isSyncingRules: boolean;
  ruleDefinitionText: string;
  setRuleDefinitionText: (text: string) => void;
  saveRulesAsDefault: () => void;
  restoreRulesDefault: () => void;
  handleSyncTextToTable: () => void;
  rules: FraudRule[];
  updateRuleValue: (index: number, field: keyof FraudRule, value: any) => void;
  cyclePriority: (index: number) => void;
}

const TuningView: React.FC<TuningViewProps> = (props) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl space-y-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight ml-4">Signal Calibration</h2>
          <div className="relative">
            <textarea 
              value={props.naturalLanguageInput} 
              onChange={(e) => props.setNaturalLanguageInput(e.target.value)} 
              placeholder="Describe rules in plain language..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-[2rem] p-8 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none shadow-inner resize-none"
            />
            <button onClick={props.handleNLConvertToLogic} disabled={props.isSyncingRules || !props.naturalLanguageInput.trim()} className="absolute bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
              <i className="fas fa-magic"></i> Calibrate Signal
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 ml-4">Structural Logic Matrix</label>
          <textarea value={props.ruleDefinitionText} onChange={(e) => props.setRuleDefinitionText(e.target.value)} className="w-full h-96 bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 text-sm font-mono text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner" />
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center ml-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-200">Interactive Tuner</h2>
            <div className="flex gap-4">
               <button onClick={props.saveRulesAsDefault} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
               <button onClick={props.restoreRulesDefault} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
               <button onClick={props.handleSyncTextToTable} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Update Table</button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-800/50 shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-[10px] font-black uppercase tracking-[0.3em] text-slate-200 border-b border-slate-800">
                  <th className="px-8 py-6 w-48">Code</th>
                  <th className="px-8 py-6">Description</th>
                  <th className="px-8 py-6 text-center w-40">Impact</th>
                  <th className="px-8 py-6 text-center w-32">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-950/20">
                {props.rules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-lg bg-slate-900 text-slate-200 text-[10px] font-black uppercase tracking-widest">{rule.code.split('-')[0]}</span>
                        <input 
                          value={rule.code.split('-').slice(1).join('-')}
                          onChange={(e) => props.updateRuleValue(idx, 'code', `${rule.code.split('-')[0]}-${e.target.value}`)}
                          className="bg-transparent border-b border-transparent hover:border-indigo-500/30 focus:border-indigo-500 outline-none w-32 font-mono text-indigo-400 font-bold text-xs"
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <input value={rule.description} onChange={(e) => props.updateRuleValue(idx, 'description', e.target.value)} className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full text-xs font-bold text-slate-200" />
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => props.updateRuleValue(idx, 'weight', rule.weight - 5)} className="w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-500/20 text-slate-200 hover:text-rose-500 flex items-center justify-center transition-all">
                          <i className="fas fa-minus text-[10px]"></i>
                        </button>
                        <span className={`w-10 text-center font-mono font-black text-sm ${
                          rule.weight > 0 ? 'text-rose-400' : 
                          rule.weight < 0 ? 'text-emerald-400' : 'text-indigo-400'
                        }`}>
                          {rule.weight > 0 ? '+' : ''}{rule.weight}
                        </span>
                        <button onClick={() => props.updateRuleValue(idx, 'weight', rule.weight + 5)} className="w-8 h-8 rounded-full bg-slate-900 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-500 flex items-center justify-center transition-all">
                          <i className="fas fa-plus text-[10px]"></i>
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <button onClick={() => props.cyclePriority(idx)} className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all border ${
                          rule.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          rule.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                       }`}>
                         {rule.priority}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TuningView;

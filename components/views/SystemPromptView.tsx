
import React from 'react';
import { SYSTEM_INSTRUCTION, DEFAULT_PROFILE_BUILDER_PROMPT } from '../../constants';

interface SystemPromptViewProps {
  systemPrompt: string;
  setSystemPrompt: (text: string) => void;
  saveAsDefault: (key: string, value: string) => void;
  restoreDefaults: (key: string, fallback: string, setter: (val: string) => void) => void;
  profileBuilderPrompt: string;
  setProfileBuilderPrompt: (text: string) => void;
}

const SystemPromptView: React.FC<SystemPromptViewProps> = (props) => {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 p-12 shadow-2xl space-y-12">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Core System Prompt</h2>
            <p className="text-slate-200 text-sm mt-2 font-medium">Define the core intelligence layer governing the Guardian AI audit logic.</p>
          </div>
          <textarea 
            value={props.systemPrompt}
            onChange={(e) => props.setSystemPrompt(e.target.value)}
            className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-[2rem] p-10 text-sm font-mono text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none leading-relaxed shadow-inner"
          />
          <div className="flex justify-end gap-4">
            <button onClick={() => props.saveAsDefault('guardian_system_prompt', props.systemPrompt)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
            <button onClick={() => props.restoreDefaults('guardian_system_prompt', SYSTEM_INSTRUCTION, props.setSystemPrompt)} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
          </div>
        </div>

        <div className="space-y-6 border-t border-slate-800 pt-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Target Profile Builder</h2>
            <p className="text-slate-200 text-sm mt-2 font-medium">Instruction set for converting messy metadata into standardized profile fields.</p>
          </div>
          <textarea 
            value={props.profileBuilderPrompt}
            onChange={(e) => props.setProfileBuilderPrompt(e.target.value)}
            className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-[2rem] p-10 text-sm font-mono text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none leading-relaxed shadow-inner"
          />
          <div className="flex justify-end gap-4">
            <button onClick={() => props.saveAsDefault('guardian_profile_builder_prompt', props.profileBuilderPrompt)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Make as New Default</button>
            <button onClick={() => props.restoreDefaults('guardian_profile_builder_prompt', DEFAULT_PROFILE_BUILDER_PROMPT, props.setProfileBuilderPrompt)} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Restore Defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptView;


import React from 'react';

const AnalysisView: React.FC = () => {
  return (
    <div className="h-[700px] flex flex-col items-center justify-center text-center space-y-12">
      <div className="relative scale-150">
        <div className="w-24 h-24 border-[6px] border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-fingerprint text-indigo-500 text-2xl animate-pulse"></i></div>
      </div>
      <div className="space-y-4">
        <h3 className="text-3xl font-black uppercase tracking-tighter text-white">SYSTEM ENGAGEMENT ACTIVE</h3>
        <p className="text-slate-200 text-xs font-bold uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Multimodal analysis in progress. Comparing voice timbre and profile discrepancies...</p>
      </div>
    </div>
  );
};

export default AnalysisView;

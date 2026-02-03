
import React from 'react';

interface RiskMeterProps {
  score: number;
  verdict: 'PASS' | 'INVESTIGATE' | 'BLOCK';
}

const RiskMeter: React.FC<RiskMeterProps> = ({ score, verdict }) => {
  const getColor = () => {
    if (verdict === 'PASS') return 'text-emerald-400';
    if (verdict === 'INVESTIGATE') return 'text-amber-400';
    return 'text-rose-500';
  };

  const getBgColor = () => {
    if (verdict === 'PASS') return 'bg-emerald-500/20';
    if (verdict === 'INVESTIGATE') return 'bg-amber-500/20';
    return 'bg-rose-500/20';
  };

  // SVG parameters
  const size = 200;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-3xl border border-slate-700 shadow-xl overflow-visible">
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="transform -rotate-90 overflow-visible"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-700/50"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getColor()} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-black ${getColor()} tracking-tighter`}>{Math.round(score)}</span>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Risk Unit</span>
        </div>
      </div>
      <div className={`mt-8 px-8 py-2 rounded-full text-xs font-black uppercase tracking-widest ${getColor()} ${getBgColor()} border border-current/20 shadow-lg`}>
        {verdict}
      </div>
    </div>
  );
};

export default RiskMeter;

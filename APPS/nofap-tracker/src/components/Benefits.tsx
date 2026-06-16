import React from 'react';
import { 
  CheckCircle, 
  Lock, 
  Sparkles, 
  Brain, 
  Heart, 
  Users 
} from 'lucide-react';
import { BENEFITS_TIMELINE } from '../data';
import type { Benefit } from '../types';

interface BenefitsProps {
  streakDays: number;
}

export const Benefits: React.FC<BenefitsProps> = ({ streakDays }) => {
  const getCategoryIcon = (category: Benefit['category']) => {
    switch (category) {
      case 'physical':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'mental':
        return <Brain className="w-4 h-4 text-indigo-400" />;
      case 'social':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'spiritual':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: Benefit['category']) => {
    switch (category) {
      case 'physical': return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'mental': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'social': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'spiritual': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default: return 'bg-slate-800 text-slate-350 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Timeline of Benefits</h1>
        <p className="text-sm text-slate-400 mt-1">Science-backed physical and neural adaptations that occur during recovery.</p>
      </div>

      {/* Main Timeline layout */}
      <div className="relative border-l border-slate-800 ml-4 pl-6 md:pl-8 space-y-8 py-2">
        {BENEFITS_TIMELINE.map((benefit) => {
          const isActive = streakDays >= benefit.dayStart;
          
          // Calculate progress percentage for locked benefits
          const progressPercent = isActive 
            ? 100 
            : Math.min(100, Math.max(0, (streakDays / benefit.dayStart) * 100));

          return (
            <div key={benefit.id} className="relative">
              {/* Timeline Indicator Dot */}
              <span className={`absolute -left-[37px] md:-left-[45px] top-1.5 flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-500 ${
                isActive 
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {isActive ? (
                  <CheckCircle className="w-4 h-4 fill-indigo-500/10 text-indigo-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </span>

              {/* Benefit Card */}
              <div className={`glass-card p-5 rounded-2xl border transition-all duration-300 ${
                isActive 
                  ? 'border-indigo-500/15 bg-indigo-950/5 shadow-md shadow-indigo-500/2' 
                  : 'border-slate-800/60 opacity-60'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold m-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {benefit.title}
                    </h3>
                    
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getCategoryColor(benefit.category)}`}>
                      {benefit.category}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-slate-450 shrink-0">
                    {benefit.dayStart >= 1 
                      ? `Day ${benefit.dayStart}` 
                      : `${benefit.dayStart * 24} Hours`}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {benefit.description}
                </p>

                {/* Progress bar for locked benefit */}
                {!isActive && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-400">{progressPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-700 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="mt-3.5 flex items-center gap-1.5 text-[10px] text-indigo-400 font-bold">
                    {getCategoryIcon(benefit.category)}
                    <span>Active Benefit unlocked</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

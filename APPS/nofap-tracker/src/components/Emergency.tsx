import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Wind, 
  Play, 
  Square, 
  Zap, 
  Activity
} from 'lucide-react';

export const Emergency: React.FC = () => {
  const [breathing, setBreathing] = useState(false);
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [timeLeft, setTimeLeft] = useState(4);

  // Box Breathing cycle: Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Hold (4s)
  useEffect(() => {
    if (!breathing) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Change state
          setBreathState((state) => {
            switch (state) {
              case 'Inhale':
                return 'Hold';
              case 'Hold':
                return 'Exhale';
              case 'Exhale':
                return 'Rest';
              case 'Rest':
                return 'Inhale';
            }
          });
          return 4; // Reset to 4 seconds for next box step
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [breathing, breathState]);

  const handleToggleBreathing = () => {
    if (breathing) {
      setBreathing(false);
      setBreathState('Inhale');
      setTimeLeft(4);
    } else {
      setBreathing(true);
      setBreathState('Inhale');
      setTimeLeft(4);
    }
  };

  const getBreathInstructions = () => {
    switch (breathState) {
      case 'Inhale': return 'Fill your lungs slowly with fresh air...';
      case 'Hold': return 'Suspend your breath. Feel the stillness.';
      case 'Exhale': return 'Release all tension and stress...';
      case 'Rest': return 'Pause. Calm your nervous system.';
    }
  };

  const getBreathCircleScaleClass = () => {
    if (!breathing) return 'scale-90 bg-indigo-500/10 border-indigo-500/20';
    switch (breathState) {
      case 'Inhale': return 'scale-125 bg-indigo-500/30 border-indigo-500/40 shadow-[0_0_40px_10px_rgba(99,102,241,0.4)] transition-all duration-[4000ms] ease-in-out';
      case 'Hold': return 'scale-125 bg-purple-500/30 border-purple-500/40 shadow-[0_0_40px_10px_rgba(168,85,247,0.4)] transition-all duration-[4000ms]';
      case 'Exhale': return 'scale-90 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_20px_2px_rgba(99,102,241,0.1)] transition-all duration-[4000ms] ease-in-out';
      case 'Rest': return 'scale-90 bg-slate-800/40 border-slate-700/50 shadow-none transition-all duration-[4000ms]';
    }
  };

  const urgeSurfTips = [
    {
      title: "Shift Your Environment Immediately",
      description: "Get up, leave your current room, and head to a shared living space or step outdoors. Physical displacement breaks the cognitive loop."
    },
    {
      title: "The 2-Minute Cold Shower",
      description: "Cold water triggers a mammalian dive reflex, immediately shifting blood circulation and down-regulating intense dopamine cravings."
    },
    {
      title: "High-Intensity Physical Shock",
      description: "Drop and perform 20 pushups, 30 air squats, or jumping jacks. Channeling physical energy redirect stress hormones away from triggers."
    },
    {
      title: "Urge Surfing Mindfulness",
      description: "Acknowledge the urge. Do not fight it; simply observe it as a wave. Recognize that urges peak within 15 minutes and will naturally dissipate."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white m-0 flex items-center gap-2.5">
          <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          Urge Panic Station
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          An urge is a temporary neurological storm. Breathe, refocus, and ride the wave out.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Box Breathing Tool */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl flex flex-col items-center justify-between min-h-[420px] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
          
          <div className="w-full text-center relative z-10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
              <Wind className="w-4 h-4 text-indigo-400" />
              Interactive Box Breathing
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Settle your heart rate and re-center your cognitive control center.
            </p>
          </div>

          {/* Breathing Circle */}
          <div className="my-8 relative z-10 flex items-center justify-center w-52 h-52">
            <div className={`w-40 h-40 rounded-full border-2 flex flex-col items-center justify-center text-center transition-all select-none ${getBreathCircleScaleClass()}`}>
              {breathing ? (
                <>
                  <span className="text-xl font-black text-white tracking-wide uppercase transition-all">
                    {breathState}
                  </span>
                  <span className="text-3xl font-mono font-bold text-white mt-1">
                    {timeLeft}s
                  </span>
                </>
              ) : (
                <Wind className="w-12 h-12 text-indigo-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Controller & Guide instructions */}
          <div className="w-full text-center relative z-10 space-y-4">
            <p className="text-xs font-semibold text-slate-350 italic min-h-[1.5rem]">
              {breathing ? getBreathInstructions() : 'Ready to ground your mind? Click start.'}
            </p>

            <button
              onClick={handleToggleBreathing}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md select-none cursor-pointer ${
                breathing 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/10' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {breathing ? (
                <>
                  <Square className="w-4 h-4 fill-white" />
                  Stop Breathing
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Begin Grounding
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Quick Action Tips */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Urge Surfing Playbook
            </h3>

            <div className="space-y-4">
              {urgeSurfTips.map((tip, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] w-5 h-5 flex items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-200">{tip.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-450 leading-relaxed pl-7">
                    {tip.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-500">
            <Activity className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Neurologically, a craving is only a recommendation. You hold full veto power.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

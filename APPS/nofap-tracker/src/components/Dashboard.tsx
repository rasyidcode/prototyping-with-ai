import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Award, 
  TrendingUp, 
  RefreshCcw, 
  Calendar, 
  Plus, 
  Activity, 
  Heart,
  HelpCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { MOTIVATIONAL_QUOTES } from '../data';
import type { Relapse, UrgeLog } from '../types';

interface DashboardProps {
  startDate: string;
  relapses: Relapse[];
  urges: UrgeLog[];
  onAddUrge: (intensity: number, notes: string) => void;
  onOpenRelapseModal: () => void;
  onOpenStartPickerModal: () => void;
  bestStreakDays: number;
}

const MILESTONES_DAYS = [1, 3, 7, 14, 30, 60, 90, 120, 180, 365];

export function getMilestoneInfo(streakMs: number) {
  const streakDays = streakMs / (1000 * 60 * 60 * 24);
  
  let currentMilestone = 0;
  let nextMilestone = MILESTONES_DAYS[0];
  
  for (let i = 0; i < MILESTONES_DAYS.length; i++) {
    if (streakDays >= MILESTONES_DAYS[i]) {
      currentMilestone = MILESTONES_DAYS[i];
      nextMilestone = MILESTONES_DAYS[i + 1] || MILESTONES_DAYS[i] * 2;
    } else {
      nextMilestone = MILESTONES_DAYS[i];
      currentMilestone = i === 0 ? 0 : MILESTONES_DAYS[i - 1];
      break;
    }
  }
  
  const total = nextMilestone - currentMilestone;
  const progress = streakDays - currentMilestone;
  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));
  
  return {
    currentMilestone,
    nextMilestone,
    percentage,
    daysRemaining: Math.max(0, nextMilestone - streakDays)
  };
}

export const Dashboard: React.FC<DashboardProps> = ({
  startDate,
  relapses,
  urges,
  onAddUrge,
  onOpenRelapseModal,
  onOpenStartPickerModal,
  bestStreakDays
}) => {
  // Timer State
  const [timeElapsed, setTimeElapsed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ms: 0
  });

  // Quote State
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Quick Urge Logger State
  const [urgeIntensity, setUrgeIntensity] = useState(3);
  const [urgeNotes, setUrgeNotes] = useState('');
  const [showUrgeSuccess, setShowUrgeSuccess] = useState(false);

  // Pick random quote on load
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setQuoteIndex(randomIndex);
  }, []);

  // Update timer in real-time
  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeElapsed({ days, hours, minutes, seconds, ms: diff });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  const currentStreakDays = timeElapsed.ms / (1000 * 60 * 60 * 24);
  const milestone = getMilestoneInfo(timeElapsed.ms);

  // Statistics calculation
  const totalCleanDays = currentStreakDays + relapses.reduce((acc, curr) => acc + curr.streakDurationDays, 0);
  const totalTrackedDays = (new Date().getTime() - (relapses.length > 0 ? new Date(relapses[relapses.length - 1].date).getTime() : new Date(startDate).getTime())) / (1000 * 60 * 60 * 24) + relapses.reduce((acc, curr) => acc + curr.streakDurationDays, 0);
  
  // Calculate Success Rate: Clean Days / Total Tracked Days
  const successRate = totalTrackedDays > 0 ? Math.min(100, Math.max(0, (totalCleanDays / totalTrackedDays) * 100)) : 100;

  const handleNewQuote = () => {
    let nextIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    while (nextIndex === quoteIndex && MOTIVATIONAL_QUOTES.length > 1) {
      nextIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    }
    setQuoteIndex(nextIndex);
  };

  const handleUrgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUrge(urgeIntensity, urgeNotes);
    setUrgeNotes('');
    setShowUrgeSuccess(true);
    setTimeout(() => setShowUrgeSuccess(false), 3000);
  };

  const radius = 95;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (milestone.percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Sovereign Control</h1>
          <p className="text-sm text-slate-400 mt-1">One choice at a time. Establish your dominance over instincts.</p>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onOpenStartPickerModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 hover:text-white transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            Adjust Start
          </button>
          
          <button
            onClick={onOpenRelapseModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-200 hover:text-red-100 transition-all cursor-pointer animate-pulse-ring"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset / Relapse
          </button>
        </div>
      </div>

      {/* Main Counter & Quote Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Circular Progress Streak Counter */}
        <div className="lg:col-span-7 glass-panel p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative flex items-center justify-center w-64 h-64 select-none">
            {/* SVG Progress Ring */}
            <svg className="w-60 h-60 transform -rotate-90">
              <defs>
                <linearGradient id="gradientColor" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#6366f1" floodOpacity="0.4" />
                </filter>
              </defs>
              {/* Background ring */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                className="stroke-slate-800/80"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress ring */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                className="stroke-[url(#gradientColor)] transition-all duration-1000 ease-out"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                filter="url(#glow)"
              />
            </svg>
            
            {/* Counter display in center of ring */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Streak</span>
              <span className="text-6xl font-black tracking-tighter text-white mt-1 select-all">
                {timeElapsed.days}
              </span>
              <span className="text-sm font-semibold text-slate-300">Days</span>
              <span className="text-[10px] mt-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-indigo-400" />
                {milestone.percentage.toFixed(0)}% to Day {milestone.nextMilestone}
              </span>
            </div>
          </div>

          {/* Sub-counters (H, M, S) */}
          <div className="grid grid-cols-3 gap-6 w-full max-w-sm mt-4 text-center">
            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
              <div className="text-xl font-bold text-white font-mono">{String(timeElapsed.hours).padStart(2, '0')}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Hours</div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
              <div className="text-xl font-bold text-white font-mono">{String(timeElapsed.minutes).padStart(2, '0')}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Minutes</div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
              <div className="text-xl font-bold text-white font-mono">{String(timeElapsed.seconds).padStart(2, '0')}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Seconds</div>
            </div>
          </div>
        </div>

        {/* Motivational Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-500"></div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Daily Fortitude
                </span>
                <button
                  onClick={handleNewQuote}
                  title="Next Quote"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <blockquote className="text-lg font-medium text-slate-200 leading-relaxed italic pr-2">
                "{MOTIVATIONAL_QUOTES[quoteIndex].text}"
              </blockquote>
            </div>

            <cite className="text-xs font-semibold text-slate-400 not-italic block mt-4 border-l-2 border-purple-500 pl-3">
              — {MOTIVATIONAL_QUOTES[quoteIndex].author}
            </cite>
          </div>

          {/* Next Milestone Card */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Next Breakthrough</h3>
                <p className="text-[10px] text-slate-400">Day {milestone.nextMilestone} milestone</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Progress</span>
                <span className="text-indigo-400 font-semibold">{milestone.percentage.toFixed(0)}%</span>
              </div>
              
              {/* Mini progress bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${milestone.percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Day {milestone.currentMilestone}</span>
                <span className="text-slate-300">
                  {milestone.daysRemaining.toFixed(1)} days remaining
                </span>
                <span>Day {milestone.nextMilestone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Streak</div>
          <div className="text-2xl font-black text-white mt-1.5 flex items-baseline gap-1">
            {bestStreakDays.toFixed(1)}
            <span className="text-xs font-medium text-slate-400">days</span>
          </div>
          <p className="text-[10px] text-indigo-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> High Score
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clean Days</div>
          <div className="text-2xl font-black text-white mt-1.5 flex items-baseline gap-1">
            {totalCleanDays.toFixed(1)}
            <span className="text-xs font-medium text-slate-400">days</span>
          </div>
          <p className="text-[10px] text-green-400 font-semibold mt-1 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-green-400/20" /> Life Reclaimed
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Relapses</div>
          <div className="text-2xl font-black text-white mt-1.5">
            {relapses.length}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            Logs of experience
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</div>
          <div className="text-2xl font-black text-white mt-1.5">
            {successRate.toFixed(0)}%
          </div>
          <p className="text-[10px] text-purple-400 font-semibold mt-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Efficiency
          </p>
        </div>
      </div>

      {/* Urge logger & Info Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Quick urge logger */}
        <div className="md:col-span-6 glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Log an Urge</h3>
          </div>

          <form onSubmit={handleUrgeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Intensity: {urgeIntensity} / 5
              </label>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold">Mild</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={urgeIntensity}
                  onChange={(e) => setUrgeIntensity(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-xs text-red-500 font-semibold">Severe</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Mental State / What triggered it?
              </label>
              <textarea
                value={urgeNotes}
                onChange={(e) => setUrgeNotes(e.target.value)}
                placeholder="E.g., felt bored while working in my room late at night. Surfed the urge..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all"
              ></textarea>
            </div>

            <div className="flex items-center justify-between">
              {showUrgeSuccess ? (
                <span className="text-xs text-green-400 font-semibold animate-pulse">
                  Urge logged successfully. Stay strong!
                </span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Record Urge
              </button>
            </div>
          </form>
        </div>

        {/* Urge tracker summary info */}
        <div className="md:col-span-6 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Urge Intelligence</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Tracking urges allows you to see triggers and notice patterns. Most urges peak within <strong className="text-purple-300">15-30 minutes</strong> and dissipate when you shift environment, exercise, or perform urge surfing.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase">Logged Urges</span>
                <span className="text-lg font-bold text-slate-200 mt-1 block">{urges.length}</span>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase">Avg Intensity</span>
                <span className="text-lg font-bold text-purple-400 mt-1 block">
                  {urges.length > 0 
                    ? (urges.reduce((acc, curr) => acc + curr.intensity, 0) / urges.length).toFixed(1)
                    : '0.0'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Urges are not commands. Let them float past like clouds.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

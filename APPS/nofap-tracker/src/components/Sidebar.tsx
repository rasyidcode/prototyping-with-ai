import React from 'react';
import { 
  Flame, 
  LayoutDashboard, 
  History, 
  BookOpen, 
  Compass, 
  ShieldAlert, 
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  streakDays: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  streakDays 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Relapse History', icon: History },
    { id: 'journal', label: 'Daily Journal', icon: BookOpen },
    { id: 'timeline', label: 'Benefits Timeline', icon: Compass },
    { id: 'emergency', label: 'Urge Emergency', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-full lg:w-64 glass-panel lg:h-screen lg:sticky lg:top-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 transition-all duration-300 z-30">
      <div className="p-6 flex flex-col h-full">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 animate-pulse-ring">
            <Flame className="w-6 h-6 fill-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent m-0">
              Sovereign
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">NoFap Companion</p>
          </div>
        </div>

        {/* Quick Streak Card */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs text-slate-400 font-medium">Current Streak</p>
              <h2 className="text-2xl font-black text-white mt-1">
                {streakDays.toFixed(1)} <span className="text-sm font-normal text-indigo-300">days</span>
              </h2>
            </div>
            <div className="flex flex-col items-center">
              <Sparkles className="w-4 h-4 text-purple-400 mb-1 animate-pulse" />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/20">
                {streakDays >= 90 ? 'Rebooted' : streakDays >= 30 ? 'Elite' : streakDays >= 7 ? 'Steady' : 'Initiate'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'text-white bg-indigo-600/15 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full"></span>
                )}
                
                <Icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'
                }`} />
                
                <span>{item.label}</span>
                
                {item.id === 'emergency' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Copyright */}
        <div className="pt-6 border-t border-slate-800/60 mt-auto">
          <div className="text-center text-xs text-slate-500">
            <p className="font-medium">Stay Sovereign</p>
            <p className="text-[10px] mt-0.5">Control Your Destiny</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

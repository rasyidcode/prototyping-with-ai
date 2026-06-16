import React from 'react';
import { 
  History, 
  Trash2, 
  Smile, 
  Activity, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import type { Relapse } from '../types';

interface RelapseHistoryProps {
  relapses: Relapse[];
  onDeleteRelapse: (id: string) => void;
}

export const RelapseHistory: React.FC<RelapseHistoryProps> = ({
  relapses,
  onDeleteRelapse
}) => {
  // Sort relapses newest first
  const sortedRelapses = [...relapses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Analytics
  const triggerCounts = relapses.reduce((acc, curr) => {
    acc[curr.trigger] = (acc[curr.trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityCounts = relapses.reduce((acc, curr) => {
    acc[curr.severity] = (acc[curr.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalRelapses = relapses.length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Relapse History & Insights</h1>
        <p className="text-sm text-slate-400 mt-1">Reviewing past slips is the highest path to self-awareness and improvement.</p>
      </div>

      {totalRelapses === 0 ? (
        /* Empty State */
        <div className="glass-panel p-10 rounded-2xl text-center flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4 animate-pulse-ring relative z-10">
            <Smile className="w-10 h-10 fill-emerald-500/10" />
          </div>
          
          <h2 className="text-xl font-bold text-white relative z-10 m-0">Flawless Record</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-2 relative z-10">
            No relapses logged! You have maintained complete mastery over your desires. Keep this clean slate!
          </p>
        </div>
      ) : (
        /* Content State */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Analytics */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Trigger Analytics Card */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-400" />
                Primary Triggers
              </h3>
              
              <div className="space-y-4">
                {Object.entries(triggerCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([trigger, count]) => {
                    const percentage = (count / totalRelapses) * 100;
                    return (
                      <div key={trigger} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{trigger}</span>
                          <span className="text-slate-450">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Severity Analytics Card */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Severity Breakdown
              </h3>
              
              <div className="space-y-4">
                {['M', 'P', 'O', 'PM', 'PMO', 'Other'].map((sev) => {
                  const count = severityCounts[sev] || 0;
                  const percentage = totalRelapses > 0 ? (count / totalRelapses) * 100 : 0;
                  
                  if (count === 0) return null;
                  
                  return (
                    <div key={sev} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-350">
                          {sev === 'P' ? 'Porn only' :
                           sev === 'M' ? 'Masturbation only' :
                           sev === 'O' ? 'Orgasm only' :
                           sev === 'PM' ? 'Porn + Masturbation' :
                           sev === 'PMO' ? 'Porn + Masturbation + Orgasm' : 'Other slips'}
                        </span>
                        <span className="text-slate-450">{count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* Right Column: History Timeline */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Slip History Log ({totalRelapses})
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {sortedRelapses.map((relapse) => (
                <div 
                  key={relapse.id} 
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 relative group hover:border-slate-700/60 transition-all"
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteRelapse(relapse.id)}
                    title="Delete entry"
                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-350">{formatDate(relapse.date)}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase tracking-wider">
                      {relapse.severity}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">
                      Trigger: {relapse.trigger}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-450 mb-3">
                    <span>Streak before slip:</span>
                    <strong className="text-indigo-300 font-semibold">{relapse.streakDurationDays.toFixed(1)} days</strong>
                  </div>

                  {relapse.notes && (
                    <div className="mt-2.5 p-3 rounded-lg bg-slate-950/50 border border-slate-900 text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <span>{relapse.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};

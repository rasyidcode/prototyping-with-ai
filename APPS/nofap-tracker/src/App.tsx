import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RelapseHistory } from './components/RelapseHistory';
import { Journal } from './components/Journal';
import { Benefits } from './components/Benefits';
import { Emergency } from './components/Emergency';
import { Settings } from './components/Settings';
import type { Relapse, JournalEntry, UrgeLog } from './types';
import { X, AlertTriangle, FileText, Calendar, Flame } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Persistence States
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('sovereign_start_date');
    return saved || new Date().toISOString();
  });

  const [relapses, setRelapses] = useState<Relapse[]>(() => {
    const saved = localStorage.getItem('sovereign_relapses');
    return saved ? JSON.parse(saved) : [];
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('sovereign_journals');
    return saved ? JSON.parse(saved) : [];
  });

  const [urges, setUrges] = useState<UrgeLog[]>(() => {
    const saved = localStorage.getItem('sovereign_urges');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal States
  const [showRelapseModal, setShowRelapseModal] = useState(false);
  const [showStartPickerModal, setShowStartPickerModal] = useState(false);

  // Relapse Modal Form State
  const [relapseDate, setRelapseDate] = useState('');
  const [relapseTrigger, setRelapseTrigger] = useState('Boredom');
  const [relapseSeverity, setRelapseSeverity] = useState<'P' | 'M' | 'O' | 'PM' | 'PMO' | 'Other'>('PMO');
  const [relapseNotes, setRelapseNotes] = useState('');
  const [relapseError, setRelapseError] = useState('');

  // Start Date Picker Form State
  const [startPickerDate, setStartPickerDate] = useState('');

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('sovereign_start_date', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('sovereign_relapses', JSON.stringify(relapses));
  }, [relapses]);

  useEffect(() => {
    localStorage.setItem('sovereign_journals', JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    localStorage.setItem('sovereign_urges', JSON.stringify(urges));
  }, [urges]);

  // Set default form values when modals open
  useEffect(() => {
    if (showRelapseModal) {
      // Local ISO string YYYY-MM-DDThh:mm
      const dateObj = new Date();
      const offset = dateObj.getTimezoneOffset() * 60000;
      const localTime = new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
      setRelapseDate(localTime);
      setRelapseNotes('');
      setRelapseTrigger('Boredom');
      setRelapseSeverity('PMO');
      setRelapseError('');
    }
  }, [showRelapseModal]);

  useEffect(() => {
    if (showStartPickerModal) {
      const dateObj = new Date(startDate);
      const offset = dateObj.getTimezoneOffset() * 60000;
      const localTime = new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
      setStartPickerDate(localTime);
    }
  }, [showStartPickerModal, startDate]);

  // Real-time calculation of active streak
  const [currentTimeMs, setCurrentTimeMs] = useState(new Date().getTime());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(new Date().getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStreakMs = Math.max(0, currentTimeMs - new Date(startDate).getTime());
  const currentStreakDays = currentStreakMs / (1000 * 60 * 60 * 24);

  // Best streak calculation: Max of current streak and all past completed streaks
  const bestStreakDays = Math.max(
    currentStreakDays,
    ...relapses.map(r => r.streakDurationDays),
    0
  );

  // Action Handlers
  const handleAddUrge = (intensity: number, notes: string) => {
    const newUrge: UrgeLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      intensity,
      notes
    };
    setUrges(prev => [...prev, newUrge]);
  };

  const handleAddRelapseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateSelected = new Date(relapseDate);
    const startObj = new Date(startDate);

    if (dateSelected.getTime() < startObj.getTime()) {
      setRelapseError('Relapse date cannot be earlier than your streak start date.');
      return;
    }
    if (dateSelected.getTime() > new Date().getTime()) {
      setRelapseError('Relapse date cannot be in the future.');
      return;
    }

    const durationDays = (dateSelected.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24);
    
    const newRelapse: Relapse = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      date: dateSelected.toISOString(),
      trigger: relapseTrigger,
      severity: relapseSeverity,
      notes: relapseNotes,
      streakDurationDays: Math.max(0, durationDays)
    };

    setRelapses(prev => [...prev, newRelapse]);
    setStartDate(dateSelected.toISOString());
    setShowRelapseModal(false);
  };

  const handleDeleteRelapse = (id: string) => {
    setRelapses(prev => prev.filter(r => r.id !== id));
  };

  const handleAddJournal = (entry: Omit<JournalEntry, 'id'>) => {
    // Check if journal for this date already exists
    const existingIdx = journals.findIndex(j => j.date === entry.date);
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)
    };

    if (existingIdx >= 0) {
      // Overwrite existing entry for that date
      setJournals(prev => {
        const updated = [...prev];
        updated[existingIdx] = newEntry;
        return updated;
      });
    } else {
      setJournals(prev => [...prev, newEntry]);
    }
  };

  const handleDeleteJournal = (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  const handleUpdateStartDate = (dateIso: string) => {
    setStartDate(dateIso);
  };

  const handleStartPickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateSelected = new Date(startPickerDate);
    if (dateSelected.getTime() > new Date().getTime()) {
      alert('Start date cannot be in the future.');
      return;
    }
    setStartDate(dateSelected.toISOString());
    setShowStartPickerModal(false);
  };

  const handleExportData = () => {
    const data = {
      startDate,
      relapses,
      journals,
      urges,
      version: '1.0.0'
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `sovereign_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && typeof parsed === 'object') {
        if (parsed.startDate && Array.isArray(parsed.relapses)) {
          setStartDate(parsed.startDate);
          setRelapses(parsed.relapses);
          setJournals(parsed.journals || []);
          setUrges(parsed.urges || []);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleResetAllData = () => {
    localStorage.removeItem('sovereign_start_date');
    localStorage.removeItem('sovereign_relapses');
    localStorage.removeItem('sovereign_journals');
    localStorage.removeItem('sovereign_urges');
    
    setStartDate(new Date().toISOString());
    setRelapses([]);
    setJournals([]);
    setUrges([]);
    setActiveTab('dashboard');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            startDate={startDate}
            relapses={relapses}
            urges={urges}
            onAddUrge={handleAddUrge}
            onOpenRelapseModal={() => setShowRelapseModal(true)}
            onOpenStartPickerModal={() => setShowStartPickerModal(true)}
            bestStreakDays={bestStreakDays}
          />
        );
      case 'history':
        return (
          <RelapseHistory 
            relapses={relapses}
            onDeleteRelapse={handleDeleteRelapse}
          />
        );
      case 'journal':
        return (
          <Journal 
            journals={journals}
            onAddJournal={handleAddJournal}
            onDeleteJournal={handleDeleteJournal}
          />
        );
      case 'timeline':
        return <Benefits streakDays={currentStreakDays} />;
      case 'emergency':
        return <Emergency />;
      case 'settings':
        return (
          <Settings 
            startDate={startDate}
            onUpdateStartDate={handleUpdateStartDate}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetAllData={handleResetAllData}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] flex flex-col lg:flex-row text-slate-100 antialiased font-sans">
      
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        streakDays={currentStreakDays} 
      />

      {/* Main Viewport */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-5xl mx-auto w-full overflow-y-auto mb-16 lg:mb-0">
        <div className="animate-in fade-in duration-500">
          {renderActiveView()}
        </div>
      </main>

      {/* MODAL: Relapse Questionnaire */}
      {showRelapseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg glass-panel p-6 rounded-2xl border border-red-500/20 shadow-2xl relative animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Close */}
            <button
              onClick={() => setShowRelapseModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white m-0">Reset / Relapse Questionnaire</h2>
                <p className="text-xs text-slate-400">Honesty is the baseline of self-mastery. Reflect and reboot.</p>
              </div>
            </div>

            <form onSubmit={handleAddRelapseSubmit} className="space-y-4">
              {relapseError && (
                <div className="p-3 bg-red-500/15 border border-red-500/20 text-xs font-semibold text-red-400 rounded-xl">
                  {relapseError}
                </div>
              )}

              {/* Time of Slip */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Time of Slip
                </label>
                <input
                  type="datetime-local"
                  required
                  value={relapseDate}
                  onChange={(e) => setRelapseDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Severity Breakdown</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['P', 'M', 'O', 'PM', 'PMO', 'Other'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setRelapseSeverity(sev)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border text-center transition-all cursor-pointer ${
                        relapseSeverity === sev
                          ? 'bg-red-600/15 border-red-500/30 text-red-300'
                          : 'bg-slate-900/50 border-slate-850 text-slate-450 hover:bg-slate-850'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  P (Pornography), M (Masturbation), O (Orgasm). PMO is a full relapse.
                </p>
              </div>

              {/* Primary Trigger */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">What triggered the slip?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {['Boredom', 'Stress', 'Social Media', 'Insomnia', 'Loneliness', 'Fatigue', 'Urge', 'Other'].map((trig) => (
                    <button
                      key={trig}
                      type="button"
                      onClick={() => setRelapseTrigger(trig)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border text-center transition-all cursor-pointer ${
                        relapseTrigger === trig
                          ? 'bg-purple-600/15 border-purple-500/30 text-purple-300'
                          : 'bg-slate-900/50 border-slate-850 text-slate-450 hover:bg-slate-850'
                      }`}
                    >
                      {trig}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflective Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Reflections & Adjustments
                </label>
                <textarea
                  value={relapseNotes}
                  onChange={(e) => setRelapseNotes(e.target.value)}
                  placeholder="Detail your mindset. Why did this trigger break you? How will you modify your environment/routines for the next streak?"
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-none transition-all"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-800/60 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRelapseModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-350 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/10 cursor-pointer"
                >
                  Acknowledge & Reset Streak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Start Date */}
      {showStartPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Close */}
            <button
              onClick={() => setShowStartPickerModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-450 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-indigo-400" />
              Adjust Streak Start Time
            </h3>
            
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Backdate or align your streak start. Setting this time changes the current timer directly.
            </p>

            <form onSubmit={handleStartPickerSubmit} className="space-y-4">
              <div>
                <input
                  type="datetime-local"
                  required
                  value={startPickerDate}
                  onChange={(e) => setStartPickerDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartPickerModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-350 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Update Start Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

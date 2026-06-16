import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Smile, 
  Meh, 
  Frown, 
  Angry, 
  Laugh,
  CheckCircle
} from 'lucide-react';
import type { JournalEntry } from '../types';

interface JournalProps {
  journals: JournalEntry[];
  onAddJournal: (entry: Omit<JournalEntry, 'id'>) => void;
  onDeleteJournal: (id: string) => void;
}

const MOODS = [
  { value: 'great', label: 'Great', icon: Laugh, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'good', label: 'Good', icon: Smile, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'bad', label: 'Bad', icon: Frown, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'terrible', label: 'Terrible', icon: Angry, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
] as const;

const HABITS = [
  { id: 'meditation', label: 'Meditation' },
  { id: 'exercise', label: 'Exercise / Workout' },
  { id: 'cold_shower', label: 'Cold Shower' },
  { id: 'reading', label: 'Reading Books' },
  { id: 'productive_work', label: 'Deep Work' },
  { id: 'socializing', label: 'Socializing / Family' },
  { id: 'healthy_diet', label: 'Clean Diet' }
];

export const Journal: React.FC<JournalProps> = ({
  journals,
  onAddJournal,
  onDeleteJournal
}) => {
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState<JournalEntry['mood']>('good');
  const [urgeLevel, setUrgeLevel] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Sort journals newest first
  const sortedJournals = [...journals].sort((a, b) => b.date.localeCompare(a.date));

  const handleHabitToggle = (habitId: string) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(h => h !== habitId) 
        : [...prev, habitId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddJournal({
      date,
      mood,
      urgeLevel,
      notes,
      activities: selectedHabits
    });
    setNotes('');
    setSelectedHabits([]);
    setShowForm(false);
  };

  const getMoodConfig = (moodValue: string) => {
    return MOODS.find(m => m.value === moodValue) || MOODS[2];
  };

  const getUrgeText = (level: number) => {
    switch(level) {
      case 1: return 'Non-existent';
      case 2: return 'Mild / Passable';
      case 3: return 'Noticeable / Nagging';
      case 4: return 'Strong / Demanding';
      case 5: return 'Extreme / Emergency';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Reflection Journal</h1>
          <p className="text-sm text-slate-400 mt-1">Strengthen your resolve by logging daily achievements and mental changes.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all cursor-pointer select-none"
        >
          {showForm ? 'Cancel Entry' : (
            <>
              <Plus className="w-4 h-4" />
              Write Daily Log
            </>
          )}
        </button>
      </div>

      {showForm && (
        /* Daily Entry Form */
        <div className="glass-panel p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Today's Mental Check-In
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column Fields */}
              <div className="space-y-5">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                {/* Mood Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2.5">How is your mood today?</label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => {
                      const Icon = m.icon;
                      const isSelected = mood === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMood(m.value)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected 
                              ? m.color + ' ring-1 ring-offset-2 ring-offset-slate-950 ring-indigo-500/50' 
                              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urge Level Selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-400">Urge Intensity: {urgeLevel} / 5</label>
                    <span className="text-[10px] font-bold text-indigo-400">{getUrgeText(urgeLevel)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-semibold">Zero</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={urgeLevel}
                      onChange={(e) => setUrgeLevel(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-xs text-red-500 font-semibold">Extreme</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Activities Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2.5">
                  Positive Habits Logged Today
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HABITS.map((habit) => {
                    const isSelected = selectedHabits.includes(habit.id);
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        onClick={() => handleHabitToggle(habit.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300' 
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                        }`}
                      >
                        <CheckCircle className={`w-4 h-4 shrink-0 transition-all ${
                          isSelected ? 'text-indigo-400 fill-indigo-500/10' : 'text-slate-600'
                        }`} />
                        <span>{habit.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reflection Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Reflections / Notes / Gratitude Journal
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you learn today? What are you grateful for? Detail any struggles or successes..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all"
              ></textarea>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 border-t border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Save Reflection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Journals History Log */}
      {sortedJournals.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center flex flex-col items-center justify-center min-h-[300px]">
          <BookOpen className="w-10 h-10 text-slate-600 mb-3" />
          <h2 className="text-lg font-bold text-white m-0">No Reflections Yet</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-1.5">
            Start logging your days. Reflecting on your progress builds cognitive resilience and neural rebooting.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white mb-2">Previous Reflections ({sortedJournals.length})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedJournals.map((entry) => {
              const moodInfo = getMoodConfig(entry.mood);
              const MoodIcon = moodInfo.icon;
              return (
                <div 
                  key={entry.id} 
                  className="glass-panel p-5 rounded-2xl border border-slate-800 relative group flex flex-col justify-between hover:border-slate-700/60 transition-all"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteJournal(entry.id)}
                    title="Delete journal"
                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800/80 hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    {/* Header bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-indigo-400">{entry.date}</span>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${moodInfo.color}`}>
                        <MoodIcon className="w-3.5 h-3.5 shrink-0" />
                        Mood: {moodInfo.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50 font-bold">
                        Urge: {entry.urgeLevel}/5
                      </span>
                    </div>

                    {/* Note content */}
                    {entry.notes ? (
                      <p className="text-xs text-slate-300 leading-relaxed italic pr-2 mt-2">
                        "{entry.notes}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic mt-2">No reflective notes written.</p>
                    )}
                  </div>

                  {/* Habits completed */}
                  {entry.activities && entry.activities.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/60">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Habits Checked
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.activities.map((act) => {
                          const habitObj = HABITS.find(h => h.id === act);
                          return (
                            <span 
                              key={act}
                              className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/5 text-indigo-300 border border-indigo-500/10 font-medium"
                            >
                              {habitObj ? habitObj.label : act}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

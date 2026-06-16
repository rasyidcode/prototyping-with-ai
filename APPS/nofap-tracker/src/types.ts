export interface Relapse {
  id: string;
  date: string; // ISO string
  trigger: string;
  severity: 'P' | 'M' | 'O' | 'PM' | 'PMO' | 'Other';
  notes: string;
  streakDurationDays: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  urgeLevel: number; // 1 to 5
  notes: string;
  activities: string[]; // e.g. ['meditation', 'exercise', 'cold_shower', 'reading', 'socializing']
}

export interface UrgeLog {
  id: string;
  date: string; // ISO string
  intensity: number; // 1 to 5
  notes: string;
}

export interface UserStats {
  bestStreakDays: number;
  totalRelapses: number;
  totalCleanDaysCount: number;
}

export interface Benefit {
  id: string;
  dayStart: number;
  dayEnd: number;
  title: string;
  description: string;
  category: 'physical' | 'mental' | 'spiritual' | 'social';
}

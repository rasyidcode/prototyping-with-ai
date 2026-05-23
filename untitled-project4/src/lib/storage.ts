import type { TriviaStats } from "../types";

const STORAGE_KEY = "queue-trivia-companion:stats";

export const defaultStats: TriviaStats = {
  bestScore: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  longestStreak: 0,
  lastCategory: "all",
  lastDifficulty: "all",
};

export function loadStats(storage: Storage | undefined = globalThis.localStorage): TriviaStats {
  try {
    const rawStats = storage?.getItem(STORAGE_KEY);
    if (!rawStats) {
      return defaultStats;
    }

    return { ...defaultStats, ...JSON.parse(rawStats) };
  } catch {
    return defaultStats;
  }
}

export function saveStats(
  stats: TriviaStats,
  storage: Storage | undefined = globalThis.localStorage,
) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage can fail in private browsing or locked-down webviews.
  }
}

export function mergeSessionStats(
  stats: TriviaStats,
  session: { score: number; answered: number; correct: number; longestStreak?: number },
): TriviaStats {
  return {
    ...stats,
    bestScore: Math.max(stats.bestScore, session.score),
    totalAnswered: stats.totalAnswered + session.answered,
    totalCorrect: stats.totalCorrect + session.correct,
    longestStreak: Math.max(stats.longestStreak, session.longestStreak ?? 0),
  };
}

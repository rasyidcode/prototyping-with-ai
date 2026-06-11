export type ScoreInput = {
  isCorrect: boolean;
  timeRemaining: number;
  questionTime: number;
  streak: number;
};

export type ScoreResult = {
  points: number;
  nextStreak: number;
  timeBonus: number;
  streakBonus: number;
};

export function calculateScore({
  isCorrect,
  timeRemaining,
  questionTime,
  streak,
}: ScoreInput): ScoreResult {
  if (!isCorrect) {
    return { points: 0, nextStreak: 0, timeBonus: 0, streakBonus: 0 };
  }

  const safeQuestionTime = Math.max(questionTime, 1);
  const safeTimeRemaining = Math.max(0, Math.min(timeRemaining, safeQuestionTime));
  const nextStreak = streak + 1;
  const timeRatio = safeTimeRemaining / safeQuestionTime;
  const timeBonus = Math.round(timeRatio * 50);
  const streakBonus = Math.min(Math.max(nextStreak - 1, 0) * 15, 150);
  const points = 100 + timeBonus + streakBonus;

  return { points, nextStreak, timeBonus, streakBonus };
}

export type TriviaCategory =
  | "heroes"
  | "abilities"
  | "items"
  | "mechanics"
  | "objectives"
  | "roles";

export type TriviaDifficulty = "easy" | "medium" | "hard";

export type TriviaQuestion = {
  id: string;
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
  prompt: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

export type TriviaStats = {
  bestScore: number;
  totalAnswered: number;
  totalCorrect: number;
  longestStreak: number;
  lastCategory: TriviaCategory | "all";
  lastDifficulty: TriviaDifficulty | "all";
};

export type LiveTriviaState = {
  questionNumber: number;
  question: TriviaQuestion;
  remainingSeconds: number;
  totalSeconds: number;
};

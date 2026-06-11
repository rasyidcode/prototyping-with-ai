import type { TriviaQuestion } from "../types";

export function filterQuestions(
  questions: TriviaQuestion[],
  category: TriviaQuestion["category"] | "all",
  difficulty: TriviaQuestion["difficulty"] | "all",
) {
  return questions.filter((question) => {
    const categoryMatches = category === "all" || question.category === category;
    const difficultyMatches = difficulty === "all" || question.difficulty === difficulty;
    return categoryMatches && difficultyMatches;
  });
}

export function pickNextQuestion(
  pool: TriviaQuestion[],
  answeredIds: string[],
  random = Math.random,
): { question: TriviaQuestion; nextAnsweredIds: string[] } {
  if (pool.length === 0) {
    throw new Error("Cannot pick a trivia question from an empty pool.");
  }

  const unanswered = pool.filter((question) => !answeredIds.includes(question.id));
  const candidates = unanswered.length > 0 ? unanswered : pool;
  const index = Math.floor(random() * candidates.length);
  const question = candidates[Math.min(index, candidates.length - 1)];
  const nextAnsweredIds = unanswered.length > 0 ? [...answeredIds, question.id] : [question.id];

  return { question, nextAnsweredIds };
}

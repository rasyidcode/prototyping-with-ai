import type { LiveTriviaState, TriviaQuestion } from "../types";

export const LIVE_TRIVIA_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
export const LIVE_TRIVIA_STARTING_NUMBER = 5_788_111;
export const LIVE_TRIVIA_QUESTION_SECONDS = 20;

type LiveTriviaInput = {
  nowMs: number;
  pool: TriviaQuestion[];
  epochMs?: number;
  startingQuestionNumber?: number;
  questionSeconds?: number;
};

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function hashQuestionNumber(questionNumber: number) {
  let hash = questionNumber | 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash;
}

export function getLiveTriviaState({
  nowMs,
  pool,
  epochMs = LIVE_TRIVIA_EPOCH_MS,
  startingQuestionNumber = LIVE_TRIVIA_STARTING_NUMBER,
  questionSeconds = LIVE_TRIVIA_QUESTION_SECONDS,
}: LiveTriviaInput): LiveTriviaState {
  if (pool.length === 0) {
    throw new Error("Cannot create live trivia state from an empty question pool.");
  }

  const durationMs = Math.max(questionSeconds, 1) * 1000;
  const elapsedMs = Math.max(0, nowMs - epochMs);
  const questionOffset = Math.floor(elapsedMs / durationMs);
  const questionNumber = startingQuestionNumber + questionOffset;
  const elapsedInQuestionMs = elapsedMs % durationMs;
  const remainingSeconds = Math.max(0, Math.ceil((durationMs - elapsedInQuestionMs) / 1000));
  const questionIndex = positiveModulo(hashQuestionNumber(questionNumber), pool.length);

  return {
    questionNumber,
    question: pool[questionIndex],
    remainingSeconds,
    totalSeconds: Math.max(questionSeconds, 1),
  };
}

export function formatQuestionNumber(questionNumber: number) {
  return `#${new Intl.NumberFormat("en-US").format(questionNumber)}`;
}

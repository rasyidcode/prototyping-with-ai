import { describe, expect, it } from "vitest";
import { formatQuestionNumber, getLiveTriviaState } from "./liveTrivia";
import type { TriviaQuestion } from "../types";

const pool: TriviaQuestion[] = [
  {
    id: "one",
    category: "items",
    difficulty: "easy",
    prompt: "One?",
    choices: ["A", "B", "C", "D"],
    answerIndex: 0,
    explanation: "One",
  },
  {
    id: "two",
    category: "heroes",
    difficulty: "hard",
    prompt: "Two?",
    choices: ["A", "B", "C", "D"],
    answerIndex: 1,
    explanation: "Two",
  },
];

describe("live trivia", () => {
  it("computes a global question number from epoch and timestamp", () => {
    const state = getLiveTriviaState({
      nowMs: 40_000,
      epochMs: 0,
      startingQuestionNumber: 100,
      questionSeconds: 20,
      pool,
    });

    expect(state.questionNumber).toBe(102);
  });

  it("computes remaining time inside the current question", () => {
    const state = getLiveTriviaState({
      nowMs: 25_000,
      epochMs: 0,
      startingQuestionNumber: 100,
      questionSeconds: 20,
      pool,
    });

    expect(state.remainingSeconds).toBe(15);
    expect(state.totalSeconds).toBe(20);
  });

  it("selects the same question for the same question number", () => {
    const first = getLiveTriviaState({
      nowMs: 20_000,
      epochMs: 0,
      startingQuestionNumber: 100,
      questionSeconds: 20,
      pool,
    });
    const second = getLiveTriviaState({
      nowMs: 20_999,
      epochMs: 0,
      startingQuestionNumber: 100,
      questionSeconds: 20,
      pool,
    });

    expect(first.questionNumber).toBe(second.questionNumber);
    expect(first.question.id).toBe(second.question.id);
  });

  it("formats a large visible question number", () => {
    expect(formatQuestionNumber(5_788_111)).toBe("#5,788,111");
  });
});

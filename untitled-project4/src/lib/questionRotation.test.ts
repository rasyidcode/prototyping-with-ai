import { describe, expect, it } from "vitest";
import { filterQuestions, pickNextQuestion } from "./questionRotation";
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

describe("question rotation", () => {
  it("filters by category and difficulty", () => {
    expect(filterQuestions(pool, "items", "easy")).toHaveLength(1);
    expect(filterQuestions(pool, "items", "easy")[0].id).toBe("one");
  });

  it("does not repeat questions until the current pool is exhausted", () => {
    const first = pickNextQuestion(pool, [], () => 0);
    const second = pickNextQuestion(pool, first.nextAnsweredIds, () => 0);

    expect(first.question.id).toBe("one");
    expect(second.question.id).toBe("two");
    expect(second.nextAnsweredIds).toEqual(["one", "two"]);
  });

  it("starts a new cycle after pool exhaustion", () => {
    const next = pickNextQuestion(pool, ["one", "two"], () => 0);

    expect(next.question.id).toBe("one");
    expect(next.nextAnsweredIds).toEqual(["one"]);
  });
});

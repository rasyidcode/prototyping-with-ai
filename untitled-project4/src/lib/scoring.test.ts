import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";

describe("calculateScore", () => {
  it("awards base, time, and streak points for a correct answer", () => {
    const score = calculateScore({
      isCorrect: true,
      timeRemaining: 10,
      questionTime: 20,
      streak: 2,
    });

    expect(score).toEqual({
      points: 155,
      nextStreak: 3,
      timeBonus: 25,
      streakBonus: 30,
    });
  });

  it("resets streak and awards no points for a wrong answer", () => {
    const score = calculateScore({
      isCorrect: false,
      timeRemaining: 20,
      questionTime: 20,
      streak: 5,
    });

    expect(score).toEqual({
      points: 0,
      nextStreak: 0,
      timeBonus: 0,
      streakBonus: 0,
    });
  });
});

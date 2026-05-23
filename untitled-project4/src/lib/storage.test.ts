import { describe, expect, it } from "vitest";
import { defaultStats, loadStats, mergeSessionStats, saveStats } from "./storage";

function createStorage(shouldThrow = false): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => {
      if (shouldThrow) {
        throw new Error("blocked");
      }
      return values.get(key) ?? null;
    },
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => {
      if (shouldThrow) {
        throw new Error("blocked");
      }
      values.set(key, value);
    },
  };
}

describe("storage", () => {
  it("loads saved stats", () => {
    const storage = createStorage();
    saveStats({ ...defaultStats, bestScore: 420 }, storage);

    expect(loadStats(storage).bestScore).toBe(420);
  });

  it("falls back to defaults when storage is unavailable", () => {
    expect(loadStats(createStorage(true))).toEqual(defaultStats);
  });

  it("merges completed session stats", () => {
    expect(
      mergeSessionStats(
        { ...defaultStats, bestScore: 200, totalAnswered: 3, totalCorrect: 2 },
        { score: 300, answered: 10, correct: 7, longestStreak: 4 },
      ),
    ).toMatchObject({
      bestScore: 300,
      totalAnswered: 13,
      totalCorrect: 9,
      longestStreak: 4,
    });
  });
});

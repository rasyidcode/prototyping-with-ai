export type SaveData = {
  bestScore: number;
  xp: number;
  stars: number;
};

const KEY = "sawit-rush-save";

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { bestScore: 0, xp: 0, stars: 0 };
    return { bestScore: 0, xp: 0, stars: 0, ...JSON.parse(raw) };
  } catch {
    return { bestScore: 0, xp: 0, stars: 0 };
  }
}

export function saveProgress(data: SaveData): void {
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

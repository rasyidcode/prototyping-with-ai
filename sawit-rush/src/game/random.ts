export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed || 1;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.integer(0, items.length - 1)];
  }
}

export function dailySeed(date = new Date()): number {
  const stamp = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;
  return Number(stamp);
}

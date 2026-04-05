/**
 * Seeded PRNG (Mulberry32 variant)
 *
 * Deterministic random number generator for reproducible map generation.
 * Given the same seed, always produces the same sequence of values.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Warm up: LCG outputs are nearly identical for small sequential seeds.
    // Running 3 iterations disperses the internal state before first use.
    this.state = seed;
    for (let i = 0; i < 3; i++) {
      this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    }
  }

  /** Returns a float in [0, 1) — drop-in replacement for Math.random(). */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max). */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** Returns a float in [min, max). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Pick a random element from an array. */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)];
  }

  /** Shuffle an array in-place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

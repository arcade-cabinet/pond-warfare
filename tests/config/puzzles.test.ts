import { describe, expect, it } from 'vitest';
import { getPuzzleStars, PUZZLES } from '@/config/puzzles';

describe('puzzle definitions', () => {
  it('defines exactly 10 puzzles', () => {
    expect(PUZZLES).toHaveLength(10);
  });

  it('all puzzles have unique IDs', () => {
    const ids = PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all puzzles have required fields', () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.name).toBeTruthy();
      expect(puzzle.description).toBeTruthy();
      expect(puzzle.difficulty).toBeGreaterThanOrEqual(1);
      expect(puzzle.difficulty).toBeLessThanOrEqual(5);
      expect(puzzle.mapSeed).toBeGreaterThan(0);
      expect(puzzle.playerUnits.length).toBeGreaterThan(0);
      expect(puzzle.objective).toBeDefined();
      expect(puzzle.objective.description).toBeTruthy();
      expect(puzzle.parTimeFrames).toBeGreaterThan(0);
      expect(puzzle.hint).toBeTruthy();
    }
  });

  it('core puzzles (1-5) have escalating difficulty', () => {
    for (let i = 1; i < 5; i++) {
      expect(PUZZLES[i].difficulty).toBeGreaterThanOrEqual(PUZZLES[i - 1].difficulty);
    }
  });

  it('advanced puzzles (6-10) have escalating difficulty', () => {
    for (let i = 6; i < 10; i++) {
      expect(PUZZLES[i].difficulty).toBeGreaterThanOrEqual(PUZZLES[i - 1].difficulty);
    }
  });

  it('all puzzles have unique map seeds', () => {
    const seeds = PUZZLES.map((p) => p.mapSeed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  // ---- Core puzzles (1-5) ----

  it('first strike has 3 brawlers and no training', () => {
    const p = PUZZLES[0];
    expect(p.id).toBe('first-strike');
    expect(p.playerUnits).toHaveLength(3);
    expect(p.trainingAllowed).toBe(false);
    expect(p.objective.type).toBe('destroy');
  });

  it('stealth run has 2 divers', () => {
    const p = PUZZLES[1];
    expect(p.id).toBe('stealth-run');
    expect(p.playerUnits).toHaveLength(2);
    expect(p.objective.type).toBe('reach');
  });

  it('hold the bridge is a survival puzzle', () => {
    const p = PUZZLES[2];
    expect(p.id).toBe('hold-the-bridge');
    expect(p.objective.type).toBe('survive');
    expect(p.objective.surviveFrames).toBe(10800);
  });

  it('economy race is a collection puzzle', () => {
    const p = PUZZLES[3];
    expect(p.id).toBe('economy-race');
    expect(p.objective.type).toBe('collect');
    expect(p.objective.collectAmount).toBe(1000);
  });

  it('commander down targets alpha predator', () => {
    const p = PUZZLES[4];
    expect(p.id).toBe('commander-down');
    expect(p.objective.type).toBe('destroy');
    expect(p.difficulty).toBe(5);
  });

  // ---- Advanced puzzles (6-10) ----

  it('naval ambush has divers + warship and targets dock', () => {
    const p = PUZZLES[5];
    expect(p.id).toBe('naval-ambush');
    expect(p.playerUnits).toHaveLength(4);
    expect(p.scenario).toBe('archipelago');
    expect(p.objective.type).toBe('destroy');
  });

  it("engineer's bridge has engineers + brawlers on river map", () => {
    const p = PUZZLES[6];
    expect(p.id).toBe('engineers-bridge');
    expect(p.playerUnits).toHaveLength(6);
    expect(p.scenario).toBe('river');
    expect(p.buildingAllowed).toBe(true);
    expect(p.objective.type).toBe('destroy');
  });

  it('weather warfare is a 5-minute survival on island', () => {
    const p = PUZZLES[7];
    expect(p.id).toBe('weather-warfare');
    expect(p.playerUnits).toHaveLength(5);
    expect(p.scenario).toBe('island');
    expect(p.objective.type).toBe('survive');
    expect(p.objective.surviveFrames).toBe(18000);
  });

  it("berserker's last stand has 1 berserker and kill-count objective", () => {
    const p = PUZZLES[8];
    expect(p.id).toBe('berserkers-last-stand');
    expect(p.playerUnits).toHaveLength(1);
    expect(p.objective.type).toBe('kill-count');
    expect(p.objective.targetCount).toBe(20);
  });

  it('full spectrum is build-all economy challenge', () => {
    const p = PUZZLES[9];
    expect(p.id).toBe('full-spectrum');
    expect(p.objective.type).toBe('build-all');
    expect(p.trainingAllowed).toBe(true);
    expect(p.buildingAllowed).toBe(true);
    expect(p.difficulty).toBe(5);
  });
});

describe('getPuzzleStars', () => {
  it('returns 0 for incomplete puzzle', () => {
    expect(getPuzzleStars(false, 5000, 7200, 0)).toBe(0);
  });

  it('returns 1 star for completion over par with losses', () => {
    expect(getPuzzleStars(true, 10000, 7200, 2)).toBe(1);
  });

  it('returns 2 stars for under par with losses', () => {
    expect(getPuzzleStars(true, 5000, 7200, 2)).toBe(2);
  });

  it('returns 2 stars for over par with no losses', () => {
    expect(getPuzzleStars(true, 10000, 7200, 0)).toBe(2);
  });

  it('returns 3 stars for under par with no losses', () => {
    expect(getPuzzleStars(true, 5000, 7200, 0)).toBe(3);
  });
});

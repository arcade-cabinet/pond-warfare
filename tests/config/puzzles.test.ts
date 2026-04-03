import { describe, expect, it } from 'vitest';
import type { DifficultyTier } from '@/config/puzzles';
import { getPuzzleStars, PUZZLES, puzzlesByTier } from '@/config/puzzles';

describe('puzzle definitions', () => {
  it('defines exactly 20 puzzles', () => {
    expect(PUZZLES).toHaveLength(20);
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
      expect(puzzle.difficultyTier).toBeTruthy();
      expect(puzzle.mapSeed).toBeGreaterThan(0);
      expect(puzzle.playerUnits.length).toBeGreaterThan(0);
      expect(puzzle.objective).toBeDefined();
      expect(puzzle.objective.description).toBeTruthy();
      expect(puzzle.parTimeFrames).toBeGreaterThan(0);
      expect(puzzle.hint).toBeTruthy();
    }
  });

  it('all puzzles have a valid difficulty tier', () => {
    const validTiers: DifficultyTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    for (const puzzle of PUZZLES) {
      expect(validTiers).toContain(puzzle.difficultyTier);
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

  it('expert puzzles (11-20) have escalating difficulty', () => {
    for (let i = 11; i < 20; i++) {
      expect(PUZZLES[i].difficulty).toBeGreaterThanOrEqual(PUZZLES[i - 1].difficulty);
    }
  });

  it('all puzzles have unique map seeds', () => {
    const seeds = PUZZLES.map((p) => p.mapSeed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  // ---- Difficulty tier grouping ----

  it('puzzles 1-5 are beginner tier', () => {
    for (let i = 0; i < 5; i++) {
      expect(PUZZLES[i].difficultyTier).toBe('beginner');
    }
  });

  it('puzzles 6-10 are intermediate tier', () => {
    for (let i = 5; i < 10; i++) {
      expect(PUZZLES[i].difficultyTier).toBe('intermediate');
    }
  });

  it('puzzles 11-13 are advanced tier', () => {
    for (let i = 10; i < 13; i++) {
      expect(PUZZLES[i].difficultyTier).toBe('advanced');
    }
  });

  it('puzzles 14-20 are expert tier', () => {
    for (let i = 13; i < 20; i++) {
      expect(PUZZLES[i].difficultyTier).toBe('expert');
    }
  });

  it('puzzlesByTier groups correctly', () => {
    const grouped = puzzlesByTier();
    expect(grouped.beginner).toHaveLength(5);
    expect(grouped.intermediate).toHaveLength(5);
    expect(grouped.advanced).toHaveLength(3);
    expect(grouped.expert).toHaveLength(7);
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

  // ---- Expert puzzles (11-20) ----

  it('economy rush is a timed collection puzzle', () => {
    const p = PUZZLES[10];
    expect(p.id).toBe('economy-rush');
    expect(p.playerUnits).toHaveLength(2);
    expect(p.objective.type).toBe('collect');
    expect(p.objective.collectAmount).toBe(500);
    expect(p.buildingAllowed).toBe(true);
  });

  it('tech sprint is a build-all research puzzle', () => {
    const p = PUZZLES[11];
    expect(p.id).toBe('tech-sprint');
    expect(p.objective.type).toBe('build-all');
    expect(p.trainingAllowed).toBe(true);
    expect(p.buildingAllowed).toBe(true);
  });

  it('hold the line is a 5-minute defense on peninsula', () => {
    const p = PUZZLES[12];
    expect(p.id).toBe('hold-the-line');
    expect(p.scenario).toBe('peninsula');
    expect(p.objective.type).toBe('survive');
    expect(p.objective.surviveFrames).toBe(18000);
    expect(p.buildingAllowed).toBe(true);
  });

  it('sniper alley has 3 snipers and kill-count objective', () => {
    const p = PUZZLES[13];
    expect(p.id).toBe('sniper-alley');
    expect(p.playerUnits).toHaveLength(3);
    expect(p.objective.type).toBe('kill-count');
    expect(p.objective.targetCount).toBe(10);
    expect(p.difficultyTier).toBe('expert');
  });

  it('the great flood is a survival puzzle on island', () => {
    const p = PUZZLES[14];
    expect(p.id).toBe('the-great-flood');
    expect(p.scenario).toBe('island');
    expect(p.objective.type).toBe('survive');
    expect(p.playerUnits).toHaveLength(5);
  });

  it("commander's trial targets predator nest", () => {
    const p = PUZZLES[15];
    expect(p.id).toBe('commanders-trial');
    expect(p.objective.type).toBe('destroy');
    expect(p.difficulty).toBe(5);
  });

  it('no build challenge forbids building with 10 units', () => {
    const p = PUZZLES[16];
    expect(p.id).toBe('no-build-challenge');
    expect(p.playerUnits).toHaveLength(10);
    expect(p.buildingAllowed).toBe(false);
    expect(p.trainingAllowed).toBe(false);
    expect(p.objective.type).toBe('destroy');
  });

  it('weather master is a 6-minute survival on island', () => {
    const p = PUZZLES[17];
    expect(p.id).toBe('weather-master');
    expect(p.scenario).toBe('island');
    expect(p.objective.type).toBe('survive');
    expect(p.objective.surviveFrames).toBe(21600);
  });

  it('the gauntlet is a reach puzzle in labyrinth', () => {
    const p = PUZZLES[18];
    expect(p.id).toBe('the-gauntlet');
    expect(p.scenario).toBe('labyrinth');
    expect(p.objective.type).toBe('reach');
    expect(p.playerUnits).toHaveLength(5);
  });

  it('endgame targets alpha predator with full squad', () => {
    const p = PUZZLES[19];
    expect(p.id).toBe('endgame');
    expect(p.objective.type).toBe('destroy');
    expect(p.playerUnits).toHaveLength(8);
    expect(p.difficulty).toBe(5);
    expect(p.difficultyTier).toBe('expert');
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

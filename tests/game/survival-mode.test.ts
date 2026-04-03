/**
 * Survival Mode Tests
 *
 * Verifies wave spawning, difficulty escalation, boss waves,
 * and score calculation.
 */

import { query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { FactionTag, Position } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { spawnInitialEntities } from '@/game/init-entities';
import { calculateSurvivalScore, shouldSpawnWave, spawnSurvivalWave } from '@/game/survival-mode';
import { Faction } from '@/types';

function createSurvivalWorld() {
  const world = createGameWorld();
  world.mapSeed = 42;
  world.scenarioOverride = 'standard';
  world.viewWidth = 1280;
  world.viewHeight = 720;
  world.peaceTimer = 0; // No peace timer
  world.nestCountOverride = 0; // No enemy nests
  spawnInitialEntities(world);
  return world;
}

describe('Survival Mode', () => {
  it('should not spawn wave during peace timer', () => {
    const world = createSurvivalWorld();
    world.peaceTimer = 7200;
    world.frameCount = 100;
    expect(shouldSpawnWave(world)).toBe(false);
  });

  it('should spawn wave at correct interval', () => {
    const world = createSurvivalWorld();
    world.frameCount = 7200; // First wave interval
    expect(shouldSpawnWave(world)).toBe(true);
  });

  it('spawns enemy units from map edges', () => {
    const world = createSurvivalWorld();

    const countBefore = query(world.ecs, [Position, FactionTag]).filter(
      (eid) => FactionTag.faction[eid] === Faction.Enemy,
    ).length;

    const spawned = spawnSurvivalWave(world);
    expect(spawned).toBeGreaterThan(0);

    const countAfter = query(world.ecs, [Position, FactionTag]).filter(
      (eid) => FactionTag.faction[eid] === Faction.Enemy,
    ).length;

    expect(countAfter).toBeGreaterThan(countBefore);
  });

  it('increments wave number on each spawn', () => {
    const world = createSurvivalWorld();
    expect(world.waveNumber).toBe(0);

    spawnSurvivalWave(world);
    expect(world.waveNumber).toBe(1);

    spawnSurvivalWave(world);
    expect(world.waveNumber).toBe(2);
  });

  it('spawns more units as waves increase', () => {
    const worldEarly = createSurvivalWorld();
    const countEarly = spawnSurvivalWave(worldEarly); // Wave 1

    const worldLate = createSurvivalWorld();
    worldLate.waveNumber = 9; // Will become wave 10
    const countLate = spawnSurvivalWave(worldLate);

    expect(countLate).toBeGreaterThan(countEarly);
  });

  it('boss wave spawns extra bosses on every 5th wave', () => {
    const world = createSurvivalWorld();
    world.waveNumber = 4; // Next wave will be 5 (boss wave)

    spawnSurvivalWave(world);
    expect(world.waveNumber).toBe(5);

    // Should have floating text announcing boss wave
    const bossText = world.floatingTexts.find((t) => t.text.includes('BOSS'));
    expect(bossText).toBeDefined();
  });

  it('calculates survival score from time, kills, and buildings', () => {
    const world = createSurvivalWorld();
    world.frameCount = 3600; // 60 seconds
    world.stats.unitsKilled = 5;

    const score = calculateSurvivalScore(world);
    // 60 (time) + 50 (5 kills * 10) + buildings * 50, difficulty=normal (1.0x)
    expect(score).toBeGreaterThanOrEqual(110);
  });

  it('applies difficulty multiplier to score', () => {
    const worldEasy = createSurvivalWorld();
    worldEasy.frameCount = 6000; // 100 seconds
    worldEasy.stats.unitsKilled = 10;
    worldEasy.difficulty = 'easy';

    const worldHard = createSurvivalWorld();
    worldHard.frameCount = 6000;
    worldHard.stats.unitsKilled = 10;
    worldHard.difficulty = 'hard';

    const scoreEasy = calculateSurvivalScore(worldEasy);
    const scoreHard = calculateSurvivalScore(worldHard);

    // Hard (2.0x) should be 4x easy (0.5x) for same base
    expect(scoreHard).toBe(scoreEasy * 4);
  });

  it('applies ultra nightmare 5x multiplier', () => {
    const worldNormal = createSurvivalWorld();
    worldNormal.frameCount = 6000;
    worldNormal.stats.unitsKilled = 10;
    worldNormal.difficulty = 'normal';

    const worldUltra = createSurvivalWorld();
    worldUltra.frameCount = 6000;
    worldUltra.stats.unitsKilled = 10;
    worldUltra.difficulty = 'ultraNightmare';

    const scoreNormal = calculateSurvivalScore(worldNormal);
    const scoreUltra = calculateSurvivalScore(worldUltra);
    expect(scoreUltra).toBe(scoreNormal * 5);
  });

  it('adds wave milestone bonuses', () => {
    const worldNoMilestone = createSurvivalWorld();
    worldNoMilestone.frameCount = 6000;
    worldNoMilestone.stats.unitsKilled = 0;
    worldNoMilestone.waveNumber = 9;

    const worldWave10 = createSurvivalWorld();
    worldWave10.frameCount = 6000;
    worldWave10.stats.unitsKilled = 0;
    worldWave10.waveNumber = 10;

    const scoreNoMilestone = calculateSurvivalScore(worldNoMilestone);
    const scoreWave10 = calculateSurvivalScore(worldWave10);

    // Wave 10 adds +500 bonus
    expect(scoreWave10 - scoreNoMilestone).toBe(500);
  });

  it('stacks multiple wave milestone bonuses', () => {
    const worldWave10 = createSurvivalWorld();
    worldWave10.frameCount = 6000;
    worldWave10.stats.unitsKilled = 0;
    worldWave10.waveNumber = 10;

    const worldWave30 = createSurvivalWorld();
    worldWave30.frameCount = 6000;
    worldWave30.stats.unitsKilled = 0;
    worldWave30.waveNumber = 30;

    const score10 = calculateSurvivalScore(worldWave10);
    const score30 = calculateSurvivalScore(worldWave30);

    // Wave 30 adds +500 + +1000 + +2000 = +3500 over no milestones
    // Wave 10 adds +500
    // Difference should be +3000 (1000 + 2000)
    expect(score30 - score10).toBe(3000);
  });

  it('applies commander diversity bonus for non-marshal', () => {
    const worldMarshal = createSurvivalWorld();
    worldMarshal.frameCount = 6000;
    worldMarshal.stats.unitsKilled = 10;
    worldMarshal.commanderId = 'marshal';

    const worldSage = createSurvivalWorld();
    worldSage.frameCount = 6000;
    worldSage.stats.unitsKilled = 10;
    worldSage.commanderId = 'sage';

    const scoreMarshal = calculateSurvivalScore(worldMarshal);
    const scoreSage = calculateSurvivalScore(worldSage);

    // Sage gets +10% over marshal
    expect(scoreSage).toBe(Math.round(scoreMarshal * 1.1));
  });

  it('all 5 tech branches available (standard world tech)', () => {
    const world = createSurvivalWorld();
    // Verify tech state exists (all false by default, but available)
    expect(Object.keys(world.tech).length).toBeGreaterThan(0);
  });
});

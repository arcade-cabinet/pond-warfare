/**
 * Wave Spawn Pattern Tests
 *
 * Validates that spawn patterns produce deterministic, visually
 * distinct formations at each panel configuration.
 */

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import type { EventTemplate } from '@/config/v3-types';
import { FactionTag, Health, Position } from '@/ecs/components';
import { spawnEventEnemies } from '@/ecs/systems/wave-spawner';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Faction } from '@/types';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../../helpers/world-factory';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

function makeEvent(
  pattern: string,
  composition: Record<string, number> = { fighter: 5 },
): EventTemplate {
  return {
    type: 'wave',
    min_progression: 0,
    max_progression: 999,
    duration_seconds: 60,
    enemy_composition: composition,
    reward_clams: 5,
    description: 'Test wave',
    spawn_pattern: pattern as EventTemplate['spawn_pattern'],
  };
}

function getEnemyPositions(world: ReturnType<typeof createTestWorld>): { x: number; y: number }[] {
  const eids = query(world.ecs, [Position, Health, FactionTag]);
  const result: { x: number; y: number }[] = [];
  for (const eid of eids) {
    if (FactionTag.faction[eid] === Faction.Enemy && Health.current[eid] > 0) {
      result.push({ x: Position.x[eid], y: Position.y[eid] });
    }
  }
  return result;
}

describe('Wave Spawn Patterns', () => {
  function setupWorld(stage: number) {
    progressionLevel.value = stage;
    const world = createTestWorld({ stage, seed: 42 });
    const pg = createTestPanelGrid(stage);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    spawnVerticalEntities(world, layout, new SeededRandom(99));
    return world;
  }

  it('scatter produces spread-out positions', () => {
    const world = setupWorld(3);
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('scatter', { fighter: 6 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(6);

    // Positions should be spread (not all in same spot)
    const xs = newEnemies.map((p) => p.x);
    const spread = Math.max(...xs) - Math.min(...xs);
    expect(spread).toBeGreaterThan(10);
  });

  it('v_formation produces converging arrowhead', () => {
    const world = setupWorld(3);
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('v_formation', { fighter: 7 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(7);

    // V-formation: leader at tip, widening rows behind
    // Check that later units are more spread than earlier ones
    const firstTwo = newEnemies.slice(0, 2);
    const lastTwo = newEnemies.slice(-2);
    const firstSpread = Math.abs(firstTwo[0].x - firstTwo[1].x);
    const lastSpread = Math.abs(lastTwo[0].x - lastTwo[1].x);
    expect(lastSpread).toBeGreaterThan(firstSpread);
  });

  it('pincer produces two groups', () => {
    const world = setupWorld(4); // 4 panels = more edges
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('pincer', { fighter: 8 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(8);

    // Pincer: two clusters — check X separation between halves
    const half = Math.ceil(newEnemies.length / 2);
    const group1Avg = newEnemies.slice(0, half).reduce((s, p) => s + p.x, 0) / half;
    const group2Avg =
      newEnemies.slice(half).reduce((s, p) => s + p.x, 0) / (newEnemies.length - half);
    expect(Math.abs(group1Avg - group2Avg)).toBeGreaterThan(50);
  });

  it('line produces vertically stacked positions', () => {
    const world = setupWorld(2);
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('line', { fighter: 5 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(5);

    // Line: X values should be close, Y values should increase
    const xs = newEnemies.map((p) => p.x);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    expect(xSpread).toBeLessThan(80); // Tight horizontal grouping

    const ys = newEnemies.map((p) => p.y);
    expect(ys[ys.length - 1]).toBeGreaterThan(ys[0]); // Y increases
  });

  it('surround distributes across all edges', () => {
    const world = setupWorld(6); // 6 panels = all edges available
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('surround', { fighter: 10 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(10);

    // Surround: wide X spread (units from left, center, right edges)
    const xs = newEnemies.map((p) => p.x);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    expect(xSpread).toBeGreaterThan(200);
  });

  it('same seed produces identical formations', () => {
    const w1 = setupWorld(3);
    const w2 = setupWorld(3);
    // Set same frame count so PRNG seeds match
    w1.frameCount = 1000;
    w2.frameCount = 1000;

    const before1 = getEnemyPositions(w1).length;
    const before2 = getEnemyPositions(w2).length;

    spawnEventEnemies(w1, makeEvent('v_formation'));
    spawnEventEnemies(w2, makeEvent('v_formation'));

    const pos1 = getEnemyPositions(w1).slice(before1);
    const pos2 = getEnemyPositions(w2).slice(before2);

    expect(pos1.length).toBe(pos2.length);
    for (let i = 0; i < pos1.length; i++) {
      expect(pos1[i].x).toBeCloseTo(pos2[i].x, 1);
      expect(pos1[i].y).toBeCloseTo(pos2[i].y, 1);
    }
  });

  it('l_sweep produces curved path along L-shape (stage 3)', () => {
    const world = setupWorld(3); // L-shape: [1,2,5] or [2,3,5]
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('l_sweep', { fighter: 6 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(6);

    // L-sweep: first unit near corner, last near Lodge — Y should increase
    expect(newEnemies[newEnemies.length - 1].y).toBeGreaterThan(newEnemies[0].y);
  });

  it('t_hammer produces center + flank groups (stage 4)', () => {
    const world = setupWorld(4); // T-shape: [1,2,3,5]
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('t_hammer', { fighter: 10 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(10);

    // Hammer: 60% center (6 units), 20% left (2), 20% right (2)
    // Center group should have tighter X spread than the overall spread
    const center = newEnemies.slice(0, 6);
    const centerXs = center.map((p) => p.x);
    const allXs = newEnemies.map((p) => p.x);
    expect(Math.max(...allXs) - Math.min(...allXs)).toBeGreaterThan(
      Math.max(...centerXs) - Math.min(...centerXs),
    );
  });

  it('flank sends units from side panel (stage 5)', () => {
    const world = setupWorld(5); // T+arm: [1,2,3,5,6] or [1,2,3,4,5]
    const beforeCount = getEnemyPositions(world).length;

    spawnEventEnemies(world, makeEvent('flank', { fighter: 8 }));

    const newEnemies = getEnemyPositions(world).slice(beforeCount);
    expect(newEnemies.length).toBe(8);

    // Flank: main from top (y near top), flankers from side (different x range)
    const mainForce = newEnemies.slice(0, 5); // 60%
    const flankers = newEnemies.slice(5);

    // Main force Y should be lower (nearer top) than flanker Y
    const mainAvgY = mainForce.reduce((s, p) => s + p.y, 0) / mainForce.length;
    const flankAvgY = flankers.reduce((s, p) => s + p.y, 0) / flankers.length;
    expect(flankAvgY).toBeGreaterThan(mainAvgY);
  });

  it('events.json templates have valid spawn_pattern values', async () => {
    const events = await import('../../../configs/events.json');
    const validPatterns = new Set([
      'scatter',
      'v_formation',
      'pincer',
      'line',
      'wave',
      'surround',
      'l_sweep',
      't_hammer',
      'flank',
      'funnel',
      undefined,
    ]);

    for (const [_id, template] of Object.entries(events.templates)) {
      const t = template as EventTemplate;
      if (t.spawn_pattern !== undefined) {
        expect(validPatterns.has(t.spawn_pattern)).toBe(true);
      }
    }
  });
});

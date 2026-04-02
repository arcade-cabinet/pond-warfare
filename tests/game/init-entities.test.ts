/**
 * Init Entities — Determinism Tests
 *
 * Verifies that the same mapSeed produces identical entity layouts
 * across multiple runs. This guarantees that seeded randomization
 * within each scenario is truly deterministic.
 */

import { query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { EntityTypeTag, Position, Resource } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { spawnInitialEntities } from '@/game/init-entities';
import type { MapScenario } from '@/ui/store';

interface EntitySnapshot {
  eid: number;
  kind: number;
  x: number;
  y: number;
  resource: number;
}

/** Snapshot all entity positions, kinds, and resource amounts from a world. */
function snapshotEntities(world: GameWorld): EntitySnapshot[] {
  const eids = query(world.ecs, [Position, EntityTypeTag]);
  const result: EntitySnapshot[] = [];
  for (const eid of eids) {
    result.push({
      eid,
      kind: EntityTypeTag.kind[eid],
      x: Position.x[eid],
      y: Position.y[eid],
      resource: Resource.amount[eid] ?? 0,
    });
  }
  return result.sort((a, b) => a.eid - b.eid);
}

/** Create a world with a fixed seed and scenario, then spawn entities. */
function spawnWithSeed(seed: number, scenario: MapScenario): GameWorld {
  const world = createGameWorld();
  world.mapSeed = seed;
  world.scenarioOverride = scenario;
  world.viewWidth = 1280;
  world.viewHeight = 720;
  spawnInitialEntities(world);
  return world;
}

const SCENARIOS: MapScenario[] = [
  'standard',
  'island',
  'contested',
  'labyrinth',
  'river',
  'peninsula',
  'archipelago',
  'ravine',
  'swamp',
];

describe('init-entities determinism', () => {
  const TEST_SEED = 42;

  for (const scenario of SCENARIOS) {
    it(`same seed produces identical layout for "${scenario}"`, () => {
      const worldA = spawnWithSeed(TEST_SEED, scenario);
      const worldB = spawnWithSeed(TEST_SEED, scenario);

      const snapA = snapshotEntities(worldA);
      const snapB = snapshotEntities(worldB);

      expect(snapA.length).toBeGreaterThan(0);
      expect(snapA.length).toBe(snapB.length);

      for (let i = 0; i < snapA.length; i++) {
        expect(snapA[i].kind).toBe(snapB[i].kind);
        expect(snapA[i].x).toBe(snapB[i].x);
        expect(snapA[i].y).toBe(snapB[i].y);
        expect(snapA[i].resource).toBe(snapB[i].resource);
      }
    });
  }

  it('different seeds produce different layouts for "standard"', () => {
    // bitECS SoA arrays are global, so we must snapshot before spawning the
    // second world (which overwrites the same array slots).
    const worldA = spawnWithSeed(TEST_SEED, 'standard');
    const snapA = snapshotEntities(worldA);

    const worldB = spawnWithSeed(TEST_SEED + 1, 'standard');
    const snapB = snapshotEntities(worldB);

    // At least one position should differ
    const hasDifference = snapA.some(
      (a, i) =>
        i < snapB.length && (a.x !== snapB[i].x || a.y !== snapB[i].y || a.kind !== snapB[i].kind),
    );
    expect(hasDifference).toBe(true);
  });
});

/**
 * Tests: Prestige Player Flow
 *
 * Uses world factory. Tests multi-panel spawning at higher tiers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction } from '@/types';

const spawnedEntities: { kind: number; x: number; y: number; faction: number }[] = [];
let nextEid = 1;

vi.mock('@/ecs/archetypes', () => ({
  spawnEntity: vi.fn((_world: unknown, kind: number, x: number, y: number, faction: number) => {
    const eid = nextEid++;
    spawnedEntities.push({ kind, x, y, faction });
    return eid;
  }),
}));

vi.mock('@/ecs/components', () => ({
  resetTransientComponentState: vi.fn(),
  Resource: { amount: {} as Record<number, number> },
  Commander: {
    commanderType: {} as Record<number, number>,
    auraRadius: {} as Record<number, number>,
    auraDamageBonus: {} as Record<number, number>,
    abilityTimer: {} as Record<number, number>,
    abilityCooldown: {} as Record<number, number>,
    isPlayerCommander: {} as Record<number, number>,
  },
  Health: { max: {} as Record<number, number>, current: {} as Record<number, number> },
  Combat: { damage: {} as Record<number, number>, range: {} as Record<number, number> },
  Velocity: { speed: {} as Record<number, number> },
}));

vi.mock('@/config/factions', () => ({
  getFactionConfig: (faction: string) => {
    if (faction === 'predator') {
      return {
        lodgeKind: EntityKind.PredatorNest,
        gathererKind: EntityKind.Gator,
        meleeKind: EntityKind.Gator,
        supportKind: EntityKind.Gator,
        heroKind: EntityKind.Commander,
      };
    }
    return {
      lodgeKind: EntityKind.Lodge,
      gathererKind: MUDPAW_KIND,
      meleeKind: MUDPAW_KIND,
      supportKind: EntityKind.Healer,
      heroKind: EntityKind.Commander,
    };
  },
}));

import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

beforeEach(() => {
  spawnedEntities.length = 0;
  nextEid = 1;
});

describe('Prestige player — multiple panels unlocked', () => {
  it('spawns enemy nests from multiple directions at stage 4', () => {
    const world = createTestWorld({ stage: 4 });
    const pg = createTestPanelGrid(4);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(99));

    const enemyNests = spawnedEntities.filter(
      (e) => e.faction === Faction.Enemy && e.kind === EntityKind.PredatorNest,
    );
    // Stage 4 = T-shape = 3 top panels with enemy spawns = multiple nests
    expect(enemyNests.length).toBeGreaterThanOrEqual(2);
  });

  it.skip('spawns enemy Commander at stage 2+ (needs full ECS context)', () => {
    const world = createTestWorld({ stage: 2 });
    const pg = createTestPanelGrid(2);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const enemyCmdrs = spawnedEntities.filter(
      (e) => e.faction === Faction.Enemy && e.kind === EntityKind.Commander,
    );
    expect(enemyCmdrs.length).toBe(1);
    expect(world.enemyCommanderEntityId).toBeGreaterThan(0);
  });

  it('does NOT spawn enemy Commander at stage 1', () => {
    const world = createTestWorld({ stage: 1 });
    const pg = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const enemyCmdrs = spawnedEntities.filter(
      (e) => e.faction === Faction.Enemy && e.kind === EntityKind.Commander,
    );
    expect(enemyCmdrs.length).toBe(0);
  });

  it('stage 5+ gives starting Rocks', () => {
    const world = createTestWorld({ stage: 5 });
    const pg = createTestPanelGrid(5);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    // Stage 5 formula includes rocks
    expect(world.resources.rocks).toBeGreaterThan(0);
  });

  it('stage 6 gives starting Logs', () => {
    const world = createTestWorld({ stage: 6 });
    const pg = createTestPanelGrid(6);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    expect(world.resources.logs).toBeGreaterThan(0);
  });
});

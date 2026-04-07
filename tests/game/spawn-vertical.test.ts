/**
 * Tests: Vertical Map Entity Spawner
 *
 * Uses the world factory for properly typed worlds.
 * Parameterized by tier where applicable.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityKind, Faction } from '@/types';

// Track spawned entities
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
  getFactionConfig: (_faction: string) => ({
    lodgeKind: EntityKind.Lodge,
    gathererKind: EntityKind.Gatherer,
    meleeKind: EntityKind.Gatherer,
    supportKind: EntityKind.Healer,
    heroKind: EntityKind.Commander,
  }),
}));

import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

beforeEach(() => {
  spawnedEntities.length = 0;
  nextEid = 1;
  vi.clearAllMocks();
});

describe('spawnVerticalEntities', () => {
  it('spawns Lodge at panel 5 bottom center', () => {
    const world = createTestWorld({ stage: 1 });
    const panelGrid = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const lodges = spawnedEntities.filter((e) => e.kind === EntityKind.Lodge);
    expect(lodges).toHaveLength(1);
    expect(lodges[0].x).toBeCloseTo(layout.lodgeX, -1);
    expect(lodges[0].y).toBeCloseTo(layout.lodgeY, -1);
    expect(lodges[0].faction).toBe(Faction.Player);
  });

  it('spawns only Commander (no free units — player trains them)', () => {
    const world = createTestWorld({ stage: 1 });
    const panelGrid = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const playerUnits = spawnedEntities.filter(
      (e) => e.faction === Faction.Player && e.kind !== EntityKind.Lodge,
    );
    expect(playerUnits.length).toBe(1); // Commander only
    expect(playerUnits[0].kind).toBe(EntityKind.Commander);
  });

  it('sets starting Fish from config formula', () => {
    const world = createTestWorld({ stage: 1 });
    const panelGrid = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    // Starting fish should be > 0 (computed from panels.json formula × units.json costs)
    expect(world.resources.fish).toBeGreaterThan(0);
  });

  it('spawns resource nodes per panel biome', () => {
    const world = createTestWorld({ stage: 2 });
    const panelGrid = createTestPanelGrid(2);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const resources = spawnedEntities.filter(
      (e) => e.faction === Faction.Neutral && e.kind !== EntityKind.Frog,
    );
    expect(resources.length).toBeGreaterThan(0);
  });

  it('spawns enemy nests at stage 2+ (not stage 1)', () => {
    // Stage 1: no enemy nests
    const world1 = createTestWorld({ stage: 1 });
    const pg1 = createTestPanelGrid(1);
    const layout1 = generateVerticalMapLayout(pg1, new SeededRandom(42));
    spawnVerticalEntities(world1, layout1, new SeededRandom(42));
    const nests1 = spawnedEntities.filter((e) => e.faction === Faction.Enemy);
    expect(nests1.length).toBe(0);
    expect(world1.waveSurvivalMode).toBe(true);

    // Stage 2: enemy nests present
    spawnedEntities.length = 0;
    nextEid = 1;
    const world2 = createTestWorld({ stage: 2 });
    const pg2 = createTestPanelGrid(2);
    const layout2 = generateVerticalMapLayout(pg2, new SeededRandom(42));
    spawnVerticalEntities(world2, layout2, new SeededRandom(42));
    const nests2 = spawnedEntities.filter((e) => e.faction === Faction.Enemy);
    expect(nests2.length).toBeGreaterThan(0);
  });

  it('spawns wildlife', () => {
    const world = createTestWorld({ stage: 1 });
    const panelGrid = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    const frogs = spawnedEntities.filter((e) => e.kind === EntityKind.Frog);
    expect(frogs.length).toBeGreaterThanOrEqual(3);
  });

  it('sets selection to Lodge', () => {
    const world = createTestWorld({ stage: 1 });
    const panelGrid = createTestPanelGrid(1);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(42));

    expect(world.selection).toContain(lodgeEid);
  });

  it.each([1, 2, 3, 4, 5, 6])('spawns correctly at tier %i', (stage) => {
    spawnedEntities.length = 0;
    nextEid = 1;
    const world = createTestWorld({ stage });
    const panelGrid = createTestPanelGrid(stage);
    const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));

    spawnVerticalEntities(world, layout, new SeededRandom(42));

    // Always has a Lodge
    const lodges = spawnedEntities.filter(
      (e) => e.kind === EntityKind.Lodge && e.faction === Faction.Player,
    );
    expect(lodges).toHaveLength(1);

    // Always has a Commander
    const cmdr = spawnedEntities.filter(
      (e) => e.kind === EntityKind.Commander && e.faction === Faction.Player,
    );
    expect(cmdr).toHaveLength(1);

    // Always has resources
    const resources = spawnedEntities.filter(
      (e) => e.faction === Faction.Neutral && e.kind !== EntityKind.Frog,
    );
    expect(resources.length).toBeGreaterThan(0);

    // Starting Fish > 0
    expect(world.resources.fish).toBeGreaterThan(0);
  });
});

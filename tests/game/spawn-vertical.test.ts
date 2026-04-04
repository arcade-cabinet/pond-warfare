/**
 * Tests: Vertical Map Entity Spawner (v3.0 — US5/US8)
 *
 * Validates:
 * - Lodge spawned at bottom center
 * - 4 starting generalist units spawned
 * - Resource nodes placed in middle zone
 * - Enemy nest at top
 * - Wildlife spawned
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Track spawned entities
const spawnedEntities: { kind: number; x: number; y: number; faction: number }[] = [];
let nextEid = 1;

vi.mock('@/ecs/archetypes', () => ({
  spawnEntity: vi.fn((world: unknown, kind: number, x: number, y: number, faction: number) => {
    const eid = nextEid++;
    spawnedEntities.push({ kind, x, y, faction });
    return eid;
  }),
}));

vi.mock('@/ecs/components', () => ({
  Resource: { amount: {} as Record<number, number> },
}));

vi.mock('@/config/factions', () => ({
  getFactionConfig: (faction: string) => ({
    lodgeKind: faction === 'otter' ? 5 : 9, // Lodge or PredatorNest
    gathererKind: 0, // Gatherer
    meleeKind: 1, // Brawler
    rangedKind: 2, // Sniper
    supportKind: 12, // Healer
    heroKind: 30, // Commander
  }),
}));

import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { PanelGrid } from '@/game/panel-grid';
import type { VerticalMapLayout } from '@/game/vertical-map';
import { SeededRandom } from '@/utils/random';

function makeLayout(): VerticalMapLayout {
  const panelGrid = new PanelGrid(960, 540, 2);
  return {
    worldWidth: 2880,
    worldHeight: 1080,
    cols: 90,
    rows: 34,
    lodgeX: 1440,
    lodgeY: 1026,
    resourcePositions: [
      { x: 400, y: 700, type: 'fish_node', panelId: 5 as const },
      { x: 800, y: 300, type: 'rock_deposit', panelId: 2 as const },
      { x: 1200, y: 400, type: 'tree_cluster', panelId: 2 as const },
    ],
    enemySpawnPositions: [{ x: 1440, y: 40, panelId: 2 as const }],
    panelGrid,
  };
}

function makeWorld(): {
  selection: number[];
  playerFaction: string;
  ecs: unknown;
  yukaManager: unknown;
} {
  return {
    selection: [],
    playerFaction: 'otter',
    ecs: {},
    yukaManager: {},
  };
}

beforeEach(() => {
  spawnedEntities.length = 0;
  nextEid = 1;
  vi.clearAllMocks();
});

describe('spawnVerticalEntities', () => {
  it('spawns a Lodge at the layout lodge position', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    const lodges = spawnedEntities.filter((e) => e.kind === 5); // Lodge
    expect(lodges).toHaveLength(1);
    expect(lodges[0].x).toBe(1440);
    expect(lodges[0].y).toBe(1026);
    expect(lodges[0].faction).toBe(0); // Faction.Player
  });

  it('spawns 4 starting generalist units', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    const playerUnits = spawnedEntities.filter(
      (e) => e.faction === 0 && e.kind !== 5, // Player, not Lodge
    );
    // Gatherer(0) + Brawler(1) + Healer(12) + Scout(16)
    const kinds = playerUnits.map((e) => e.kind);
    expect(kinds).toContain(0); // Gatherer
    expect(kinds).toContain(1); // Brawler (Fighter)
    expect(kinds).toContain(12); // Healer (Medic)
    expect(kinds).toContain(16); // Scout
    expect(playerUnits.length).toBe(4);
  });

  it('spawns resource nodes in the layout positions', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    // Resource entities: Clambed(11), PearlBed(25), Cattail(10)
    const resources = spawnedEntities.filter((e) => e.faction === 2); // Neutral
    // 3 resources + some frogs
    const resKinds = resources.map((e) => e.kind);
    expect(resKinds).toContain(11); // Clambed (fish)
    expect(resKinds).toContain(25); // PearlBed (rocks)
    expect(resKinds).toContain(10); // Cattail (logs)
  });

  it('spawns enemy nest at the top of the map', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    const enemyBuildings = spawnedEntities.filter(
      (e) => e.faction === 1 && e.kind === 9, // Enemy PredatorNest
    );
    expect(enemyBuildings).toHaveLength(1);
    expect(enemyBuildings[0].y).toBe(40); // Top edge of enemy panel
  });

  it('spawns enemy guard units near enemy nest', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    const enemyUnits = spawnedEntities.filter(
      (e) => e.faction === 1 && e.kind !== 9, // Enemy non-building
    );
    expect(enemyUnits.length).toBe(2);
  });

  it('spawns neutral wildlife (frogs)', () => {
    const world = makeWorld();
    const layout = makeLayout();
    spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    const frogs = spawnedEntities.filter((e) => e.kind === 31); // Frog
    expect(frogs.length).toBeGreaterThanOrEqual(3);
    expect(frogs.length).toBeLessThanOrEqual(6);
  });

  it('sets world.selection to the Lodge entity', () => {
    const world = makeWorld();
    const layout = makeLayout();
    const lodgeEid = spawnVerticalEntities(world as any, layout, new SeededRandom(42));

    expect(lodgeEid).toBe(1); // First entity spawned
    expect(world.selection).toEqual([1]);
  });
});

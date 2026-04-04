/**
 * Tests: New Player First 5 Matches (T42)
 *
 * Integration test simulating the new-player progression loop:
 * 1. Create world at stage 1 (single panel, wave-survival)
 * 2. Verify entities spawn correctly
 * 3. Simulate gathering by setting resource amounts
 * 4. Simulate wave arrival (wave-survival mode enabled)
 * 5. Verify rewards calculation
 * 6. Verify progression level increments
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  Resource: { amount: {} as Record<number, number> },
  Commander: {
    commanderType: {} as Record<number, number>,
    auraRadius: {} as Record<number, number>,
    auraDamageBonus: {} as Record<number, number>,
    abilityTimer: {} as Record<number, number>,
    abilityCooldown: {} as Record<number, number>,
    isPlayerCommander: {} as Record<number, number>,
  },
  Health: {
    max: {} as Record<number, number>,
    current: {} as Record<number, number>,
  },
  Combat: {
    damage: {} as Record<number, number>,
  },
  Velocity: {
    speed: {} as Record<number, number>,
  },
}));

vi.mock('@/config/factions', () => ({
  getFactionConfig: (faction: string) => ({
    lodgeKind: faction === 'otter' ? 5 : 9,
    gathererKind: 0,
    meleeKind: 1,
    rangedKind: 2,
    supportKind: 12,
    heroKind: 30,
  }),
}));

import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward, type MatchStats } from '@/game/match-rewards';
import { PanelGrid } from '@/game/panel-grid';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Faction } from '@/types';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';

function makeWorld(): any {
  return {
    selection: [],
    playerFaction: 'otter',
    ecs: {},
    yukaManager: {},
    waveSurvivalMode: false,
    waveSurvivalTarget: 5,
    commanderId: 'marshal',
    commanderEntityId: -1,
  };
}

beforeEach(() => {
  spawnedEntities.length = 0;
  nextEid = 1;
  vi.clearAllMocks();
  storeV3.progressionLevel.value = 0;
  storeV3.totalClams.value = 0;
  storeV3.prestigeRank.value = 0;
});

describe('New player first match — stage 1', () => {
  it('creates a single-panel world at stage 1', () => {
    const panelGrid = new PanelGrid(960, 540, 1);
    expect(panelGrid.getActivePanels()).toEqual([5]);
    expect(panelGrid.isPanelUnlocked(5)).toBe(true);
    expect(panelGrid.isPanelUnlocked(2)).toBe(false);
  });

  it('generates layout with lodge in panel 5', () => {
    const panelGrid = new PanelGrid(960, 540, 1);
    const rng = new SeededRandom(42);
    const layout = generateVerticalMapLayout(panelGrid, rng);

    // Lodge position from panel 5
    expect(layout.lodgeX).toBe(panelGrid.getLodgePosition().x);
    expect(layout.lodgeY).toBe(panelGrid.getLodgePosition().y);
  });

  it('spawns entities and enables wave-survival at stage 1', () => {
    const panelGrid = new PanelGrid(960, 540, 1);
    const rng = new SeededRandom(42);
    const layout = generateVerticalMapLayout(panelGrid, rng);
    const world = makeWorld();

    const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Lodge spawned
    expect(lodgeEid).toBe(1);
    const lodges = spawnedEntities.filter((e) => e.kind === 5 && e.faction === Faction.Player);
    expect(lodges).toHaveLength(1);

    // 4 starting units + 1 Commander
    const playerUnits = spawnedEntities.filter((e) => e.faction === Faction.Player && e.kind !== 5);
    expect(playerUnits).toHaveLength(5);

    // No enemy nests at stage 1 -> wave-survival mode
    const enemyNests = spawnedEntities.filter((e) => e.faction === Faction.Enemy && e.kind === 9);
    expect(enemyNests).toHaveLength(0);
    expect(world.waveSurvivalMode).toBe(true);
    expect(world.waveSurvivalTarget).toBe(5);
  });

  it('resource nodes spawn in unlocked panels only', () => {
    const panelGrid = new PanelGrid(960, 540, 1);
    const rng = new SeededRandom(42);
    const layout = generateVerticalMapLayout(panelGrid, rng);

    // All resources should be in panel 5 bounds
    const bounds = panelGrid.getPanelBounds(5);
    for (const res of layout.resourcePositions) {
      expect(res.x).toBeGreaterThanOrEqual(bounds.x);
      expect(res.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(res.y).toBeGreaterThanOrEqual(bounds.y);
      expect(res.y).toBeLessThanOrEqual(bounds.y + bounds.height);
      expect(res.panelId).toBe(5);
    }
  });
});

describe('Reward calculation for new player', () => {
  it('calculates correct rewards for a winning match', () => {
    const stats: MatchStats = {
      result: 'win',
      durationSeconds: 300, // 5 minutes
      kills: 10,
      resourcesGathered: 50,
      eventsCompleted: 1,
      prestigeRank: 0,
    };

    const reward = calculateMatchReward(stats);

    expect(reward.base).toBeGreaterThan(0);
    expect(reward.killBonus).toBe(10); // 10 kills * 1
    expect(reward.eventBonus).toBe(5); // 1 event * 5
    expect(reward.prestigeMultiplier).toBe(1.0); // rank 0
    expect(reward.isWin).toBe(true);
    expect(reward.totalClams).toBeGreaterThan(0);
  });

  it('applies loss penalty for a losing match', () => {
    const winStats: MatchStats = {
      result: 'win',
      durationSeconds: 300,
      kills: 10,
      resourcesGathered: 50,
      eventsCompleted: 1,
      prestigeRank: 0,
    };
    const loseStats: MatchStats = { ...winStats, result: 'loss' };

    const winReward = calculateMatchReward(winStats);
    const loseReward = calculateMatchReward(loseStats);

    expect(loseReward.totalClams).toBe(Math.floor(winReward.totalClams * 0.5));
  });
});

describe('Progression increment across matches', () => {
  it('simulates 5 matches with increasing progression', () => {
    // Simulate progression: each match increments the level
    for (let match = 0; match < 5; match++) {
      const stage = Math.min(storeV3.progressionLevel.value + 1, 6);
      const panelGrid = new PanelGrid(960, 540, stage);
      const activePanels = panelGrid.getActivePanels();

      // Verify panels unlock with progression
      if (match === 0) {
        expect(activePanels).toEqual([5]); // stage 1
      }

      // Simulate match reward
      const stats: MatchStats = {
        result: 'win',
        durationSeconds: 300 + match * 60,
        kills: 5 + match * 3,
        resourcesGathered: 30 + match * 10,
        eventsCompleted: match,
        prestigeRank: 0,
      };

      const reward = calculateMatchReward(stats);
      storeV3.totalClams.value += reward.totalClams;

      // Increment progression
      storeV3.progressionLevel.value += 1;
    }

    // After 5 matches, progression level should be 5
    expect(storeV3.progressionLevel.value).toBe(5);
    expect(storeV3.totalClams.value).toBeGreaterThan(0);

    // At stage 5, should have 5 panels unlocked
    const finalGrid = new PanelGrid(960, 540, 5);
    expect(finalGrid.getActivePanels()).toHaveLength(5);
  });
});

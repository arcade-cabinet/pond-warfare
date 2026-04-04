/**
 * Tests: Prestige Player Flow (T43)
 *
 * Integration test simulating a prestige rank 3 player:
 * - Verify prestige state with Pearl upgrades
 * - Auto-deploy specialists at match start
 * - Multiple panels unlocked at high progression
 * - Enemy spawns from multiple directions
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

import { getAutoDeployUnits, getStatMultiplier, type PrestigeState } from '@/config/prestige-logic';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward, type MatchStats } from '@/game/match-rewards';
import { PanelGrid } from '@/game/panel-grid';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Faction } from '@/types';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';

function makePrestigeState(): PrestigeState {
  return {
    rank: 3,
    pearls: 15,
    totalPearlsEarned: 30,
    upgradeRanks: {
      auto_deploy_fisher: 2,
      auto_deploy_guardian: 1,
      gather_multiplier: 3,
    },
  };
}

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
  storeV3.prestigeRank.value = 3;
  storeV3.progressionLevel.value = 4;
  storeV3.totalClams.value = 100;
});

describe('Prestige player state', () => {
  it('has correct prestige rank and Pearl upgrades', () => {
    const state = makePrestigeState();
    expect(state.rank).toBe(3);
    expect(state.pearls).toBe(15);
    expect(state.upgradeRanks.auto_deploy_fisher).toBe(2);
    expect(state.upgradeRanks.auto_deploy_guardian).toBe(1);
  });

  it('resolves auto-deploy units from Pearl upgrades', () => {
    const state = makePrestigeState();
    const deploySpecs = getAutoDeployUnits(state);

    expect(deploySpecs.length).toBeGreaterThan(0);

    const fisherDeploy = deploySpecs.find((d) => d.unitId === 'fisher');
    expect(fisherDeploy).toBeDefined();
    expect(fisherDeploy?.count).toBe(2); // 2 ranks * 1 per rank

    const guardianDeploy = deploySpecs.find((d) => d.unitId === 'guardian');
    expect(guardianDeploy).toBeDefined();
    expect(guardianDeploy?.count).toBe(1); // 1 rank * 1 per rank
  });

  it('applies stat multipliers from Pearl upgrades', () => {
    const state = makePrestigeState();
    const gatherMult = getStatMultiplier(state, 'gathering_speed');

    // 3 ranks * 0.05 per rank = 0.15 bonus -> 1.15
    expect(gatherMult).toBeCloseTo(1.15);
  });
});

describe('Prestige player — multiple panels unlocked', () => {
  it('at progression level 4 (T-shape), 4 panels are unlocked', () => {
    const panelGrid = new PanelGrid(960, 540, 4);
    const active = panelGrid.getActivePanels();

    // Stage 4: panels 5, 2, 1, 3 (T-shape)
    expect(active).toHaveLength(4);
    expect(active).toContain(5);
    expect(active).toContain(2);
    expect(active).toContain(1);
    expect(active).toContain(3);
  });

  it('enemy nests spawn in multiple enemy-spawn panels', () => {
    const panelGrid = new PanelGrid(960, 540, 4);
    const rng = new SeededRandom(42);
    const layout = generateVerticalMapLayout(panelGrid, rng);

    // At stage 4, panels 1, 2, 3 all have enemy_spawn=true
    const spawnPanels = new Set(layout.enemySpawnPositions.map((s) => s.panelId));
    expect(spawnPanels.size).toBeGreaterThanOrEqual(2);

    // Verify enemy spawns are at top edges of enemy panels
    for (const spawn of layout.enemySpawnPositions) {
      const bounds = panelGrid.getPanelBounds(spawn.panelId);
      expect(spawn.y).toBeCloseTo(bounds.y + 40, -1);
    }
  });

  it('spawns enemy nests from multiple directions at stage 4', () => {
    const panelGrid = new PanelGrid(960, 540, 4);
    const rng = new SeededRandom(42);
    const layout = generateVerticalMapLayout(panelGrid, rng);
    const world = makeWorld();

    spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Enemy nests should come from multiple panels
    const enemyNests = spawnedEntities.filter((e) => e.faction === Faction.Enemy && e.kind === 9);
    expect(enemyNests.length).toBeGreaterThanOrEqual(2);

    // No wave-survival mode since there are enemy nests
    expect(world.waveSurvivalMode).toBe(false);
  });
});

describe('Prestige player — rewards with prestige multiplier', () => {
  it('prestige rank 3 gives 1.3x reward multiplier', () => {
    const stats: MatchStats = {
      result: 'win',
      durationSeconds: 600,
      kills: 30,
      resourcesGathered: 200,
      eventsCompleted: 3,
      prestigeRank: 3,
    };

    const reward = calculateMatchReward(stats);

    expect(reward.prestigeMultiplier).toBeCloseTo(1.3);
    expect(reward.totalClams).toBe(Math.floor(reward.subtotal * 1.3));
    expect(reward.totalClams).toBeGreaterThan(reward.subtotal);
  });
});

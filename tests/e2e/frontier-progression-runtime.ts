// @vitest-environment jsdom

import { query } from 'bitecs';
import { vi } from 'vitest';
import type { BalanceSnapshot } from '@/balance/progression-model';
import { createPrestigeState } from '@/config/prestige-logic';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { fogOfWarSystem, initFogOfWar, resetFogOfWar } from '@/ecs/systems/fog-of-war';
import { getEventsCompletedCount, resetMatchEventRunner } from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { getCurrentRunPanelStage } from '@/ui/current-run-diamond-effects';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as storeV3 from '@/ui/store-v3';
import type { UpgradeWebPurchaseState } from '@/ui/upgrade-web-state';
import { SeededRandom } from '@/utils/random';
import { createExploredTestContext } from '../helpers/explored-context';
import { getPlayerFortificationSnapshot } from '../helpers/fortification-snapshot';
import { mockedGameRef } from '../helpers/game-world-ref';
import { syncGovernorSignals } from '../helpers/governor-sync';
import { runSimFrame } from '../helpers/run-sim-frame';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

vi.mock('@/game', () => ({
  game: new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'world') return mockedGameRef.world;
      return undefined;
    },
  }),
}));
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

export interface MatchRunResult {
  activePanels: number;
  earnedClams: number;
  snapshot: BalanceSnapshot;
  state: string;
}

function getAliveEnemyNestHp(world: GameWorld): number {
  return Array.from(query(world.ecs, [Health, EntityTypeTag])).reduce((sum, eid) => {
    if (EntityTypeTag.kind[eid] !== EntityKind.PredatorNest) return sum;
    if (Health.current[eid] <= 0) return sum;
    return sum + Health.current[eid];
  }, 0);
}

export function runFrontierMatch(
  seed: number,
  state: UpgradeWebPurchaseState,
  frames: number,
  options: { forcedStage?: number } = {},
): MatchRunResult {
  resetAutoSymbol();
  resetMatchEventRunner();
  const panelStage =
    options.forcedStage ?? getCurrentRunPanelStage(Array.from(state.purchasedDiamonds));

  storeV3.progressionLevel.value = panelStage;
  storeV3.prestigeState.value = createPrestigeState();
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = Array.from(state.purchasedNodes);
  storeV3.currentRunPurchasedDiamondIds.value = Array.from(state.purchasedDiamonds);

  const world = createTestWorld({ stage: panelStage, seed, fish: 200 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(panelStage, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed));
  const upgradeState = buildCurrentRunUpgradeState({
    clams: state.clams,
    purchasedNodeIds: Array.from(state.purchasedNodes),
    purchasedDiamondIds: Array.from(state.purchasedDiamonds),
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, createPrestigeState());
  spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  const initialEnemyNestHp = getAliveEnemyNestHp(world);
  resetFogOfWar();
  initFogOfWar(createExploredTestContext(world.worldWidth, world.worldHeight));
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < frames; frame += 1) {
    runSimFrame(world, {
      governor,
      runMatchEvents: true,
      runPrestigeAutoBehaviors: true,
      syncSignals: true,
    });
    fogOfWarSystem(world);
  }

  const result = snapshotWorld(world, initialEnemyNestHp);
  resetFogOfWar();
  return result;
}

function snapshotWorld(world: GameWorld, initialEnemyNestHp: number): MatchRunResult {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      EntityTypeTag.kind[eid] !== EntityKind.Lodge &&
      !BUILDING_KINDS.has(EntityTypeTag.kind[eid]),
  );
  const currentHp = playerUnits.reduce((sum, eid) => sum + Health.current[eid], 0);
  const maxHp = playerUnits.reduce((sum, eid) => sum + Health.max[eid], 0);
  const fortificationSnapshot = getPlayerFortificationSnapshot(world);
  const earnedClams = calculateMatchReward({
    result: world.state === 'lose' ? 'loss' : 'win',
    durationSeconds: Math.round(world.frameCount / 60),
    kills: world.stats.unitsKilled,
    resourcesGathered: world.stats.resourcesGathered,
    eventsCompleted: getEventsCompletedCount(),
    prestigeRank: 0,
    earningsMultiplier: world.clamRewardMultiplier,
  }).totalClams;

  return {
    activePanels: world.panelGrid?.getActivePanels().length ?? 0,
    earnedClams,
    state: world.state,
    snapshot: {
      resourcesGathered: world.stats.resourcesGathered,
      resourcesStockpiled: world.resources.fish + world.resources.logs + world.resources.rocks,
      unitsTrained: world.stats.unitsTrained,
      kills: world.stats.unitsKilled,
      playerUnits: playerUnits.length,
      playerUnitHpPool: currentHp,
      playerUnitHpRatio: maxHp > 0 ? currentHp / maxHp : 0,
      ...fortificationSnapshot,
      exploredPercent: world.exploredPercent,
      enemyNestHpRemovedRatio:
        initialEnemyNestHp > 0
          ? Math.min(1, Math.max(0, 1 - getAliveEnemyNestHp(world) / initialEnemyNestHp))
          : 0,
      lodgeHpRatio:
        lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge],
      matchClamsEarned: earnedClams,
    },
  };
}

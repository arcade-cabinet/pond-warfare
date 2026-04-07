// @vitest-environment jsdom

import { query } from 'bitecs';
import { vi } from 'vitest';
import { type BalanceSnapshot } from '@/balance/progression-model';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoSymbolSystem, resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import {
  getEventsCompletedCount,
  matchEventRunnerSystem,
  resetMatchEventRunner,
} from '@/ecs/systems/match-event-runner';
import { movementSystem } from '@/ecs/systems/movement';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { createPrestigeState } from '@/config/prestige-logic';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { getCurrentRunPanelStage } from '@/ui/current-run-diamond-effects';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import { type UpgradeWebPurchaseState } from '@/ui/upgrade-web-state';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { mockedGameRef } from '../helpers/game-world-ref';
import { syncGovernorSignals } from '../helpers/governor-sync';
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

export function runFrontierMatch(
  seed: number,
  state: UpgradeWebPurchaseState,
  frames: number,
  options: { forcedStage?: number } = {},
): MatchRunResult {
  resetAutoSymbol();
  resetMatchEventRunner();
  const panelStage = options.forcedStage ?? getCurrentRunPanelStage(Array.from(state.purchasedDiamonds));

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
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < frames; frame += 1) {
    runFrame(world, governor);
  }

  return snapshotWorld(world);
}

function runFrame(world: GameWorld, governor: Governor): void {
  world.frameCount++;
  world.yukaManager.update(1 / 60, world.ecs);
  world.spatialHash.clear();
  for (const eid of query(world.ecs, [Position, Health])) {
    if (Health.current[eid] > 0) {
      world.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
    }
  }

  weatherSystem(world);
  movementSystem(world);
  gatheringSystem(world);
  combatSystem(world);
  commanderPassivesSystem(world);
  trainingSystem(world);
  aiSystem(world);
  evolutionSystem(world);
  autoTrainSystem(world);
  healthSystem(world);
  matchEventRunnerSystem(world, storeV3.progressionLevel.value);
  autoSymbolSystem(world);
  cleanupSystem(world);

  if (world.frameCount % 30 === 0) {
    syncGovernorSignals(world);
  }

  governor.tick();
}

function snapshotWorld(world: GameWorld): MatchRunResult {
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
      lodgeHpRatio:
        lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge],
      matchClamsEarned: earnedClams,
    },
  };
}

// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
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
import { matchEventRunnerSystem, resetMatchEventRunner } from '@/ecs/systems/match-event-runner';
import { movementSystem } from '@/ecs/systems/movement';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { createPrestigeState } from '@/config/prestige-logic';
import { SeededRandom } from '@/utils/random';
import { syncGovernorSignals } from '../helpers/governor-sync';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

const _gameRef: { world: GameWorld | null } = { world: null };
vi.mock('@/game', () => ({
  game: new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'world') return _gameRef.world;
      return undefined;
    },
  }),
}));
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

interface BaselineMetrics {
  stage: number;
  state: string;
  lodgeHp: number;
  resourcesGathered: number;
  unitsTrained: number;
  kills: number;
  playerUnits: number;
  gatherSpeedMod: number;
  activePanels: number;
}

function countAlive(world: GameWorld, faction: Faction): number {
  return Array.from(query(world.ecs, [Health, FactionTag])).filter(
    (eid) => FactionTag.faction[eid] === faction && Health.current[eid] > 0,
  ).length;
}

function getPlayerLodgeHp(world: GameWorld): number {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  return lodge == null ? -1 : Health.current[lodge];
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

function runScenario(stage: number, purchasedNodeIds: string[] = []): BaselineMetrics {
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = stage;
  storeV3.prestigeState.value = createPrestigeState();
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = purchasedNodeIds;
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage, seed: 42, fish: 200 });
  world.peaceTimer = 0;
  _gameRef.world = world;

  const panelGrid = createTestPanelGrid(stage);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42));
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 999,
    purchasedNodeIds,
    purchasedDiamondIds: [],
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, createPrestigeState());
  spawnVerticalEntities(world, layout, new SeededRandom(99));
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;

  for (let frame = 0; frame < 1800; frame += 1) {
    runFrame(world, governor);
  }

  return {
    stage,
    state: world.state,
    lodgeHp: getPlayerLodgeHp(world),
    resourcesGathered: world.stats.resourcesGathered,
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits: countAlive(world, Faction.Player),
    gatherSpeedMod: world.gatherSpeedMod,
    activePanels: world.panelGrid?.getActivePanels().length ?? 0,
  };
}

describe('baseline stage viability', () => {
  it.each([1, 2, 3, 4, 5, 6])(
    'stage %i stays playable for a fresh run without Clams or Pearls',
    (stage) => {
      const metrics = runScenario(stage);
      console.table([metrics]);

      expect(metrics.activePanels).toBe(stage);
      expect(metrics.gatherSpeedMod).toBe(1);
      expect(metrics.state).not.toBe('lose');
      expect(metrics.lodgeHp).toBeGreaterThan(0);
      expect(metrics.resourcesGathered).toBeGreaterThan(0);
      expect(metrics.unitsTrained).toBeGreaterThan(0);
      expect(metrics.playerUnits).toBeGreaterThanOrEqual(2);
    },
  );

  it('Clam upgrades improve margin instead of providing baseline viability', () => {
    const baseline = runScenario(6);
    const reliefValve = runScenario(6, [
      'gathering_fish_gathering_t0',
      'gathering_fish_gathering_t1',
      'defense_wall_hp_t0',
      'economy_node_yield_t0',
    ]);

    console.table([baseline, reliefValve]);

    expect(baseline.state).not.toBe('lose');
    expect(reliefValve.state).not.toBe('lose');
    expect(reliefValve.gatherSpeedMod).toBeGreaterThan(baseline.gatherSpeedMod);
    expect(reliefValve.resourcesGathered * reliefValve.gatherSpeedMod).toBeGreaterThan(
      baseline.resourcesGathered * baseline.gatherSpeedMod,
    );
  });
});

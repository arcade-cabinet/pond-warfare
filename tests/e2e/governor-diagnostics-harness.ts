import { query } from 'bitecs';
import { isAutoBehaviorUnlocked, type PrestigeState } from '@/config/prestige-logic';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import { resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { resetMatchEventRunner } from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import type { Governor } from '@/governor/governor';
import { EntityKind, Faction, type UnitState } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { mockedGameRef } from '../helpers/game-world-ref';
import { syncGovernorSignals } from '../helpers/governor-sync';
import { runSimFrame } from '../helpers/run-sim-frame';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

export function runGovernorFrame(world: GameWorld, governor: Governor): void {
  runSimFrame(world, {
    governor,
    runMatchEvents: true,
    runPrestigeAutoBehaviors: true,
    syncSignals: true,
  });
}

export function createGovernorTraceWorld(
  prestigeState: PrestigeState,
  seed: number,
  stage: number,
): GameWorld {
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = stage;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage, seed, fish: 200 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(stage, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed), {
    hasRareResourceAccess: isAutoBehaviorUnlocked(prestigeState, 'rare_resource_access'),
  });
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 999,
    purchasedNodeIds: [],
    purchasedDiamondIds: [],
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);
  const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);
  return world;
}

export function combatArmySize(): number {
  return store.unitRoster.value
    .filter((group) => group.role === 'combat')
    .reduce((sum, group) => sum + group.units.length, 0);
}

export function lodgeHpRatio(world: GameWorld): number {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  if (lodge == null || Health.max[lodge] <= 0) return 0;
  return Health.current[lodge] / Health.max[lodge];
}

export function countTaskUnits(world: GameWorld, task: UnitState): number {
  return Array.from(query(world.ecs, [Health, FactionTag, TaskOverride, UnitStateMachine])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      TaskOverride.task[eid] === task,
  ).length;
}

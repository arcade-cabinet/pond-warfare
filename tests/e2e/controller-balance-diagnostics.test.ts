// @vitest-environment jsdom

import { hasComponent, query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  createPrestigeState,
  isAutoBehaviorUnlocked,
  type PrestigeState,
} from '@/config/prestige-logic';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TaskOverride,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { AttackGoal, MIN_ATTACK_ARMY } from '@/governor/goals/attack-goal';
import { BuildGoal } from '@/governor/goals/build-goal';
import { DefendGoal } from '@/governor/goals/defend-goal';
import { GatherGoal } from '@/governor/goals/gather-goal';
import { TrainGoal } from '@/governor/goals/train-goal';
import { EntityKind, Faction, UnitState } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
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

const GATHER_CONTROLLER_SEED = 101;
const BUILD_CONTROLLER_SEED = 201;
const TRAIN_CONTROLLER_SEED = 301;
const DEFEND_CONTROLLER_SEED = 401;
const ATTACK_CONTROLLER_SEED = 501;
const CONTROLLER_DIAGNOSTICS_TIMEOUT = 90_000;

function tickWorld(world: GameWorld): void {
  runSimFrame(world, { runMatchEvents: false, runPrestigeAutoBehaviors: true, syncSignals: false });
}

function setupWorld(
  stage: number,
  seed: number,
  fish: number,
  logs: number,
  prestigeState: PrestigeState,
  startingTierRank = 0,
): { world: GameWorld; lodgeEid: number; rareNodeCount: number } {
  storeV3.progressionLevel.value = stage;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = startingTierRank;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage, seed, fish, logs });
  world.peaceTimer = Number.MAX_SAFE_INTEGER;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(stage, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed), {
    hasRareResourceAccess: isAutoBehaviorUnlocked(prestigeState, 'rare_resource_access'),
  });
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 0,
    purchasedNodeIds: [],
    purchasedDiamondIds: [],
    startingTierRank,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);
  const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);
  return {
    world,
    lodgeEid,
    rareNodeCount: layout.resourcePositions.filter(
      (pos: { type: string }) => pos.type === 'rare_node',
    ).length,
  };
}

function setupMicroWorld(
  seed: number,
  fish: number,
  logs: number,
  prestigeState: PrestigeState,
  startingTierRank = 0,
): { world: GameWorld; lodgeEid: number } {
  storeV3.progressionLevel.value = 1;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = startingTierRank;
  const world = createTestWorld({ stage: 1, seed, fish, logs });
  world.peaceTimer = Number.MAX_SAFE_INTEGER;
  mockedGameRef.world = world;
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 0,
    purchasedNodeIds: [],
    purchasedDiamondIds: [],
    startingTierRank,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);
  const lodgeEid = spawnEntity(world, EntityKind.Lodge, 320, 460, Faction.Player);
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);
  return { world, lodgeEid };
}

function spawnPlayerMudpaws(world: GameWorld, lodgeEid: number, count: number): number[] {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  return Array.from({ length: count }, (_, index) =>
    spawnEntity(world, MUDPAW_KIND, lodgeX - 70 + index * 25, lodgeY - 40, Faction.Player),
  );
}

function spawnResourceNode(world: GameWorld, kind: EntityKind, x: number, y: number): void {
  spawnEntity(world, kind, x, y, Faction.Neutral);
}

function runGoalLoop(
  world: GameWorld,
  createGoal: () => { activate(): void },
  frames: number,
): void {
  for (let frame = 0; frame < frames; frame += 1) {
    if (frame % 120 === 0) {
      syncGovernorSignals(world);
      createGoal().activate();
    }
    tickWorld(world);
  }
  syncGovernorSignals(world);
}

function countLiving(world: GameWorld, kind: EntityKind, faction: Faction): number {
  return Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health])).filter(
    (eid) =>
      EntityTypeTag.kind[eid] === kind &&
      FactionTag.faction[eid] === faction &&
      Health.current[eid] > 0,
  ).length;
}

function countLivingPlayerFieldUnits(world: GameWorld): number {
  return Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health])).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource)) {
      return false;
    }
    return true;
  }).length;
}

function findPlayerLodge(world: GameWorld): number {
  const lodge = Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health])).find(
    (eid) =>
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0,
  );
  if (lodge == null) throw new Error('Player lodge not found');
  return lodge;
}

function seedAttackSkirmish(world: GameWorld, lodgeEid: number): void {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  spawnEntity(world, MUDPAW_KIND, lodgeX - 60, lodgeY - 50, Faction.Player);
  spawnEntity(world, MUDPAW_KIND, lodgeX - 20, lodgeY - 64, Faction.Player);
  spawnEntity(world, SAPPER_KIND, lodgeX + 20, lodgeY - 56, Faction.Player);
  spawnEntity(world, SAPPER_KIND, lodgeX + 60, lodgeY - 44, Faction.Player);
  for (let i = 0; i < 6; i += 1) {
    spawnEntity(
      world,
      i % 2 === 0 ? EntityKind.Gator : EntityKind.Snake,
      lodgeX - 50 + i * 20,
      lodgeY - 280 - i * 10,
      Faction.Enemy,
    );
  }
}

function seedDefendPressure(world: GameWorld, lodgeEid: number): void {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  Health.current[lodgeEid] = Math.round(Health.max[lodgeEid] * 0.6);
  const defenders = [
    spawnEntity(world, MUDPAW_KIND, lodgeX - 70, lodgeY - 35, Faction.Player),
    spawnEntity(world, MUDPAW_KIND, lodgeX - 25, lodgeY - 52, Faction.Player),
    spawnEntity(world, SAPPER_KIND, lodgeX + 18, lodgeY - 48, Faction.Player),
    spawnEntity(world, SAPPER_KIND, lodgeX + 60, lodgeY - 34, Faction.Player),
  ];
  for (const eid of defenders) {
    Health.current[eid] = Math.round(Health.max[eid] * 0.65);
  }
  for (let i = 0; i < 6; i += 1) {
    spawnEntity(
      world,
      i % 2 === 0 ? EntityKind.Snake : EntityKind.Gator,
      lodgeX - 90 + i * 35,
      lodgeY - 130,
      Faction.Enemy,
    );
  }
}

describe('controller balance diagnostics', () => {
  it(
    'profiles gather, build, train, defend, and attack controllers separately',
    () => {
      const rankOne = { ...createPrestigeState(), rank: 1 };

      const gatherRows = [
        { name: 'baseline', prestigeState: rankOne },
        {
          name: 'gather_multiplier',
          prestigeState: { ...rankOne, upgradeRanks: { gather_multiplier: 2 } },
        },
        {
          name: 'blueprint_fisher',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_fisher: 1 } },
        },
        {
          name: 'fisher_radius',
          prestigeState: {
            ...rankOne,
            upgradeRanks: { blueprint_fisher: 1, fisher_radius: 2 },
          },
        },
        {
          name: 'blueprint_digger',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_digger: 1 } },
        },
        {
          name: 'blueprint_logger',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_logger: 1 } },
        },
        {
          name: 'rare_resource_access',
          prestigeState: { ...rankOne, upgradeRanks: { rare_resource_access: 1 } },
        },
      ].map((variant) => {
        const { world, lodgeEid, rareNodeCount } = setupWorld(
          6,
          GATHER_CONTROLLER_SEED,
          300,
          0,
          variant.prestigeState,
        );
        spawnPlayerMudpaws(world, lodgeEid, 4);
        runGoalLoop(world, () => new GatherGoal(), 1200);
        return {
          name: variant.name,
          rareNodeCount,
          gatherSpeedMod: world.gatherSpeedMod,
          gathered: world.stats.resourcesGathered,
          fish: world.resources.fish,
          logs: world.resources.logs,
          rocks: world.resources.rocks,
        };
      });

      const buildRows = [
        { name: 'baseline', prestigeState: rankOne, startingTierRank: 0 },
        {
          name: 'gather_multiplier',
          prestigeState: { ...rankOne, upgradeRanks: { gather_multiplier: 2 } },
          startingTierRank: 0,
        },
        {
          name: 'starting_tier_1',
          prestigeState: { ...rankOne, upgradeRanks: { starting_tier: 1 } },
          startingTierRank: 1,
        },
      ].map((variant) => {
        const { world, lodgeEid } = setupMicroWorld(
          BUILD_CONTROLLER_SEED,
          170,
          110,
          variant.prestigeState,
          variant.startingTierRank,
        );
        spawnResourceNode(world, EntityKind.Clambed, 230, 360);
        spawnResourceNode(world, EntityKind.Clambed, 410, 360);
        spawnResourceNode(world, EntityKind.Cattail, 260, 320);
        spawnResourceNode(world, EntityKind.Cattail, 380, 320);
        const mudpaws = spawnPlayerMudpaws(world, lodgeEid, 4);
        dispatchTaskOverride(world, mudpaws[0], 'gathering-fish');
        dispatchTaskOverride(world, mudpaws[1], 'gathering-fish');
        dispatchTaskOverride(world, mudpaws[2], 'gathering-logs');
        dispatchTaskOverride(world, mudpaws[3], 'gathering-logs');
        let armoryFrame = -1;
        for (let frame = 0; frame < 1200; frame += 1) {
          if (frame % 120 === 0) {
            syncGovernorSignals(world);
            new BuildGoal().activate();
          }
          tickWorld(world);
          if (armoryFrame === -1 && countLiving(world, EntityKind.Armory, Faction.Player) > 0)
            armoryFrame = frame;
        }
        return {
          name: variant.name,
          armoryFrame,
          buildingsBuilt: world.stats.buildingsBuilt,
          fish: world.resources.fish,
          logs: world.resources.logs,
        };
      });

      const trainRows = [
        { name: 'baseline', prestigeState: rankOne, startingTierRank: 0 },
        {
          name: 'blueprint_fisher',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_fisher: 1 } },
          startingTierRank: 0,
        },
        {
          name: 'gather_multiplier',
          prestigeState: { ...rankOne, upgradeRanks: { gather_multiplier: 2 } },
          startingTierRank: 0,
        },
        {
          name: 'starting_tier_1',
          prestigeState: { ...rankOne, upgradeRanks: { starting_tier: 1 } },
          startingTierRank: 1,
        },
      ].map((variant) => {
        const { world, lodgeEid } = setupWorld(
          6,
          TRAIN_CONTROLLER_SEED,
          40,
          0,
          variant.prestigeState,
          variant.startingTierRank,
        );
        const mudpaws = spawnPlayerMudpaws(world, lodgeEid, 4);
        for (const mudpaw of mudpaws) dispatchTaskOverride(world, mudpaw, 'gathering-fish');
        runGoalLoop(world, () => new TrainGoal(), 1500);
        return {
          name: variant.name,
          unitsTrained: world.stats.unitsTrained,
          playerUnits: countLivingPlayerFieldUnits(world),
          fish: world.resources.fish,
        };
      });

      const defendRows = [
        { name: 'baseline', prestigeState: rankOne },
        {
          name: 'blueprint_shaman',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_shaman: 1 } },
        },
        {
          name: 'shaman_radius',
          prestigeState: {
            ...rankOne,
            upgradeRanks: { blueprint_shaman: 1, shaman_radius: 2 },
          },
        },
        {
          name: 'auto_repair_behavior',
          prestigeState: { ...rankOne, upgradeRanks: { auto_repair_behavior: 1 } },
        },
        {
          name: 'hp_multiplier',
          prestigeState: { ...rankOne, upgradeRanks: { hp_multiplier: 1 } },
        },
        {
          name: 'auto_heal_behavior',
          prestigeState: { ...rankOne, upgradeRanks: { auto_heal_behavior: 1 } },
        },
      ].map((variant) => {
        const { world, lodgeEid } = setupWorld(
          3,
          DEFEND_CONTROLLER_SEED,
          80,
          0,
          variant.prestigeState,
        );
        seedDefendPressure(world, lodgeEid);
        runGoalLoop(world, () => new DefendGoal(), 900);
        const liveLodge = findPlayerLodge(world);
        return {
          name: variant.name,
          lodgeHpRatio: Number((Health.current[liveLodge] / Health.max[liveLodge]).toFixed(3)),
          kills: world.stats.unitsKilled,
        };
      });

      const attackRows = [
        { name: 'baseline', prestigeState: rankOne },
        {
          name: 'combat_multiplier',
          prestigeState: { ...rankOne, upgradeRanks: { combat_multiplier: 1 } },
        },
        {
          name: 'blueprint_guard',
          prestigeState: { ...rankOne, upgradeRanks: { blueprint_guard: 1 } },
        },
      ].map((variant) => {
        const { world, lodgeEid } = setupMicroWorld(
          ATTACK_CONTROLLER_SEED,
          120,
          0,
          variant.prestigeState,
        );
        seedAttackSkirmish(world, lodgeEid);
        let maxCommitted = 0;
        for (let frame = 0; frame < 900; frame += 1) {
          if (frame % 120 === 0) {
            syncGovernorSignals(world);
            new AttackGoal().activate();
          }
          tickWorld(world);
          const committed = Array.from(query(world.ecs, [FactionTag, Health])).filter(
            (eid) =>
              FactionTag.faction[eid] === Faction.Player &&
              Health.current[eid] > 0 &&
              TaskOverride.task[eid] === UnitState.AttackMove,
          ).length;
          maxCommitted = Math.max(maxCommitted, committed);
        }
        return {
          name: variant.name,
          kills: world.stats.unitsKilled,
          committed: maxCommitted,
          enemiesLeft:
            countLiving(world, EntityKind.Gator, Faction.Enemy) +
            countLiving(world, EntityKind.Snake, Faction.Enemy),
        };
      });

      console.log('\nGather controller diagnostics');
      console.table(gatherRows);
      console.log('\nBuild controller diagnostics');
      console.table(buildRows);
      console.log('\nTrain controller diagnostics');
      console.table(trainRows);
      console.log('\nDefend controller diagnostics');
      console.table(defendRows);
      console.log('\nAttack controller diagnostics');
      console.table(attackRows);

      expect(
        gatherRows.find((row) => row.name === 'gather_multiplier')?.gatherSpeedMod,
      ).toBeGreaterThan(gatherRows[0].gatherSpeedMod);
      expect(gatherRows.find((row) => row.name === 'blueprint_fisher')?.fish).toBeGreaterThan(
        gatherRows[0].fish,
      );
      expect(gatherRows.find((row) => row.name === 'fisher_radius')?.fish).toBeGreaterThanOrEqual(
        gatherRows.find((row) => row.name === 'blueprint_fisher')?.fish ?? 0,
      );
      expect(gatherRows.find((row) => row.name === 'blueprint_digger')?.rocks).toBeGreaterThan(
        gatherRows[0].rocks,
      );
      expect(gatherRows.find((row) => row.name === 'blueprint_logger')?.logs).toBeGreaterThan(
        gatherRows[0].logs,
      );
      expect(
        gatherRows.find((row) => row.name === 'rare_resource_access')?.rareNodeCount,
      ).toBeGreaterThan(gatherRows[0].rareNodeCount);
      expect(buildRows.some((row) => row.armoryFrame >= 0)).toBe(true);
      expect(
        Math.min(
          ...buildRows
            .slice(1)
            .map((row) => (row.armoryFrame >= 0 ? row.armoryFrame : Number.POSITIVE_INFINITY)),
        ),
      ).toBeLessThan(Number.POSITIVE_INFINITY);
      expect(Math.max(...trainRows.slice(1).map((row) => row.unitsTrained))).toBeGreaterThanOrEqual(
        trainRows[0].unitsTrained,
      );
      expect(trainRows.find((row) => row.name === 'blueprint_fisher')?.playerUnits).toBeGreaterThan(
        trainRows[0].playerUnits,
      );
      expect(
        defendRows.find((row) => row.name === 'blueprint_shaman')?.kills,
      ).toBeGreaterThanOrEqual(defendRows[0].kills);
      expect(
        defendRows.find((row) => row.name === 'shaman_radius')?.lodgeHpRatio,
      ).toBeGreaterThanOrEqual(
        defendRows.find((row) => row.name === 'blueprint_shaman')?.lodgeHpRatio ?? 0,
      );
      expect(
        defendRows.find((row) => row.name === 'auto_repair_behavior')?.lodgeHpRatio,
      ).toBeGreaterThan(defendRows[0].lodgeHpRatio);
      expect(attackRows[0].committed).toBeGreaterThanOrEqual(MIN_ATTACK_ARMY);
    },
    CONTROLLER_DIAGNOSTICS_TIMEOUT,
  );
});

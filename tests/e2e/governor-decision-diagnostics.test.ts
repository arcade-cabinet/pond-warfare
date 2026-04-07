// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { GameEntity } from 'yuka';
import { getPowerScore } from '@/balance/progression-model';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
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
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { createPrestigeState, isAutoBehaviorUnlocked, type PrestigeState } from '@/config/prestige-logic';
import {
  AttackEvaluator,
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from '@/governor/evaluators';
import { countAvailableAttackers } from '@/governor/goals/attack-goal';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind, Faction, UnitState } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
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

const TEST_STAGE = 6;
const TEST_FRAMES = 1200;
const TRACE_SEEDS = [11, 42, 77];
const evaluatorOwner = new GameEntity();

interface TraceVariant {
  name: string;
  prestigeState: PrestigeState;
}

interface TraceSummary {
  name: string;
  seed: number;
  decisions: string;
  avgCombatArmy: number;
  avgReadyArmy: number;
  attackOpportunityTicks: number;
  maxAttackScore: number;
  avgAttackers: number;
  avgDefenders: number;
  avgLodgeHp: number;
  baseThreatPct: number;
  kills: number;
  unitsTrained: number;
  gathered: number;
  clams: number;
  power: number;
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
  prestigeAutoBehaviorSystem(world);
  matchEventRunnerSystem(world, storeV3.progressionLevel.value);
  autoSymbolSystem(world);
  cleanupSystem(world);

  if (world.frameCount % 30 === 0) {
    syncGovernorSignals(world);
  }

  governor.tick();
}

function createWorld(prestigeState: PrestigeState, seed: number): GameWorld {
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = TEST_STAGE;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: TEST_STAGE, seed, fish: 200 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(TEST_STAGE, 960, 540, seed);
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

function pickDecision(): string {
  return scoreDecisionWindow().bestName;
}

function scoreDecisionWindow(): { bestName: string; attackScore: number } {
  const evaluators = [
    ['gather', new GatherEvaluator()],
    ['build', new BuildEvaluator()],
    ['train', new TrainEvaluator()],
    ['defend', new DefendEvaluator()],
    ['attack', new AttackEvaluator()],
  ] as const;
  let bestName = 'none';
  let bestScore = 0;
  let attackScore = 0;
  for (const [name, evaluator] of evaluators) {
    const score = evaluator.calculateDesirability(evaluatorOwner);
    if (name === 'attack') attackScore = score;
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }
  return { bestName, attackScore };
}

function combatArmySize(): number {
  return store.unitRoster.value
    .filter((group) => group.role === 'combat')
    .reduce((sum, group) => sum + group.units.length, 0);
}

function lodgeHpRatio(world: GameWorld): number {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  if (lodge == null || Health.max[lodge] <= 0) return 0;
  return Health.current[lodge] / Health.max[lodge];
}

function countTaskUnits(world: GameWorld, task: UnitState): number {
  return Array.from(query(world.ecs, [Health, FactionTag, TaskOverride, UnitStateMachine])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      TaskOverride.task[eid] === task,
  ).length;
}

function runVariant(seed: number, variant: TraceVariant): TraceSummary {
  const world = createWorld(variant.prestigeState, seed);
  const governor = new Governor();
  governor.enabled = true;

  const decisionCounts = new Map<string, number>();
  let combatArmyTotal = 0;
  let readyArmyTotal = 0;
  let attackOpportunityTicks = 0;
  let maxAttackScore = 0;
  let attackersTotal = 0;
  let defendersTotal = 0;
  let lodgeHpTotal = 0;
  let threatFrames = 0;
  let samples = 0;

  for (let frame = 0; frame < TEST_FRAMES; frame += 1) {
    runFrame(world, governor);
    if (world.frameCount % 120 === 0) {
      const combatArmy = combatArmySize();
      const readyArmy = countAvailableAttackers();
      const { bestName: choice, attackScore } = scoreDecisionWindow();
      decisionCounts.set(choice, (decisionCounts.get(choice) ?? 0) + 1);
      combatArmyTotal += combatArmy;
      readyArmyTotal += readyArmy;
      if (attackScore > 0) attackOpportunityTicks += 1;
      if (attackScore > maxAttackScore) maxAttackScore = attackScore;
    }
    if (world.frameCount % 30 === 0) {
      attackersTotal += countTaskUnits(world, UnitState.AttackMove);
      defendersTotal += countTaskUnits(world, UnitState.AttackMovePatrol);
      lodgeHpTotal += lodgeHpRatio(world);
      if (store.baseUnderAttack.value) threatFrames += 1;
      samples += 1;
    }
  }

  const clams = calculateMatchReward({
    result: world.state === 'lose' ? 'loss' : 'win',
    durationSeconds: Math.round(world.frameCount / 60),
    kills: world.stats.unitsKilled,
    resourcesGathered: world.stats.resourcesGathered,
    eventsCompleted: getEventsCompletedCount(),
    prestigeRank: variant.prestigeState.rank,
    earningsMultiplier: world.clamRewardMultiplier,
  }).totalClams;

  const decisions = ['gather', 'build', 'train', 'defend', 'attack']
    .map((name) => `${name}:${decisionCounts.get(name) ?? 0}`)
    .join(' ');

  return {
    name: variant.name,
    seed,
    decisions,
    avgCombatArmy: Number((combatArmyTotal / Math.max(TEST_FRAMES / 120, 1)).toFixed(2)),
    avgReadyArmy: Number((readyArmyTotal / Math.max(TEST_FRAMES / 120, 1)).toFixed(2)),
    attackOpportunityTicks,
    maxAttackScore: Number(maxAttackScore.toFixed(2)),
    avgAttackers: Number((attackersTotal / Math.max(samples, 1)).toFixed(2)),
    avgDefenders: Number((defendersTotal / Math.max(samples, 1)).toFixed(2)),
    avgLodgeHp: Number((lodgeHpTotal / Math.max(samples, 1)).toFixed(3)),
    baseThreatPct: Number(((threatFrames / Math.max(samples, 1)) * 100).toFixed(1)),
    kills: world.stats.unitsKilled,
    unitsTrained: world.stats.unitsTrained,
    gathered: world.stats.resourcesGathered,
    clams,
    power: Number(
      getPowerScore({
        resourcesGathered: world.stats.resourcesGathered,
        unitsTrained: world.stats.unitsTrained,
        kills: world.stats.unitsKilled,
        playerUnits: Array.from(query(world.ecs, [Health, FactionTag])).filter(
          (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
        ).length,
        lodgeHpRatio: lodgeHpRatio(world),
      }).toFixed(3),
    ),
  };
}

describe('governor decision diagnostics', () => {
  it('profiles full-governor decision mix for baseline and problematic pearl rows', () => {
    const rankOne = { ...createPrestigeState(), rank: 1 };
    const variants = [
      { name: 'baseline', prestigeState: rankOne },
      { name: 'combat_multiplier', prestigeState: { ...rankOne, upgradeRanks: { combat_multiplier: 1 } } },
      { name: 'hp_multiplier', prestigeState: { ...rankOne, upgradeRanks: { hp_multiplier: 1 } } },
      { name: 'auto_heal_behavior', prestigeState: { ...rankOne, upgradeRanks: { auto_heal_behavior: 1 } } },
      { name: 'gather_multiplier', prestigeState: { ...rankOne, upgradeRanks: { gather_multiplier: 1 } } },
    ];
    const rows = TRACE_SEEDS.flatMap((seed) => variants.map((variant) => runVariant(seed, variant)));

    console.log('\nGovernor decision diagnostics');
    console.table(rows);

    expect(rows).toHaveLength(TRACE_SEEDS.length * variants.length);
    for (const row of rows) {
      expect(Number.isFinite(row.avgAttackers)).toBe(true);
      expect(Number.isFinite(row.avgDefenders)).toBe(true);
      expect(Number.isFinite(row.avgLodgeHp)).toBe(true);
      expect(Number.isFinite(row.baseThreatPct)).toBe(true);
      expect(Number.isFinite(row.avgCombatArmy)).toBe(true);
      expect(Number.isFinite(row.avgReadyArmy)).toBe(true);
      expect(Number.isFinite(row.maxAttackScore)).toBe(true);
      expect(row.decisions.length).toBeGreaterThan(0);
    }
  }, 120_000);
});

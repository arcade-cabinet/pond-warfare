// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { GameEntity } from 'yuka';
import { getPowerScore } from '@/balance/progression-model';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { getEventsCompletedCount } from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import {
  AttackEvaluator,
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from '@/governor/evaluators';
import { countAvailableAttackers, MIN_ATTACK_ARMY } from '@/governor/goals/attack-goal';
import { calculateMatchReward } from '@/game/match-rewards';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import {
  combatArmySize,
  countTaskUnits,
  createGovernorTraceWorld,
  lodgeHpRatio,
  runGovernorFrame,
} from './governor-diagnostics-harness';
import { mockedGameRef } from '../helpers/game-world-ref';
import { getPlayerFortificationSnapshot } from '../helpers/fortification-snapshot';

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
const TRACE_WINDOWS = [
  { label: 'opening', frames: 1200 },
  { label: 'long_run', frames: 2400 },
] as const;
const TRACE_SEEDS = [11, 42, 77];
const evaluatorOwner = new GameEntity();
const GOVERNOR_DECISION_TIMEOUT = 180_000;

interface TraceVariant {
  name: string;
  prestigeState: PrestigeState;
}

interface TraceSummary {
  name: string;
  window: string;
  seed: number;
  decisions: string;
  maxGatherScore: number;
  maxBuildScore: number;
  maxDefendScore: number;
  affordableArmoryTicks: number;
  affordableArmoryDefendTicks: number;
  affordableArmorySevereThreatTicks: number;
  affordableArmoryCriticalHpTicks: number;
  maxThreatWhileAffordableArmory: number;
  minLodgeHpWhileAffordableArmory: number | null;
  avgCombatArmy: number;
  avgReadyArmy: number;
  attackOpportunityTicks: number;
  attackDecisionTicks: number;
  firstAttackOpportunitySec: number | null;
  firstAttackDecisionSec: number | null;
  maxAttackScore: number;
  avgAttackers: number;
  avgDefenders: number;
  avgLodgeHp: number;
  baseThreatPct: number;
  avgThreatCount: number;
  lightThreatPct: number;
  heavyThreatPct: number;
  readyForAttackPct: number;
  skirmishWindowPct: number;
  kills: number;
  unitsTrained: number;
  gathered: number;
  stockpile: number;
  fish: number;
  logs: number;
  armories: number;
  towers: number;
  clams: number;
  power: number;
}

function getMobilePlayerUnits(world: GameWorld): number[] {
  return Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      EntityTypeTag.kind[eid] !== EntityKind.Lodge &&
      !BUILDING_KINDS.has(EntityTypeTag.kind[eid]),
  );
}

function scoreDecisionWindow(): {
  bestName: string;
  attackScore: number;
  buildScore: number;
  gatherScore: number;
  defendScore: number;
} {
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
  let buildScore = 0;
  let gatherScore = 0;
  let defendScore = 0;
  for (const [name, evaluator] of evaluators) {
    const score = evaluator.calculateDesirability(evaluatorOwner);
    if (name === 'attack') attackScore = score;
    if (name === 'build') buildScore = score;
    if (name === 'gather') gatherScore = score;
    if (name === 'defend') defendScore = score;
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }
  return { bestName, attackScore, buildScore, gatherScore, defendScore };
}

function runVariant(
  seed: number,
  variant: TraceVariant,
  window: (typeof TRACE_WINDOWS)[number],
): TraceSummary {
  const world = createGovernorTraceWorld(variant.prestigeState, seed, TEST_STAGE);
  const governor = new Governor();
  governor.enabled = true;

  const decisionCounts = new Map<string, number>();
  let combatArmyTotal = 0;
  let readyArmyTotal = 0;
  let attackOpportunityTicks = 0;
  let attackDecisionTicks = 0;
  let firstAttackOpportunityFrame: number | null = null;
  let firstAttackDecisionFrame: number | null = null;
  let maxGatherScore = 0;
  let maxAttackScore = 0;
  let maxBuildScore = 0;
  let maxDefendScore = 0;
  let affordableArmoryTicks = 0;
  let affordableArmoryDefendTicks = 0;
  let affordableArmorySevereThreatTicks = 0;
  let affordableArmoryCriticalHpTicks = 0;
  let maxThreatWhileAffordableArmory = 0;
  let minLodgeHpWhileAffordableArmory: number | null = null;
  let attackersTotal = 0;
  let defendersTotal = 0;
  let lodgeHpTotal = 0;
  let threatCountTotal = 0;
  let threatFrames = 0;
  let lightThreatFrames = 0;
  let heavyThreatFrames = 0;
  let samples = 0;
  let readyForAttackTicks = 0;
  let skirmishWindowTicks = 0;

  for (let frame = 0; frame < window.frames; frame += 1) {
    runGovernorFrame(world, governor);
    if (world.frameCount % 120 === 0) {
      const combatArmy = combatArmySize();
      const readyArmy = countAvailableAttackers();
      const lodgeHp = lodgeHpRatio(world);
      const waveCountdown = store.waveCountdown.value === -1 ? null : store.waveCountdown.value;
      const threats = Math.max(0, Math.trunc(store.baseThreatCount.value || 0));
      const affordableFirstArmory =
        storeV3.progressionLevel.value >= 6 &&
        store.buildingRoster.value.every((building) => building.kind !== EntityKind.Armory) &&
        store.fish.value >= 180 &&
        store.logs.value >= 120;
      const { bestName: choice, attackScore, buildScore, gatherScore, defendScore } = scoreDecisionWindow();
      decisionCounts.set(choice, (decisionCounts.get(choice) ?? 0) + 1);
      combatArmyTotal += combatArmy;
      readyArmyTotal += readyArmy;
      if (affordableFirstArmory) {
        affordableArmoryTicks += 1;
        if (choice === 'defend') affordableArmoryDefendTicks += 1;
        if (threats >= 3) affordableArmorySevereThreatTicks += 1;
        if (lodgeHp < 0.7) affordableArmoryCriticalHpTicks += 1;
        maxThreatWhileAffordableArmory = Math.max(maxThreatWhileAffordableArmory, threats);
        minLodgeHpWhileAffordableArmory =
          minLodgeHpWhileAffordableArmory == null
            ? lodgeHp
            : Math.min(minLodgeHpWhileAffordableArmory, lodgeHp);
      }
      if (readyArmy >= MIN_ATTACK_ARMY) readyForAttackTicks += 1;
      if (
        store.baseUnderAttack.value &&
        threats === 1 &&
        lodgeHp >= 0.97 &&
        (waveCountdown === null || waveCountdown > 14) &&
        combatArmy >= MIN_ATTACK_ARMY + 1 &&
        readyArmy >= MIN_ATTACK_ARMY
      ) {
        skirmishWindowTicks += 1;
      }
      if (attackScore > 0) {
        attackOpportunityTicks += 1;
        if (firstAttackOpportunityFrame == null) firstAttackOpportunityFrame = world.frameCount;
      }
      if (choice === 'attack') {
        attackDecisionTicks += 1;
        if (firstAttackDecisionFrame == null) firstAttackDecisionFrame = world.frameCount;
      }
      if (attackScore > maxAttackScore) maxAttackScore = attackScore;
      if (buildScore > maxBuildScore) maxBuildScore = buildScore;
      if (gatherScore > maxGatherScore) maxGatherScore = gatherScore;
      if (defendScore > maxDefendScore) maxDefendScore = defendScore;
    }
    if (world.frameCount % 30 === 0) {
      attackersTotal += countTaskUnits(world, UnitState.AttackMove);
      defendersTotal += countTaskUnits(world, UnitState.AttackMovePatrol);
      lodgeHpTotal += lodgeHpRatio(world);
      const threats = Math.max(0, Math.trunc(store.baseThreatCount.value || 0));
      threatCountTotal += threats;
      if (store.baseUnderAttack.value) threatFrames += 1;
      if (threats === 1) lightThreatFrames += 1;
      if (threats >= 2) heavyThreatFrames += 1;
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
    window: window.label,
    seed,
    decisions,
    maxGatherScore: Number(maxGatherScore.toFixed(2)),
    maxBuildScore: Number(maxBuildScore.toFixed(2)),
    maxDefendScore: Number(maxDefendScore.toFixed(2)),
    affordableArmoryTicks,
    affordableArmoryDefendTicks,
    affordableArmorySevereThreatTicks,
    affordableArmoryCriticalHpTicks,
    maxThreatWhileAffordableArmory,
    minLodgeHpWhileAffordableArmory:
      minLodgeHpWhileAffordableArmory == null ? null : Number(minLodgeHpWhileAffordableArmory.toFixed(3)),
    avgCombatArmy: Number((combatArmyTotal / Math.max(window.frames / 120, 1)).toFixed(2)),
    avgReadyArmy: Number((readyArmyTotal / Math.max(window.frames / 120, 1)).toFixed(2)),
    attackOpportunityTicks,
    attackDecisionTicks,
    firstAttackOpportunitySec:
      firstAttackOpportunityFrame == null ? null : Number((firstAttackOpportunityFrame / 60).toFixed(1)),
    firstAttackDecisionSec:
      firstAttackDecisionFrame == null ? null : Number((firstAttackDecisionFrame / 60).toFixed(1)),
    maxAttackScore: Number(maxAttackScore.toFixed(2)),
    avgAttackers: Number((attackersTotal / Math.max(samples, 1)).toFixed(2)),
    avgDefenders: Number((defendersTotal / Math.max(samples, 1)).toFixed(2)),
    avgLodgeHp: Number((lodgeHpTotal / Math.max(samples, 1)).toFixed(3)),
    baseThreatPct: Number(((threatFrames / Math.max(samples, 1)) * 100).toFixed(1)),
    avgThreatCount: Number((threatCountTotal / Math.max(samples, 1)).toFixed(2)),
    lightThreatPct: Number(((lightThreatFrames / Math.max(samples, 1)) * 100).toFixed(1)),
    heavyThreatPct: Number(((heavyThreatFrames / Math.max(samples, 1)) * 100).toFixed(1)),
    readyForAttackPct: Number(
      ((readyForAttackTicks / Math.max(window.frames / 120, 1)) * 100).toFixed(1),
    ),
    skirmishWindowPct: Number(
      ((skirmishWindowTicks / Math.max(window.frames / 120, 1)) * 100).toFixed(1),
    ),
    kills: world.stats.unitsKilled,
    unitsTrained: world.stats.unitsTrained,
    gathered: world.stats.resourcesGathered,
    stockpile: world.resources.fish + world.resources.logs + world.resources.rocks,
    fish: world.resources.fish,
    logs: world.resources.logs,
    armories: store.buildingRoster.value.filter((building) => building.kind === EntityKind.Armory).length,
    towers: store.buildingRoster.value.filter((building) => building.kind === EntityKind.Tower).length,
    clams,
    power: Number(
      (() => {
        const playerUnits = getMobilePlayerUnits(world);
        const totalCurrentHp = playerUnits.reduce((sum, eid) => sum + Health.current[eid], 0);
        const totalMaxHp = playerUnits.reduce((sum, eid) => sum + Health.max[eid], 0);
	        return getPowerScore({
	          resourcesGathered: world.stats.resourcesGathered,
	          resourcesStockpiled: world.resources.fish + world.resources.logs + world.resources.rocks,
	          unitsTrained: world.stats.unitsTrained,
	          kills: world.stats.unitsKilled,
	          playerUnits: playerUnits.length,
	          playerUnitHpPool: totalCurrentHp,
	          playerUnitHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
	          ...getPlayerFortificationSnapshot(world),
	          lodgeHpRatio: lodgeHpRatio(world),
	        });
      })().toFixed(3),
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
    const rows = TRACE_WINDOWS.flatMap((window) =>
      TRACE_SEEDS.flatMap((seed) => variants.map((variant) => runVariant(seed, variant, window))),
    );

    console.log('\nGovernor decision diagnostics');
    console.table(rows);

    expect(rows).toHaveLength(TRACE_WINDOWS.length * TRACE_SEEDS.length * variants.length);
    for (const row of rows) {
      expect(Number.isFinite(row.avgAttackers)).toBe(true);
      expect(Number.isFinite(row.avgDefenders)).toBe(true);
      expect(Number.isFinite(row.avgLodgeHp)).toBe(true);
      expect(Number.isFinite(row.baseThreatPct)).toBe(true);
      expect(Number.isFinite(row.avgThreatCount)).toBe(true);
      expect(Number.isFinite(row.lightThreatPct)).toBe(true);
      expect(Number.isFinite(row.heavyThreatPct)).toBe(true);
      expect(Number.isFinite(row.readyForAttackPct)).toBe(true);
      expect(Number.isFinite(row.skirmishWindowPct)).toBe(true);
      expect(Number.isFinite(row.avgCombatArmy)).toBe(true);
      expect(Number.isFinite(row.avgReadyArmy)).toBe(true);
      expect(Number.isFinite(row.attackDecisionTicks)).toBe(true);
      expect(Number.isFinite(row.maxAttackScore)).toBe(true);
      expect(row.decisions.length).toBeGreaterThan(0);
    }
  }, GOVERNOR_DECISION_TIMEOUT);
});

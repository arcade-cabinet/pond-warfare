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
import { countAvailableAttackers } from '@/governor/goals/attack-goal';
import { calculateMatchReward } from '@/game/match-rewards';
import { Governor } from '@/governor/governor';
import { Faction, UnitState } from '@/types';
import * as store from '@/ui/store';
import {
  combatArmySize,
  countTaskUnits,
  createGovernorTraceWorld,
  lodgeHpRatio,
  runGovernorFrame,
} from './governor-diagnostics-harness';
import { mockedGameRef } from '../helpers/game-world-ref';

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

interface TraceVariant {
  name: string;
  prestigeState: PrestigeState;
}

interface TraceSummary {
  name: string;
  window: string;
  seed: number;
  decisions: string;
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
  kills: number;
  unitsTrained: number;
  gathered: number;
  clams: number;
  power: number;
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
  let maxAttackScore = 0;
  let attackersTotal = 0;
  let defendersTotal = 0;
  let lodgeHpTotal = 0;
  let threatFrames = 0;
  let samples = 0;

  for (let frame = 0; frame < window.frames; frame += 1) {
    runGovernorFrame(world, governor);
    if (world.frameCount % 120 === 0) {
      const combatArmy = combatArmySize();
      const readyArmy = countAvailableAttackers();
      const { bestName: choice, attackScore } = scoreDecisionWindow();
      decisionCounts.set(choice, (decisionCounts.get(choice) ?? 0) + 1);
      combatArmyTotal += combatArmy;
      readyArmyTotal += readyArmy;
      if (attackScore > 0) {
        attackOpportunityTicks += 1;
        if (firstAttackOpportunityFrame == null) firstAttackOpportunityFrame = world.frameCount;
      }
      if (choice === 'attack') {
        attackDecisionTicks += 1;
        if (firstAttackDecisionFrame == null) firstAttackDecisionFrame = world.frameCount;
      }
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
    window: window.label,
    seed,
    decisions,
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
      expect(Number.isFinite(row.avgCombatArmy)).toBe(true);
      expect(Number.isFinite(row.avgReadyArmy)).toBe(true);
      expect(Number.isFinite(row.attackDecisionTicks)).toBe(true);
      expect(Number.isFinite(row.maxAttackScore)).toBe(true);
      expect(row.decisions.length).toBeGreaterThan(0);
    }
  }, 120_000);
});

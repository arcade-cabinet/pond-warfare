// @vitest-environment jsdom

import { hasComponent, query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction, UnitState } from '@/types';
import { mockedGameRef } from '../helpers/game-world-ref';
import { createGovernorTraceWorld, runGovernorFrame } from './governor-diagnostics-harness';

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
const TRACE_FRAMES = 2400;
const SAMPLE_INTERVAL = 30;
const TRACE_SEEDS = [11, 42, 77];

interface AttackVariant {
  name: string;
  prestigeState: PrestigeState;
}

interface AttackConversionRow {
  name: string;
  seed: number;
  attackWindowOpened: boolean;
  firstCommitSec: number | null;
  firstEngageSec: number | null;
  avgCommitted: number;
  avgMoving: number;
  avgEngaged: number;
  engagePct: number;
  liveTargetPct: number;
  avgDistanceOverRange: number;
  avgFocusPct: number;
  directiveSwitches: number;
  liveSwitches: number;
  kills: number;
  killsWhileCommitted: number;
  killsPerCommittedSample: number;
}

function isLiveEnemy(eid: number, world = mockedGameRef.world): boolean {
  if (world == null) return false;
  return (
    eid !== -1 &&
    hasComponent(world.ecs, eid, Health) &&
    FactionTag.faction[eid] === Faction.Enemy &&
    Health.current[eid] > 0
  );
}

function getCommittedAttackers(world = mockedGameRef.world): number[] {
  if (world == null) return [];
  return Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag, TaskOverride]))
    .filter((eid) => FactionTag.faction[eid] === Faction.Player)
    .filter((eid) => Health.current[eid] > 0)
    .filter((eid) => !BUILDING_KINDS.has(EntityTypeTag.kind[eid] as EntityKind))
    .filter((eid) => EntityTypeTag.kind[eid] !== EntityKind.Lodge)
    .filter(
      (eid) => TaskOverride.active[eid] === 1 && TaskOverride.task[eid] === UnitState.AttackMove,
    );
}

function runVariant(seed: number, variant: AttackVariant): AttackConversionRow {
  const world = createGovernorTraceWorld(variant.prestigeState, seed, TEST_STAGE);
  const governor = new Governor();
  governor.enabled = true;

  const previousDirectiveTarget = new Map<number, number>();
  const previousLiveTarget = new Map<number, number>();

  let firstCommitFrame: number | null = null;
  let firstEngageFrame: number | null = null;
  let committedSamples = 0;
  let committedTotal = 0;
  let movingTotal = 0;
  let engagedTotal = 0;
  let liveTargetTotal = 0;
  let distanceOverRangeTotal = 0;
  let distanceSamples = 0;
  let focusPctTotal = 0;
  let focusSamples = 0;
  let directiveSwitches = 0;
  let liveSwitches = 0;
  let killsWhileCommitted = 0;
  let previousKills = 0;

  for (let frame = 0; frame < TRACE_FRAMES; frame += 1) {
    runGovernorFrame(world, governor);

    if (world.frameCount % SAMPLE_INTERVAL !== 0) continue;

    const committed = getCommittedAttackers(world);
    if (committed.length === 0) {
      previousKills = world.stats.unitsKilled;
      continue;
    }

    if (firstCommitFrame == null) firstCommitFrame = world.frameCount;
    committedSamples += 1;
    committedTotal += committed.length;
    killsWhileCommitted += Math.max(world.stats.unitsKilled - previousKills, 0);
    previousKills = world.stats.unitsKilled;

    let movingCount = 0;
    let engagedCount = 0;
    let liveTargetCount = 0;
    const focusCounts = new Map<number, number>();

    for (const eid of committed) {
      if (UnitStateMachine.state[eid] === UnitState.AttackMove) movingCount += 1;
      if (UnitStateMachine.state[eid] === UnitState.Attacking) {
        engagedCount += 1;
        if (firstEngageFrame == null) firstEngageFrame = world.frameCount;
      }

      const directiveTarget = TaskOverride.targetEntity[eid];
      const liveTarget = UnitStateMachine.targetEntity[eid];
      if (
        previousDirectiveTarget.has(eid) &&
        previousDirectiveTarget.get(eid) !== directiveTarget &&
        directiveTarget > 0
      ) {
        directiveSwitches += 1;
      }
      if (
        previousLiveTarget.has(eid) &&
        previousLiveTarget.get(eid) !== liveTarget &&
        liveTarget > 0
      ) {
        liveSwitches += 1;
      }
      previousDirectiveTarget.set(eid, directiveTarget);
      previousLiveTarget.set(eid, liveTarget);

      if (!isLiveEnemy(liveTarget, world)) continue;
      liveTargetCount += 1;
      focusCounts.set(liveTarget, (focusCounts.get(liveTarget) ?? 0) + 1);

      const dx = Position.x[liveTarget] - Position.x[eid];
      const dy = Position.y[liveTarget] - Position.y[eid];
      const distance = Math.sqrt(dx * dx + dy * dy);
      distanceOverRangeTotal += Math.max(distance - Combat.attackRange[eid], 0);
      distanceSamples += 1;
    }

    movingTotal += movingCount;
    engagedTotal += engagedCount;
    liveTargetTotal += liveTargetCount;

    if (focusCounts.size > 0) {
      focusPctTotal += (Math.max(...focusCounts.values()) / committed.length) * 100;
      focusSamples += 1;
    }
  }

  return {
    name: variant.name,
    seed,
    attackWindowOpened: firstCommitFrame != null,
    firstCommitSec: firstCommitFrame == null ? null : Number((firstCommitFrame / 60).toFixed(1)),
    firstEngageSec: firstEngageFrame == null ? null : Number((firstEngageFrame / 60).toFixed(1)),
    avgCommitted: Number((committedTotal / Math.max(committedSamples, 1)).toFixed(2)),
    avgMoving: Number((movingTotal / Math.max(committedSamples, 1)).toFixed(2)),
    avgEngaged: Number((engagedTotal / Math.max(committedSamples, 1)).toFixed(2)),
    engagePct: Number(((engagedTotal / Math.max(committedTotal, 1)) * 100).toFixed(1)),
    liveTargetPct: Number(((liveTargetTotal / Math.max(committedTotal, 1)) * 100).toFixed(1)),
    avgDistanceOverRange: Number(
      (distanceOverRangeTotal / Math.max(distanceSamples, 1)).toFixed(1),
    ),
    avgFocusPct: Number((focusPctTotal / Math.max(focusSamples, 1)).toFixed(1)),
    directiveSwitches,
    liveSwitches,
    kills: world.stats.unitsKilled,
    killsWhileCommitted,
    killsPerCommittedSample: Number(
      (killsWhileCommitted / Math.max(committedSamples, 1)).toFixed(2),
    ),
  };
}

describe('governor attack conversion diagnostics', () => {
  it('profiles whether attack windows open and how committed parties convert', () => {
    const rankOne = { ...createPrestigeState(), rank: 1 };
    const variants: AttackVariant[] = [
      { name: 'baseline', prestigeState: rankOne },
      {
        name: 'combat_multiplier',
        prestigeState: { ...rankOne, upgradeRanks: { combat_multiplier: 1 } },
      },
    ];

    const rows = TRACE_SEEDS.flatMap((seed) =>
      variants.map((variant) => runVariant(seed, variant)),
    );

    console.log('\nGovernor attack conversion diagnostics');
    console.table(rows);

    expect(rows).toHaveLength(TRACE_SEEDS.length * variants.length);
    for (const row of rows) {
      expect(Number.isFinite(row.avgCommitted)).toBe(true);
      expect(Number.isFinite(row.avgMoving)).toBe(true);
      expect(Number.isFinite(row.avgEngaged)).toBe(true);
      expect(Number.isFinite(row.engagePct)).toBe(true);
      expect(Number.isFinite(row.liveTargetPct)).toBe(true);
      expect(Number.isFinite(row.avgDistanceOverRange)).toBe(true);
      expect(Number.isFinite(row.avgFocusPct)).toBe(true);
      expect(Number.isFinite(row.killsPerCommittedSample)).toBe(true);
      expect(typeof row.attackWindowOpened).toBe('boolean');
    }
  }, 120_000);
});

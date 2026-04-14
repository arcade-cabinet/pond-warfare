// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  type BalanceSnapshot,
  getDifficultyShiftPercent,
  summarizeShiftPercents,
} from '@/balance/progression-model';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { getEventsCompletedCount, resetMatchEventRunner } from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { getPlayerFortificationSnapshot } from '../helpers/fortification-snapshot';
import { mockedGameRef } from '../helpers/game-world-ref';
import { syncGovernorSignals } from '../helpers/governor-sync';
import { runSimFrame } from '../helpers/run-sim-frame';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';
import { createSnapshotScoreCache } from './balance-score-cache';

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

interface VariantConfig {
  name: string;
  purchasedNodeIds?: string[];
  prestigeState?: PrestigeState;
  startingTierRank?: number;
}

const SEEDS = [11, 42, 77];
const TEST_STAGE = 6;
const TEST_FRAMES = 1800;

function getLodgeSnapshot(world: GameWorld): BalanceSnapshot {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  const lodgeHpRatio =
    lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge];

  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      EntityTypeTag.kind[eid] !== EntityKind.Lodge &&
      !BUILDING_KINDS.has(EntityTypeTag.kind[eid]),
  );
  const totalCurrentHp = playerUnits.reduce((sum, eid) => sum + Health.current[eid], 0);
  const totalMaxHp = playerUnits.reduce((sum, eid) => sum + Health.max[eid], 0);
  const fortificationSnapshot = getPlayerFortificationSnapshot(world);
  const matchClamsEarned = calculateMatchReward({
    result: world.state === 'lose' ? 'loss' : 'win',
    durationSeconds: Math.round(world.frameCount / 60),
    kills: world.stats.unitsKilled,
    resourcesGathered: world.stats.resourcesGathered,
    eventsCompleted: getEventsCompletedCount(),
    prestigeRank: storeV3.prestigeState.value.rank,
    earningsMultiplier: world.clamRewardMultiplier,
  }).totalClams;

  return {
    resourcesGathered: world.stats.resourcesGathered,
    resourcesStockpiled: world.resources.fish + world.resources.logs + world.resources.rocks,
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits: playerUnits.length,
    playerUnitHpPool: totalCurrentHp,
    playerUnitHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
    ...fortificationSnapshot,
    lodgeHpRatio,
    matchClamsEarned,
  };
}

function runVariant(seed: number, variant: VariantConfig): BalanceSnapshot {
  const prestigeState = variant.prestigeState ?? createPrestigeState();
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = TEST_STAGE;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = variant.startingTierRank ?? 0;
  storeV3.currentRunPurchasedNodeIds.value = variant.purchasedNodeIds ?? [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: TEST_STAGE, seed, fish: 200 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(TEST_STAGE, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed));
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 999,
    purchasedNodeIds: variant.purchasedNodeIds ?? [],
    purchasedDiamondIds: [],
    startingTierRank: variant.startingTierRank ?? 0,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);
  spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;

  for (let frame = 0; frame < TEST_FRAMES; frame += 1) {
    runSimFrame(world, {
      governor,
      runMatchEvents: true,
      runPrestigeAutoBehaviors: true,
      syncSignals: true,
    });
  }

  return getLodgeSnapshot(world);
}

describe('balance track shifts', () => {
  it('estimates min/mean/max relief for selected Clam and Pearl tracks', () => {
    const getScores = createSnapshotScoreCache(runVariant);
    const baselineScores = new Map<string, number>();
    const rankOneBaseline: VariantConfig = {
      name: 'rank_one_baseline',
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    };
    for (const seed of SEEDS) {
      baselineScores.set(`clam:${seed}`, getScores(seed, { name: 'baseline' }).meta);
      baselineScores.set(`pearl:${seed}`, getScores(seed, rankOneBaseline).meta);
    }

    const variants: VariantConfig[] = [
      { name: 'clam_gather_t1', purchasedNodeIds: ['gathering_fish_gathering_t0'] },
      { name: 'clam_yield_t1', purchasedNodeIds: ['economy_node_yield_t0'] },
      { name: 'clam_clam_bonus_t1', purchasedNodeIds: ['economy_clam_bonus_t0'] },
      {
        name: 'pearl_clam_earnings_rank_1',
        prestigeState: {
          rank: 1,
          pearls: 0,
          totalPearlsEarned: 8,
          upgradeRanks: { clam_earnings_multiplier: 1 },
        },
      },
      {
        name: 'pearl_gather_rank_2',
        prestigeState: {
          rank: 1,
          pearls: 0,
          totalPearlsEarned: 10,
          upgradeRanks: { gather_multiplier: 2 },
        },
      },
      {
        name: 'pearl_blueprint_fisher',
        prestigeState: {
          rank: 1,
          pearls: 0,
          totalPearlsEarned: 3,
          upgradeRanks: { blueprint_fisher: 1 },
        },
      },
      {
        name: 'pearl_starting_tier_1',
        prestigeState: {
          rank: 1,
          pearls: 0,
          totalPearlsEarned: 20,
          upgradeRanks: { starting_tier: 1 },
        },
        startingTierRank: 1,
      },
    ];

    const rows = variants.map((variant) => {
      const baselineKeyPrefix = variant.name.startsWith('pearl_') ? 'pearl' : 'clam';
      const shifts = SEEDS.map((seed) => {
        const baseline = baselineScores.get(`${baselineKeyPrefix}:${seed}`) ?? 0;
        return getDifficultyShiftPercent(baseline, getScores(seed, variant).meta);
      });
      const summary = summarizeShiftPercents(shifts);
      return {
        track: variant.name,
        min_pct: Number(summary.min.toFixed(2)),
        mean_pct: Number(summary.mean.toFixed(2)),
        max_pct: Number(summary.max.toFixed(2)),
      };
    });

    console.table(rows);

    for (const row of rows) {
      expect(row.max_pct).toBeGreaterThanOrEqual(row.mean_pct);
      expect(row.mean_pct).toBeGreaterThanOrEqual(row.min_pct);
      expect(Number.isFinite(row.min_pct)).toBe(true);
      expect(Number.isFinite(row.mean_pct)).toBe(true);
      expect(Number.isFinite(row.max_pct)).toBe(true);
    }

    expect(rows.find((row) => row.track === 'clam_yield_t1')?.mean_pct).toBeGreaterThan(0);
    // A blueprint-only Pearl unlock should be near-neutral until the player
    // actually fields that specialist in-match.
    expect(
      rows.find((row) => row.track === 'pearl_blueprint_fisher')?.mean_pct,
    ).toBeGreaterThanOrEqual(-0.1);
    expect(
      rows.find((row) => row.track === 'pearl_clam_earnings_rank_1')?.mean_pct,
    ).toBeGreaterThan(0);
  }, 180_000);
});

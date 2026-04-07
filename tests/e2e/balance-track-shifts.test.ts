// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  getDifficultyShiftPercent,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
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
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { type PrestigeState, createPrestigeState } from '@/config/prestige-logic';
import { SeededRandom } from '@/utils/random';
import { createSnapshotScoreCache } from './balance-score-cache';
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

interface VariantConfig {
  name: string;
  purchasedNodeIds?: string[];
  prestigeState?: PrestigeState;
  startingTierRank?: number;
}

const SEEDS = [11, 42, 77];
const TEST_STAGE = 6;
const TEST_FRAMES = 1800;

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

function getLodgeSnapshot(world: GameWorld): BalanceSnapshot {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === 0 &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  const lodgeHpRatio =
    lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge];

  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag])).filter(
    (eid) => FactionTag.faction[eid] === 0 && Health.current[eid] > 0,
  ).length;
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
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits,
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
    runFrame(world, governor);
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
        name: 'pearl_auto_deploy_fisher',
        prestigeState: {
          rank: 1,
          pearls: 0,
          totalPearlsEarned: 3,
          upgradeRanks: { auto_deploy_fisher: 1 },
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
    expect(rows.find((row) => row.track === 'pearl_auto_deploy_fisher')?.mean_pct).toBeGreaterThan(0);
    expect(rows.find((row) => row.track === 'pearl_clam_earnings_rank_1')?.mean_pct).toBeGreaterThan(0);
  });
});

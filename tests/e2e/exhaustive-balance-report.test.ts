// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  getDifficultyShiftPercent,
  getMetaProgressionScore,
  getPowerScore,
  getRewardScore,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
import {
  buildClamTierOneVariants,
  buildPearlRankOneVariants,
  type BalanceVariantConfig,
} from '@/balance/track-variants';
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
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { createPrestigeState, isAutoBehaviorUnlocked } from '@/config/prestige-logic';
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

const SEEDS = [11, 42, 77];
const TEST_STAGE = 6;
const TEST_FRAMES = 1200;

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

function snapshotWorld(world: GameWorld, prestigeRank: number): BalanceSnapshot {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag])).filter(
    (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
  ).length;
  const matchClamsEarned = calculateMatchReward({
    result: world.state === 'lose' ? 'loss' : 'win',
    durationSeconds: Math.round(world.frameCount / 60),
    kills: world.stats.unitsKilled,
    resourcesGathered: world.stats.resourcesGathered,
    eventsCompleted: getEventsCompletedCount(),
    prestigeRank,
    earningsMultiplier: world.clamRewardMultiplier,
  }).totalClams;

  return {
    resourcesGathered: world.stats.resourcesGathered,
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits,
    lodgeHpRatio:
      lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge],
    matchClamsEarned,
  };
}

function runVariant(seed: number, variant?: BalanceVariantConfig): BalanceSnapshot {
  const prestigeState = variant?.prestigeState ?? createPrestigeState();
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = TEST_STAGE;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = variant?.startingTierRank ?? 0;
  storeV3.currentRunPurchasedNodeIds.value = variant?.purchasedNodeIds ?? [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: TEST_STAGE, seed, fish: 200 });
  world.peaceTimer = 0;
  _gameRef.world = world;

  const panelGrid = createTestPanelGrid(TEST_STAGE, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed), {
    hasRareResourceAccess: isAutoBehaviorUnlocked(prestigeState, 'rare_resource_access'),
  });
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 999,
    purchasedNodeIds: variant?.purchasedNodeIds ?? [],
    purchasedDiamondIds: [],
    startingTierRank: variant?.startingTierRank ?? 0,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);
  const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < TEST_FRAMES; frame += 1) {
    runFrame(world, governor);
  }

  return snapshotWorld(world, prestigeState.rank);
}

function buildRows(variants: BalanceVariantConfig[], baselineVariant?: BalanceVariantConfig) {
  const baselinePowerScores = new Map<number, number>();
  const baselineRewardScores = new Map<number, number>();
  const baselineMetaScores = new Map<number, number>();
  for (const seed of SEEDS) {
    const snapshot = runVariant(seed, baselineVariant);
    baselinePowerScores.set(seed, getPowerScore(snapshot));
    baselineRewardScores.set(seed, getRewardScore(snapshot));
    baselineMetaScores.set(seed, getMetaProgressionScore(snapshot));
  }

  return variants
    .map((variant) => {
      const powerShifts = SEEDS.map((seed) => {
        const baseline = baselinePowerScores.get(seed) ?? 0;
        const score = getPowerScore(runVariant(seed, variant));
        return getDifficultyShiftPercent(baseline, score);
      });
      const rewardShifts = SEEDS.map((seed) => {
        const baseline = baselineRewardScores.get(seed) ?? 0;
        const score = getRewardScore(runVariant(seed, variant));
        return getDifficultyShiftPercent(baseline, score);
      });
      const metaShifts = SEEDS.map((seed) => {
        const baseline = baselineMetaScores.get(seed) ?? 0;
        const score = getMetaProgressionScore(runVariant(seed, variant));
        return getDifficultyShiftPercent(baseline, score);
      });
      const powerSummary = summarizeShiftPercents(powerShifts);
      const rewardSummary = summarizeShiftPercents(rewardShifts);
      const metaSummary = summarizeShiftPercents(metaShifts);
      return {
        kind: variant.kind,
        id: variant.id,
        label: variant.label,
        cost: variant.cost,
        budget_pct: variant.budgetPct ?? null,
        power_mean_pct: Number(powerSummary.mean.toFixed(2)),
        economy_mean_pct: Number(rewardSummary.mean.toFixed(2)),
        meta_min_pct: Number(metaSummary.min.toFixed(2)),
        meta_mean_pct: Number(metaSummary.mean.toFixed(2)),
        meta_max_pct: Number(metaSummary.max.toFixed(2)),
      };
    })
    .sort((a, b) => b.meta_mean_pct - a.meta_mean_pct);
}

describe('exhaustive balance report', () => {
  it('profiles every Clam T1 track and every Pearl rank-1 upgrade', () => {
    const clamRows = buildRows(buildClamTierOneVariants());
    const pearlRows = buildRows(buildPearlRankOneVariants(), {
      kind: 'pearl',
      id: 'baseline_rank_1',
      label: 'Rank 1 Baseline',
      cost: 0,
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    });

    console.log('\nClam T1 relief report (stage 6, 1200 frames)');
    console.table(clamRows);
    console.log('\nPearl rank-1 relief report (stage 6, 1200 frames)');
    console.table(pearlRows);

    const suspicious = [...clamRows, ...pearlRows]
      .filter(
        (row) =>
          row.meta_mean_pct <= 0 ||
          row.meta_min_pct < -2 ||
          (row.budget_pct != null &&
            Math.max(row.power_mean_pct, row.economy_mean_pct) < row.budget_pct * 0.25),
      )
      .map(({ kind, id, budget_pct, power_mean_pct, economy_mean_pct, meta_mean_pct, meta_min_pct, meta_max_pct }) => ({
        kind,
        id,
        budget_pct,
        power_mean_pct,
        economy_mean_pct,
        meta_mean_pct,
        meta_min_pct,
        meta_max_pct,
      }));

    if (suspicious.length > 0) {
      console.log('\nSuspicious low-impact tracks');
      console.table(suspicious);
    }

    expect(clamRows).toHaveLength(buildClamTierOneVariants().length);
    expect(pearlRows).toHaveLength(buildPearlRankOneVariants().length);
    expect(clamRows.some((row) => row.meta_mean_pct > 0)).toBe(true);
    for (const row of [...clamRows, ...pearlRows]) {
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_min_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_max_pct)).toBe(true);
    }
  }, 120_000);
});

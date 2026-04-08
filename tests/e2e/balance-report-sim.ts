// @vitest-environment jsdom

import { query } from 'bitecs';
import { vi } from 'vitest';
import {
  getDifficultyShiftPercent,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
import { type BalanceVariantConfig } from '@/balance/track-variants';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { autoSymbolSystem, resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { fogOfWarSystem, initFogOfWar, resetFogOfWar } from '@/ecs/systems/fog-of-war';
import {
  getEventsCompletedCount,
  resetMatchEventRunner,
} from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { createPrestigeState, isAutoBehaviorUnlocked } from '@/config/prestige-logic';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createSnapshotScoreCache } from './balance-score-cache';
import { mockedGameRef } from '../helpers/game-world-ref';
import { createExploredTestContext } from '../helpers/explored-context';
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

export const BALANCE_REPORT_SEEDS = [11, 42, 77];
export const BALANCE_REPORT_OPENING_FRAMES = 1200;
export const BALANCE_REPORT_CLAM_FRAMES = 1800;
export const BALANCE_REPORT_LONG_RUN_FRAMES = 2400;
const TEST_STAGE = 6;

export interface BalanceReportRow {
  kind: 'clam' | 'pearl';
  id: string;
  label: string;
  cost: number;
  budget_pct: number | null;
  power_mean_pct: number;
  economy_mean_pct: number;
  meta_min_pct: number;
  meta_mean_pct: number;
  meta_max_pct: number;
}

interface BuildReportOptions {
  frames?: number;
}

function getAliveEnemyNestHp(world: GameWorld): number {
  return Array.from(query(world.ecs, [Health, EntityTypeTag])).reduce((sum, eid) => {
    if (EntityTypeTag.kind[eid] !== EntityKind.PredatorNest) return sum;
    if (Health.current[eid] <= 0) return sum;
    return sum + Health.current[eid];
  }, 0);
}

function snapshotWorld(
  world: GameWorld,
  prestigeRank: number,
  initialEnemyNestHp: number,
): BalanceSnapshot {
  const lodge = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      EntityTypeTag.kind[eid] !== EntityKind.Lodge &&
      !BUILDING_KINDS.has(EntityTypeTag.kind[eid]),
  );
  const totalCurrentHp = playerUnits.reduce((sum, eid) => sum + Health.current[eid], 0);
  const totalMaxHp = playerUnits.reduce((sum, eid) => sum + Health.max[eid], 0);
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
    resourcesStockpiled: world.resources.fish + world.resources.logs + world.resources.rocks,
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits: playerUnits.length,
    lodgeHpRatio:
      lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge],
    playerUnitHpPool: totalCurrentHp,
    playerUnitHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
    exploredPercent: world.exploredPercent,
    enemyNestHpRemovedRatio:
      initialEnemyNestHp > 0
        ? Math.min(1, Math.max(0, 1 - getAliveEnemyNestHp(world) / initialEnemyNestHp))
        : 0,
    matchClamsEarned,
  };
}

function runVariant(
  seed: number,
  variant: BalanceVariantConfig | undefined,
  frames: number,
): BalanceSnapshot {
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
  mockedGameRef.world = world;

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
  const initialEnemyNestHp = getAliveEnemyNestHp(world);
  resetFogOfWar();
  initFogOfWar(createExploredTestContext(world.worldWidth, world.worldHeight));
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < frames; frame += 1) {
    runSimFrame(world, { governor, runMatchEvents: true, runPrestigeAutoBehaviors: true, syncSignals: true });
    fogOfWarSystem(world);
  }

  const result = snapshotWorld(world, prestigeState.rank, initialEnemyNestHp);
  resetFogOfWar();
  return result;
}

export function buildReportRows(
  variants: BalanceVariantConfig[],
  baselineVariant?: BalanceVariantConfig,
  options: BuildReportOptions = {},
): BalanceReportRow[] {
  const frames = options.frames ?? BALANCE_REPORT_OPENING_FRAMES;
  const getScores = createSnapshotScoreCache<BalanceVariantConfig | undefined>((seed, variant) =>
    runVariant(seed, variant, frames),
  );
  const baselineScores = new Map<number, ReturnType<typeof getScores>>();
  for (const seed of BALANCE_REPORT_SEEDS) {
    baselineScores.set(seed, getScores(seed, baselineVariant));
  }

  return variants
    .map((variant) => {
      const powerShifts = BALANCE_REPORT_SEEDS.map((seed) =>
        getDifficultyShiftPercent(
          baselineScores.get(seed)?.power ?? 0,
          getScores(seed, variant).power,
        ),
      );
      const rewardShifts = BALANCE_REPORT_SEEDS.map((seed) =>
        getDifficultyShiftPercent(
          baselineScores.get(seed)?.reward ?? 0,
          getScores(seed, variant).reward,
        ),
      );
      const metaShifts = BALANCE_REPORT_SEEDS.map((seed) =>
        getDifficultyShiftPercent(
          baselineScores.get(seed)?.meta ?? 0,
          getScores(seed, variant).meta,
        ),
      );
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

export function getSuspiciousRows(rows: BalanceReportRow[]): BalanceReportRow[] {
  return rows.filter(
    (row) =>
      row.meta_mean_pct <= 0 ||
      row.meta_min_pct < -2 ||
      (row.budget_pct != null &&
        Math.max(row.power_mean_pct, row.economy_mean_pct) < row.budget_pct * 0.25),
  );
}

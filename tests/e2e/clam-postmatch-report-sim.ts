// @vitest-environment jsdom

import { query } from 'bitecs';
import { vi } from 'vitest';
import {
  getDifficultyShiftPercent,
  getMetaProgressionScore,
  getPowerScore,
  getRewardScore,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
import { type BalanceVariantConfig } from '@/balance/track-variants';
import { generateUpgradeWeb } from '@/config/upgrade-web';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { autoSymbolSystem, resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { fogOfWarSystem, initFogOfWar, resetFogOfWar } from '@/ecs/systems/fog-of-war';
import {
  getEventsCompletedCount,
  resetMatchEventRunner,
} from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import { createUpgradeWebState, purchaseNode } from '@/ui/upgrade-web-state';
import * as storeV3 from '@/ui/store-v3';
import { createPrestigeState } from '@/config/prestige-logic';
import { SeededRandom } from '@/utils/random';
import { createSnapshotScoreCache } from './balance-score-cache';
import { BALANCE_REPORT_SEEDS, type BalanceReportRow } from './balance-report-sim';
import { mockedGameRef } from '../helpers/game-world-ref';
import { createExploredTestContext } from '../helpers/explored-context';
import { getPlayerFortificationSnapshot } from '../helpers/fortification-snapshot';
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

export const CLAM_POSTMATCH_STAGE = 6;
export const CLAM_POSTMATCH_WARMUP_FRAMES = 2400;
export const CLAM_POSTMATCH_EVAL_FRAMES = 2400;

interface MatchRunResult {
  snapshot: BalanceSnapshot;
  earnedClams: number;
  fish: number;
  logs: number;
  rocks: number;
  towerCount: number;
  wallCount: number;
}

function getAliveEnemyNestHp(world: GameWorld): number {
  return Array.from(query(world.ecs, [Health, EntityTypeTag])).reduce((sum, eid) => {
    if (EntityTypeTag.kind[eid] !== EntityKind.PredatorNest) return sum;
    if (Health.current[eid] <= 0) return sum;
    return sum + Health.current[eid];
  }, 0);
}

function snapshotWorld(world: GameWorld, initialEnemyNestHp: number): MatchRunResult {
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
  const fortificationSnapshot = getPlayerFortificationSnapshot(world);
  const towerCount = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Tower &&
      Health.current[eid] > 0,
  ).length;
  const wallCount = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Wall &&
      Health.current[eid] > 0,
  ).length;
  const earnedClams = calculateMatchReward({
    result: world.state === 'lose' ? 'loss' : 'win',
    durationSeconds: Math.round(world.frameCount / 60),
    kills: world.stats.unitsKilled,
    resourcesGathered: world.stats.resourcesGathered,
    eventsCompleted: getEventsCompletedCount(),
    prestigeRank: 0,
    earningsMultiplier: world.clamRewardMultiplier,
  }).totalClams;

  return {
    earnedClams,
    fish: world.resources.fish,
    logs: world.resources.logs,
    rocks: world.resources.rocks,
    towerCount,
    wallCount,
    snapshot: {
      resourcesGathered: world.stats.resourcesGathered,
      resourcesStockpiled: world.resources.fish + world.resources.logs + world.resources.rocks,
      unitsTrained: world.stats.unitsTrained,
      kills: world.stats.unitsKilled,
      playerUnits: playerUnits.length,
      playerUnitHpPool: totalCurrentHp,
      playerUnitHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
      ...fortificationSnapshot,
      exploredPercent: world.exploredPercent,
      enemyNestHpRemovedRatio:
        initialEnemyNestHp > 0
          ? Math.min(1, Math.max(0, 1 - getAliveEnemyNestHp(world) / initialEnemyNestHp))
          : 0,
      lodgeHpRatio:
        lodge == null || Health.max[lodge] <= 0 ? 0 : Health.current[lodge] / Health.max[lodge],
      matchClamsEarned: earnedClams,
    },
  };
}

function runMatch(seed: number, purchasedNodeIds: string[], clams: number, frames: number): MatchRunResult {
  resetAutoSymbol();
  resetMatchEventRunner();
  storeV3.progressionLevel.value = CLAM_POSTMATCH_STAGE;
  storeV3.prestigeState.value = createPrestigeState();
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = purchasedNodeIds;
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: CLAM_POSTMATCH_STAGE, seed, fish: 200 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(CLAM_POSTMATCH_STAGE, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed));
  const upgradeState = buildCurrentRunUpgradeState({
    clams,
    purchasedNodeIds,
    purchasedDiamondIds: [],
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, createPrestigeState());
  spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  const initialEnemyNestHp = getAliveEnemyNestHp(world);
  resetFogOfWar();
  initFogOfWar(createExploredTestContext(world.worldWidth, world.worldHeight));
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < frames; frame += 1) {
    runSimFrame(world, { governor, runMatchEvents: true, runPrestigeAutoBehaviors: true, syncSignals: true });
    fogOfWarSystem(world);
  }

  const result = snapshotWorld(world, initialEnemyNestHp);
  resetFogOfWar();
  return result;
}

function buildPurchasedNodeIds(
  availableClams: number,
  variant: BalanceVariantConfig | undefined,
): string[] {
  if (!variant?.purchasedNodeIds?.length) return [];

  const state = createUpgradeWebState(availableClams);
  const web = generateUpgradeWeb();
  for (const nodeId of variant.purchasedNodeIds) {
    const result = purchaseNode(state, web, nodeId);
    if (!result.success) {
      throw new Error(`Unable to afford ${nodeId} after warmup: ${result.reason}`);
    }
  }
  return Array.from(state.purchasedNodes);
}

export function buildPostMatchClamReportRows(
  variants: BalanceVariantConfig[],
): BalanceReportRow[] {
  const getScores = createSnapshotScoreCache<BalanceVariantConfig | undefined>((seed, variant) => {
    const warmup = runMatch(seed, [], 0, CLAM_POSTMATCH_WARMUP_FRAMES);
    const purchasedNodeIds = buildPurchasedNodeIds(warmup.earnedClams, variant);
    return runMatch(seed, purchasedNodeIds, warmup.earnedClams, CLAM_POSTMATCH_EVAL_FRAMES).snapshot;
  });
  const baselineScores = new Map<number, ReturnType<typeof getScores>>();
  for (const seed of BALANCE_REPORT_SEEDS) {
    baselineScores.set(seed, getScores(seed, undefined));
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

export interface ClamTrackDiagnosticRow {
  id: string;
  label: string;
  seed: number;
  earnedClams: number;
  fish: number;
  logs: number;
  rocks: number;
  towers: number;
  walls: number;
  fortificationCount: number;
  fortificationHpPool: number;
  fortificationHpRatio: number;
  exploredPercent: number;
  enemyNestHpRemovedRatio: number;
  power: number;
  reward: number;
  meta: number;
}

export function buildPostMatchClamDiagnosticRows(
  variants: BalanceVariantConfig[],
): ClamTrackDiagnosticRow[] {
  const cache = new Map<string, MatchRunResult>();

  const getResult = (seed: number, variant: BalanceVariantConfig | undefined): MatchRunResult => {
    const key = `${seed}:${JSON.stringify(variant ?? null)}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const warmup = runMatch(seed, [], 0, CLAM_POSTMATCH_WARMUP_FRAMES);
    const purchasedNodeIds = buildPurchasedNodeIds(warmup.earnedClams, variant);
    const result = runMatch(seed, purchasedNodeIds, warmup.earnedClams, CLAM_POSTMATCH_EVAL_FRAMES);
    cache.set(key, result);
    return result;
  };

  return variants.flatMap((variant) =>
    BALANCE_REPORT_SEEDS.map((seed) => {
      const result = getResult(seed, variant);
      return {
        id: variant.id,
        label: variant.label,
        seed,
        earnedClams: result.earnedClams,
        fish: result.fish,
        logs: result.logs,
        rocks: result.rocks,
        towers: result.towerCount,
        walls: result.wallCount,
        fortificationCount: result.snapshot.playerFortificationCount ?? 0,
        fortificationHpPool: result.snapshot.playerFortificationHpPool ?? 0,
        fortificationHpRatio: Number((result.snapshot.playerFortificationHpRatio ?? 0).toFixed(3)),
        exploredPercent: Number((result.snapshot.exploredPercent ?? 0).toFixed(2)),
        enemyNestHpRemovedRatio: Number((result.snapshot.enemyNestHpRemovedRatio ?? 0).toFixed(3)),
        power: Number(getPowerScore(result.snapshot).toFixed(3)),
        reward: Number(getRewardScore(result.snapshot).toFixed(3)),
        meta: Number(getMetaProgressionScore(result.snapshot).toFixed(3)),
      };
    }),
  );
}

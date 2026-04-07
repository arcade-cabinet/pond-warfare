// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  getCombatPressureScore,
  getDifficultyShiftPercent,
  getPowerScore,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { computePopulation } from '@/game/population-counter';
import { syncRosters } from '@/game/roster-sync';
import { syncThreatAndObjectives } from '@/game/threat-sync';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
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

interface CombatVariant {
  name: string;
  prestigeState: PrestigeState;
}

const SEEDS = [11, 42, 77];
const TEST_STAGE = 3;
const TEST_FRAMES = 900;

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

function seedCombatPressure(world: GameWorld, lodgeEid: number): void {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  Health.current[lodgeEid] = Math.round(Health.max[lodgeEid] * 0.6);

  const playerOffsets = [
    [-70, -30],
    [-20, -55],
    [35, -40],
    [75, -15],
  ] as const;
  for (let index = 0; index < playerOffsets.length; index += 1) {
    const [dx, dy] = playerOffsets[index];
    const kind = index < 2 ? MUDPAW_KIND : SAPPER_KIND;
    const eid = spawnEntity(world, kind, lodgeX + dx, lodgeY + dy, Faction.Player);
    Health.current[eid] = Math.round(Health.max[eid] * 0.65);
  }

  const enemyOffsets = [
    [-90, -110],
    [-30, -135],
    [25, -115],
    [85, -130],
    [-55, -170],
    [60, -175],
  ] as const;
  for (let index = 0; index < enemyOffsets.length; index += 1) {
    const [dx, dy] = enemyOffsets[index];
    const kind = index % 3 === 0 ? EntityKind.Snake : EntityKind.Gator;
    spawnEntity(world, kind, lodgeX + dx, lodgeY + dy, Faction.Enemy);
  }
}

function snapshotWorld(world: GameWorld): BalanceSnapshot {
  const lodgeEid = findPlayerLodge(world);
  const playerUnits = Array.from(query(world.ecs, [FactionTag, Health])).filter(
    (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
  ).length;

  return {
    resourcesGathered: world.stats.resourcesGathered,
    unitsTrained: world.stats.unitsTrained,
    kills: world.stats.unitsKilled,
    playerUnits,
    lodgeHpRatio: Health.current[lodgeEid] / Math.max(1, Health.max[lodgeEid]),
  };
}

function runCombatVariant(seed: number, variant: CombatVariant): BalanceSnapshot {
  storeV3.progressionLevel.value = TEST_STAGE;
  storeV3.prestigeState.value = variant.prestigeState;
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: TEST_STAGE, seed, fish: 80 });
  world.peaceTimer = 0;
  mockedGameRef.world = world;

  const panelGrid = createTestPanelGrid(TEST_STAGE, 960, 540, seed);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(seed));
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 0,
    purchasedNodeIds: [],
    purchasedDiamondIds: [],
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, variant.prestigeState);
  const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(seed + 100));
  deploySpecialistsAtMatchStart(world, variant.prestigeState, lodgeEid);
  seedCombatPressure(world, lodgeEid);
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;
  for (let frame = 0; frame < TEST_FRAMES; frame += 1) {
    runSimFrame(world, { governor, runMatchEvents: false, runPrestigeAutoBehaviors: true, syncSignals: true });
  }

  return snapshotWorld(world);
}

describe('pearl combat-pressure diagnostics', () => {
  it('profiles combat, hp, heal, and repair upgrades under immediate pressure', () => {
    const baselineVariant: CombatVariant = {
      name: 'rank_one_baseline',
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    };

    const variants: CombatVariant[] = [
      {
        name: 'combat_multiplier',
        prestigeState: {
          ...baselineVariant.prestigeState,
          upgradeRanks: { combat_multiplier: 1 },
        },
      },
      {
        name: 'hp_multiplier',
        prestigeState: {
          ...baselineVariant.prestigeState,
          upgradeRanks: { hp_multiplier: 1 },
        },
      },
      {
        name: 'auto_heal_behavior',
        prestigeState: {
          ...baselineVariant.prestigeState,
          upgradeRanks: { auto_heal_behavior: 1 },
        },
      },
      {
        name: 'auto_repair_behavior',
        prestigeState: {
          ...baselineVariant.prestigeState,
          upgradeRanks: { auto_repair_behavior: 1 },
        },
      },
    ];

    const baselineScores = new Map<number, number>();
    for (const seed of SEEDS) {
      baselineScores.set(seed, getCombatPressureScore(runCombatVariant(seed, baselineVariant)));
    }

    const rows = variants.map((variant) => {
      const shifts = SEEDS.map((seed) => {
        const baseline = baselineScores.get(seed) ?? 0;
        return getDifficultyShiftPercent(
          baseline,
          getCombatPressureScore(runCombatVariant(seed, variant)),
        );
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
      expect(Number.isFinite(row.min_pct)).toBe(true);
      expect(Number.isFinite(row.mean_pct)).toBe(true);
      expect(Number.isFinite(row.max_pct)).toBe(true);
      expect(row.max_pct).toBeGreaterThanOrEqual(row.mean_pct);
      expect(row.mean_pct).toBeGreaterThanOrEqual(row.min_pct);
    }
  });
});

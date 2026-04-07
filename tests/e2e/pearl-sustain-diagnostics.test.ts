// @vitest-environment jsdom

import { hasComponent, query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  getDifficultyShiftPercent,
  getSustainScore,
  summarizeShiftPercents,
  type BalanceSnapshot,
} from '@/balance/progression-model';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { healthSystem } from '@/ecs/systems/health';
import { movementSystem } from '@/ecs/systems/movement';
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind, Faction, UnitState } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as storeV3 from '@/ui/store-v3';
import { runSimFrame } from '../helpers/run-sim-frame';
import { createTestWorld } from '../helpers/world-factory';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

interface SustainVariant {
  name: string;
  prestigeState: PrestigeState;
}

const SEEDS = [11, 42, 77];
const TEST_FRAMES = 1500;
const WAVE_INTERVAL = 300;

function createSustainWorld(seed: number, prestigeState: PrestigeState): { world: GameWorld; lodge: number } {
  storeV3.progressionLevel.value = 4;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  const world = createTestWorld({ stage: 1, seed, fish: 0, logs: 0 });
  world.peaceTimer = 0;

  const upgradeState = buildCurrentRunUpgradeState({
    clams: 0,
    purchasedNodeIds: [],
    purchasedDiamondIds: [],
    startingTierRank: 0,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);

  const lodge = spawnEntity(world, EntityKind.Lodge, 320, 430, Faction.Player);
  Health.current[lodge] = Math.round(Health.max[lodge] * 0.72);

  seedPlayerDefense(world, lodge);
  spawnEnemyWave(world, lodge, 0);

  return { world, lodge };
}

function seedPlayerDefense(world: GameWorld, lodge: number): void {
  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];
  const offsets = [
    [-90, -40],
    [-50, -62],
    [-10, -55],
    [30, -62],
    [70, -42],
    [0, -18],
  ] as const;

  for (let index = 0; index < offsets.length; index += 1) {
    const [dx, dy] = offsets[index];
    const eid = spawnEntity(world, EntityKind.Brawler, lodgeX + dx, lodgeY + dy, Faction.Player);
    const hpRatio = world.gameRng.float(0.48, 0.72);
    Health.current[eid] = Math.round(Health.max[eid] * hpRatio);
    dispatchTaskOverride(world, eid, 'defending');
  }
}

function spawnEnemyWave(world: GameWorld, lodge: number, waveIndex: number): void {
  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];
  const originY = lodgeY - 220 - waveIndex * 18 + world.gameRng.float(-12, 12);
  const unitKinds: EntityKind[] = [];
  const baseCount = waveIndex >= 3 ? 6 : 5;
  for (let index = 0; index < baseCount; index += 1) {
    if (waveIndex >= 2 && world.gameRng.next() > 0.72) {
      unitKinds.push(EntityKind.ArmoredGator);
    } else {
      unitKinds.push(world.gameRng.next() > 0.45 ? EntityKind.Gator : EntityKind.Snake);
    }
  }

  for (let index = 0; index < unitKinds.length; index += 1) {
    const kind = unitKinds[index];
    const eid = spawnEntity(
      world,
      kind,
      lodgeX - 100 + index * 40 + world.gameRng.float(-10, 10),
      originY - (index % 2) * 18 + world.gameRng.float(-8, 8),
      Faction.Enemy,
    );
    UnitStateMachine.targetEntity[eid] = lodge;
    UnitStateMachine.targetX[eid] = lodgeX;
    UnitStateMachine.targetY[eid] = lodgeY;
    UnitStateMachine.state[eid] = UnitState.AttackMove;
  }
}

function snapshotWorld(world: GameWorld, lodge: number): BalanceSnapshot {
  const playerUnits = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (eid === lodge) return false;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource)) {
      return false;
    }
    return true;
  });

  const totalCurrentHp = playerUnits.reduce((sum, eid) => sum + Health.current[eid], 0);
  const totalMaxHp = playerUnits.reduce((sum, eid) => sum + Health.max[eid], 0);

  return {
    resourcesGathered: 0,
    unitsTrained: 0,
    kills: world.stats.unitsKilled,
    playerUnits: playerUnits.length,
    playerUnitHpPool: totalCurrentHp,
    playerUnitHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
    lodgeHpRatio: Health.current[lodge] / Math.max(1, Health.max[lodge]),
  };
}

function runSustainVariant(seed: number, variant: SustainVariant): BalanceSnapshot {
  const { world, lodge } = createSustainWorld(seed, variant.prestigeState);

  for (let frame = 0; frame < TEST_FRAMES; frame += 1) {
    if (frame > 0 && frame % WAVE_INTERVAL === 0) {
      spawnEnemyWave(world, lodge, Math.floor(frame / WAVE_INTERVAL));
    }
    runSimFrame(world, { runMatchEvents: false, runPrestigeAutoBehaviors: true, syncSignals: false });
  }

  return snapshotWorld(world, lodge);
}

describe('pearl sustain diagnostics', () => {
  it('profiles hp, heal, repair, and combat upgrades in a developed defensive hold', () => {
    const baselineVariant: SustainVariant = {
      name: 'rank_one_baseline',
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    };

    const variants: SustainVariant[] = [
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
      baselineScores.set(seed, getSustainScore(runSustainVariant(seed, baselineVariant)));
    }

    const rows = variants.map((variant) => {
      const shifts = SEEDS.map((seed) => {
        const baseline = baselineScores.get(seed) ?? 0;
        return getDifficultyShiftPercent(baseline, getSustainScore(runSustainVariant(seed, variant)));
      });
      const summary = summarizeShiftPercents(shifts);
      return {
        track: variant.name,
        min_pct: Number(summary.min.toFixed(2)),
        mean_pct: Number(summary.mean.toFixed(2)),
        max_pct: Number(summary.max.toFixed(2)),
      };
    });

    console.log('\nPearl sustain diagnostics');
    console.table(rows);

    const byTrack = new Map(rows.map((row) => [row.track, row]));

    for (const row of rows) {
      expect(Number.isFinite(row.min_pct)).toBe(true);
      expect(Number.isFinite(row.mean_pct)).toBe(true);
      expect(Number.isFinite(row.max_pct)).toBe(true);
      expect(row.max_pct).toBeGreaterThanOrEqual(row.mean_pct);
      expect(row.mean_pct).toBeGreaterThanOrEqual(row.min_pct);
    }

    expect(byTrack.get('auto_heal_behavior')?.mean_pct ?? 0).toBeGreaterThan(0);
    expect(byTrack.get('auto_repair_behavior')?.mean_pct ?? 0).toBeGreaterThan(0);
  });
});

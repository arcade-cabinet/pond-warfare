// @vitest-environment jsdom
/**
 * Tap-Based E2E Playthrough with Timing Profiles
 *
 * Simulates a REAL player using ONLY tap actions:
 * - Tap Lodge to select it, tap radial option to train
 * - Tap unit to select, tap resource/enemy to issueContextCommand
 * - NO Governor, NO keyboard, NO direct state manipulation
 *
 * Runs the full ECS system chain per frame. Tracks timing milestones
 * and prints a profiling table for each tier 1-6.
 */

import { query } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoSymbolSystem } from '@/ecs/systems/auto-symbol';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import { matchEventRunnerSystem } from '@/ecs/systems/match-event-runner';
import { movementSystem } from '@/ecs/systems/movement';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { computePopulation } from '@/game/population-counter';
import { syncRosters } from '@/game/roster-sync';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { issueContextCommand, train } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';
import { getRadialOptions } from '@/ui/radial-menu-options';
import * as store from '@/ui/store';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

// ── Mocks (audio, rendering, particles only) ──────────────────────
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');
vi.mock('@/game', () => ({
  game: { world: null },
}));

// ── Milestone Tracker ─────────────────────────────────────────────

interface TierProfile {
  tier: number;
  firstUnitTrained: number;
  firstDeposit: number;
  firstKill: number;
  firstWaveEvent: number;
  lodgeHpAtEnd: number;
  finalState: string;
  playerUnits: number;
  enemyUnits: number;
  totalTrained: number;
  totalGathered: number;
  totalKills: number;
}

const NO_FRAME = -1;

// ── Entity Finders (simulate "tapping on" an entity) ──────────────

/** Find player Lodge entity. */
function findLodge(w: GameWorld): number | null {
  for (const eid of query(w.ecs, [EntityTypeTag, FactionTag, Health, IsBuilding])) {
    const k = EntityTypeTag.kind[eid];
    if (
      (k === EntityKind.Lodge || k === EntityKind.PredatorNest) &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return null;
}

/** Find player Commander entity. */
function findCommander(w: GameWorld): number | null {
  for (const eid of query(w.ecs, [Commander, FactionTag, Health])) {
    if (Commander.isPlayerCommander[eid] === 1 && Health.current[eid] > 0) {
      return eid;
    }
  }
  return null;
}

/** Find all player units of a given EntityKind that are alive. */
function findPlayerUnits(w: GameWorld, kind: EntityKind): number[] {
  const results: number[] = [];
  for (const eid of query(w.ecs, [EntityTypeTag, FactionTag, Health, UnitStateMachine])) {
    if (
      EntityTypeTag.kind[eid] === kind &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      results.push(eid);
    }
  }
  return results;
}

/** Find all idle player combat units (Brawler, Sniper, etc). */
function findIdleCombatUnits(w: GameWorld): number[] {
  const combatKinds = new Set([
    EntityKind.Brawler,
    EntityKind.Sniper,
    EntityKind.Healer,
    EntityKind.Scout,
    EntityKind.Sapper,
    EntityKind.Saboteur,
  ]);
  const results: number[] = [];
  for (const eid of query(w.ecs, [EntityTypeTag, FactionTag, Health, UnitStateMachine])) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (!combatKinds.has(EntityTypeTag.kind[eid])) continue;
    if (UnitStateMachine.state[eid] === UnitState.Idle) {
      results.push(eid);
    }
  }
  return results;
}

/** Find nearest resource of a specific kind to a position. */
function findNearestResource(w: GameWorld, x: number, y: number, kind: EntityKind): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const eid of query(w.ecs, [Position, IsResource, Resource, EntityTypeTag])) {
    if (EntityTypeTag.kind[eid] !== kind) continue;
    if (Resource.amount[eid] <= 0) continue;
    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = eid;
    }
  }
  return best;
}

/** Find nearest alive enemy unit to a position. */
function findNearestEnemy(w: GameWorld, x: number, y: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const eid of query(w.ecs, [Position, FactionTag, Health])) {
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = eid;
    }
  }
  return best;
}

/** Check if any enemy is within range of Lodge. */
function isBaseUnderAttack(w: GameWorld, range: number): boolean {
  const lodge = findLodge(w);
  if (lodge === null) return false;
  const lx = Position.x[lodge];
  const ly = Position.y[lodge];
  for (const eid of query(w.ecs, [Position, Health, FactionTag])) {
    if (FactionTag.faction[eid] !== Faction.Enemy || Health.current[eid] <= 0) continue;
    const dx = lx - Position.x[eid];
    const dy = ly - Position.y[eid];
    if (dx * dx + dy * dy < range * range) return true;
  }
  return false;
}

/** Count alive units for a faction. */
function countAlive(w: GameWorld, faction: Faction): number {
  let n = 0;
  for (const eid of query(w.ecs, [Health, FactionTag])) {
    if (FactionTag.faction[eid] === faction && Health.current[eid] > 0) n++;
  }
  return n;
}

/** Get Lodge HP. */
function getLodgeHp(w: GameWorld): number {
  const lodge = findLodge(w);
  return lodge !== null ? Health.current[lodge] : -1;
}

// ── Frame Runner ──────────────────────────────────────────────────

function runFrame(w: GameWorld): void {
  w.frameCount++;

  // Yuka steering + spatial hash BEFORE systems (same as real game loop)
  w.yukaManager.update(1 / 60, w.ecs);
  w.spatialHash.clear();
  for (const eid of query(w.ecs, [Position, Health])) {
    if (Health.current[eid] > 0) {
      w.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
    }
  }

  // Core ECS systems (same order as systems-runner.ts minus physics/visual)
  weatherSystem(w);
  movementSystem(w);
  gatheringSystem(w);
  combatSystem(w);
  commanderPassivesSystem(w);
  trainingSystem(w);
  aiSystem(w);
  evolutionSystem(w);
  autoTrainSystem(w);
  healthSystem(w);
  matchEventRunnerSystem(w, progressionLevel.value);
  autoSymbolSystem(w);
  cleanupSystem(w);

  // Store sync every 30 frames (same as real game)
  if (w.frameCount % 30 === 0) {
    computePopulation(w);
    store.fish.value = w.resources.fish;
    store.logs.value = w.resources.logs;
    store.rocks.value = w.resources.rocks;
    store.gameState.value = w.state;
    syncRosters(w);
  }
}

// ── Tap Simulation Helpers ────────────────────────────────────────

/** Simulate "tap on entity" -> select it. */
function tapSelect(w: GameWorld, eid: number): void {
  w.selection = [eid];
}

/**
 * Simulate "tap radial train option" on a selected Lodge.
 * Reads radial options, finds the train_X option, and calls train().
 * Returns true if training was successfully queued.
 */
function tapTrainFromRadial(w: GameWorld, lodgeEid: number, unitKind: EntityKind): boolean {
  const gameState = {
    fish: w.resources.fish,
    rocks: w.resources.rocks,
    logs: w.resources.logs,
    unlockStage: progressionLevel.value,
    lodgeDamaged: Health.current[lodgeEid] < Health.max[lodgeEid],
  };
  const options = getRadialOptions('lodge', null, gameState);

  const kindToRadialId: Partial<Record<EntityKind, string>> = {
    [EntityKind.Gatherer]: 'train_gatherer',
    [EntityKind.Brawler]: 'train_fighter',
    [EntityKind.Healer]: 'train_medic',
    [EntityKind.Scout]: 'train_scout',
    [EntityKind.Sapper]: 'train_sapper',
    [EntityKind.Saboteur]: 'train_saboteur',
  };

  const radialId = kindToRadialId[unitKind];
  if (!radialId) return false;

  const opt = options.find((o) => o.id === radialId);
  if (!opt || opt.disabled) return false;

  const def = ENTITY_DEFS[unitKind];
  const fc = def.fishCost ?? 0;
  const lc = def.logCost ?? 0;
  const foodCost = def.foodCost ?? 1;

  if (w.resources.fish >= fc && w.resources.logs >= lc) {
    train(w, lodgeEid, unitKind, fc, lc, foodCost);
    return true;
  }
  return false;
}

/**
 * Simulate "tap unit, then tap target" (context command).
 */
function tapUnitThenTarget(w: GameWorld, unitEid: number, targetEid: number): boolean {
  tapSelect(w, unitEid);
  return issueContextCommand(w, targetEid, Position.x[targetEid], Position.y[targetEid]);
}

// ── Test Suite ────────────────────────────────────────────────────

describe('Tap-Based E2E Playthrough Profiles', () => {
  const profiles: TierProfile[] = [];

  beforeEach(() => {
    progressionLevel.value = 0;
    store.fish.value = 200;
    store.logs.value = 50;
    store.rocks.value = 0;
    store.food.value = 0;
    store.maxFood.value = 0;
  });

  it.each([
    1, 2, 3, 4, 5, 6,
  ])('tier %i: tap-only playthrough with timing profile (13200 frames ~220s)', (stage) => {
    progressionLevel.value = stage;

    // ── World Setup ───────────────────────────────────
    const world = createTestWorld({ stage, seed: 42 });
    // Real peace timer: 10800 frames (3 min) — player builds economy before enemies attack
    const pg = createTestPanelGrid(stage);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Initial population sync
    computePopulation(world);
    syncRosters(world);
    store.fish.value = world.resources.fish;
    store.logs.value = world.resources.logs;
    store.rocks.value = world.resources.rocks;

    // ── Milestone tracking ────────────────────────────
    const profile: TierProfile = {
      tier: stage,
      firstUnitTrained: NO_FRAME,
      firstDeposit: NO_FRAME,
      firstKill: NO_FRAME,
      firstWaveEvent: NO_FRAME,
      lodgeHpAtEnd: -1,
      finalState: 'playing',
      playerUnits: 0,
      enemyUnits: 0,
      totalTrained: 0,
      totalGathered: 0,
      totalKills: 0,
    };

    let prevUnitsTrained = world.stats.unitsTrained;
    let prevResourcesGathered = world.stats.resourcesGathered;
    let prevKills = world.stats.unitsKilled;
    let prevWaveNumber = world.waveNumber;
    let gathererTrainAttempts = 0;
    let fighterTrainAttempts = 0;

    const TOTAL_FRAMES = 13200; // 220 seconds — past 3-min peace timer + initial combat

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      // Stop early if game ended (Lodge destroyed)
      if (world.state !== 'playing') break;

      runFrame(world);

      // ── Milestone Detection ─────────────────────────
      if (profile.firstUnitTrained === NO_FRAME && world.stats.unitsTrained > prevUnitsTrained) {
        profile.firstUnitTrained = f + 1;
      }
      if (
        profile.firstDeposit === NO_FRAME &&
        world.stats.resourcesGathered > prevResourcesGathered
      ) {
        profile.firstDeposit = f + 1;
      }
      if (profile.firstKill === NO_FRAME && world.stats.unitsKilled > prevKills) {
        profile.firstKill = f + 1;
      }
      if (profile.firstWaveEvent === NO_FRAME && world.waveNumber > prevWaveNumber) {
        profile.firstWaveEvent = f + 1;
      }

      prevUnitsTrained = world.stats.unitsTrained;
      prevResourcesGathered = world.stats.resourcesGathered;
      prevKills = world.stats.unitsKilled;
      prevWaveNumber = world.waveNumber;

      // ── Player Actions (every 60 frames = ~1s) ─────
      if ((f + 1) % 60 !== 0) continue;

      const lodge = findLodge(world);
      if (!lodge) continue;

      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      const gatherers = findPlayerUnits(world, EntityKind.Gatherer);
      const fighters = findPlayerUnits(world, EntityKind.Brawler);
      const baseAttacked = isBaseUnderAttack(world, 500);

      // Priority 1: If base is under attack, rally ALL combat units
      if (baseAttacked) {
        const cmdr = findCommander(world);
        if (cmdr !== null && UnitStateMachine.state[cmdr] === UnitState.Idle) {
          const enemy = findNearestEnemy(world, lodgeX, lodgeY);
          if (enemy !== null) {
            tapUnitThenTarget(world, cmdr, enemy);
          }
        }
        const idleCombat = findIdleCombatUnits(world);
        for (const cEid of idleCombat) {
          const enemy = findNearestEnemy(world, Position.x[cEid], Position.y[cEid]);
          if (enemy !== null) {
            tapUnitThenTarget(world, cEid, enemy);
          }
        }
        for (const fEid of fighters) {
          if (UnitStateMachine.state[fEid] !== UnitState.Idle) continue;
          const enemy = findNearestEnemy(world, Position.x[fEid], Position.y[fEid]);
          if (enemy !== null) {
            tapUnitThenTarget(world, fEid, enemy);
          }
        }
      }

      // Priority 2: Train units via Lodge radial menu
      if (gatherers.length < 4 && gathererTrainAttempts < 10) {
        tapSelect(world, lodge);
        if (tapTrainFromRadial(world, lodge, EntityKind.Gatherer)) {
          gathererTrainAttempts++;
        }
      } else if (fighters.length < 4 && fighterTrainAttempts < 10) {
        tapSelect(world, lodge);
        if (tapTrainFromRadial(world, lodge, EntityKind.Brawler)) {
          fighterTrainAttempts++;
        }
      } else if (world.resources.food < world.resources.maxFood) {
        tapSelect(world, lodge);
        if (fighters.length <= gatherers.length) {
          tapTrainFromRadial(world, lodge, EntityKind.Brawler);
        } else {
          tapTrainFromRadial(world, lodge, EntityKind.Gatherer);
        }
      }

      // Priority 3: Send idle gatherers to fish
      for (const gEid of gatherers) {
        if (UnitStateMachine.state[gEid] !== UnitState.Idle) continue;
        const fishNode = findNearestResource(
          world,
          Position.x[gEid],
          Position.y[gEid],
          EntityKind.Clambed,
        );
        if (fishNode !== null) {
          tapUnitThenTarget(world, gEid, fishNode);
        }
      }

      // Priority 4: Send idle fighters to proactively attack enemies
      if (!baseAttacked) {
        for (const fEid of fighters) {
          if (UnitStateMachine.state[fEid] !== UnitState.Idle) continue;
          const enemy = findNearestEnemy(world, Position.x[fEid], Position.y[fEid]);
          if (enemy !== null) {
            tapUnitThenTarget(world, fEid, enemy);
          }
        }
      }

      // Clear selection after actions
      world.selection = [];
    }

    // ── Record profile ────────────────────────────────
    profile.lodgeHpAtEnd = getLodgeHp(world);
    profile.finalState = world.state;
    profile.playerUnits = countAlive(world, Faction.Player);
    profile.enemyUnits = countAlive(world, Faction.Enemy);
    profile.totalTrained = world.stats.unitsTrained;
    profile.totalGathered = world.stats.resourcesGathered;
    profile.totalKills = world.stats.unitsKilled;
    profiles.push(profile);

    // ── Assertions ────────────────────────────────────
    // The player actively trained and gathered
    expect(world.stats.unitsTrained + world.stats.resourcesGathered).toBeGreaterThan(0);

    // No NaN positions on any surviving entity
    for (const eid of query(world.ecs, [Position, Health])) {
      if (Health.current[eid] <= 0) continue;
      expect(Number.isNaN(Position.x[eid])).toBe(false);
      expect(Number.isNaN(Position.y[eid])).toBe(false);
    }

    // Tiers 1-2: safe enough that active player survives 100s easily
    if (stage <= 2) {
      expect(world.state).toBe('playing');
      expect(getLodgeHp(world)).toBeGreaterThan(0);
    }

    // At all tiers, first unit should train within 300 frames (5s)
    expect(profile.firstUnitTrained).toBeGreaterThan(0);
    expect(profile.firstUnitTrained).toBeLessThanOrEqual(300);
  });

  it('prints consolidated profiling table', () => {
    if (profiles.length === 0) {
      console.log('  [No profiles collected -- run full suite]');
      return;
    }

    const fmtFrame = (f: number): string =>
      f === NO_FRAME ? '    N/A' : `${String(f).padStart(7)}`;

    console.log('\n' + '='.repeat(100));
    console.log('  TAP-BASED PLAYTHROUGH PROFILING TABLE');
    console.log('='.repeat(100));
    console.log(
      '  TIER | First Unit | First Deposit | First Kill |' +
        ' First Wave | Lodge HP | State   | P/E Units |' +
        ' Trained | Gathered | Kills',
    );
    console.log('-'.repeat(100));

    for (const p of profiles) {
      console.log(
        `    ${p.tier}  ` +
          `| ${fmtFrame(p.firstUnitTrained)} frm` +
          `| ${fmtFrame(p.firstDeposit)} frm    ` +
          `| ${fmtFrame(p.firstKill)} frm` +
          `| ${fmtFrame(p.firstWaveEvent)} frm` +
          `| ${String(p.lodgeHpAtEnd).padStart(8)}` +
          `| ${p.finalState.padEnd(8)}` +
          `| ${String(p.playerUnits).padStart(3)}/${String(p.enemyUnits).padEnd(3)}` +
          `| ${String(p.totalTrained).padStart(7)}` +
          `| ${String(p.totalGathered).padStart(8)}` +
          `| ${String(p.totalKills).padStart(5)}`,
      );
    }

    console.log('-'.repeat(100));
    console.log('  Frames @ 60 FPS. 13200 frames = ~220 seconds. Peace timer = 10800 (3 min).');
    console.log('  Player strategy: 4 gatherers -> fighters, defend Lodge, gather fish.');
    console.log('='.repeat(100) + '\n');
  });
});

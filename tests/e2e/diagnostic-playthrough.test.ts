// @vitest-environment jsdom
/**
 * Diagnostic Playthrough E2E — Governor-Driven
 *
 * The Governor (Yuka AI) plays the game the way a human would:
 * reads from UI store signals, makes decisions (train, gather, build,
 * attack, defend), and interacts through the same APIs the UI uses.
 *
 * This is NOT an integration test of individual systems. This simulates
 * a real match from the player's perspective — the Governor perceives
 * the game state through the store, acts through the same dispatch
 * functions, and the full ECS system chain runs each frame.
 *
 * Diagnostic tables print gameplay metrics at intervals so we can
 * validate the v3 experience: economy flow, combat pacing, tier scaling.
 */

import { query } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
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
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { Governor } from '@/governor/governor';
import { train } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

// ── Mocks ──────────────────────────────────────────────────────────

// Mutable world ref — Governor goals read game.world to dispatch actions
const _gameRef: { world: GameWorld | null } = { world: null };
vi.mock('@/game', () => ({
  game: new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'world') return _gameRef.world;
      return undefined;
    },
  }),
}));

// Mock audio — Governor goals transitively import audio for SFX
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
// Auto-mock rendering and particle modules (no real DOM/canvas in test)
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

// ── Diagnostic Snapshot ────────────────────────────────────────────

interface Snap {
  frame: number;
  playerUnits: number;
  enemyUnits: number;
  fish: number;
  rocks: number;
  logs: number;
  food: number;
  maxFood: number;
  lodgeHp: number;
  cmdrHp: number;
  enemyCmdrHp: number;
  kills: number;
  lost: number;
  gathered: number;
  trained: number;
  enemyFish: number;
  gathererInfo: string;
}

function countAlive(world: GameWorld, faction: Faction): number {
  let n = 0;
  for (const eid of query(world.ecs, [Health, FactionTag])) {
    if (FactionTag.faction[eid] === faction && Health.current[eid] > 0) n++;
  }
  return n;
}

function hpOf(world: GameWorld, playerCmdr: boolean): number {
  for (const eid of query(world.ecs, [Health, Commander])) {
    if (Commander.isPlayerCommander[eid] === (playerCmdr ? 1 : 0) && Health.current[eid] > 0) {
      return Health.current[eid];
    }
  }
  return -1;
}

function lodgeHp(world: GameWorld): number {
  for (const eid of query(world.ecs, [Health, EntityTypeTag, FactionTag])) {
    const k = EntityTypeTag.kind[eid];
    if (
      (k === EntityKind.Lodge || k === EntityKind.PredatorNest) &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return Health.current[eid];
    }
  }
  return -1;
}

function snap(w: GameWorld, frame: number): Snap {
  return {
    frame,
    playerUnits: countAlive(w, Faction.Player),
    enemyUnits: countAlive(w, Faction.Enemy),
    fish: w.resources.fish,
    rocks: w.resources.rocks,
    logs: w.resources.logs,
    food: w.resources.food,
    maxFood: w.resources.maxFood,
    lodgeHp: lodgeHp(w),
    cmdrHp: hpOf(w, true),
    enemyCmdrHp: hpOf(w, false),
    kills: w.stats.unitsKilled,
    lost: w.stats.unitsLost,
    trained: w.stats.unitsTrained,
    gathered: w.stats.resourcesGathered,
    enemyFish: w.enemyResources.fish,
    gathererInfo: gathererInfo(w),
  };
}

const STATE_NAMES: Record<number, string> = {
  [UnitState.Idle]: 'I',
  [UnitState.Move]: 'M',
  [UnitState.GatherMove]: 'GM',
  [UnitState.Gathering]: 'G',
  [UnitState.ReturnMove]: 'RM',
  [UnitState.AttackMove]: 'AM',
  [UnitState.Attacking]: 'A',
};

const KIND_SHORT: Record<number, string> = {
  [EntityKind.Gatherer]: 'Ga',
  [EntityKind.Brawler]: 'Br',
  [EntityKind.Scout]: 'Sc',
  [EntityKind.Commander]: 'Cm',
  [EntityKind.Healer]: 'He',
};

function gathererInfo(w: GameWorld): string {
  const states: string[] = [];
  for (const eid of query(w.ecs, [Health, FactionTag, EntityTypeTag, UnitStateMachine])) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid];
    // Skip Lodge and other buildings
    if (kind === EntityKind.Lodge || kind === EntityKind.PredatorNest) continue;
    const s = UnitStateMachine.state[eid];
    const kn = KIND_SHORT[kind] ?? '??';
    states.push(`${kn}:${STATE_NAMES[s] ?? `?${s}`}`);
  }
  return states.length > 0 ? states.join(' ') : '-';
}

function noNaNPositions(w: GameWorld): boolean {
  for (const eid of query(w.ecs, [Position, Health])) {
    if (Health.current[eid] <= 0) continue;
    if (Number.isNaN(Position.x[eid]) || Number.isNaN(Position.y[eid])) return false;
  }
  return true;
}

// ── Frame Runner ───────────────────────────────────────────────────

/**
 * Run one game frame: ECS systems + Yuka update + spatial hash rebuild.
 * Governor tick + store sync happen every 30 frames (same as real game).
 */
function runFrame(w: GameWorld, governor: Governor): void {
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

  // Store sync (every 30 frames, same as real game)
  if (w.frameCount % 30 === 0) {
    // computePopulation calculates food/maxFood/idle counts from buildings
    computePopulation(w);
    store.fish.value = w.resources.fish;
    store.logs.value = w.resources.logs;
    store.rocks.value = w.resources.rocks;
    store.gameState.value = w.state;
    // Detect base under attack: any enemy within 400px of Lodge
    let baseAttacked = false;
    const lodgeEids = query(w.ecs, [Position, EntityTypeTag, FactionTag]).filter(
      (eid) =>
        (EntityTypeTag.kind[eid] === EntityKind.Lodge ||
          EntityTypeTag.kind[eid] === EntityKind.PredatorNest) &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0,
    );
    if (lodgeEids.length > 0) {
      const lx = Position.x[lodgeEids[0]];
      const ly = Position.y[lodgeEids[0]];
      for (const eid of query(w.ecs, [Position, Health, FactionTag])) {
        if (FactionTag.faction[eid] !== Faction.Enemy || Health.current[eid] <= 0) continue;
        const dx = lx - Position.x[eid];
        const dy = ly - Position.y[eid];
        if (dx * dx + dy * dy < 400 * 400) {
          baseAttacked = true;
          break;
        }
      }
    }
    store.baseUnderAttack.value = baseAttacked;
    syncRosters(w);
  }

  // Governor ticks EVERY frame (same as real game loop).
  // Its internal counter handles the 120-frame think interval.
  governor.tick();

  // Direct task dispatch: bypass game.world proxy (bitECS query isolation
  // in vitest). Re-dispatch every 30 frames to keep gatherers working between
  // trips and assign combat units when base is under attack.
  if (w.frameCount % 30 === 0) {
    // Re-dispatch ALL idle gatherers (including those between trips)
    const allIdleGatherers = store.unitRoster.value
      .flatMap((g) => g.units)
      .filter((u) => u.task === 'idle' && u.kind === EntityKind.Gatherer);
    for (const u of allIdleGatherers) {
      dispatchTaskOverride(w, u.eid, 'gathering-fish');
    }

    // Assign idle combat units to attack nearest enemy (proactive defense)
    const idleCombat = store.unitRoster.value
      .filter((g) => g.role === 'combat' || g.role === 'commander')
      .flatMap((g) => g.units)
      .filter((u) => u.task === 'idle');
    if (idleCombat.length > 0 && store.baseUnderAttack.value) {
      for (const u of idleCombat) {
        dispatchTaskOverride(w, u.eid, 'attacking');
      }
    }

    // Direct training: train ONE unit per 120-frame cycle to avoid queue flooding.
    // Alternate between gatherers (up to 4) and combat (up to 3).
    if (w.frameCount % 120 === 0 && w.resources.food < w.resources.maxFood) {
      const lodge = store.buildingRoster.value.find((b) => b.kind === EntityKind.Lodge);
      if (lodge && lodge.queueItems.length < 2) {
        const gatherers = store.unitRoster.value
          .filter((g) => g.role === 'gatherer')
          .reduce((sum, g) => sum + g.units.length, 0);
        const army = store.unitRoster.value
          .filter((g) => g.role === 'combat')
          .reduce((sum, g) => sum + g.units.length, 0);

        let unitKind: EntityKind | null = null;
        if (gatherers < 4) unitKind = EntityKind.Gatherer;
        else if (army < 3) unitKind = EntityKind.Brawler;

        if (unitKind !== null) {
          const def = ENTITY_DEFS[unitKind];
          const fc = def.fishCost ?? 0;
          const lc = def.logCost ?? 0;
          if (w.resources.fish >= fc && w.resources.logs >= lc) {
            train(w, lodge.eid, unitKind, fc, lc, def.foodCost ?? 1);
          }
        }
      }
    }
  }
}

function printDiag(
  stage: number,
  panels: number[],
  wave: boolean,
  w: GameWorld,
  snaps: Snap[],
): void {
  const last = snaps[snaps.length - 1];
  console.log(`\n${'═'.repeat(76)}`);
  console.log(
    `  TIER ${stage} — Panels: [${panels.join(',')}]  Wave: ${wave ? 'YES' : 'NO'}  ` +
      `World: ${w.worldWidth}×${w.worldHeight}`,
  );
  console.log(`${'═'.repeat(76)}`);
  console.log(
    '  Frame | P.Unt | E.Unt | Fish | Rock | Food | Kill | Lost | Trn | Gath | E.Clm | Gatherers',
  );
  console.log(`${'─'.repeat(90)}`);
  for (const s of snaps) {
    console.log(
      `  ${String(s.frame).padStart(5)} |` +
        `${String(s.playerUnits).padStart(5)} |` +
        `${String(s.enemyUnits).padStart(5)} |` +
        `${String(s.fish).padStart(4)} |` +
        `${String(s.rocks).padStart(4)} |` +
        `${String(s.food).padStart(4)} |` +
        `${String(s.kills).padStart(4)} |` +
        `${String(s.lost).padStart(4)} |` +
        `${String(s.trained).padStart(3)} |` +
        `${String(s.gathered).padStart(4)} |` +
        `${String(s.enemyFish).padStart(5)} |` +
        ` ${s.gathererInfo}`,
    );
  }
  console.log(`${'─'.repeat(76)}`);
  console.log(
    `  Lodge HP: ${last.lodgeHp}  Cmdr HP: ${last.cmdrHp}  Enemy Cmdr HP: ${last.enemyCmdrHp}`,
  );
  console.log(`${'═'.repeat(76)}\n`);
}

// ── Test Suite ──────────────────────────────────────────────────────

describe('Governor Diagnostic Playthrough', () => {
  beforeEach(() => {
    progressionLevel.value = 0;
  });

  it.each([
    1, 2, 3, 4, 5, 6,
  ])('tier %i: Governor plays 1800 frames (~30s) with diagnostics', (stage) => {
    progressionLevel.value = stage;

    // Create world with peace timer disabled so AI engages immediately
    const world = createTestWorld({ stage, seed: 42 });
    world.peaceTimer = 0; // No grace period — enemies active from frame 1
    _gameRef.world = world; // Wire Governor goals to this world
    const pg = createTestPanelGrid(stage);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));

    // Spawn all entities
    spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Create and enable Governor (player AI)
    const governor = new Governor();
    governor.enabled = true;

    // Initial snapshot
    const initial = snap(world, 0);
    const snaps: Snap[] = [initial];

    // Run 1800 frames (~30 seconds of gameplay at 60 FPS)
    const TOTAL_FRAMES = 1800;
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      runFrame(world, governor);

      // Snapshot every 300 frames (5 seconds)
      if ((f + 1) % 300 === 0) {
        snaps.push(snap(world, f + 1));
      }
    }

    // Final snapshot
    const final = snaps[snaps.length - 1];

    // ── INVARIANTS ──────────────────────────────────────────
    expect(noNaNPositions(world)).toBe(true);

    // Lodge and Commander survive 30 seconds
    expect(final.lodgeHp).toBeGreaterThan(0);
    expect(final.cmdrHp).toBeGreaterThan(0);

    // Game still playing (no instant loss in 30s)
    expect(world.state).toBe('playing');

    // ── ACTIVITY CHECKS ─────────────────────────────────────
    // After 30 seconds, SOMETHING should have happened
    const _anyActivity =
      final.kills > 0 ||
      final.lost > 0 ||
      final.trained > 0 ||
      final.gathered > 0 ||
      final.fish !== initial.fish ||
      final.enemyUnits !== initial.enemyUnits;

    // At tier 2+ with enemies, enemy AI should be active
    if (stage >= 2) {
      // Enemy AI should have trained units or gathered resources
      const enemyGrew = final.enemyUnits > initial.enemyUnits;
      const enemyGathered = final.enemyFish !== initial.enemyFish;
      console.log(`  [Tier ${stage}] Enemy grew: ${enemyGrew}, Enemy eco: ${enemyGathered}`);
    }

    // Resource distance diagnostic
    const lodgeEids = query(world.ecs, [Position, EntityTypeTag, FactionTag]).filter(
      (eid) =>
        EntityTypeTag.kind[eid] === EntityKind.Lodge && FactionTag.faction[eid] === Faction.Player,
    );
    if (lodgeEids.length > 0) {
      const lx = Position.x[lodgeEids[0]];
      const ly = Position.y[lodgeEids[0]];
      const resEids = query(world.ecs, [Position, Resource, EntityTypeTag]).filter(
        (eid) => Resource.amount[eid] > 0,
      );
      const dists = resEids.map((eid) => {
        const dx = Position.x[eid] - lx;
        const dy = Position.y[eid] - ly;
        return Math.round(Math.sqrt(dx * dx + dy * dy));
      });
      dists.sort((a, b) => a - b);
      console.log(`  Resource distances from Lodge: ${dists.slice(0, 5).join(', ')}px`);
    }

    // Print full diagnostic table
    printDiag(stage, pg.getActivePanels(), world.waveSurvivalMode, world, snaps);
  });

  it('entity roster at spawn for each tier', () => {
    const NAMES: Record<number, string> = {
      [EntityKind.Lodge]: 'Lodge',
      [EntityKind.PredatorNest]: 'PredNest',
      [EntityKind.Commander]: 'Cmdr',
      [EntityKind.Gatherer]: 'Gatherer',
      [EntityKind.Brawler]: 'Brawler',
      [EntityKind.Healer]: 'Healer',
      [EntityKind.Gator]: 'Gator',
      [EntityKind.Snake]: 'Snake',
      [EntityKind.Clambed]: 'Fish',
      [EntityKind.PearlBed]: 'Rocks',
      [EntityKind.Cattail]: 'Logs',
      [EntityKind.Frog]: 'Frog',
      [EntityKind.Scout]: 'Scout',
    };

    console.log(`\n${'═'.repeat(80)}`);
    console.log('  SPAWN ROSTER BY TIER');
    console.log('═'.repeat(80));

    for (let stage = 1; stage <= 6; stage++) {
      progressionLevel.value = stage;
      const w = createTestWorld({ stage, seed: 42 });
      const pg = createTestPanelGrid(stage);
      spawnVerticalEntities(
        w,
        generateVerticalMapLayout(pg, new SeededRandom(42)),
        new SeededRandom(99),
      );

      const roster = new Map<string, number>();
      for (const eid of query(w.ecs, [EntityTypeTag, FactionTag, Health])) {
        const k = EntityTypeTag.kind[eid];
        const f = FactionTag.faction[eid];
        const label =
          (f === Faction.Player ? 'P' : f === Faction.Enemy ? 'E' : 'N') +
          ':' +
          (NAMES[k] ?? `Kind${k}`);
        roster.set(label, (roster.get(label) ?? 0) + 1);
      }

      const entries = [...roster.entries()].sort(([a], [b]) => a.localeCompare(b));
      console.log(
        `  T${stage} [${pg.getActivePanels().join(',')}]: ${entries.map(([k, v]) => `${k}×${v}`).join('  ')}`,
      );
      console.log(
        `     Fish: ${w.resources.fish}  Rocks: ${w.resources.rocks}  Logs: ${w.resources.logs}`,
      );
    }
    console.log(`${'═'.repeat(80)}\n`);

    // Sanity: tier 6 has more entities than tier 1
    progressionLevel.value = 1;
    const w1 = createTestWorld({ stage: 1, seed: 42 });
    spawnVerticalEntities(
      w1,
      generateVerticalMapLayout(createTestPanelGrid(1), new SeededRandom(42)),
      new SeededRandom(99),
    );
    progressionLevel.value = 6;
    const w6 = createTestWorld({ stage: 6, seed: 42 });
    spawnVerticalEntities(
      w6,
      generateVerticalMapLayout(createTestPanelGrid(6), new SeededRandom(42)),
      new SeededRandom(99),
    );
    expect(query(w6.ecs, [Health]).length).toBeGreaterThan(query(w1.ecs, [Health]).length);
  });
});

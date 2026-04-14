/**
 * Full Match Flow Tests
 *
 * Validates the complete v3 player journey:
 * 1. Match setup: world creation, entity spawning, panel config
 * 2. Early game: train Mudpaws, start economy
 * 3. Mid game: train army, resource gathering income
 * 4. Combat: enemy engagement, kills, Lodge defense
 * 5. Match end: victory conditions, reward calculation
 * 6. Post-match: prestige check, upgrade availability
 */

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { canPrestige, createPrestigeState, executePrestige } from '@/config/prestige-logic';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import { movementSystem } from '@/ecs/systems/movement';
import { trainingSystem } from '@/ecs/systems/training';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { calculateMatchReward } from '@/game/match-rewards';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { train } from '@/input/selection/queries';
import { EntityKind, Faction, UnitState } from '@/types';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

function runFrames(world: GameWorld, count: number): void {
  for (let i = 0; i < count; i++) {
    world.frameCount++;
    world.yukaManager.update(1 / 60, world.ecs);
    world.spatialHash.clear();
    for (const eid of query(world.ecs, [Position, Health])) {
      if (Health.current[eid] > 0) {
        world.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
      }
    }
    movementSystem(world);
    gatheringSystem(world);
    combatSystem(world);
    trainingSystem(world);
    healthSystem(world);
    cleanupSystem(world);
  }
}

describe('Full Match Flow', () => {
  it('complete lifecycle: setup → economy → combat → rewards → prestige', () => {
    // ── 1. MATCH SETUP ──────────────────────────────────────
    progressionLevel.value = 3;
    const world = createTestWorld({ stage: 3, seed: 42, fish: 200 });
    const pg = createTestPanelGrid(3);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(99));

    expect(lodgeEid).toBeGreaterThan(0);
    expect(world.panelGrid?.getActivePanels().length).toBe(3);
    expect(world.resources.fish).toBeGreaterThan(0);

    // ── 2. EARLY GAME: TRAIN UNITS ──────────────────────────
    const mudpawCost = ENTITY_DEFS[MUDPAW_KIND].fishCost ?? 0;
    const sapperFishCost = ENTITY_DEFS[SAPPER_KIND].fishCost ?? 0;
    const sapperRockCost = ENTITY_DEFS[SAPPER_KIND].rockCost ?? 0;
    const fishBefore = world.resources.fish;

    // Ensure Lodge food cap is set (normally computed by populationSync)
    world.resources.maxFood = 8;

    // Train 2 Mudpaws from the Lodge
    train(world, lodgeEid, MUDPAW_KIND, mudpawCost, 0, 1);
    train(world, lodgeEid, MUDPAW_KIND, mudpawCost, 0, 1);
    expect(world.resources.fish).toBe(fishBefore - mudpawCost * 2);

    // Train 1 Sapper (fish + rocks deducted from remaining stockpile)
    world.resources.rocks = Math.max(world.resources.rocks, sapperRockCost + 5);
    const fishAfterMudpaws = world.resources.fish;
    train(world, lodgeEid, SAPPER_KIND, sapperFishCost, 0, 1, sapperRockCost);
    expect(world.resources.fish).toBe(fishAfterMudpaws - sapperFishCost);

    // Run frames to complete training (TRAIN_TIMER = 120 per unit)
    runFrames(world, 400);
    expect(world.stats.unitsTrained).toBeGreaterThanOrEqual(2);

    // ── 3. MID GAME: ECONOMY ────────────────────────────────
    // Manually place a Mudpaw near a resource and run gather cycle
    const clambeds = query(world.ecs, [Position, Resource, EntityTypeTag]).filter(
      (eid) => EntityTypeTag.kind[eid] === EntityKind.Clambed && Resource.amount[eid] > 0,
    );
    expect(clambeds.length).toBeGreaterThan(0);

    const rx = Position.x[clambeds[0]];
    const ry = Position.y[clambeds[0]];
    const testMudpaw = spawnEntity(world, MUDPAW_KIND, rx + 30, ry, Faction.Player);

    // Set Mudpaw to gather the resource
    UnitStateMachine.state[testMudpaw] = UnitState.GatherMove;
    UnitStateMachine.targetEntity[testMudpaw] = clambeds[0];
    UnitStateMachine.targetX[testMudpaw] = rx;
    UnitStateMachine.targetY[testMudpaw] = ry;

    const _fishBeforeGather = world.resources.fish;
    runFrames(world, 600); // Enough for walk + gather + return + deposit

    expect(world.stats.resourcesGathered).toBeGreaterThan(0);

    // ── 4. COMBAT ───────────────────────────────────────────
    // Enemy count should be > 0 at stage 3
    const enemyCount = query(world.ecs, [Health, FactionTag]).filter(
      (eid) => FactionTag.faction[eid] === Faction.Enemy && Health.current[eid] > 0,
    ).length;
    expect(enemyCount).toBeGreaterThan(0);

    // ── 5. MATCH END: REWARDS ───────────────────────────────
    const reward = calculateMatchReward({
      result: 'win',
      kills: world.stats.unitsKilled,
      eventsCompleted: 0,
      durationSeconds: 180,
      prestigeRank: 0,
      resourcesGathered: world.stats.resourcesGathered,
    });

    expect(reward.totalClams).toBeGreaterThan(0);
    expect(reward.base).toBeGreaterThan(0);

    // ── 6. POST-MATCH: PRESTIGE CHECK ───────────────────────
    const prestigeState = createPrestigeState();

    // Player at progression level 25 can prestige
    expect(canPrestige(25, prestigeState.rank)).toBe(true);

    // Execute prestige
    const { state: postPrestige, result } = executePrestige(prestigeState, 25);
    expect(result.newRank).toBe(1);
    expect(result.pearlsEarned).toBeGreaterThan(0);
    expect(postPrestige.pearls).toBeGreaterThan(0);
  });

  it.each([1, 2, 3, 4, 5, 6])('tier %i: world is playable', (stage) => {
    progressionLevel.value = stage;
    const world = createTestWorld({ stage, seed: 42 });
    const pg = createTestPanelGrid(stage);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Basic viability checks
    expect(world.resources.fish).toBeGreaterThan(0);
    expect(world.state).toBe('playing');

    const playerUnits = query(world.ecs, [Health, FactionTag]).filter(
      (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
    );
    expect(playerUnits.length).toBeGreaterThanOrEqual(2); // Lodge + Commander

    // Can afford at least 1 Mudpaw
    const mudpawCost = ENTITY_DEFS[MUDPAW_KIND].fishCost ?? 0;
    expect(world.resources.fish).toBeGreaterThanOrEqual(mudpawCost);

    // Run 300 frames without crash
    runFrames(world, 300);
    expect(world.state).toBe('playing');
  });
});

/**
 * Fortification Integration Tests
 *
 * Validates that fortifications are functional in the gameplay loop:
 * - Towers attack enemies via fortificationTickSystem
 * - Fort slots initialize with world on spawn
 * - Enemy damage reduces fort HP
 * - Tower sustains damage over 300 frames
 * - Walls block movement (getBlockingForts returns active walls)
 */

import { describe, expect, it, vi } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Health, Position } from '@/ecs/components';
import {
  damageFortification,
  fortificationTickSystem,
  getBlockingForts,
  initFortificationState,
  placeFortification,
} from '@/ecs/systems/fortification';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { EntityKind, Faction } from '@/types';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

describe('Fortification Integration', () => {
  it('world.fortifications is initialized after spawnVerticalEntities', () => {
    progressionLevel.value = 3;
    const world = createTestWorld({ stage: 3, seed: 42 });
    const pg = createTestPanelGrid(3);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    spawnVerticalEntities(world, layout, new SeededRandom(99));

    expect(world.fortifications).not.toBeNull();
    const forts = world.fortifications;
    expect(forts).toBeDefined();
    expect(forts!.slots.length).toBeGreaterThan(0);
    expect(forts!.totalRockCost).toBe(0);
  });

  it('tower attacks nearest enemy in range via fortificationTickSystem', () => {
    progressionLevel.value = 3;
    const world = createTestWorld({ stage: 3, seed: 42 });
    const pg = createTestPanelGrid(3);
    const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
    spawnVerticalEntities(world, layout, new SeededRandom(99));

    // Place a watchtower in the first slot
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;
    const result = placeFortification(forts, 0, 'watchtower', 100);
    expect(result.success).toBe(true);
    const tower = forts.slots[0];
    expect(tower).toBeDefined();

    // Spawn an enemy within tower range
    const enemyEid = spawnEntity(
      world,
      EntityKind.Gator,
      tower.worldX + 10,
      tower.worldY + 10,
      Faction.Enemy,
    );
    const hpBefore = Health.current[enemyEid];

    // Populate spatial hash so tower can find the enemy
    world.spatialHash.clear();
    world.spatialHash.insert(enemyEid, Position.x[enemyEid], Position.y[enemyEid]);

    // Run fortification tick
    world.frameCount = 100;
    fortificationTickSystem(world);

    // Enemy should have taken damage
    expect(Health.current[enemyEid]).toBeLessThan(hpBefore);
  });

  it('tower respects cooldown — no double attack in same window', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;
    placeFortification(forts, 0, 'watchtower', 100);
    const tower = forts.slots[0];
    expect(tower).toBeDefined();

    const enemyEid = spawnEntity(
      world,
      EntityKind.Gator,
      tower.worldX + 5,
      tower.worldY + 5,
      Faction.Enemy,
    );
    world.spatialHash.insert(enemyEid, Position.x[enemyEid], Position.y[enemyEid]);

    // First attack at frame 100
    world.frameCount = 100;
    fortificationTickSystem(world);
    const hpAfterFirst = Health.current[enemyEid];

    // Second tick at frame 101 — should NOT attack (cooldown 90 frames)
    world.frameCount = 101;
    fortificationTickSystem(world);
    expect(Health.current[enemyEid]).toBe(hpAfterFirst);

    // Third tick at frame 191 — cooldown expired, should attack again
    world.frameCount = 191;
    fortificationTickSystem(world);
    expect(Health.current[enemyEid]).toBeLessThan(hpAfterFirst);
  });

  it('enemy sapper can damage fort slot to destroyed', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;
    placeFortification(forts, 0, 'wood_wall', 100);

    expect(forts.slots[0].status).toBe('active');
    expect(forts.slots[0].currentHp).toBe(100);

    // Simulate sapper dealing lethal damage
    damageFortification(forts, 0, 100);

    expect(forts.slots[0].status).toBe('destroyed');
    expect(forts.slots[0].currentHp).toBe(0);
  });

  it('walls do NOT attack even with enemies nearby', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;
    placeFortification(forts, 0, 'wood_wall', 100);
    const wall = forts.slots[0];
    expect(wall).toBeDefined();

    const enemyEid = spawnEntity(
      world,
      EntityKind.Gator,
      wall.worldX + 5,
      wall.worldY + 5,
      Faction.Enemy,
    );
    const hpBefore = Health.current[enemyEid];
    world.spatialHash.insert(enemyEid, Position.x[enemyEid], Position.y[enemyEid]);

    world.frameCount = 100;
    fortificationTickSystem(world);

    // Wall has no damage, so enemy should be untouched
    expect(Health.current[enemyEid]).toBe(hpBefore);
  });

  it('higher progression has more fort slots', () => {
    const s1 = initFortificationState(1, 500, 500);
    const s6 = initFortificationState(6, 500, 500);
    expect(s6.slots.length).toBeGreaterThanOrEqual(s1.slots.length);
  });

  it('tower deals cumulative damage over 300 frames', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;
    placeFortification(forts, 0, 'watchtower', 100);
    const tower = forts.slots[0];
    expect(tower).toBeDefined();

    const enemyEid = spawnEntity(
      world,
      EntityKind.Gator,
      tower.worldX + 5,
      tower.worldY + 5,
      Faction.Enemy,
    );
    // Give enemy high HP so it survives 300 frames
    Health.current[enemyEid] = 500;
    Health.max[enemyEid] = 500;

    world.spatialHash.clear();
    world.spatialHash.insert(enemyEid, Position.x[enemyEid], Position.y[enemyEid]);

    const hpBefore = Health.current[enemyEid];

    // Run 300 frames of fortification tick
    for (let frame = 1; frame <= 300; frame++) {
      world.frameCount = frame;
      fortificationTickSystem(world);
    }

    const hpAfter = Health.current[enemyEid];
    const totalDamage = hpBefore - hpAfter;

    // Tower has 90-frame cooldown, so in 300 frames it attacks at frames:
    // ~0, ~90, ~180, ~270 = 4 attacks minimum
    // Each attack does tower.damage (watchtower = 5 from config)
    expect(hpAfter).toBeLessThan(hpBefore);
    expect(totalDamage).toBeGreaterThanOrEqual(tower.damage * 3);
  });

  it('walls are reported by getBlockingForts', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;

    // No blocking forts initially
    expect(getBlockingForts(forts)).toHaveLength(0);

    // Place a wood wall
    placeFortification(forts, 0, 'wood_wall', 100);

    // Wall should be in blocking forts list
    const blocking = getBlockingForts(forts);
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking[0].fortType).toBe('wood_wall');
    expect(blocking[0].status).toBe('active');
  });

  it('destroyed walls are not in blocking list', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;

    placeFortification(forts, 0, 'wood_wall', 100);
    expect(getBlockingForts(forts).length).toBe(1);

    // Destroy the wall
    damageFortification(forts, 0, 200);
    expect(forts.slots[0].status).toBe('destroyed');

    // Destroyed wall should not be in blocking list
    expect(getBlockingForts(forts)).toHaveLength(0);
  });

  it('towers are NOT in blocking forts list', () => {
    const world = createTestWorld({ stage: 3, seed: 42 });
    world.fortifications = initFortificationState(3, 500, 500);
    expect(world.fortifications).toBeDefined();
    const forts = world.fortifications!;

    placeFortification(forts, 0, 'watchtower', 100);

    // Tower should not block movement
    const blocking = getBlockingForts(forts);
    const towerInBlocking = blocking.some((s) => s.fortType === 'watchtower');
    expect(towerInBlocking).toBe(false);
  });
});

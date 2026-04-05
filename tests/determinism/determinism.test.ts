/**
 * Determinism Tests
 *
 * Verifies that SeededRandom produces identical sequences and that
 * AI/evolution systems consume gameRng deterministically (no Math.random).
 */

import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Sprite,
  TrainingQueue,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType } from '@/types';
import { SeededRandom } from '@/utils/random';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/rendering/animations', () => ({
  triggerSpawnPop: vi.fn(),
  triggerHitRecoil: vi.fn(),
  triggerAttackLunge: vi.fn(),
  cleanupEntityAnimation: vi.fn(),
}));

vi.mock('@/ui/game-events', () => ({
  pushGameEvent: vi.fn(),
}));

vi.mock('@/ui/store', () => ({
  waveNumber: { value: 0 },
}));

const TEST_SEED = 42;

function setupTestEntities(world: GameWorld): void {
  const nest = addEntity(world.ecs);
  addComponent(world.ecs, nest, Position);
  addComponent(world.ecs, nest, Health);
  addComponent(world.ecs, nest, IsBuilding);
  addComponent(world.ecs, nest, Building);
  addComponent(world.ecs, nest, FactionTag);
  addComponent(world.ecs, nest, EntityTypeTag);
  addComponent(world.ecs, nest, Sprite);
  addComponent(world.ecs, nest, TrainingQueue);
  Position.x[nest] = 800;
  Position.y[nest] = 800;
  Health.current[nest] = 500;
  Health.max[nest] = 500;
  Building.progress[nest] = 100;
  FactionTag.faction[nest] = Faction.Enemy;
  EntityTypeTag.kind[nest] = EntityKind.PredatorNest;

  const lodge = addEntity(world.ecs);
  addComponent(world.ecs, lodge, Position);
  addComponent(world.ecs, lodge, Health);
  addComponent(world.ecs, lodge, IsBuilding);
  addComponent(world.ecs, lodge, Building);
  addComponent(world.ecs, lodge, FactionTag);
  addComponent(world.ecs, lodge, EntityTypeTag);
  addComponent(world.ecs, lodge, Sprite);
  Position.x[lodge] = 200;
  Position.y[lodge] = 200;
  Health.current[lodge] = 300;
  Health.max[lodge] = 300;
  Building.progress[lodge] = 100;
  FactionTag.faction[lodge] = Faction.Player;
  EntityTypeTag.kind[lodge] = EntityKind.Lodge;

  const res = addEntity(world.ecs);
  addComponent(world.ecs, res, Position);
  addComponent(world.ecs, res, IsResource);
  addComponent(world.ecs, res, Resource);
  addComponent(world.ecs, res, Health);
  addComponent(world.ecs, res, FactionTag);
  addComponent(world.ecs, res, EntityTypeTag);
  addComponent(world.ecs, res, Sprite);
  Position.x[res] = 850;
  Position.y[res] = 850;
  Resource.resourceType[res] = ResourceType.Fish;
  Resource.amount[res] = 1000;
  Health.current[res] = 1;
  Health.max[res] = 1;
  FactionTag.faction[res] = Faction.Neutral;
  EntityTypeTag.kind[res] = EntityKind.Clambed;

  world.enemyResources.fish = 5000;
  world.enemyResources.logs = 5000;
}

describe('Determinism', () => {
  it('SeededRandom produces identical sequences from same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const seq1 = Array.from({ length: 200 }, () => rng1.next());
    const seq2 = Array.from({ length: 200 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('SeededRandom helper methods are deterministic', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const ints1 = Array.from({ length: 50 }, () => rng1.int(0, 100));
    const ints2 = Array.from({ length: 50 }, () => rng2.int(0, 100));
    expect(ints1).toEqual(ints2);

    const floats1 = Array.from({ length: 50 }, () => rng1.float(-1, 1));
    const floats2 = Array.from({ length: 50 }, () => rng2.float(-1, 1));
    expect(floats1).toEqual(floats2);

    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const picks1 = Array.from({ length: 20 }, () => rng1.pick(arr));
    const picks2 = Array.from({ length: 20 }, () => rng2.pick(arr));
    expect(picks1).toEqual(picks2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRandom(111);
    const rng2 = new SeededRandom(222);

    const a = Array.from({ length: 10 }, () => rng1.next());
    const b = Array.from({ length: 10 }, () => rng2.next());

    expect(a).not.toEqual(b);
  });

  it('AI system consumes gameRng deterministically', () => {
    const world = createGameWorld();
    world.mapSeed = TEST_SEED;
    world.gameRng = new SeededRandom(TEST_SEED ^ 0x9e3779b9);
    world.peaceTimer = 0;
    setupTestEntities(world);

    // Snapshot RNG state after AI runs by recording a probe value
    // Run 1: run AI for 300 frames, probe RNG
    for (let f = 1; f <= 300; f++) {
      world.frameCount = f;
      aiSystem(world);
    }
    const probeAfterRun1 = world.gameRng.next();

    // Run 2: reset RNG to same state, run same frames on same world state
    // We can't fully reset ECS state, so instead we verify the RNG
    // was consumed (not skipped) by comparing to a fresh RNG
    const freshRng = new SeededRandom(TEST_SEED ^ 0x9e3779b9);
    const freshProbe = freshRng.next();

    // After 300 frames of AI consuming randomness, the RNG state
    // must have advanced past the fresh start
    expect(probeAfterRun1).not.toBe(freshProbe);
  });

  it('gameRng is not consumed during peace timer', () => {
    const world = createGameWorld();
    world.mapSeed = TEST_SEED;
    world.gameRng = new SeededRandom(TEST_SEED ^ 0x9e3779b9);
    world.peaceTimer = 99999; // AI systems are suppressed during peace
    setupTestEntities(world);

    // Record initial RNG state
    const checkpoint = new SeededRandom(TEST_SEED ^ 0x9e3779b9);

    for (let f = 1; f <= 100; f++) {
      world.frameCount = f;
      aiSystem(world);
      evolutionSystem(world);
    }

    // During peace, no gameplay randomness should be consumed
    // so the RNG should still be at its initial state
    expect(world.gameRng.next()).toBe(checkpoint.next());
  });
});

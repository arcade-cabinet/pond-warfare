/**
 * Enemy Economy System Tests
 *
 * Validates harvester spawning from nests, resource limits, peace timer
 * gating, max harvester caps, and resource deduction on spawn.
 *
 * NOTE: bitECS SoA components are global typed arrays, so entities from
 * parallel test files can pollute queries. We create minimal entities and
 * verify via resource deduction rather than entity counting for resilience.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_HARVESTER_COST,
  ENEMY_HARVESTER_SPAWN_INTERVAL,
  ENEMY_MAX_HARVESTERS_PER_NEST,
} from '@/constants';
import {
  Building,
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { enemyEconomyTick } from '@/ecs/systems/ai/enemy-economy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { ENEMY_HARVESTER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType } from '@/types';

// Mock rendering animations to prevent side-effects
vi.mock('@/rendering/animations', () => ({
  triggerSpawnPop: vi.fn(),
}));

// Mock particles to prevent side-effects
vi.mock('@/utils/particles', () => ({
  spawnDustBurst: vi.fn(),
}));

/** Create a completed enemy nest. */
function createEnemyNest(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[EntityKind.PredatorNest];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.PredatorNest;
  Building.progress[eid] = 100;

  return eid;
}

/** Create a resource node near a nest. */
function createResourceNode(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.resourceType[eid] = ResourceType.Fish;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;

  return eid;
}

/** Create an existing enemy harvester near a position. */
function createEnemyHarvester(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = ENEMY_HARVESTER_KIND;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('enemyEconomyTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    world.frameCount = ENEMY_HARVESTER_SPAWN_INTERVAL;
    world.enemyResources.fish = 10000;
    world.enemyResources.logs = 10000;
  });

  describe('peace timer gating', () => {
    it('should not spawn harvester units during peace period', () => {
      world.peaceTimer = ENEMY_HARVESTER_SPAWN_INTERVAL + 100;
      world.frameCount = ENEMY_HARVESTER_SPAWN_INTERVAL;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should spawn harvester units when peace timer has expired', () => {
      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });

    it('should spawn when frameCount exactly equals peaceTimer', () => {
      world.peaceTimer = ENEMY_HARVESTER_SPAWN_INTERVAL;
      world.frameCount = ENEMY_HARVESTER_SPAWN_INTERVAL;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      // frameCount === peaceTimer means isPeaceful is false (frameCount < peaceTimer is false)
      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });
  });

  describe('enemy harvester count limits', () => {
    it('should not spawn when at max harvester units per nest', () => {
      const nestX = 500;
      const nestY = 500;
      createEnemyNest(world, nestX, nestY);
      createResourceNode(world, 600, 500);

      for (let i = 0; i < ENEMY_MAX_HARVESTERS_PER_NEST; i++) {
        createEnemyHarvester(world, nestX + i * 10, nestY);
      }

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should spawn when harvester units are below max per nest', () => {
      const nestX = 500;
      const nestY = 500;
      createEnemyNest(world, nestX, nestY);
      createResourceNode(world, 600, 500);

      // Only create 1 harvester unit, which is below the max
      createEnemyHarvester(world, nestX + 10, nestY);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });

    it('should not count harvester units far from the nest', () => {
      const nestX = 500;
      const nestY = 500;
      createEnemyNest(world, nestX, nestY);
      createResourceNode(world, 600, 500);

      // Place max harvester units far from the nest (beyond ENEMY_HARVESTER_RADIUS)
      for (let i = 0; i < ENEMY_MAX_HARVESTERS_PER_NEST; i++) {
        createEnemyHarvester(world, nestX + 2000, nestY + 2000);
      }

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      // Distant harvester units should not be counted, so a new one spawns
      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });
  });

  describe('resource costs', () => {
    it('should decrease enemy fish when spawning harvester units', () => {
      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });

    it('should not spawn harvester when fish is below cost', () => {
      world.enemyResources.fish = ENEMY_HARVESTER_COST - 1;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should spawn from multiple nests if resources allow', () => {
      createEnemyNest(world, 500, 500);
      createEnemyNest(world, 800, 800);
      createResourceNode(world, 600, 500);
      createResourceNode(world, 900, 800);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      // Each nest should spawn one harvester: 2 * ENEMY_HARVESTER_COST deducted
      expect(world.enemyResources.fish).toBe(fishBefore - 2 * ENEMY_HARVESTER_COST);
    });
  });

  describe('spawn interval', () => {
    it('should not spawn when frameCount is not a multiple of spawn interval', () => {
      world.frameCount = ENEMY_HARVESTER_SPAWN_INTERVAL + 1;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should spawn on exact spawn interval multiples', () => {
      world.frameCount = ENEMY_HARVESTER_SPAWN_INTERVAL * 3;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });
  });

  describe('resource node requirements', () => {
    it('should not spawn harvester when no resource nodes exist', () => {
      createEnemyNest(world, 500, 500);
      // No resource node created

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should not spawn harvester when all resource nodes are depleted', () => {
      createEnemyNest(world, 500, 500);
      const resEid = createResourceNode(world, 600, 500);
      Resource.amount[resEid] = 0; // Depleted

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });
  });

  describe('difficulty scaling', () => {
    it('should have shorter spawn interval on hard difficulty', () => {
      world.difficulty = 'hard';
      // Hard spawn interval = floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 0.75)
      const hardInterval = Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 0.75);
      world.frameCount = hardInterval;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });

    it('should have longer spawn interval on easy difficulty', () => {
      world.difficulty = 'easy';
      // Easy spawn interval = floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 1.5)
      const easyInterval = Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 1.5);
      world.frameCount = easyInterval;

      createEnemyNest(world, 500, 500);
      createResourceNode(world, 600, 500);

      const fishBefore = world.enemyResources.fish;
      enemyEconomyTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore - ENEMY_HARVESTER_COST);
    });
  });
});

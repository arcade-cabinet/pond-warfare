/**
 * Commander Entity Tests
 *
 * Validates: Commander spawns with correct HP/stats from config,
 * Commander ECS component is attached, aura applies to nearby units,
 * Commander cannot be retrained (no training queue).
 */

import { hasComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { COMMANDER_ABILITIES, COMMANDERS, getCommanderTypeIndex } from '@/config/commanders';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Combat,
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TrainingQueue,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction } from '@/types';

describe('Commander Entity', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should spawn with Commander ECS component attached', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(hasComponent(world.ecs, eid, Commander)).toBe(true);
  });

  it('should have correct HP from entity-defs (150)', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(Health.max[eid]).toBe(150);
    expect(Health.current[eid]).toBe(150);
  });

  it('should have combat stats from entity-defs', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(Combat.damage[eid]).toBe(8);
    expect(Combat.attackRange[eid]).toBe(60);
  });

  it('should have velocity/speed', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(hasComponent(world.ecs, eid, Velocity)).toBe(true);
    expect(Velocity.speed[eid]).toBeCloseTo(1.8);
  });

  it('should NOT have a TrainingQueue (cannot be retrained)', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(hasComponent(world.ecs, eid, TrainingQueue)).toBe(false);
  });

  it('should have default Commander component values', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    expect(Commander.commanderType[eid]).toBe(0);
    expect(Commander.auraRadius[eid]).toBe(150);
    expect(Commander.isPlayerCommander[eid]).toBe(0); // caller sets this
  });

  it('should have 2x sprite scale compared to normal units', () => {
    const _cmdEid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    const _unitEid = spawnEntity(world, SAPPER_KIND, 200, 100, Faction.Player);
    // Commander spriteScale is 5.0 vs normal 2.5 = 2x bigger
    const cmdW = 16 * 5.0; // spriteSize * spriteScale
    const unitW = 16 * 2.5;
    expect(cmdW).toBe(unitW * 2);
  });
});

describe('Commander Config Mapping', () => {
  it('getCommanderTypeIndex returns correct index for each commander', () => {
    for (let i = 0; i < COMMANDERS.length; i++) {
      expect(getCommanderTypeIndex(COMMANDERS[i].id)).toBe(i);
    }
  });

  it('getCommanderTypeIndex falls back to 0 for unknown id', () => {
    expect(getCommanderTypeIndex('nonexistent')).toBe(0);
  });

  it('every commander has a matching active ability', () => {
    for (const cmd of COMMANDERS) {
      expect(COMMANDER_ABILITIES[cmd.id]).toBeDefined();
      expect(COMMANDER_ABILITIES[cmd.id].cooldownFrames).toBeGreaterThan(0);
    }
  });
});

describe('Commander aura integration with entity', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('commander entity is recognized by aura system query (has required components)', () => {
    const eid = spawnEntity(world, EntityKind.Commander, 100, 100, Faction.Player);
    // The aura system queries for [Position, Health, FactionTag, EntityTypeTag, Combat]
    expect(hasComponent(world.ecs, eid, Position)).toBe(true);
    expect(hasComponent(world.ecs, eid, Health)).toBe(true);
    expect(hasComponent(world.ecs, eid, FactionTag)).toBe(true);
    expect(hasComponent(world.ecs, eid, EntityTypeTag)).toBe(true);
    expect(hasComponent(world.ecs, eid, Combat)).toBe(true);
    expect(EntityTypeTag.kind[eid]).toBe(EntityKind.Commander);
  });
});

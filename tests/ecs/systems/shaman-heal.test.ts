/**
 * Shaman AoE Healing Tests
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { shamanHealSystem } from '@/ecs/systems/shaman-heal';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import type { SpecialistAssignment } from '@/game/specialist-assignment';
import { EntityKind, Faction } from '@/types';

function createUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
  hp: number = 60,
  maxHp: number = 60,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;

  return eid;
}

describe('shamanHealSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Disable spatial hash so the system uses the fallback query path
    world.spatialHash = undefined as never;
    world.frameCount = 0;
  });

  it('should heal friendly units within range', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const ally = createUnit(world, 150, 100, Faction.Player, EntityKind.Brawler, 40, 60);

    shamanHealSystem(world);

    expect(Health.current[ally]).toBe(42); // 40 + 2
  });

  it('should NOT heal enemies', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const enemy = createUnit(world, 150, 100, Faction.Enemy, EntityKind.Gator, 40, 60);

    shamanHealSystem(world);

    expect(Health.current[enemy]).toBe(40); // unchanged
  });

  it('should NOT overheal past max HP', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const ally = createUnit(world, 150, 100, Faction.Player, EntityKind.Brawler, 59, 60);

    shamanHealSystem(world);

    expect(Health.current[ally]).toBe(60); // capped at max
  });

  it('should NOT heal units outside range', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const farAlly = createUnit(world, 500, 500, Faction.Player, EntityKind.Brawler, 40, 60);

    shamanHealSystem(world);

    expect(Health.current[farAlly]).toBe(40); // unchanged
  });

  it('should NOT heal units already at full HP', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const fullAlly = createUnit(world, 150, 100, Faction.Player, EntityKind.Brawler, 60, 60);

    shamanHealSystem(world);

    expect(Health.current[fullAlly]).toBe(60); // unchanged
  });

  it('should heal multiple nearby units', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const ally1 = createUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 40, 60);
    const ally2 = createUnit(world, 100, 130, Faction.Player, EntityKind.Sniper, 30, 40);

    shamanHealSystem(world);

    expect(Health.current[ally1]).toBe(42);
    expect(Health.current[ally2]).toBe(32);
  });

  it('should only run on correct frame interval', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const ally = createUnit(world, 150, 100, Faction.Player, EntityKind.Brawler, 40, 60);

    world.frameCount = 15; // Not multiple of 300
    shamanHealSystem(world);
    expect(Health.current[ally]).toBe(40); // No heal

    world.frameCount = 300; // Multiple of 300
    shamanHealSystem(world);
    expect(Health.current[ally]).toBe(42); // Healed
  });

  it('should spawn green particles when healing', () => {
    createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    createUnit(world, 150, 100, Faction.Player, EntityKind.Brawler, 40, 60);

    shamanHealSystem(world);

    expect(world.particles.length).toBeGreaterThan(0);
  });

  it('respects the shaman assigned area when healing', () => {
    const shaman = createUnit(world, 100, 100, Faction.Player, EntityKind.Shaman, 30, 30);
    const inside = createUnit(world, 140, 100, Faction.Player, EntityKind.Brawler, 40, 60);
    const outside = createUnit(world, 260, 100, Faction.Player, EntityKind.Brawler, 40, 60);

    world.specialistAssignments.set(shaman, {
      runtimeId: 'shaman',
      canonicalId: 'shaman',
      label: 'Shaman',
      mode: 'single_zone',
      operatingRadius: 90,
      centerX: 140,
      centerY: 100,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 140,
      engagementY: 100,
      projectionRange: 0,
    } satisfies SpecialistAssignment);

    shamanHealSystem(world);

    expect(Health.current[inside]).toBe(42);
    expect(Health.current[outside]).toBe(40);
  });
});

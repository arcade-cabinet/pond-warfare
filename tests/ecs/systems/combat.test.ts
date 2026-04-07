/**
 * Combat System Tests
 *
 * Validates attack behavior, cooldown management, and auto-aggro.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Building,
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import type { SpecialistAssignment } from '@/game/specialist-assignment';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createCombatUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, TaskOverride);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 1.8;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = 0;
  TaskOverride.targetEntity[eid] = -1;
  TaskOverride.resourceKind[eid] = 0;

  return eid;
}

describe('combatSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('should set attack cooldown after attacking', () => {
    const attacker = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Brawler);
    const target = createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);

    UnitStateMachine.state[attacker] = UnitState.Attacking;
    UnitStateMachine.targetEntity[attacker] = target;
    Combat.attackCooldown[attacker] = 0;

    combatSystem(world);

    // After attacking, cooldown should be set
    expect(Combat.attackCooldown[attacker]).toBeGreaterThan(0);
  });

  it('should return to idle if target is dead', () => {
    const attacker = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Brawler);
    const target = createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);

    UnitStateMachine.state[attacker] = UnitState.Attacking;
    UnitStateMachine.targetEntity[attacker] = target;
    Health.current[target] = 0; // Target is dead

    combatSystem(world);

    expect(UnitStateMachine.state[attacker]).toBe(UnitState.Idle);
  });

  it('should skip attack when cooldown is active', () => {
    const attacker = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Brawler);
    const target = createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);

    UnitStateMachine.state[attacker] = UnitState.Attacking;
    UnitStateMachine.targetEntity[attacker] = target;
    Combat.attackCooldown[attacker] = 30;

    const startHp = Health.current[target];
    combatSystem(world);

    // Target should not have taken damage because attacker is on cooldown
    expect(Health.current[target]).toBe(startHp);
  });

  it('clears commander aura buffs immediately after the commander dies', () => {
    const commander = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Commander);
    const ally = createCombatUnit(world, 130, 100, Faction.Player, EntityKind.Brawler);

    combatSystem(world);
    expect(world.commanderDamageBuff.has(ally)).toBe(true);

    Health.current[commander] = 0;
    world.frameCount += 1;

    combatSystem(world);
    expect(world.commanderDamageBuff.has(ally)).toBe(false);
    expect(world.commanderSpeedBuff.has(ally)).toBe(false);
  });

  it('applies war drums buffs from a nearby armory', () => {
    const armory = addEntity(world.ecs);
    addComponent(world.ecs, armory, Position);
    addComponent(world.ecs, armory, Building);
    addComponent(world.ecs, armory, Health);
    addComponent(world.ecs, armory, FactionTag);
    addComponent(world.ecs, armory, EntityTypeTag);
    addComponent(world.ecs, armory, IsBuilding);

    Position.x[armory] = 100;
    Position.y[armory] = 100;
    Building.progress[armory] = 100;
    Health.current[armory] = 500;
    Health.max[armory] = 500;
    FactionTag.faction[armory] = Faction.Player;
    EntityTypeTag.kind[armory] = EntityKind.Armory;

    const ally = createCombatUnit(world, 130, 100, Faction.Player, EntityKind.Brawler);
    world.tech.warDrums = true;

    combatSystem(world);

    expect(world.warDrumsBuff.has(ally)).toBe(true);
  });

  it('clears war drums buffs immediately after the armory is destroyed', () => {
    const armory = addEntity(world.ecs);
    addComponent(world.ecs, armory, Position);
    addComponent(world.ecs, armory, Building);
    addComponent(world.ecs, armory, Health);
    addComponent(world.ecs, armory, FactionTag);
    addComponent(world.ecs, armory, EntityTypeTag);
    addComponent(world.ecs, armory, IsBuilding);

    Position.x[armory] = 100;
    Position.y[armory] = 100;
    Building.progress[armory] = 100;
    Health.current[armory] = 500;
    Health.max[armory] = 500;
    FactionTag.faction[armory] = Faction.Player;
    EntityTypeTag.kind[armory] = EntityKind.Armory;

    const ally = createCombatUnit(world, 130, 100, Faction.Player, EntityKind.Brawler);
    world.tech.warDrums = true;

    combatSystem(world);
    expect(world.warDrumsBuff.has(ally)).toBe(true);

    Health.current[armory] = 0;
    world.frameCount += 1;

    combatSystem(world);
    expect(world.warDrumsBuff.has(ally)).toBe(false);
  });

  it('skips idle auto-aggro for gather overrides', () => {
    world.frameCount = 10;
    const gatherer = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Gatherer);
    const enemy = createCombatUnit(world, 120, 100, Faction.Enemy, EntityKind.Snake);

    Combat.damage[gatherer] = 2;
    TaskOverride.active[gatherer] = 1;
    TaskOverride.task[gatherer] = UnitState.GatherMove;
    TaskOverride.targetEntity[gatherer] = 3;
    TaskOverride.resourceKind[gatherer] = EntityKind.Clambed;
    UnitStateMachine.targetEntity[gatherer] = -1;

    combatSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(-1);
    expect(enemy).toBeGreaterThanOrEqual(0);
  });

  it('moves shamans toward wounded allies while idle', () => {
    world.frameCount = 30;
    const shaman = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Shaman);
    const ally = createCombatUnit(world, 140, 100, Faction.Player, EntityKind.Brawler);

    Combat.damage[shaman] = 0;
    Health.current[ally] = 40;

    combatSystem(world);

    expect(UnitStateMachine.state[shaman]).toBe(UnitState.Move);
    expect(UnitStateMachine.targetEntity[shaman]).toBe(ally);
    expect(UnitStateMachine.targetX[shaman]).toBe(Position.x[ally]);
    expect(UnitStateMachine.targetY[shaman]).toBe(Position.y[ally]);
  });

  it('keeps shaman support targeting inside the assigned area', () => {
    world.frameCount = 30;
    const shaman = createCombatUnit(world, 100, 100, Faction.Player, EntityKind.Shaman);
    const inside = createCombatUnit(world, 150, 100, Faction.Player, EntityKind.Brawler);
    const outside = createCombatUnit(world, 360, 100, Faction.Player, EntityKind.Brawler);

    Health.current[inside] = 40;
    Health.current[outside] = 20;
    world.specialistAssignments.set(shaman, {
      runtimeId: 'shaman',
      canonicalId: 'shaman',
      label: 'Shaman',
      mode: 'single_zone',
      operatingRadius: 120,
      centerX: 150,
      centerY: 100,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 150,
      engagementY: 100,
      projectionRange: 0,
    } satisfies SpecialistAssignment);

    combatSystem(world);

    expect(UnitStateMachine.targetEntity[shaman]).toBe(inside);
    expect(UnitStateMachine.targetEntity[shaman]).not.toBe(outside);
  });
});

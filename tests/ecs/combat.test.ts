/**
 * Combat System Tests
 *
 * Validates attack behavior, cooldown management, and auto-aggro.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { Position, Health, Combat, UnitStateMachine, FactionTag, EntityTypeTag, Velocity, Collider, Sprite, Carrying } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { UnitState, Faction, EntityKind, ResourceType } from '@/types';
import { combatSystem } from '@/ecs/systems/combat';

function createCombatUnit(world: GameWorld, x: number, y: number, faction: Faction, kind: EntityKind): number {
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

  return eid;
}

describe('combatSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
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
});

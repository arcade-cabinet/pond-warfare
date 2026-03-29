/**
 * Enemy Combat System Tests
 *
 * Validates attack decisions and retreat logic.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { ENEMY_ATTACK_CHECK_INTERVAL, ENEMY_RETREAT_HP_PERCENT } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { enemyCombatTick } from '@/ecs/systems/ai/enemy-combat';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

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

/** Create an enemy combat unit. */
function createEnemyCombatUnit(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
  state: UnitState = UnitState.Idle,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = state;
  Velocity.speed[eid] = def.speed;

  return eid;
}

/** Create a player building (target for attacks). */
function createPlayerBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;

  return eid;
}

describe('enemyCombatTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    // Set difficulty to easy so threshold is higher but predictable
    world.difficulty = 'easy';
  });

  it('should attack when army exceeds threshold', () => {
    // Easy mode base threshold = 8, and needs 3+ idle units
    world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

    createEnemyNest(world, 1000, 1000);
    createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

    // Create enough idle enemy combat units to exceed the threshold
    const units: number[] = [];
    for (let i = 0; i < 10; i++) {
      units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
    }

    enemyCombatTick(world);

    // At least some units should have been sent to attack (state changed to AttackMove)
    const attackingCount = units.filter(
      (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
    ).length;
    expect(attackingCount).toBeGreaterThan(0);
  });

  it('should retreat units below 20% HP', () => {
    // Retreat logic runs every 60 frames
    world.frameCount = 60;

    createEnemyNest(world, 1000, 1000);

    // Create a low-HP enemy unit in attacking state
    const damagedUnit = createEnemyCombatUnit(
      world,
      EntityKind.Gator,
      200,
      200,
      UnitState.Attacking,
    );
    // Set HP below 20% threshold
    const maxHp = Health.max[damagedUnit];
    Health.current[damagedUnit] = Math.floor(maxHp * (ENEMY_RETREAT_HP_PERCENT - 0.01));

    enemyCombatTick(world);

    // The damaged unit should have been switched to Move (retreating)
    expect(UnitStateMachine.state[damagedUnit]).toBe(UnitState.Move);
  });
});

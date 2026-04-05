/**
 * Combat Retarget Tests
 *
 * Validates that units immediately scan for a new target after killing
 * an enemy, rather than going idle and waiting for the 10-frame aggro
 * check. This is critical for snappy RTS combat feel.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

function spawnUnit(
  world: GameWorld,
  x: number,
  y: number,
  kind: EntityKind,
  faction: Faction,
  hp: number,
  damage: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Velocity);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = hp;
  Combat.damage[eid] = damage;
  Combat.attackRange[eid] = 50;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;
  EntityTypeTag.kind[eid] = kind;
  FactionTag.faction[eid] = faction;
  Collider.radius[eid] = 10;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;
  Velocity.speed[eid] = 2.0;
  Sprite.facingLeft[eid] = 0;

  return eid;
}

describe('Combat retarget after kill', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash.clear();
  });

  it('unit transitions to AttackMove (not Idle) after killing target', () => {
    // Brawler next to a 1-HP enemy and another enemy nearby
    const brawler = spawnUnit(world, 100, 100, EntityKind.Brawler, Faction.Player, 60, 50);
    const enemy1 = spawnUnit(world, 110, 100, EntityKind.Gator, Faction.Enemy, 1, 5);
    const enemy2 = spawnUnit(world, 130, 100, EntityKind.Gator, Faction.Enemy, 60, 5);

    // Put brawler in Attacking state targeting enemy1
    UnitStateMachine.state[brawler] = UnitState.Attacking;
    UnitStateMachine.targetEntity[brawler] = enemy1;

    // Populate spatial hash so retarget scan works
    world.spatialHash.insert(brawler, 100, 100);
    world.spatialHash.insert(enemy1, 110, 100);
    world.spatialHash.insert(enemy2, 130, 100);

    // Frame 1: attack deals lethal damage
    world.frameCount = 1;
    combatSystem(world);
    expect(Health.current[enemy1]).toBeLessThanOrEqual(0);

    // Frame 2: combat system detects dead target, triggers immediate retarget
    world.frameCount = 2;
    combatSystem(world);

    // Brawler should have retargeted to enemy2 (AttackMove, not Idle)
    expect(UnitStateMachine.state[brawler]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.targetEntity[brawler]).toBe(enemy2);
  });

  it('unit goes Idle if no enemies remain after kill', () => {
    const brawler = spawnUnit(world, 100, 100, EntityKind.Brawler, Faction.Player, 60, 50);
    const enemy = spawnUnit(world, 110, 100, EntityKind.Gator, Faction.Enemy, 1, 5);

    UnitStateMachine.state[brawler] = UnitState.Attacking;
    UnitStateMachine.targetEntity[brawler] = enemy;

    world.spatialHash.insert(brawler, 100, 100);
    world.spatialHash.insert(enemy, 110, 100);

    // Frame 1: attack kills the enemy
    world.frameCount = 1;
    combatSystem(world);
    expect(Health.current[enemy]).toBeLessThanOrEqual(0);

    // Frame 2: detects dead target, no enemies remain → Idle
    world.frameCount = 2;
    combatSystem(world);
    expect(UnitStateMachine.state[brawler]).toBe(UnitState.Idle);
  });
});

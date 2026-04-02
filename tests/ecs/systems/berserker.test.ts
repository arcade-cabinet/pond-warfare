import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { Combat, EntityTypeTag, Health, Position, UnitStateMachine } from '@/ecs/components';
import { berserkerSystem } from '@/ecs/systems/berserker';
import { createGameWorld } from '@/ecs/world';
import { EntityKind, UnitState } from '@/types';

function spawnBerserker(world: ReturnType<typeof createGameWorld>, hp?: number) {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = EntityKind.Berserker;

  addComponent(world.ecs, eid, Health);
  Health.max[eid] = ENTITY_DEFS[EntityKind.Berserker].hp;
  Health.current[eid] = hp ?? ENTITY_DEFS[EntityKind.Berserker].hp;

  addComponent(world.ecs, eid, Combat);
  Combat.damage[eid] = ENTITY_DEFS[EntityKind.Berserker].damage;
  Combat.attackRange[eid] = ENTITY_DEFS[EntityKind.Berserker].attackRange;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;

  addComponent(world.ecs, eid, UnitStateMachine);
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;

  addComponent(world.ecs, eid, Position);
  Position.x[eid] = 500;
  Position.y[eid] = 500;

  return eid;
}

describe('berserkerSystem', () => {
  it('drains HP when attacking', () => {
    const world = createGameWorld();
    const eid = spawnBerserker(world);
    UnitStateMachine.state[eid] = UnitState.Attacking;
    world.frameCount = 60;

    const hpBefore = Health.current[eid];
    berserkerSystem(world);
    expect(Health.current[eid]).toBe(hpBefore - 1);
  });

  it('does not drain HP when idle', () => {
    const world = createGameWorld();
    const eid = spawnBerserker(world);
    UnitStateMachine.state[eid] = UnitState.Idle;
    world.frameCount = 60;

    const hpBefore = Health.current[eid];
    berserkerSystem(world);
    expect(Health.current[eid]).toBe(hpBefore);
  });

  it('does not drain below 1 HP', () => {
    const world = createGameWorld();
    const eid = spawnBerserker(world, 1);
    UnitStateMachine.state[eid] = UnitState.Attacking;
    world.frameCount = 60;

    berserkerSystem(world);
    expect(Health.current[eid]).toBe(1);
  });

  it('increases damage as HP decreases', () => {
    const world = createGameWorld();
    const baseDamage = ENTITY_DEFS[EntityKind.Berserker].damage; // 15
    const maxHp = ENTITY_DEFS[EntityKind.Berserker].hp; // 60

    // At full HP: no bonus
    const eid = spawnBerserker(world, maxHp);
    world.frameCount = 60;
    berserkerSystem(world);
    expect(Combat.damage[eid]).toBe(baseDamage); // 15

    // At 50% HP: 50% lost = 5 * 0.05 = 0.25 bonus = 15 * 1.25 = 19
    Health.current[eid] = maxHp * 0.5;
    world.frameCount = 120;
    berserkerSystem(world);
    expect(Combat.damage[eid]).toBe(Math.round(baseDamage * 1.25)); // 19

    // At 10% HP: 90% lost = 9 * 0.05 = 0.45 bonus = 15 * 1.45 = 22
    Health.current[eid] = maxHp * 0.1;
    world.frameCount = 180;
    berserkerSystem(world);
    expect(Combat.damage[eid]).toBe(Math.round(baseDamage * 1.45)); // 22
  });

  it('caps damage bonus at +50%', () => {
    const world = createGameWorld();
    const baseDamage = ENTITY_DEFS[EntityKind.Berserker].damage;

    const eid = spawnBerserker(world, 1); // Nearly dead
    world.frameCount = 60;
    berserkerSystem(world);

    // At ~1.7% HP: should cap at +50% = 15 * 1.5 = 23
    expect(Combat.damage[eid]).toBeLessThanOrEqual(Math.round(baseDamage * 1.5));
  });

  it('only runs every 60 frames', () => {
    const world = createGameWorld();
    const eid = spawnBerserker(world);
    UnitStateMachine.state[eid] = UnitState.Attacking;

    world.frameCount = 30; // Not a multiple of 60
    const hpBefore = Health.current[eid];
    berserkerSystem(world);
    expect(Health.current[eid]).toBe(hpBefore); // No change
  });
});

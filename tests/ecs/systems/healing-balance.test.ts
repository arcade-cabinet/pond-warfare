/**
 * Healing Balance Tests
 *
 * Validates Nature branch healing caps:
 * - Medic aura max 3 concurrent heals per Medic
 * - Regeneration requires 5s (300 frames) out of combat
 * - Herbalist Hut range set to 200px
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
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import {
  processHerbalistHutHeal,
  processRegeneration,
  processSupportAura,
} from '@/ecs/systems/health/healing';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MEDIC_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function makeUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
  maxHp: number,
  currentHp?: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.max[eid] = maxHp;
  Health.current[eid] = currentHp ?? maxHp;
  Health.flashTimer[eid] = 0;
  Health.lastDamagedFrame[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 1.8;
  Collider.radius[eid] = 16;
  Combat.damage[eid] = 6;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

function makeHerbalistHut(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, Building);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.max[eid] = 500;
  Health.current[eid] = 500;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.HerbalistHut;
  Building.progress[eid] = 100;

  return eid;
}

describe('Medic aura -- max 3 concurrent heals', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('heals at most 3 nearby injured units per Medic', () => {
    const medic = makeUnit(world, 100, 100, Faction.Player, MEDIC_KIND, 60);
    Health.current[medic] = 60;

    const injured: number[] = [];
    for (let i = 0; i < 5; i++) {
      const u = makeUnit(
        world,
        100 + (i - 2) * 10,
        100 + (i - 2) * 10,
        Faction.Player,
        SAPPER_KIND,
        60,
        50,
      );
      injured.push(u);
    }

    processSupportAura(world);

    let healed = 0;
    for (const eid of injured) {
      if (Health.current[eid] > 50) healed++;
    }
    expect(healed).toBe(3);
  });

  it('heals fewer than 3 if fewer injured units in range', () => {
    makeUnit(world, 100, 100, Faction.Player, MEDIC_KIND, 60);
    const u1 = makeUnit(world, 110, 100, Faction.Player, SAPPER_KIND, 60, 50);
    const u2 = makeUnit(world, 120, 100, Faction.Player, SAPPER_KIND, 60, 50);

    processSupportAura(world);

    expect(Health.current[u1]).toBe(52);
    expect(Health.current[u2]).toBe(52);
  });
});

describe('Regeneration -- out-of-combat check', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 600;
  });

  it('regens units that have not been damaged recently', () => {
    const u = makeUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 60, 50);
    Health.lastDamagedFrame[u] = 0;
    processRegeneration(world);
    expect(Health.current[u]).toBe(51);
  });

  it('does NOT regen units damaged within last 300 frames', () => {
    const u = makeUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 60, 50);
    Health.lastDamagedFrame[u] = 400;
    processRegeneration(world);
    expect(Health.current[u]).toBe(50);
  });

  it('regens units damaged more than 300 frames ago', () => {
    const u = makeUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 60, 50);
    Health.lastDamagedFrame[u] = 200;
    processRegeneration(world);
    expect(Health.current[u]).toBe(51);
  });

  it('does not regen enemy units', () => {
    const u = makeUnit(world, 100, 100, Faction.Enemy, EntityKind.Gator, 100, 50);
    Health.lastDamagedFrame[u] = 0;
    processRegeneration(world);
    expect(Health.current[u]).toBe(50);
  });
});

describe('Herbalist Hut -- 200px range', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('heals units within 200px', () => {
    makeHerbalistHut(world, 100, 100);
    const close = makeUnit(world, 200, 100, Faction.Player, SAPPER_KIND, 60, 50);
    processHerbalistHutHeal(world);
    expect(Health.current[close]).toBe(52);
  });

  it('heals injured player units near hut (no spatial hash)', () => {
    makeHerbalistHut(world, 100, 100);
    const u1 = makeUnit(world, 120, 100, Faction.Player, SAPPER_KIND, 60, 50);
    const u2 = makeUnit(world, 130, 100, Faction.Player, SAPPER_KIND, 60, 50);
    processHerbalistHutHeal(world);
    // Without spatial hash, all player units are healed
    expect(Health.current[u1]).toBe(52);
    expect(Health.current[u2]).toBe(52);
  });
});

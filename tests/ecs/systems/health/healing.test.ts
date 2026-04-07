/**
 * Healing Subsystem Tests
 *
 * Validates passive healing, healer aura, regeneration,
 * and herbalist hut area heal.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MEDIC_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import {
  processHealerAura,
  processHerbalistHutHeal,
  processPassiveHealing,
  processRegeneration,
} from '@/ecs/systems/health/healing';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { SpatialHash } from '@/utils/spatial-hash';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/config/barks', () => ({
  showBark: vi.fn(),
  shouldLowHpBark: vi.fn().mockReturnValue(false),
}));

/** Create a basic player unit with health and state. */
function spawnUnit(
  world: GameWorld,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  state: UnitState = UnitState.Idle,
  kind: EntityKind = SAPPER_KIND,
  faction: Faction = Faction.Player,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Health.lastDamagedFrame[eid] = 0;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = state;

  return eid;
}

/** Create a completed herbalist hut building. */
function spawnHerbalistHut(world: GameWorld, x: number, y: number, hp: number = 100): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, Building);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.HerbalistHut;
  Building.progress[eid] = 100;

  return eid;
}

describe('processPassiveHealing', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('heals idle player units by 1 HP', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(51);
  });

  it('heals gathering units by 1 HP', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Gathering);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(51);
  });

  it('heals moving units by 1 HP', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Move);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(51);
  });

  it('does NOT heal units in attacking state', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Attacking);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(50);
  });

  it('does NOT heal units at full HP', () => {
    const eid = spawnUnit(world, 100, 100, 60, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(60);
  });

  it('does NOT heal dead units', () => {
    const eid = spawnUnit(world, 100, 100, 0, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(0);
  });

  it('does NOT heal enemy units', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle, EntityKind.Gator, Faction.Enemy);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(50);
  });

  it('caps healing at max HP', () => {
    const eid = spawnUnit(world, 100, 100, 59, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(60);
  });

  it('heals 5 HP with hardenedShells tech', () => {
    world.tech.hardenedShells = true;
    const eid = spawnUnit(world, 100, 100, 40, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(45);
  });

  it('caps hardenedShells healing at max HP', () => {
    world.tech.hardenedShells = true;
    const eid = spawnUnit(world, 100, 100, 57, 60, UnitState.Idle);

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(60);
  });

  it('does NOT heal buildings', () => {
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, Health);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);
    addComponent(world.ecs, eid, UnitStateMachine);
    addComponent(world.ecs, eid, IsBuilding);

    Position.x[eid] = 100;
    Position.y[eid] = 100;
    Health.current[eid] = 50;
    Health.max[eid] = 100;
    FactionTag.faction[eid] = Faction.Player;
    EntityTypeTag.kind[eid] = EntityKind.Lodge;
    UnitStateMachine.state[eid] = UnitState.Idle;

    processPassiveHealing(world);

    expect(Health.current[eid]).toBe(50);
  });
});

describe('processHealerAura', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('healer heals a nearby damaged ally by 2 HP', () => {
    spawnUnit(world, 100, 100, 60, 60, UnitState.Idle, MEDIC_KIND);
    const ally = spawnUnit(world, 130, 100, 40, 60, UnitState.Idle);

    processHealerAura(world);

    expect(Health.current[ally]).toBe(42);
  });

  it('does NOT heal allies beyond max HP', () => {
    spawnUnit(world, 100, 100, 60, 60, UnitState.Idle, MEDIC_KIND);
    const ally = spawnUnit(world, 130, 100, 59, 60, UnitState.Idle);

    processHealerAura(world);

    expect(Health.current[ally]).toBe(60);
  });

  it('does NOT heal allies beyond 80px range', () => {
    spawnUnit(world, 100, 100, 60, 60, UnitState.Idle, EntityKind.Healer);
    const ally = spawnUnit(world, 300, 100, 40, 60, UnitState.Idle);

    processHealerAura(world);

    expect(Health.current[ally]).toBe(40);
  });

  it('heals at most 3 allies per healer', () => {
    spawnUnit(world, 100, 100, 60, 60, UnitState.Idle, EntityKind.Healer);
    const allies: number[] = [];
    for (let i = 0; i < 5; i++) {
      allies.push(spawnUnit(world, 110 + i * 5, 100, 40, 60, UnitState.Idle));
    }

    processHealerAura(world);

    const healed = allies.filter((eid) => Health.current[eid] > 40);
    expect(healed).toHaveLength(3);
  });

  it('does NOT heal full-HP allies', () => {
    spawnUnit(world, 100, 100, 60, 60, UnitState.Idle, EntityKind.Healer);
    const ally = spawnUnit(world, 130, 100, 60, 60, UnitState.Idle);

    processHealerAura(world);

    expect(Health.current[ally]).toBe(60);
  });
});

describe('processRegeneration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 600;
  });

  it('regenerates 1 HP for units out of combat for 300+ frames', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 100; // damaged at frame 100, now at 600 = 500 frames

    processRegeneration(world);

    expect(Health.current[eid]).toBe(51);
  });

  it('does NOT regenerate units recently in combat', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 400; // only 200 frames ago

    processRegeneration(world);

    expect(Health.current[eid]).toBe(50);
  });

  it('does NOT regenerate dead units', () => {
    const eid = spawnUnit(world, 100, 100, 0, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 0;

    processRegeneration(world);

    expect(Health.current[eid]).toBe(0);
  });

  it('does NOT regenerate full HP units', () => {
    const eid = spawnUnit(world, 100, 100, 60, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 0;

    processRegeneration(world);

    expect(Health.current[eid]).toBe(60);
  });

  it('does NOT regenerate enemy units', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle, EntityKind.Gator, Faction.Enemy);
    Health.lastDamagedFrame[eid] = 0;

    processRegeneration(world);

    expect(Health.current[eid]).toBe(50);
  });

  it('caps regeneration at max HP', () => {
    const eid = spawnUnit(world, 100, 100, 59, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 0;

    processRegeneration(world);

    expect(Health.current[eid]).toBe(60);
  });

  it('regenerates units that have never been damaged (lastDamagedFrame = 0)', () => {
    const eid = spawnUnit(world, 100, 100, 50, 60, UnitState.Idle);
    Health.lastDamagedFrame[eid] = 0;

    processRegeneration(world);

    expect(Health.current[eid]).toBe(51);
  });
});

describe('processHerbalistHutHeal', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('heals nearby player units by 2 HP', () => {
    spawnHerbalistHut(world, 100, 100);
    const unit = spawnUnit(world, 120, 100, 40, 60, UnitState.Idle);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(42);
  });

  it('caps healing at max HP', () => {
    spawnHerbalistHut(world, 100, 100);
    const unit = spawnUnit(world, 120, 100, 59, 60, UnitState.Idle);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(60);
  });

  it('does NOT heal dead units', () => {
    spawnHerbalistHut(world, 100, 100);
    const unit = spawnUnit(world, 120, 100, 0, 60, UnitState.Idle);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(0);
  });

  it('does NOT heal units beyond 200px range when spatial hash is active', () => {
    // Reinstate spatial hash -- the hut code relies on it for range filtering
    world.spatialHash = new SpatialHash(200);

    const hutEid = spawnHerbalistHut(world, 100, 100);
    const unit = spawnUnit(world, 500, 100, 40, 60, UnitState.Idle);

    // Rebuild spatial hash with all entities
    world.spatialHash.clear();
    world.spatialHash.insert(hutEid, 100, 100);
    world.spatialHash.insert(unit, 500, 100);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(40);
  });

  it('does NOT heal if hut is incomplete (progress < 100)', () => {
    const hutEid = spawnHerbalistHut(world, 100, 100);
    Building.progress[hutEid] = 50;
    const unit = spawnUnit(world, 120, 100, 40, 60, UnitState.Idle);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(40);
  });

  it('does NOT heal if hut is destroyed', () => {
    const hutEid = spawnHerbalistHut(world, 100, 100, 0);
    Health.current[hutEid] = 0;
    const unit = spawnUnit(world, 120, 100, 40, 60, UnitState.Idle);

    processHerbalistHutHeal(world);

    expect(Health.current[unit]).toBe(40);
  });

  it('does NOT heal buildings', () => {
    spawnHerbalistHut(world, 100, 100);
    const building = addEntity(world.ecs);
    addComponent(world.ecs, building, Position);
    addComponent(world.ecs, building, Health);
    addComponent(world.ecs, building, FactionTag);
    addComponent(world.ecs, building, IsBuilding);
    Position.x[building] = 110;
    Position.y[building] = 100;
    Health.current[building] = 50;
    Health.max[building] = 100;
    FactionTag.faction[building] = Faction.Player;

    processHerbalistHutHeal(world);

    expect(Health.current[building]).toBe(50);
  });
});

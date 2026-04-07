/**
 * Diver Stealth System Tests
 *
 * Validates stealth on water/shallows, untargetability, ambush damage,
 * and stealth-breaking behavior.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import {
  Carrying,
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
import { consumeAmbushBonus, diverStealthSystem, isStealthed } from '@/ecs/systems/diver-stealth';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createDiver(world: GameWorld, x: number, y: number, faction: Faction): number {
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
  Health.current[eid] = 25;
  Health.max[eid] = 25;
  Combat.damage[eid] = 8;
  Combat.attackRange[eid] = 40;
  Combat.attackCooldown[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = EntityKind.Diver;
  Velocity.speed[eid] = 2.5;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

function setTerrain(world: GameWorld, x: number, y: number, type: TerrainType): void {
  const col = world.terrainGrid.worldToCol(x);
  const row = world.terrainGrid.worldToRow(y);
  world.terrainGrid.set(col, row, type);
}

describe('diverStealthSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('grants stealth when Diver is on Water terrain', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);

    expect(isStealthed(world, diver)).toBe(true);
  });

  it('grants stealth when Diver is on Shallows terrain', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Shallows);

    diverStealthSystem(world);

    expect(isStealthed(world, diver)).toBe(true);
  });

  it('does not grant stealth on Grass terrain', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    // Default terrain is Grass

    diverStealthSystem(world);

    expect(isStealthed(world, diver)).toBe(false);
  });

  it('breaks stealth when Diver moves off water', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);
    expect(isStealthed(world, diver)).toBe(true);

    // Move to grass
    Position.x[diver] = 200;
    Position.y[diver] = 200;
    // Terrain at (200,200) is default Grass

    diverStealthSystem(world);
    expect(isStealthed(world, diver)).toBe(false);
  });

  it('sets ambush bonus when entering stealth', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);

    expect(world.stealthAmbushReady.has(diver)).toBe(true);
  });

  it('consumeAmbushBonus returns true and clears stealth on first call', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);

    expect(consumeAmbushBonus(world, diver)).toBe(true);
    expect(isStealthed(world, diver)).toBe(false);
    expect(world.stealthAmbushReady.has(diver)).toBe(false);
  });

  it('consumeAmbushBonus returns false on second call', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);
    consumeAmbushBonus(world, diver);

    expect(consumeAmbushBonus(world, diver)).toBe(false);
  });

  it('clears stealth for dead Divers', () => {
    const diver = createDiver(world, 100, 100, Faction.Player);
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);
    expect(isStealthed(world, diver)).toBe(true);

    Health.current[diver] = 0;
    diverStealthSystem(world);
    expect(isStealthed(world, diver)).toBe(false);
  });

  it('does not stealth non-Diver units on water', () => {
    // Create a Sapper on water — should NOT get stealth
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, Health);
    addComponent(world.ecs, eid, UnitStateMachine);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);
    Position.x[eid] = 100;
    Position.y[eid] = 100;
    Health.current[eid] = 60;
    Health.max[eid] = 60;
    UnitStateMachine.state[eid] = UnitState.Idle;
    FactionTag.faction[eid] = Faction.Player;
    EntityTypeTag.kind[eid] = SAPPER_KIND;
    setTerrain(world, 100, 100, TerrainType.Water);

    diverStealthSystem(world);

    expect(isStealthed(world, eid)).toBe(false);
  });
});

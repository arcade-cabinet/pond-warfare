/**
 * Engineer System Tests
 *
 * Validates Engineer build speed boost, repair boost, and temporary bridge.
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
import { engineerSystem, placeEngineerBridge } from '@/ecs/systems/engineer';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createEngineer(world: GameWorld, x: number, y: number): number {
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
  Health.current[eid] = 40;
  Health.max[eid] = 40;
  Combat.damage[eid] = 1;
  Combat.attackRange[eid] = 40;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Engineer;
  Velocity.speed[eid] = 1.5;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

function createBuilding(
  world: GameWorld,
  x: number,
  y: number,
  currentHp: number,
  maxHp: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = currentHp;
  Health.max[eid] = maxHp;
  Building.progress[eid] = (currentHp / maxHp) * 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Armory;

  return eid;
}

describe('engineerSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('gives extra +1 HP per frame when Engineer is building', () => {
    const building = createBuilding(world, 110, 100, 10, 500);
    const engineer = createEngineer(world, 100, 100);
    UnitStateMachine.state[engineer] = UnitState.Building;
    UnitStateMachine.targetEntity[engineer] = building;

    const hpBefore = Health.current[building];
    engineerSystem(world);

    // Engineer adds +1 HP on top of normal build system's contribution
    expect(Health.current[building]).toBe(hpBefore + 1);
  });

  it('gives extra +1 HP per frame when Engineer is repairing', () => {
    const building = createBuilding(world, 110, 100, 400, 500);
    const engineer = createEngineer(world, 100, 100);
    UnitStateMachine.state[engineer] = UnitState.Repairing;
    UnitStateMachine.targetEntity[engineer] = building;

    const hpBefore = Health.current[building];
    engineerSystem(world);

    expect(Health.current[building]).toBe(hpBefore + 1);
  });

  it('does not exceed max HP when building', () => {
    const building = createBuilding(world, 110, 100, 499, 500);
    const engineer = createEngineer(world, 100, 100);
    UnitStateMachine.state[engineer] = UnitState.Building;
    UnitStateMachine.targetEntity[engineer] = building;

    engineerSystem(world);

    expect(Health.current[building]).toBe(500);
  });

  it('does nothing for dead Engineers', () => {
    const building = createBuilding(world, 110, 100, 10, 500);
    const engineer = createEngineer(world, 100, 100);
    UnitStateMachine.state[engineer] = UnitState.Building;
    UnitStateMachine.targetEntity[engineer] = building;
    Health.current[engineer] = 0;

    const hpBefore = Health.current[building];
    engineerSystem(world);

    expect(Health.current[building]).toBe(hpBefore);
  });
});

describe('placeEngineerBridge', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('converts Water tile to Shallows', () => {
    const engineer = createEngineer(world, 100, 100);
    const col = world.terrainGrid.worldToCol(100);
    const row = world.terrainGrid.worldToRow(100);
    world.terrainGrid.set(col, row, TerrainType.Water);

    const result = placeEngineerBridge(world, engineer);

    expect(result).toBe(true);
    expect(world.terrainGrid.get(col, row)).toBe(TerrainType.Shallows);
    expect(world.engineerBridges.length).toBe(1);
  });

  it('fails on non-Water terrain', () => {
    const engineer = createEngineer(world, 100, 100);
    // Default terrain is Grass

    const result = placeEngineerBridge(world, engineer);

    expect(result).toBe(false);
    expect(world.engineerBridges.length).toBe(0);
  });

  it('reverts bridge after expiry', () => {
    const engineer = createEngineer(world, 100, 100);
    const col = world.terrainGrid.worldToCol(100);
    const row = world.terrainGrid.worldToRow(100);
    world.terrainGrid.set(col, row, TerrainType.Water);

    placeEngineerBridge(world, engineer);
    expect(world.terrainGrid.get(col, row)).toBe(TerrainType.Shallows);

    // Advance past bridge duration
    world.frameCount = 301;
    engineerSystem(world);

    expect(world.terrainGrid.get(col, row)).toBe(TerrainType.Water);
    expect(world.engineerBridges.length).toBe(0);
  });

  it('prevents duplicate bridge on same tile', () => {
    const engineer = createEngineer(world, 100, 100);
    const col = world.terrainGrid.worldToCol(100);
    const row = world.terrainGrid.worldToRow(100);
    world.terrainGrid.set(col, row, TerrainType.Water);

    expect(placeEngineerBridge(world, engineer)).toBe(true);
    expect(placeEngineerBridge(world, engineer)).toBe(false);
    expect(world.engineerBridges.length).toBe(1);
  });
});

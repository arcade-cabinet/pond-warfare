import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health, Position, UnitStateMachine } from '@/ecs/components';
import {
  activateShrine,
  countBranchTechs,
  getDominantBranch,
  getShrineAbility,
} from '@/ecs/systems/shrine';
import { createGameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

function spawnShrine(world: ReturnType<typeof createGameWorld>) {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = EntityKind.Shrine;
  addComponent(world.ecs, eid, Health);
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = 500;
  Position.y[eid] = 500;
  addComponent(world.ecs, eid, FactionTag);
  FactionTag.faction[eid] = Faction.Player;
  return eid;
}

function spawnPlayerUnit(world: ReturnType<typeof createGameWorld>) {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Health);
  Health.current[eid] = 30;
  Health.max[eid] = 60;
  addComponent(world.ecs, eid, FactionTag);
  FactionTag.faction[eid] = Faction.Player;
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = 500;
  Position.y[eid] = 500;
  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = EntityKind.Brawler;
  return eid;
}

function spawnEnemyUnit(world: ReturnType<typeof createGameWorld>) {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Health);
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  addComponent(world.ecs, eid, FactionTag);
  FactionTag.faction[eid] = Faction.Enemy;
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = 500;
  Position.y[eid] = 500;
  addComponent(world.ecs, eid, UnitStateMachine);
  UnitStateMachine.state[eid] = UnitState.Attacking;
  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = EntityKind.Gator;
  return eid;
}

describe('countBranchTechs', () => {
  it('counts zero when no techs researched', () => {
    const world = createGameWorld();
    const counts = countBranchTechs(world.tech);
    expect(counts.lodge).toBe(0);
    expect(counts.nature).toBe(0);
    expect(counts.warfare).toBe(0);
    expect(counts.fortifications).toBe(0);
    expect(counts.shadow).toBe(0);
  });

  it('counts techs per branch correctly', () => {
    const world = createGameWorld();
    world.tech.cartography = true;
    world.tech.tidalHarvest = true;
    world.tech.tradeRoutes = true;
    const counts = countBranchTechs(world.tech);
    expect(counts.lodge).toBe(3);
  });
});

describe('getDominantBranch', () => {
  it('returns null when no branch has 3+ techs', () => {
    const world = createGameWorld();
    world.tech.cartography = true;
    world.tech.tidalHarvest = true;
    expect(getDominantBranch(world.tech)).toBeNull();
  });

  it('returns the branch with most techs (min 3)', () => {
    const world = createGameWorld();
    // 3 nature techs
    world.tech.herbalMedicine = true;
    world.tech.aquaticTraining = true;
    world.tech.pondBlessing = true;
    expect(getDominantBranch(world.tech)).toBe('nature');
  });
});

describe('getShrineAbility', () => {
  it('returns null when no dominant branch', () => {
    const world = createGameWorld();
    expect(getShrineAbility(world)).toBeNull();
  });

  it('returns bloom for nature dominance', () => {
    const world = createGameWorld();
    world.tech.herbalMedicine = true;
    world.tech.aquaticTraining = true;
    world.tech.pondBlessing = true;
    expect(getShrineAbility(world)).toBe('bloom');
  });

  it('returns flood for lodge dominance', () => {
    const world = createGameWorld();
    world.tech.cartography = true;
    world.tech.tidalHarvest = true;
    world.tech.tradeRoutes = true;
    expect(getShrineAbility(world)).toBe('flood');
  });
});

describe('activateShrine', () => {
  it('returns false when no dominant branch', () => {
    const world = createGameWorld();
    const eid = spawnShrine(world);
    expect(activateShrine(world, eid)).toBe(false);
  });

  it('returns false when shrine already used', () => {
    const world = createGameWorld();
    world.tech.herbalMedicine = true;
    world.tech.aquaticTraining = true;
    world.tech.pondBlessing = true;
    const eid = spawnShrine(world);
    world.shrineUsed.add(eid);
    expect(activateShrine(world, eid)).toBe(false);
  });

  it('bloom heals all player units to full HP', () => {
    const world = createGameWorld();
    world.tech.herbalMedicine = true;
    world.tech.aquaticTraining = true;
    world.tech.pondBlessing = true;

    const shrineEid = spawnShrine(world);
    const unitEid = spawnPlayerUnit(world);

    expect(Health.current[unitEid]).toBe(30); // Half HP

    const result = activateShrine(world, shrineEid);
    expect(result).toBe(true);
    expect(Health.current[unitEid]).toBe(60); // Full HP
  });

  it('destroys shrine after activation', () => {
    const world = createGameWorld();
    world.tech.herbalMedicine = true;
    world.tech.aquaticTraining = true;
    world.tech.pondBlessing = true;

    const eid = spawnShrine(world);
    activateShrine(world, eid);
    expect(Health.current[eid]).toBe(0); // Shrine crumbled
  });

  it('eclipse sets enemies to idle', () => {
    const world = createGameWorld();
    world.tech.swiftPaws = true;
    world.tech.cunningTraps = true;
    world.tech.rallyCry = true;

    const shrineEid = spawnShrine(world);
    const enemyEid = spawnEnemyUnit(world);

    expect(UnitStateMachine.state[enemyEid]).toBe(UnitState.Attacking);

    activateShrine(world, shrineEid);
    expect(UnitStateMachine.state[enemyEid]).toBe(UnitState.Idle);
  });

  it('meteor deals damage to enemies in radius', () => {
    const world = createGameWorld();
    world.tech.sharpSticks = true;
    world.tech.eagleEye = true;
    world.tech.battleRoar = true;

    const shrineEid = spawnShrine(world);
    const enemyEid = spawnEnemyUnit(world);
    // Place enemy near target
    Position.x[enemyEid] = 500;
    Position.y[enemyEid] = 500;

    const hpBefore = Health.current[enemyEid];
    activateShrine(world, shrineEid, 500, 500);
    expect(Health.current[enemyEid]).toBeLessThan(hpBefore);
  });
});

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
    expect(counts.gathering).toBe(0);
    expect(counts.combat).toBe(0);
    expect(counts.defense).toBe(0);
    expect(counts.utility).toBe(0);
    expect(counts.economy).toBe(0);
    expect(counts.siege).toBe(0);
  });

  it('counts techs per category correctly', () => {
    const world = createGameWorld();
    // v3 upgrade IDs: {category}_{subcategory}_t{tier}
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    world.tech.gathering_log_gathering_t0 = true;
    const counts = countBranchTechs(world.tech);
    expect(counts.gathering).toBe(3);
  });
});

describe('getDominantBranch', () => {
  it('returns null when no category has 3+ techs', () => {
    const world = createGameWorld();
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    expect(getDominantBranch(world.tech)).toBeNull();
  });

  it('returns the category with most techs (min 3)', () => {
    const world = createGameWorld();
    // 3 utility techs
    world.tech.utility_unit_speed_t0 = true;
    world.tech.utility_vision_range_t0 = true;
    world.tech.utility_heal_power_t0 = true;
    expect(getDominantBranch(world.tech)).toBe('utility');
  });
});

describe('getShrineAbility', () => {
  it('returns null when no dominant category', () => {
    const world = createGameWorld();
    expect(getShrineAbility(world)).toBeNull();
  });

  it('returns bloom for gathering dominance', () => {
    const world = createGameWorld();
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    world.tech.gathering_log_gathering_t0 = true;
    expect(getShrineAbility(world)).toBe('bloom');
  });

  it('returns flood for utility dominance', () => {
    const world = createGameWorld();
    world.tech.utility_unit_speed_t0 = true;
    world.tech.utility_vision_range_t0 = true;
    world.tech.utility_heal_power_t0 = true;
    expect(getShrineAbility(world)).toBe('flood');
  });

  it('returns meteor for combat dominance', () => {
    const world = createGameWorld();
    world.tech.combat_attack_power_t0 = true;
    world.tech.combat_attack_speed_t0 = true;
    world.tech.combat_armor_t0 = true;
    expect(getShrineAbility(world)).toBe('meteor');
  });
});

describe('activateShrine', () => {
  it('returns false when no dominant category', () => {
    const world = createGameWorld();
    const eid = spawnShrine(world);
    expect(activateShrine(world, eid)).toBe(false);
  });

  it('returns false when shrine already used', () => {
    const world = createGameWorld();
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    world.tech.gathering_log_gathering_t0 = true;
    const eid = spawnShrine(world);
    world.shrineUsed.add(eid);
    expect(activateShrine(world, eid)).toBe(false);
  });

  it('bloom heals all player units to full HP', () => {
    const world = createGameWorld();
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    world.tech.gathering_log_gathering_t0 = true;

    const shrineEid = spawnShrine(world);
    const unitEid = spawnPlayerUnit(world);

    expect(Health.current[unitEid]).toBe(30); // Half HP

    const result = activateShrine(world, shrineEid);
    expect(result).toBe(true);
    expect(Health.current[unitEid]).toBe(60); // Full HP
  });

  it('destroys shrine after activation', () => {
    const world = createGameWorld();
    world.tech.gathering_fish_gathering_t0 = true;
    world.tech.gathering_rock_gathering_t0 = true;
    world.tech.gathering_log_gathering_t0 = true;

    const eid = spawnShrine(world);
    activateShrine(world, eid);
    expect(Health.current[eid]).toBe(0); // Shrine crumbled
  });

  it('meteor deals damage to enemies in radius', () => {
    const world = createGameWorld();
    world.tech.combat_attack_power_t0 = true;
    world.tech.combat_attack_speed_t0 = true;
    world.tech.combat_armor_t0 = true;

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

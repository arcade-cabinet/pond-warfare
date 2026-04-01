/**
 * Army Integration Tests
 *
 * Tests combat unit training, attacking enemies, damage multipliers,
 * and veterancy. Operates directly on ECS systems — no UI, no DOM.
 */

import { addComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDamageMultiplier } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Combat,
  Health,
  Position,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { trainingSystem } from '@/ecs/systems/training';
import { rankFromKills, veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { getPlayerArmyUnits, getPlayerEntities } from '../helpers/ecs-queries';

describe('Army Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('armory trains brawlers and snipers', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    // Train a brawler
    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    trainingSystem(world);

    // Train a sniper
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Sniper]);
    trainingSystem(world);

    const army = getPlayerArmyUnits(world);
    expect(army.length).toBe(2);
    expect(getPlayerEntities(world, EntityKind.Brawler).length).toBe(1);
    expect(getPlayerEntities(world, EntityKind.Sniper).length).toBe(1);
  });

  it('brawler attacks enemy and deals damage', () => {
    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);

    UnitStateMachine.state[brawler] = UnitState.Attacking;
    UnitStateMachine.targetEntity[brawler] = gator;
    Combat.attackCooldown[brawler] = 0;

    const hpBefore = Health.current[gator];
    combatSystem(world);

    expect(Health.current[gator]).toBeLessThan(hpBefore);
  });

  it('damage multipliers apply correctly', () => {
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Sniper)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Sniper, EntityKind.Brawler)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.Shieldbearer, EntityKind.Gator)).toBe(0.75);
  });

  it('catapult deals AoE damage to nearby enemies', () => {
    const catapult = spawnEntity(world, EntityKind.Catapult, 100, 100, Faction.Player);
    UnitStateMachine.state[catapult] = UnitState.Attacking;
    Combat.attackCooldown[catapult] = 0;

    const target = spawnEntity(world, EntityKind.Gator, 300, 100, Faction.Enemy);
    const nearby = spawnEntity(world, EntityKind.Snake, 330, 100, Faction.Enemy);
    UnitStateMachine.targetEntity[catapult] = target;

    Position.x[target] = Position.x[catapult] + 200;
    Position.y[target] = Position.y[catapult];
    Position.x[nearby] = Position.x[target] + 30;
    Position.y[nearby] = Position.y[target];

    world.spatialHash.clear();
    world.spatialHash.insert(target, Position.x[target], Position.y[target]);
    world.spatialHash.insert(nearby, Position.x[nearby], Position.y[nearby]);
    world.spatialHash.insert(catapult, Position.x[catapult], Position.y[catapult]);

    const nearbyHpBefore = Health.current[nearby];
    combatSystem(world);

    expect(Health.current[nearby]).toBeLessThan(nearbyHpBefore);
  });

  it('veterancy rank increases with kills', () => {
    expect(rankFromKills(0)).toBe(0);
    expect(rankFromKills(3)).toBe(1);
    expect(rankFromKills(7)).toBe(2);
    expect(rankFromKills(15)).toBe(3);
  });

  it('veteran brawler gets stat bonuses', () => {
    world.frameCount = 60;
    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    const baseHp = Health.max[brawler];
    const baseDmg = Combat.damage[brawler];

    Combat.kills[brawler] = 3;
    veterancySystem(world);

    expect(Health.max[brawler]).toBeGreaterThan(baseHp);
    expect(Combat.damage[brawler]).toBeGreaterThan(baseDmg);
  });

  it('iron shell gates shieldbearer training', () => {
    world.tech.ironShell = true;
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Shieldbearer]);

    trainingSystem(world);

    const shieldbearers = getPlayerEntities(world, EntityKind.Shieldbearer);
    expect(shieldbearers.length).toBe(1);
  });

  it('siege works gates catapult training', () => {
    world.tech.siegeWorks = true;
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Catapult]);

    trainingSystem(world);

    const catapults = getPlayerEntities(world, EntityKind.Catapult);
    expect(catapults.length).toBe(1);
  });

  it('army units detected by query helper exclude gatherers', () => {
    spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    spawnEntity(world, EntityKind.Brawler, 200, 100, Faction.Player);
    spawnEntity(world, EntityKind.Sniper, 300, 100, Faction.Player);

    const army = getPlayerArmyUnits(world);
    expect(army.length).toBe(2);
  });
});

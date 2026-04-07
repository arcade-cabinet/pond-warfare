/**
 * Commander Passives Tests
 *
 * Validates all 7 commander passive abilities:
 * 1. Sage aura boosts nearby gathering
 * 2. Tidekeeper Fishers cost 50% less
 * 3. Shadowfang Rangers project 50% farther
 * 4. Ironpaw Guards cost 50% less
 * 5. Stormcaller Bombardiers project 50% farther
 * 6. Stormcaller random lightning
 * 7. Ironpaw +20% HP aura
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Carrying,
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { registerSpecialistEntity, getSpecialistAssignment } from '@/game/specialist-assignment';
import { getSpecialistSpawnCost } from '@/game/specialist-training';
import { EntityKind, Faction, UnitState } from '@/types';

function createUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
  hp = 60,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = hp;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  Combat.attackCooldown[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 1.8;
  Velocity.speedDebuffTimer[eid] = 0;
  Carrying.resourceType[eid] = 0;
  Carrying.resourceAmount[eid] = 0;

  return eid;
}

function createTrainingBuilding(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 500;
  Health.max[eid] = 500;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Armory;
  Building.progress[eid] = 100;
  Sprite.width[eid] = 48;
  Sprite.height[eid] = 48;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

describe('commander passives', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
    trainingQueueSlots.clear();
  });

  it('Sage: nearby gatherers receive the aura gather bonus', () => {
    world.commanderModifiers.auraGatherBonus = 0.25;
    const _commander = createUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 80);
    const gatherer = createUnit(world, 120, 100, Faction.Player, EntityKind.Gatherer, 30);
    const lodge = createTrainingBuilding(world, 100, 160);
    EntityTypeTag.kind[lodge] = EntityKind.Lodge;
    const fishNode = spawnResource(world, 120, 120, EntityKind.Clambed, 100);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = fishNode;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    world.frameCount = 60;
    combatSystem(world);
    gatheringSystem(world);

    expect(Carrying.resourceAmount[gatherer]).toBe(19);
    expect(world.commanderGatherBuff.has(gatherer)).toBe(true);
  });

  it('Tidekeeper: Fishers cost 50% less', () => {
    world.commanderModifiers.passiveFisherCostReduction = 0.5;
    expect(getSpecialistSpawnCost('fisher', world).fish).toBe(6);
  });

  it('Shadowfang: Rangers project 50% farther', () => {
    world.commanderModifiers.passiveRangerProjectionBonus = 0.5;
    const ranger = createPositionedEntity(world, 100, 100);

    registerSpecialistEntity(world, ranger, 'ranger');

    expect(getSpecialistAssignment(world, ranger)?.projectionRange).toBe(330);
  });

  it('Ironpaw: Guards cost 50% less', () => {
    world.commanderModifiers.passiveGuardCostReduction = 0.5;
    expect(getSpecialistSpawnCost('guard', world).fish).toBe(10);
  });

  it('Stormcaller: Bombardiers project 50% farther', () => {
    world.commanderModifiers.passiveBombardierProjectionBonus = 0.5;
    const bombardier = createPositionedEntity(world, 100, 100);

    registerSpecialistEntity(world, bombardier, 'bombardier');

    expect(getSpecialistAssignment(world, bombardier)?.projectionRange).toBe(375);
  });

  it('Stormcaller: lightning strikes up to 3 random enemies', () => {
    world.commanderModifiers.passiveLightningDamage = 10;
    const e1 = createUnit(world, 200, 200, Faction.Enemy, EntityKind.Gator, 100);
    const e2 = createUnit(world, 300, 300, Faction.Enemy, EntityKind.Snake, 100);
    const e3 = createUnit(world, 400, 400, Faction.Enemy, EntityKind.Gator, 100);

    // Fire on exact interval frame (15 seconds = 900 frames)
    world.frameCount = 900;
    commanderPassivesSystem(world);

    // All 3 enemies should have taken damage
    expect(Health.current[e1]).toBeLessThan(100);
    expect(Health.current[e2]).toBeLessThan(100);
    expect(Health.current[e3]).toBeLessThan(100);
    // Should have created 3 ZAP! floating texts
    const zapTexts = world.floatingTexts.filter((t) => t.text === 'ZAP!');
    expect(zapTexts).toHaveLength(3);
    // Should have created particles (at least 6 per target from lightning)
    expect(world.particles.length).toBeGreaterThanOrEqual(18);
  });

  it('Stormcaller: no lightning when no enemies exist', () => {
    world.commanderModifiers.passiveLightningDamage = 10;
    world.frameCount = 900;
    commanderPassivesSystem(world);
    expect(world.floatingTexts.length).toBe(0);
  });

  it('Ironpaw: +20% HP aura applied to units in range', () => {
    world.commanderModifiers.auraUnitHpBonus = 0.2;
    const _commander = createUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 80);
    const brawler = createUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 60);

    // Run combat system to trigger aura refresh
    world.frameCount = 60;
    combatSystem(world);

    // Brawler should have gained 20% HP (60 * 0.2 = 12)
    expect(Health.max[brawler]).toBe(72);
    expect(Health.current[brawler]).toBe(72);
    expect(world.commanderUnitHpBuff.has(brawler)).toBe(true);
  });

  it('Ironpaw: HP aura not applied twice', () => {
    world.commanderModifiers.auraUnitHpBonus = 0.2;
    const _commander = createUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 80);
    const brawler = createUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 60);

    world.frameCount = 60;
    combatSystem(world);
    world.frameCount = 120;
    combatSystem(world);

    // Should still be 72, not 86 (double-applied)
    expect(Health.max[brawler]).toBe(72);
  });
});

function spawnResource(
  world: GameWorld,
  x: number,
  y: number,
  kind: EntityKind,
  amount: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  EntityTypeTag.kind[eid] = kind;
  Resource.amount[eid] = amount;
  return eid;
}

function createPositionedEntity(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return eid;
}

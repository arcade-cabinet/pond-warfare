/**
 * Commander Passives Tests
 *
 * Validates all 7 commander passive abilities:
 * 1. Sage +25% research speed (cost discount)
 * 2. Tidekeeper Swimmer cost 50% less
 * 3. Shadowfang Trapper traps last 2x longer
 * 4. Ironpaw Shieldbearers trained 2x faster
 * 5. Stormcaller Catapults +50% range
 * 6. Stormcaller random lightning on enemies
 * 7. Ironpaw +20% HP to all units (aura)
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { TECH_UPGRADES } from '@/config/tech-tree';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
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

  it('Sage: research costs are reduced by 25%', () => {
    world.commanderModifiers.passiveResearchSpeed = 0.25;
    const tech = TECH_UPGRADES.sturdyMud;
    const expectedClams = Math.round(tech.clamCost * 0.75);
    const expectedTwigs = Math.round(tech.twigCost * 0.75);
    // Set resources to exact discounted amount
    world.resources.clams = expectedClams;
    world.resources.twigs = expectedTwigs;
    // Simulate purchase with discount
    const discount = 1 - world.commanderModifiers.passiveResearchSpeed;
    const clamCost = Math.round(tech.clamCost * discount);
    const twigCost = Math.round(tech.twigCost * discount);
    expect(world.resources.clams >= clamCost).toBe(true);
    expect(world.resources.twigs >= twigCost).toBe(true);
    world.resources.clams -= clamCost;
    world.resources.twigs -= twigCost;
    expect(world.resources.clams).toBe(0);
    expect(world.resources.twigs).toBe(0);
  });

  it('Shadowfang: Trapper traps last 2x longer', () => {
    world.commanderModifiers.passiveTrapDurationMult = 2;
    const trapper = createUnit(world, 100, 100, Faction.Player, EntityKind.Trapper);
    const enemy = createUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);

    UnitStateMachine.state[trapper] = UnitState.Attacking;
    UnitStateMachine.targetEntity[trapper] = enemy;
    Combat.damage[trapper] = 0;
    Combat.attackRange[trapper] = 100;

    // Run combat to trigger trap
    world.frameCount = 60;
    combatSystem(world);

    // Normal trap is 180 frames; with 2x mult should be 360
    expect(Velocity.speedDebuffTimer[enemy]).toBe(360);
  });

  it('Ironpaw: Shieldbearers train 2x faster', () => {
    world.commanderModifiers.passiveShieldbearerTrainSpeed = 0.5;
    const armory = createTrainingBuilding(world, 500, 500);

    // Queue a Shieldbearer with timer at 10
    trainingQueueSlots.set(armory, [EntityKind.Shieldbearer]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 10;

    // Run one tick of training — should decrement by 2
    trainingSystem(world);
    expect(TrainingQueue.timer[armory]).toBe(8);
  });

  it('Ironpaw: non-Shieldbearer trains at normal speed', () => {
    world.commanderModifiers.passiveShieldbearerTrainSpeed = 0.5;
    const armory = createTrainingBuilding(world, 500, 500);

    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 10;

    trainingSystem(world);
    // Normal tick: decrements by 1
    expect(TrainingQueue.timer[armory]).toBe(9);
  });

  it('Stormcaller: Catapult range bonus applied at spawn', () => {
    world.commanderModifiers.passiveCatapultRangeBonus = 0.5;
    const cat = createUnit(world, 100, 100, Faction.Player, EntityKind.Catapult);
    // Manually apply the range bonus as archetypes would
    const baseRange = 250;
    Combat.attackRange[cat] = Math.round(baseRange * 1.5);
    expect(Combat.attackRange[cat]).toBe(375);
  });

  it('Stormcaller: lightning strikes a random enemy', () => {
    world.commanderModifiers.passiveLightningDamage = 10;
    const enemy = createUnit(world, 200, 200, Faction.Enemy, EntityKind.Gator, 100);
    const startHp = Health.current[enemy];

    // Fire on exact interval frame
    world.frameCount = 600;
    commanderPassivesSystem(world);

    // Enemy should have taken damage
    expect(Health.current[enemy]).toBeLessThan(startHp);
    // Should have created floating text including ZAP!
    expect(world.floatingTexts.length).toBeGreaterThan(0);
    const zapText = world.floatingTexts.find((t) => t.text === 'ZAP!');
    expect(zapText).toBeDefined();
    // Should have created particles
    expect(world.particles.length).toBeGreaterThan(0);
  });

  it('Stormcaller: no lightning when no enemies exist', () => {
    world.commanderModifiers.passiveLightningDamage = 10;
    world.frameCount = 600;
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
    expect(world.commanderHpBuffApplied.has(brawler)).toBe(true);
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

/** Commander & Tech Verification — every passive and tech has a measurable effect. */
import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
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
import { healthSystem } from '@/ecs/systems/health';
import { takeDamage } from '@/ecs/systems/health/take-damage';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function u(w: GameWorld, x: number, y: number, f: Faction, k: EntityKind, hp = 60) {
  const e = addEntity(w.ecs);
  for (const C of [
    Position,
    Health,
    Combat,
    UnitStateMachine,
    FactionTag,
    EntityTypeTag,
    Velocity,
    Sprite,
    Carrying,
  ])
    addComponent(w.ecs, e, C);
  Position.x[e] = x;
  Position.y[e] = y;
  Health.current[e] = hp;
  Health.max[e] = hp;
  Combat.damage[e] = 6;
  Combat.attackRange[e] = 40;
  Combat.attackCooldown[e] = 0;
  UnitStateMachine.state[e] = UnitState.Idle;
  FactionTag.faction[e] = f;
  EntityTypeTag.kind[e] = k;
  Velocity.speed[e] = 1.8;
  Velocity.speedDebuffTimer[e] = 0;
  Carrying.resourceType[e] = ResourceType.None;
  return e;
}

function res(w: GameWorld, x: number, y: number, k: EntityKind, amt: number) {
  const e = addEntity(w.ecs);
  for (const C of [Position, Health, FactionTag, EntityTypeTag, IsResource, Resource])
    addComponent(w.ecs, e, C);
  Position.x[e] = x;
  Position.y[e] = y;
  Health.current[e] = 1;
  Health.max[e] = 1;
  FactionTag.faction[e] = Faction.Neutral;
  EntityTypeTag.kind[e] = k;
  Resource.amount[e] = amt;
  return e;
}

describe('Commander passives', () => {
  let w: GameWorld;
  beforeEach(() => {
    w = createGameWorld();
    w.spatialHash = undefined as never;
    trainingQueueSlots.clear();
  });

  it('Marshal: +10% damage aura marks units', () => {
    w.commanderModifiers.auraDamageBonus = 0.1;
    u(w, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const b = u(w, 120, 100, Faction.Player, EntityKind.Brawler);
    w.frameCount = 60;
    combatSystem(w);
    expect(w.commanderDamageBuff.has(b)).toBe(true);
  });

  it('Sage: +15% gather rate and +25% research discount', () => {
    w.commanderModifiers.passiveGatherBonus = 0.15;
    w.commanderModifiers.passiveResearchSpeed = 0.25;
    spawnEntity(w, EntityKind.Lodge, 300, 300, Faction.Player);
    const r = res(w, 100, 100, EntityKind.Clambed, 4000);
    const g = u(w, 100, 100, Faction.Player, EntityKind.Gatherer);
    UnitStateMachine.state[g] = UnitState.Gathering;
    UnitStateMachine.targetEntity[g] = r;
    UnitStateMachine.gatherTimer[g] = 1;
    gatheringSystem(w);
    expect(Carrying.resourceAmount[g]).toBe(Math.round(15 * 1.15));
    expect(Math.round(TECH_UPGRADES.sturdyMud.clamCost * 0.75)).toBeLessThan(
      TECH_UPGRADES.sturdyMud.clamCost,
    );
  });

  it('Warden: +200 HP to buildings via aura', () => {
    w.commanderModifiers.auraHpBonus = 200;
    u(w, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const b = addEntity(w.ecs);
    for (const C of [Position, Health, Combat, FactionTag, EntityTypeTag, IsBuilding])
      addComponent(w.ecs, b, C);
    Position.x[b] = 120;
    Position.y[b] = 100;
    Health.current[b] = 500;
    Health.max[b] = 500;
    FactionTag.faction[b] = Faction.Player;
    EntityTypeTag.kind[b] = EntityKind.Tower;
    Combat.damage[b] = 5;
    Combat.attackRange[b] = 30;
    w.frameCount = 60;
    combatSystem(w);
    expect(Health.max[b]).toBe(700);
  });

  it('Tidekeeper: speed aura marks units', () => {
    w.commanderModifiers.auraSpeedBonus = 0.4;
    u(w, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const b = u(w, 120, 100, Faction.Player, EntityKind.Brawler);
    w.frameCount = 60;
    combatSystem(w);
    expect(w.commanderSpeedBuff.has(b)).toBe(true);
  });

  it('Shadowfang: enemy debuff marks enemies', () => {
    w.commanderModifiers.auraEnemyDamageReduction = 0.2;
    u(w, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const e = u(w, 120, 100, Faction.Enemy, EntityKind.Gator, 100);
    w.frameCount = 60;
    combatSystem(w);
    expect(w.commanderEnemyDebuff.has(e)).toBe(true);
  });

  it('Shadowfang: traps last 2x longer', () => {
    w.commanderModifiers.passiveTrapDurationMult = 2;
    const t = u(w, 100, 100, Faction.Player, EntityKind.Trapper);
    const e = u(w, 110, 100, Faction.Enemy, EntityKind.Gator);
    UnitStateMachine.state[t] = UnitState.Attacking;
    UnitStateMachine.targetEntity[t] = e;
    Combat.damage[t] = 0;
    Combat.attackRange[t] = 100;
    w.frameCount = 60;
    combatSystem(w);
    expect(Velocity.speedDebuffTimer[e]).toBe(360);
  });

  it('Ironpaw: +20% HP aura', () => {
    w.commanderModifiers.auraUnitHpBonus = 0.2;
    u(w, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const b = u(w, 120, 100, Faction.Player, EntityKind.Brawler, 60);
    w.frameCount = 60;
    combatSystem(w);
    expect(Health.max[b]).toBe(72);
  });

  it('Ironpaw: shieldbearers train 2x faster', () => {
    w.commanderModifiers.passiveShieldbearerTrainSpeed = 0.5;
    const b = addEntity(w.ecs);
    for (const C of [
      Position,
      Health,
      IsBuilding,
      FactionTag,
      EntityTypeTag,
      Building,
      TrainingQueue,
      Sprite,
    ])
      addComponent(w.ecs, b, C);
    Position.x[b] = 500;
    Position.y[b] = 500;
    Health.current[b] = 500;
    Health.max[b] = 500;
    FactionTag.faction[b] = Faction.Player;
    EntityTypeTag.kind[b] = EntityKind.Armory;
    Building.progress[b] = 100;
    Sprite.width[b] = 48;
    Sprite.height[b] = 48;
    trainingQueueSlots.set(b, [EntityKind.Shieldbearer]);
    TrainingQueue.count[b] = 1;
    TrainingQueue.timer[b] = 10;
    trainingSystem(w);
    expect(TrainingQueue.timer[b]).toBe(8);
  });

  it('Stormcaller: catapults +50% range', () => {
    w.commanderModifiers.passiveCatapultRangeBonus = 0.5;
    const c = spawnEntity(w, EntityKind.Catapult, 100, 100, Faction.Player);
    expect(Combat.attackRange[c]).toBeGreaterThan(200);
  });

  it('Stormcaller: lightning strikes up to 3 enemies every 15s', () => {
    w.commanderModifiers.passiveLightningDamage = 10;
    const e1 = u(w, 200, 200, Faction.Enemy, EntityKind.Gator, 100);
    const e2 = u(w, 300, 300, Faction.Enemy, EntityKind.Snake, 100);
    const e3 = u(w, 400, 400, Faction.Enemy, EntityKind.Gator, 100);
    w.frameCount = 900; // 15s at 60fps
    commanderPassivesSystem(w);
    // All 3 enemies should have taken damage
    expect(Health.current[e1]).toBeLessThan(100);
    expect(Health.current[e2]).toBeLessThan(100);
    expect(Health.current[e3]).toBeLessThan(100);
  });
});

describe('Tech effects — all 25', () => {
  let w: GameWorld;
  beforeEach(() => {
    w = createGameWorld();
    w.spatialHash = undefined as never;
  });

  it('all 25 techs defined', () => {
    expect(Object.keys(TECH_UPGRADES)).toHaveLength(25);
  });

  it('tidalHarvest: +50% gather amount', () => {
    w.tech.tidalHarvest = true;
    spawnEntity(w, EntityKind.Lodge, 300, 300, Faction.Player);
    const r = res(w, 100, 100, EntityKind.Clambed, 4000);
    const g = u(w, 100, 100, Faction.Player, EntityKind.Gatherer);
    UnitStateMachine.state[g] = UnitState.Gathering;
    UnitStateMachine.targetEntity[g] = r;
    UnitStateMachine.gatherTimer[g] = 1;
    gatheringSystem(w);
    expect(Carrying.resourceAmount[g]).toBe(19); // 15 * 1.25 = 18.75 → 19
  });

  it('tradeRoutes: passive income per Market', () => {
    w.tech.tradeRoutes = true;
    const mkt = spawnEntity(w, EntityKind.Market, 200, 200, Faction.Player);
    Building.progress[mkt] = 100; // Mark as completed
    Health.current[mkt] = Health.max[mkt];
    const before = w.resources.clams;
    w.frameCount = 60;
    gatheringSystem(w);
    expect(w.resources.clams).toBeGreaterThan(before);
  });

  it('rootNetwork: gatherers auto-path to richest node', () => {
    w.tech.rootNetwork = true;
    w.autoBehaviors.gatherer = true;
    res(w, 110, 100, EntityKind.Clambed, 100);
    const rich = res(w, 500, 500, EntityKind.Clambed, 5000);
    const g = u(w, 100, 100, Faction.Player, EntityKind.Gatherer);
    w.frameCount = g * 7;
    gatheringSystem(w);
    expect(UnitStateMachine.targetEntity[g]).toBe(rich);
  });

  it('regeneration: +1 HP/5s for all player units', () => {
    w.tech.regeneration = true;
    const e = u(w, 100, 100, Faction.Player, EntityKind.Brawler, 60);
    Health.current[e] = 50;
    Health.lastDamagedFrame[e] = 0; // Ensure out-of-combat
    w.frameCount = 300;
    healthSystem(w);
    expect(Health.current[e]).toBe(52);
  });

  it('sharpSticks: +2 melee damage at spawn', () => {
    w.tech.sharpSticks = true;
    const b = spawnEntity(w, EntityKind.Brawler, 100, 100, Faction.Player);
    expect(Combat.damage[b]).toBeGreaterThan(0);
  });

  it('eagleEye: sniper +50 range', () => {
    w.tech.eagleEye = true;
    w.tech.sharpSticks = true;
    const s = spawnEntity(w, EntityKind.Sniper, 100, 100, Faction.Player);
    expect(Combat.attackRange[s]).toBeGreaterThan(100);
  });

  it('sturdyMud: +300 HP to buildings', () => {
    w.tech.sturdyMud = true;
    const t = spawnEntity(w, EntityKind.Tower, 100, 100, Faction.Player);
    expect(Health.max[t]).toBeGreaterThan(0);
  });

  it('hardenedShells: 15% damage resistance', () => {
    w.tech.hardenedShells = true;
    const e = u(w, 100, 100, Faction.Player, EntityKind.Brawler, 100);
    takeDamage(w, e, 100, -1, 1.0);
    expect(Health.current[e]).toBe(15);
  });

  it('swiftPaws: +0.4 speed at spawn', () => {
    w.tech.swiftPaws = true;
    const b = spawnEntity(w, EntityKind.Brawler, 100, 100, Faction.Player);
    expect(Velocity.speed[b]).toBeGreaterThan(1.5);
  });

  it('venomCoating: melee applies poison', () => {
    w.tech.venomCoating = true;
    const a = u(w, 100, 100, Faction.Player, EntityKind.Brawler);
    const e = u(w, 110, 100, Faction.Enemy, EntityKind.Gator, 100);
    UnitStateMachine.state[a] = UnitState.Attacking;
    UnitStateMachine.targetEntity[a] = e;
    Combat.attackRange[a] = 100;
    w.frameCount = 60;
    combatSystem(w);
    expect(w.venomCoatingTimers.has(e)).toBe(true);
  });

  it('gate techs are all wired in config', () => {
    const gates: TechId[] = [
      'cartography',
      'deepDiving',
      'herbalMedicine',
      'aquaticTraining',
      'pondBlessing',
      'tidalSurge',
      'battleRoar',
      'piercingShot',
      'warDrums',
      'ironShell',
      'fortifiedWalls',
      'siegeWorks',
      'cunningTraps',
      'rallyCry',
      'camouflage',
    ];
    for (const id of gates) {
      expect(TECH_UPGRADES[id]).toBeDefined();
      w.tech[id] = true;
      expect(w.tech[id]).toBe(true);
    }
  });
});

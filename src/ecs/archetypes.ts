import { addComponent, addEntity } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  isMudpawKind,
  LEGACY_SABOTEUR_CHASSIS_KIND,
  LEGACY_SAPPER_CHASSIS_KIND,
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind, Faction, type ResourceType, SpriteId } from '@/types';
import {
  AutoSymbol,
  Building,
  Carrying,
  Collider,
  Combat,
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Selectable,
  Sprite,
  Stance,
  StanceMode,
  TaskOverride,
  TowerAI,
  TrainingQueue,
  UnitStateMachine,
  Velocity,
  Veterancy,
} from './components';
import type { GameWorld } from './world';

const KIND_TO_SPRITE: Record<EntityKind, SpriteId> = {
  [MUDPAW_KIND]: SpriteId.Gatherer,
  [LEGACY_SAPPER_CHASSIS_KIND]: SpriteId.Brawler,
  [LEGACY_SABOTEUR_CHASSIS_KIND]: SpriteId.Sniper,
  [EntityKind.Gator]: SpriteId.Gator,
  [EntityKind.Snake]: SpriteId.Snake,
  [EntityKind.Lodge]: SpriteId.Lodge,
  [EntityKind.Burrow]: SpriteId.Burrow,
  [EntityKind.Armory]: SpriteId.Armory,
  [EntityKind.Tower]: SpriteId.Tower,
  [EntityKind.PredatorNest]: SpriteId.PredatorNest,
  [EntityKind.Cattail]: SpriteId.Cattail,
  [EntityKind.Clambed]: SpriteId.Clambed,
  [MEDIC_KIND]: SpriteId.Healer,
  [EntityKind.Watchtower]: SpriteId.Watchtower,
  [EntityKind.BossCroc]: SpriteId.BossCroc,
  [EntityKind.Shieldbearer]: SpriteId.Shieldbearer,
  [LOOKOUT_KIND]: SpriteId.Scout,
  [EntityKind.Catapult]: SpriteId.Catapult,
  [EntityKind.Wall]: SpriteId.Wall,
  [EntityKind.ScoutPost]: SpriteId.ScoutPost,
  [EntityKind.ArmoredGator]: SpriteId.ArmoredGator,
  [EntityKind.VenomSnake]: SpriteId.VenomSnake,
  [EntityKind.SwampDrake]: SpriteId.SwampDrake,
  [EntityKind.SiegeTurtle]: SpriteId.SiegeTurtle,
  [EntityKind.AlphaPredator]: SpriteId.AlphaPredator,
  [EntityKind.PearlBed]: SpriteId.PearlBed,
  [EntityKind.FishingHut]: SpriteId.FishingHut,
  [EntityKind.HerbalistHut]: SpriteId.HerbalistHut,
  [EntityKind.Swimmer]: SpriteId.Swimmer,
  [EntityKind.Trapper]: SpriteId.Trapper,
  [EntityKind.Commander]: SpriteId.Commander,
  [EntityKind.Frog]: SpriteId.Frog,
  [EntityKind.Fish]: SpriteId.Fish,
  [EntityKind.Diver]: SpriteId.Diver,
  [EntityKind.Engineer]: SpriteId.Engineer,
  [EntityKind.Shaman]: SpriteId.Shaman,
  [EntityKind.BurrowingWorm]: SpriteId.BurrowingWorm,
  [EntityKind.FlyingHeron]: SpriteId.FlyingHeron,
  [EntityKind.Market]: SpriteId.Market,
  // v2.0.0
  [EntityKind.Dock]: SpriteId.Dock,
  [EntityKind.OtterWarship]: SpriteId.OtterWarship,
  [EntityKind.Berserker]: SpriteId.Berserker,
  [EntityKind.WallGate]: SpriteId.WallGate,
  [EntityKind.Shrine]: SpriteId.Shrine,
  // v3.0.0
  [EntityKind.Sapper]: SpriteId.Sapper,
  [EntityKind.Saboteur]: SpriteId.Saboteur,
};

export function spawnEntity(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
  faction: Faction,
): number {
  const eid = addEntity(world.ecs);
  const def = ENTITY_DEFS[kind];

  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;

  // Core components
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world.ecs, eid, Sprite);
  Sprite.textureId[eid] = KIND_TO_SPRITE[kind];
  Sprite.width[eid] = spriteW;
  Sprite.height[eid] = spriteH;
  Sprite.facingLeft[eid] = 0;
  Sprite.yOffset[eid] = 0;

  addComponent(world.ecs, eid, FactionTag);
  FactionTag.faction[eid] = faction;

  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = kind;

  addComponent(world.ecs, eid, Collider);
  Collider.radius[eid] = spriteW / 2.5;

  addComponent(world.ecs, eid, Selectable);
  Selectable.selected[eid] = 0;

  // Health
  let hp = def.hp;
  let maxHp = def.hp;

  // Apply enemy stat multiplier (difficulty scaling for enemy units)
  if (faction === Faction.Enemy && !def.isBuilding && !def.isResource && world.enemyStatMult > 1) {
    hp = Math.round(hp * world.enemyStatMult);
    maxHp = Math.round(maxHp * world.enemyStatMult);
  }

  if (
    faction === Faction.Player &&
    !def.isBuilding &&
    !def.isResource &&
    world.playerUnitHpMultiplier > 1
  ) {
    hp = Math.round(hp * world.playerUnitHpMultiplier);
    maxHp = Math.round(maxHp * world.playerUnitHpMultiplier);
  }

  // Apply tech bonuses for player buildings
  if (faction === Faction.Player && def.isBuilding && world.tech.sturdyMud) {
    hp += 300;
    maxHp += 300;
  }

  addComponent(world.ecs, eid, Health);
  Health.max[eid] = maxHp;
  Health.flashTimer[eid] = 0;

  if (def.isBuilding) {
    addComponent(world.ecs, eid, IsBuilding);
    addComponent(world.ecs, eid, Building);

    if (faction === Faction.Player && kind !== EntityKind.Lodge) {
      Building.progress[eid] = 1;
      Health.current[eid] = 1;
    } else {
      Building.progress[eid] = 100;
      Health.current[eid] = maxHp;
    }
    Building.hasRally[eid] = 0;

    // Training queue for lodge, burrow, armory, dock, and predator nests (enemy training)
    if (
      kind === EntityKind.Lodge ||
      kind === EntityKind.Burrow ||
      kind === EntityKind.Armory ||
      kind === EntityKind.Dock ||
      kind === EntityKind.PredatorNest
    ) {
      addComponent(world.ecs, eid, TrainingQueue);
      TrainingQueue.count[eid] = 0;
      TrainingQueue.timer[eid] = 0;
    }

    // Tower AI
    if (kind === EntityKind.Tower || kind === EntityKind.Watchtower) {
      addComponent(world.ecs, eid, TowerAI);
      addComponent(world.ecs, eid, Combat);
      Combat.damage[eid] = def.damage;
      Combat.attackRange[eid] = def.attackRange;
      Combat.attackCooldown[eid] = 0;
      Combat.kills[eid] = 0;
    }
  } else if (def.isResource) {
    addComponent(world.ecs, eid, IsResource);
    addComponent(world.ecs, eid, Resource);
    Resource.resourceType[eid] = def.resourceType as ResourceType;
    Resource.amount[eid] = def.resourceAmount ?? 0;
    Health.current[eid] = 1;
  } else {
    // Unit
    Health.current[eid] = hp;

    addComponent(world.ecs, eid, Velocity);
    let speed = def.speed;
    if (faction === Faction.Player && world.tech.swiftPaws) speed *= 1.15;
    Velocity.speed[eid] = speed;
    Velocity.speedDebuffTimer[eid] = 0;

    addComponent(world.ecs, eid, Combat);
    let damage = def.damage;
    if (faction === Faction.Player && world.tech.sharpSticks && damage > 0) damage += 2;
    if (faction === Faction.Player && damage > 0 && world.playerUnitDamageMultiplier > 1) {
      damage = Math.round(damage * world.playerUnitDamageMultiplier);
    }
    // Apply enemy stat multiplier to damage
    if (faction === Faction.Enemy && world.enemyStatMult > 1 && damage > 0)
      damage = Math.round(damage * world.enemyStatMult);
    Combat.damage[eid] = damage;

    let range = def.attackRange;
    if (kind === LEGACY_SABOTEUR_CHASSIS_KIND && faction === Faction.Player && world.tech.eagleEye)
      range += 50;
    Combat.attackRange[eid] = range;
    Combat.attackCooldown[eid] = 0;
    Combat.kills[eid] = 0;

    addComponent(world.ecs, eid, UnitStateMachine);
    UnitStateMachine.state[eid] = 0; // Idle
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.returnEntity[eid] = -1;
    UnitStateMachine.gatherTimer[eid] = 0;
    UnitStateMachine.hasAttackMoveTarget[eid] = 0;
    UnitStateMachine.targetX[eid] = 0;
    UnitStateMachine.targetY[eid] = 0;

    addComponent(world.ecs, eid, Carrying);
    Carrying.resourceType[eid] = 0; // None

    addComponent(world.ecs, eid, TaskOverride);
    TaskOverride.active[eid] = 0;
    TaskOverride.task[eid] = 0;
    TaskOverride.targetEntity[eid] = 0;
    TaskOverride.resourceKind[eid] = 0;

    addComponent(world.ecs, eid, Veterancy);
    Veterancy.rank[eid] = 0;
    Veterancy.appliedRank[eid] = 0;

    // Stance: gatherers/healers default Defensive, combat units Aggressive
    addComponent(world.ecs, eid, Stance);
    Stance.mode[eid] =
      isMudpawKind(kind) || kind === MEDIC_KIND ? StanceMode.Defensive : StanceMode.Aggressive;

    // Auto-symbol: tracks pending auto-behavior confirmation
    addComponent(world.ecs, eid, AutoSymbol);
    AutoSymbol.active[eid] = 0;
    AutoSymbol.symbolType[eid] = 0;
    AutoSymbol.timer[eid] = 0;
    AutoSymbol.confirmed[eid] = 0;

    // Commander-specific ECS component (populated by caller via initCommanderComponent)
    if (kind === EntityKind.Commander) {
      addComponent(world.ecs, eid, Commander);
      Commander.commanderType[eid] = 0;
      Commander.auraRadius[eid] = 150;
      Commander.auraDamageBonus[eid] = 0;
      Commander.abilityTimer[eid] = 0;
      Commander.abilityCooldown[eid] = 0;
      Commander.isPlayerCommander[eid] = 0;
    }
  }

  return eid;
}

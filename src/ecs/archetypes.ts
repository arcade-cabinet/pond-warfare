import { addComponent, addEntity } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { EntityKind, Faction, type ResourceType, SpriteId } from '@/types';
import type { GameWorld } from './world';
import {
  Building,
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Selectable,
  Sprite,
  TowerAI,
  TrainingQueue,
  UnitStateMachine,
  Velocity,
} from './components';

const KIND_TO_SPRITE: Record<EntityKind, SpriteId> = {
  [EntityKind.Gatherer]: SpriteId.Gatherer,
  [EntityKind.Brawler]: SpriteId.Brawler,
  [EntityKind.Sniper]: SpriteId.Sniper,
  [EntityKind.Gator]: SpriteId.Gator,
  [EntityKind.Snake]: SpriteId.Snake,
  [EntityKind.Lodge]: SpriteId.Lodge,
  [EntityKind.Burrow]: SpriteId.Burrow,
  [EntityKind.Armory]: SpriteId.Armory,
  [EntityKind.Tower]: SpriteId.Tower,
  [EntityKind.PredatorNest]: SpriteId.PredatorNest,
  [EntityKind.Cattail]: SpriteId.Cattail,
  [EntityKind.Clambed]: SpriteId.Clambed,
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
  addComponent(world.ecs, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world.ecs, Sprite, eid);
  Sprite.textureId[eid] = KIND_TO_SPRITE[kind];
  Sprite.width[eid] = spriteW;
  Sprite.height[eid] = spriteH;
  Sprite.facingLeft[eid] = 0;
  Sprite.yOffset[eid] = 0;

  addComponent(world.ecs, FactionTag, eid);
  FactionTag.faction[eid] = faction;

  addComponent(world.ecs, EntityTypeTag, eid);
  EntityTypeTag.kind[eid] = kind;

  addComponent(world.ecs, Collider, eid);
  Collider.radius[eid] = spriteW / 2.5;

  addComponent(world.ecs, Selectable, eid);
  Selectable.selected[eid] = 0;

  // Health
  let hp = def.hp;
  let maxHp = def.hp;

  // Apply tech bonuses for player buildings
  if (faction === Faction.Player && def.isBuilding && world.tech.sturdyMud) {
    hp += 300;
    maxHp += 300;
  }

  addComponent(world.ecs, Health, eid);
  Health.max[eid] = maxHp;
  Health.flashTimer[eid] = 0;

  if (def.isBuilding) {
    addComponent(world.ecs, IsBuilding, eid);
    addComponent(world.ecs, Building, eid);

    if (faction === Faction.Player && kind !== EntityKind.Lodge) {
      Building.progress[eid] = 1;
      Health.current[eid] = 1;
    } else {
      Building.progress[eid] = 100;
      Health.current[eid] = maxHp;
    }
    Building.hasRally[eid] = 0;

    // Training queue for lodge, burrow, armory
    if (
      kind === EntityKind.Lodge ||
      kind === EntityKind.Burrow ||
      kind === EntityKind.Armory
    ) {
      addComponent(world.ecs, TrainingQueue, eid);
      TrainingQueue.count[eid] = 0;
      TrainingQueue.timer[eid] = 0;
    }

    // Tower AI
    if (kind === EntityKind.Tower) {
      addComponent(world.ecs, TowerAI, eid);
      addComponent(world.ecs, Combat, eid);
      Combat.damage[eid] = def.damage;
      Combat.attackRange[eid] = def.attackRange;
      Combat.attackCooldown[eid] = 0;
      Combat.kills[eid] = 0;
    }
  } else if (def.isResource) {
    addComponent(world.ecs, IsResource, eid);
    addComponent(world.ecs, Resource, eid);
    Resource.resourceType[eid] = def.resourceType as ResourceType;
    Resource.amount[eid] = def.resourceAmount!;
    Health.current[eid] = 1;
  } else {
    // Unit
    Health.current[eid] = hp;

    addComponent(world.ecs, Velocity, eid);
    let speed = def.speed;
    if (faction === Faction.Player && world.tech.swiftPaws) speed += 0.4;
    Velocity.speed[eid] = speed;

    addComponent(world.ecs, Combat, eid);
    let damage = def.damage;
    if (faction === Faction.Player && world.tech.sharpSticks && damage > 0)
      damage += 2;
    Combat.damage[eid] = damage;

    let range = def.attackRange;
    if (
      kind === EntityKind.Sniper &&
      faction === Faction.Player &&
      world.tech.eagleEye
    )
      range += 50;
    Combat.attackRange[eid] = range;
    Combat.attackCooldown[eid] = 0;
    Combat.kills[eid] = 0;

    addComponent(world.ecs, UnitStateMachine, eid);
    UnitStateMachine.state[eid] = 0; // Idle
    UnitStateMachine.targetEntity[eid] = 0;
    UnitStateMachine.returnEntity[eid] = 0;
    UnitStateMachine.gatherTimer[eid] = 0;
    UnitStateMachine.hasAttackMoveTarget[eid] = 0;

    addComponent(world.ecs, Carrying, eid);
    Carrying.resourceType[eid] = 0; // None
  }

  return eid;
}

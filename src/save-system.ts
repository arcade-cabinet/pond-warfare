/**
 * Save/Load System
 *
 * Serializes and deserializes game state for save/load functionality.
 * Uses bitECS query to extract entity data and JSON for persistence.
 */

import { query, removeEntity } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Resource,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, type Faction, UnitState } from '@/types';

interface SavedEntity {
  kind: number;
  faction: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  attackRange: number;
  kills: number;
  progress: number;
  resourceType: number;
  resourceAmount: number;
  carryingType: number;
  isBuilding: boolean;
  isResource: boolean;
}

interface SaveData {
  version: 2;
  resources: { clams: number; twigs: number; food: number; maxFood: number };
  enemyResources: { clams: number; twigs: number };
  autoBehaviors: { gather: boolean; defend: boolean; attack: boolean };
  tech: Record<string, boolean>;
  stats: {
    unitsKilled: number;
    unitsLost: number;
    resourcesGathered: number;
    buildingsBuilt: number;
    peakArmy: number;
  };
  frameCount: number;
  timeOfDay: number;
  gameSpeed: number;
  peaceTimer: number;
  entities: SavedEntity[];
}

/** Serialize the current game state to a JSON string. */
export function saveGame(world: GameWorld): string {
  const allEntities = Array.from(query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]));

  const entities: SavedEntity[] = allEntities.map((eid) => ({
    kind: EntityTypeTag.kind[eid],
    faction: FactionTag.faction[eid],
    x: Position.x[eid],
    y: Position.y[eid],
    hp: Health.current[eid],
    maxHp: Health.max[eid],
    state: UnitStateMachine.state?.[eid] ?? 0,
    targetX: UnitStateMachine.targetX?.[eid] ?? 0,
    targetY: UnitStateMachine.targetY?.[eid] ?? 0,
    speed: Velocity.speed?.[eid] ?? 0,
    damage: Combat.damage?.[eid] ?? 0,
    attackRange: Combat.attackRange?.[eid] ?? 0,
    kills: Combat.kills?.[eid] ?? 0,
    progress: Building.progress?.[eid] ?? 100,
    resourceType: Resource.resourceType?.[eid] ?? 0,
    resourceAmount: Resource.amount?.[eid] ?? 0,
    carryingType: Carrying.resourceType?.[eid] ?? 0,
    isBuilding: Sprite.width[eid] > 50,
    isResource: Resource.amount?.[eid] > 0,
  }));

  const data: SaveData = {
    version: 2,
    resources: { ...world.resources },
    enemyResources: { ...world.enemyResources },
    autoBehaviors: { ...world.autoBehaviors },
    tech: { ...world.tech },
    stats: { ...world.stats },
    frameCount: world.frameCount,
    timeOfDay: world.timeOfDay,
    gameSpeed: world.gameSpeed,
    peaceTimer: world.peaceTimer,
    entities,
  };

  return JSON.stringify(data);
}

/** Check if a save string is valid. */
export function isValidSave(json: string): boolean {
  try {
    const data = JSON.parse(json);
    return (data?.version === 1 || data?.version === 2) && Array.isArray(data?.entities);
  } catch {
    return false;
  }
}

/** Load a saved game into an existing world, clearing all current entities first. */
export function loadGame(world: GameWorld, json: string): boolean {
  if (!isValidSave(json)) return false;

  const data: SaveData = JSON.parse(json);

  // Clear all existing entities
  const existing = Array.from(query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]));
  for (const eid of existing) {
    removeEntity(world.ecs, eid);
  }

  // Clear non-ECS state
  world.particles.length = 0;
  world.floatingTexts.length = 0;
  world.corpses.length = 0;
  world.minimapPings.length = 0;
  world.groundPings.length = 0;
  world.selection.length = 0;
  world.yukaManager.clear();

  // Restore game state
  world.resources.clams = data.resources.clams;
  world.resources.twigs = data.resources.twigs;
  world.resources.food = data.resources.food;
  world.resources.maxFood = data.resources.maxFood;

  // Restore enemy resources (v2+)
  if (data.enemyResources) {
    world.enemyResources.clams = data.enemyResources.clams;
    world.enemyResources.twigs = data.enemyResources.twigs;
  }

  // Restore auto-behaviors (v2+)
  if (data.autoBehaviors) {
    world.autoBehaviors.gather = data.autoBehaviors.gather;
    world.autoBehaviors.defend = data.autoBehaviors.defend;
    world.autoBehaviors.attack = data.autoBehaviors.attack;
  }

  // Restore peace timer (v2+)
  if (data.peaceTimer !== undefined) {
    world.peaceTimer = data.peaceTimer;
  }

  // Restore tech
  for (const key of Object.keys(data.tech)) {
    (world.tech as Record<string, boolean>)[key] = data.tech[key];
  }

  // Restore stats
  world.stats.unitsKilled = data.stats.unitsKilled;
  world.stats.unitsLost = data.stats.unitsLost;
  world.stats.resourcesGathered = data.stats.resourcesGathered;
  world.stats.buildingsBuilt = data.stats.buildingsBuilt;
  world.stats.peakArmy = data.stats.peakArmy;

  // Restore timing
  world.frameCount = data.frameCount;
  world.timeOfDay = data.timeOfDay;
  world.gameSpeed = data.gameSpeed;
  world.state = 'playing';
  world.paused = false;

  // Reconstruct entities
  for (const saved of data.entities) {
    const kind = saved.kind as EntityKind;
    const faction = saved.faction as Faction;

    const eid = spawnEntity(world, kind, saved.x, saved.y, faction);
    if (eid < 0) continue;

    // Override HP from save (spawnEntity sets defaults)
    Health.current[eid] = saved.hp;
    Health.max[eid] = saved.maxHp;

    // Override speed and combat stats (may differ from defaults due to tech)
    if (saved.speed > 0) {
      Velocity.speed[eid] = saved.speed;
    }
    if (saved.damage > 0 || saved.attackRange > 0) {
      Combat.damage[eid] = saved.damage;
      Combat.attackRange[eid] = saved.attackRange;
      Combat.kills[eid] = saved.kills;
    }

    // Building progress
    if (saved.isBuilding) {
      Building.progress[eid] = saved.progress;
    }

    // Resource state
    if (saved.isResource) {
      Resource.amount[eid] = saved.resourceAmount;
    }

    // Unit state
    if (!saved.isBuilding && !saved.isResource) {
      UnitStateMachine.state[eid] = saved.state;
      UnitStateMachine.targetX[eid] = saved.targetX;
      UnitStateMachine.targetY[eid] = saved.targetY;
      Carrying.resourceType[eid] = saved.carryingType;

      // Register units in movement states with Yuka (all factions)
      const moveStates: number[] = [
        UnitState.Move,
        UnitState.GatherMove,
        UnitState.ReturnMove,
        UnitState.AttackMove,
        UnitState.BuildMove,
        UnitState.AttackMovePatrol,
        UnitState.RepairMove,
      ];
      if (moveStates.includes(saved.state)) {
        const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
        world.yukaManager.addUnit(eid, saved.x, saved.y, speed, saved.targetX, saved.targetY);
      }
    }
  }

  return true;
}

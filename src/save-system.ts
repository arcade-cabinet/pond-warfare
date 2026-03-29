/**
 * Save/Load System
 *
 * Serializes and deserializes game state for save/load functionality.
 * Uses bitECS query to extract entity data and JSON for persistence.
 */

import { query } from 'bitecs';
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
  version: 1;
  resources: { clams: number; twigs: number; food: number; maxFood: number };
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
    version: 1,
    resources: { ...world.resources },
    tech: { ...world.tech },
    stats: { ...world.stats },
    frameCount: world.frameCount,
    timeOfDay: world.timeOfDay,
    gameSpeed: world.gameSpeed,
    entities,
  };

  return JSON.stringify(data);
}

/** Check if a save string is valid. */
export function isValidSave(json: string): boolean {
  try {
    const data = JSON.parse(json);
    return data?.version === 1 && Array.isArray(data?.entities);
  } catch {
    return false;
  }
}

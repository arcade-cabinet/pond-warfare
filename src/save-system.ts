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
import type { SaveData, SavedEntity } from '@/save-types';
import { type EntityKind, type Faction, UnitState } from '@/types';

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
    version: 3,
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
    enemyEvolution: {
      tier: world.enemyEvolution.tier,
      unlockedUnits: world.enemyEvolution.unlockedUnits.map((k) => k as number),
      lastEvolutionFrame: world.enemyEvolution.lastEvolutionFrame,
    },
    poisonTimers: Array.from(world.poisonTimers.entries()),
  };

  return JSON.stringify(data);
}

/** Check if a save string is valid. */
export function isValidSave(json: string): boolean {
  try {
    const data = JSON.parse(json);
    return data?.version === 3 && Array.isArray(data?.entities);
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

  // Restore game state -- v3 fields only, no fallbacks
  world.resources.fish = data.resources.fish;
  world.resources.logs = data.resources.logs;
  world.resources.rocks = data.resources.rocks;
  world.resources.food = data.resources.food;
  world.resources.maxFood = data.resources.maxFood;

  // Restore enemy resources
  world.enemyResources.fish = data.enemyResources.fish;
  world.enemyResources.logs = data.enemyResources.logs;

  // Restore auto-behaviors (per-role format only)
  if (data.autoBehaviors) {
    world.autoBehaviors.gatherer = data.autoBehaviors.gatherer;
    world.autoBehaviors.combat = data.autoBehaviors.combat;
    world.autoBehaviors.healer = data.autoBehaviors.healer;
    world.autoBehaviors.scout = data.autoBehaviors.scout;
  }

  // Restore peace timer
  world.peaceTimer = data.peaceTimer;

  // Restore tech
  for (const key of Object.keys(data.tech)) {
    if (key in world.tech) {
      (world.tech as Record<string, boolean>)[key] = data.tech[key];
    }
  }

  // Restore stats
  world.stats.unitsKilled = data.stats.unitsKilled;
  world.stats.unitsLost = data.stats.unitsLost;
  world.stats.unitsTrained = data.stats.unitsTrained;
  world.stats.resourcesGathered = data.stats.resourcesGathered;
  world.stats.buildingsBuilt = data.stats.buildingsBuilt;
  world.stats.peakArmy = data.stats.peakArmy;
  world.stats.pearlsEarned = data.stats.pearlsEarned;
  world.stats.buildingsLost = data.stats.buildingsLost;
  world.stats.totalFishEarned = data.stats.totalFishEarned;

  // Restore enemy evolution state
  if (data.enemyEvolution) {
    world.enemyEvolution.tier = data.enemyEvolution.tier;
    world.enemyEvolution.unlockedUnits = data.enemyEvolution.unlockedUnits.map(
      (k) => k as EntityKind,
    );
    world.enemyEvolution.lastEvolutionFrame = data.enemyEvolution.lastEvolutionFrame;
  }

  // Restore poison timers
  world.poisonTimers.clear();
  if (data.poisonTimers) {
    for (const [eid, ticks] of data.poisonTimers) {
      world.poisonTimers.set(eid, ticks);
    }
  }

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

/**
 * Population Counter
 *
 * Computes food, max-food-capacity, idle worker counts, and army size
 * from the live ECS state every frame. Also handles the queued-food
 * reservation made when the player clicks "Train".
 *
 * Commander special-case: counts toward food population but is excluded
 * from army counts and idle menus so it stays near the Lodge.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  PrestigeAutoDeploy,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

export interface PopulationResult {
  idleWorkers: number;
  armyUnits: number;
  maxFoodCap: number;
}

/** Recount population, army size, and idle workers from ECS; update food signals. */
export function computePopulation(world: GameWorld): PopulationResult {
  const w = world;
  const allEnts = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  let curFood = 0;
  let maxFoodCap = 0;
  let idleWorkers = 0;
  let armyUnits = 0;
  let idleGatherers = 0;
  let idleCombat = 0;
  let idleHealers = 0;
  let idleScouts = 0;

  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    if (hasComponent(w.ecs, eid, IsBuilding)) {
      if (Building.progress[eid] >= 100) {
        const def = ENTITY_DEFS[kind];
        if (def.foodProvided) maxFoodCap += def.foodProvided;
      }
    } else if (!hasComponent(w.ecs, eid, IsResource)) {
      if (!hasComponent(w.ecs, eid, PrestigeAutoDeploy)) {
        curFood += ENTITY_DEFS[kind]?.foodCost ?? 1;
      }
      const isIdle = UnitStateMachine.state[eid] === UnitState.Idle;
      if (kind === EntityKind.Gatherer) {
        if (isIdle) {
          idleWorkers++;
          idleGatherers++;
        }
      } else if (kind === EntityKind.Healer) {
        armyUnits++;
        if (isIdle) idleHealers++;
      } else if (kind === EntityKind.Commander) {
        // Commander counts toward population but is never auto-assigned;
        // exclude from army counts and idle menus so it stays near the Lodge.
      } else {
        armyUnits++;
        if (isIdle) {
          idleCombat++;
          if (hasComponent(w.ecs, eid, Velocity) && Velocity.speed[eid] >= 2.0) idleScouts++;
        }
      }
    }
  }

  // Food reserved by units currently in training queues
  let queuedFood = 0;
  const trainingBldgs = query(w.ecs, [TrainingQueue, FactionTag, IsBuilding]);
  for (let i = 0; i < trainingBldgs.length; i++) {
    const bEid = trainingBldgs[i];
    if (FactionTag.faction[bEid] !== Faction.Player) continue;
    const slots = trainingQueueSlots.get(bEid);
    if (!slots) continue;
    for (let qi = 0; qi < slots.length; qi++) {
      queuedFood += ENTITY_DEFS[slots[qi] as EntityKind]?.foodCost ?? 1;
    }
  }

  w.resources.food = curFood + queuedFood;
  w.resources.maxFood = maxFoodCap;
  store.food.value = curFood + queuedFood;
  store.maxFood.value = maxFoodCap;
  store.idleWorkerCount.value = idleWorkers + idleCombat + idleHealers;
  store.armyCount.value = armyUnits;
  store.idleGathererCount.value = idleGatherers;
  store.idleCombatCount.value = idleCombat;
  store.idleHealerCount.value = idleHealers;
  store.idleScoutCount.value = idleScouts;

  if (armyUnits > w.stats.peakArmy) {
    w.stats.peakArmy = armyUnits;
  }

  return { idleWorkers, armyUnits, maxFoodCap };
}

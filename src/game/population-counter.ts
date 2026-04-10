/**
 * Population Counter
 *
 * Computes food, max-food-capacity, idle generalist counts, and army size
 * from the live ECS state every frame. Also handles the queued-food
 * reservation made when the player clicks "Train".
 *
 * Commander special-case: counts toward food population but is excluded
 * from army counts and idle menus so it stays near the Lodge.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  AutonomousSpecialist,
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  SnapshotHarnessSpecialist,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isMudpawKind, MEDIC_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

export interface PopulationResult {
  idleGeneralists: number;
  armyUnits: number;
  maxFoodCap: number;
}

/** Recount population, army size, and idle generalists from ECS; update food signals. */
export function computePopulation(world: GameWorld): PopulationResult {
  const w = world;
  const allEnts = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  let curFood = 0;
  let maxFoodCap = 0;
  let idleGeneralists = 0;
  let armyUnits = 0;
  let idleCombat = 0;
  let idleSupport = 0;
  let idleRecon = 0;

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
      if (!hasComponent(w.ecs, eid, SnapshotHarnessSpecialist)) {
        curFood += ENTITY_DEFS[kind]?.foodCost ?? 1;
      }
      const isAutonomousSpecialist = hasComponent(w.ecs, eid, AutonomousSpecialist);
      const isIdle = UnitStateMachine.state[eid] === UnitState.Idle;
      if (isMudpawKind(kind)) {
        if (isIdle && !isAutonomousSpecialist) {
          idleGeneralists++;
        }
      } else if (kind === MEDIC_KIND) {
        armyUnits++;
        if (isIdle && !isAutonomousSpecialist) idleSupport++;
      } else if (kind === EntityKind.Commander) {
        // Commander counts toward population but is never auto-assigned;
        // exclude from army counts and idle menus so it stays near the Lodge.
      } else {
        armyUnits++;
        if (isIdle && !isAutonomousSpecialist) {
          idleCombat++;
          if (hasComponent(w.ecs, eid, Velocity) && Velocity.speed[eid] >= 2.0) idleRecon++;
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
  store.armyCount.value = armyUnits;
  store.idleGeneralistCount.value = idleGeneralists;
  store.idleCombatCount.value = idleCombat;
  store.idleSupportCount.value = idleSupport;
  store.idleReconCount.value = idleRecon;

  if (armyUnits > w.stats.peakArmy) {
    w.stats.peakArmy = armyUnits;
  }

  return { idleGeneralists, armyUnits, maxFoodCap };
}

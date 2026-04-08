/**
 * GatherGoal — Assigns idle Mudpaws to resource collection.
 *
 * Reads unitRoster from the store to find idle Mudpaws, then dispatches
 * gathering tasks through the same API the Forces tab uses.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import { dispatchTaskOverride, findNearestGatherTaskTarget } from '@/game/task-dispatch';
import { getGovernorGatherUnits } from '@/governor/roster-units';
import { EntityKind } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';

/** Resource tasks in priority order: fish first, then logs, then rocks. */
const GATHER_TASKS = [
  { task: 'gathering-fish' as const, signal: () => store.fish.value },
  { task: 'gathering-logs' as const, signal: () => store.logs.value },
  { task: 'gathering-rocks' as const, signal: () => store.rocks.value },
];

const PREFERRED_GATHER_DISTANCE_SQ = 450 * 450;
type GatherTask = (typeof GATHER_TASKS)[number]['task'];

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((building) => building.kind === kind);
}

function hasCompletedBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((building) => building.kind === kind && building.hp >= building.maxHp);
}

function buildingCount(kind: EntityKind): number {
  return store.buildingRoster.value.filter((building) => building.kind === kind).length;
}

function currentStage(): number {
  return Math.max(1, Math.trunc(storeV3.progressionLevel.value || 1));
}

function prioritizeBuildResources(
  kind: EntityKind,
  fallback: GatherTask[],
): { tasks: GatherTask[]; rotateAssignments: boolean; hardFocusPrimary: boolean } {
  const def = ENTITY_DEFS[kind];
  const fishCost = def.fishCost ?? 0;
  const logCost = def.logCost ?? 0;

  if (store.logs.value < logCost) {
    return {
      tasks: ['gathering-logs', 'gathering-fish', 'gathering-rocks'],
      rotateAssignments: false,
      hardFocusPrimary: true,
    };
  }
  if (store.fish.value < fishCost) {
    return {
      tasks: ['gathering-fish', 'gathering-logs', 'gathering-rocks'],
      rotateAssignments: false,
      hardFocusPrimary: true,
    };
  }
  return { tasks: fallback, rotateAssignments: true, hardFocusPrimary: false };
}

function preferredGatherPlan(): { tasks: GatherTask[]; rotateAssignments: boolean; hardFocusPrimary: boolean } {
  const sorted = [...GATHER_TASKS].sort((a, b) => a.signal() - b.signal()).map((entry) => entry.task);

  if (currentStage() >= 6 && !hasBuilding(EntityKind.Armory)) {
    return prioritizeBuildResources(EntityKind.Armory, sorted);
  }

  if (store.food.value >= store.maxFood.value - 1 && buildingCount(EntityKind.Burrow) < 3) {
    return prioritizeBuildResources(EntityKind.Burrow, sorted);
  }

  const needsTower =
    (store.baseUnderAttack.value && buildingCount(EntityKind.Tower) < 2) ||
    (currentStage() >= 6 && hasCompletedBuilding(EntityKind.Armory) && buildingCount(EntityKind.Tower) < 1);
  if (needsTower) {
    return prioritizeBuildResources(EntityKind.Tower, sorted);
  }

  return { tasks: sorted, rotateAssignments: true, hardFocusPrimary: false };
}

/**
 * Find truly idle Mudpaws — those not yet assigned to any task.
 * Mudpaws with a TaskOverride are between gather trips (idle momentarily
 * after depositing), not truly unassigned. Excluding them prevents
 * GatherEval from blocking TrainEval when the economy is running.
 */
export function findIdleMudpaws(): RosterUnit[] {
  return getGovernorGatherUnits(store.unitRoster.value).filter(
    (unit) => unit.task === 'idle' && !unit.hasOverride,
  );
}

export class GatherGoal extends Goal {
  override activate(): void {
    const idle = findIdleMudpaws();
    if (idle.length === 0) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    // Assign each idle Mudpaw to the lowest-stockpiled resource, but prefer
    // nearby available nodes so early-stage layouts do not send Mudpaws on
    // dead-end marches toward distant or absent resource types. When the
    // next build is resource-gated, focus that bottleneck instead of rotating.
    const plan = preferredGatherPlan();
    for (let i = 0; i < idle.length; i++) {
      let fallbackTask: (typeof GATHER_TASKS)[number]['task'] | null = null;
      let fallbackDistSq = Infinity;

      const offset = plan.rotateAssignments ? i : 0;
      for (let attempt = 0; attempt < plan.tasks.length; attempt += 1) {
        const task = plan.tasks[(offset + attempt) % plan.tasks.length];
        const candidate = findNearestGatherTaskTarget(game.world, idle[i].eid, task);
        if (candidate == null || candidate.target === -1) continue;

        if (candidate.distanceSq <= PREFERRED_GATHER_DISTANCE_SQ) {
          dispatchTaskOverride(game.world, idle[i].eid, task);
          fallbackTask = null;
          break;
        }

        if (plan.hardFocusPrimary && attempt === 0) {
          dispatchTaskOverride(game.world, idle[i].eid, task);
          fallbackTask = null;
          break;
        }

        if (candidate.distanceSq < fallbackDistSq) {
          fallbackDistSq = candidate.distanceSq;
          fallbackTask = task;
        }
      }

      if (fallbackTask !== null) {
        dispatchTaskOverride(game.world, idle[i].eid, fallbackTask);
      }
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

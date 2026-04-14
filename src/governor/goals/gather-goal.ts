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
import { hasCurrentRunTrack } from '../current-run-upgrades';

/** Resource tasks in priority order: fish first, then logs, then rocks. */
const GATHER_TASKS = [
  { task: 'gathering-fish' as const, signal: () => store.fish.value },
  { task: 'gathering-logs' as const, signal: () => store.logs.value },
  { task: 'gathering-rocks' as const, signal: () => store.rocks.value },
];

type GatherTask = (typeof GATHER_TASKS)[number]['task'];
type GatherPlan = {
  tasks: GatherTask[];
  rotateAssignments: boolean;
  hardFocusPrimary: boolean;
};

function preferredGatherDistanceSq(): number {
  const radius = 450 * Math.max(1, game.world.playerGatherRadiusMultiplier);
  return radius * radius;
}

function isGatherTask(task: string): task is GatherTask {
  return GATHER_TASKS.some((entry) => entry.task === task);
}

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
): GatherPlan {
  const def = ENTITY_DEFS[kind];
  const fishCost = def.fishCost ?? 0;
  const logCost = def.logCost ?? 0;
  const fishShort = fishCost > 0 && store.fish.value < fishCost;
  const logShort = logCost > 0 && store.logs.value < logCost;

  if (fishShort && logShort) {
    const fishRatio = store.fish.value / fishCost;
    const logRatio = store.logs.value / logCost;
    const primary = logRatio <= fishRatio ? 'gathering-logs' : 'gathering-fish';
    const secondary = primary === 'gathering-logs' ? 'gathering-fish' : 'gathering-logs';
    if (Math.abs(fishRatio - logRatio) >= 0.2) {
      return {
        // Bias toward the larger bottleneck without fully starving the
        // secondary budget; otherwise stage-six build plans can deadlock once
        // a single extra combat train has pushed fish back below cost.
        tasks: [primary, secondary, primary],
        rotateAssignments: true,
        hardFocusPrimary: true,
      };
    }
    return {
      // Keep extras on the main bottleneck instead of rotating a third
      // gatherer onto rocks during a tower savings window.
      tasks: [primary, secondary, primary],
      rotateAssignments: true,
      hardFocusPrimary: true,
    };
  }

  if (logShort) {
    return {
      tasks: ['gathering-logs', 'gathering-fish', 'gathering-rocks'],
      rotateAssignments: false,
      hardFocusPrimary: true,
    };
  }
  if (fishShort) {
    return {
      tasks: ['gathering-fish', 'gathering-logs', 'gathering-rocks'],
      rotateAssignments: false,
      hardFocusPrimary: true,
    };
  }
  return { tasks: fallback, rotateAssignments: true, hardFocusPrimary: false };
}

function preferredGatherPlan(): GatherPlan {
  const sorted = [...GATHER_TASKS].sort((a, b) => a.signal() - b.signal()).map((entry) => entry.task);

  if (
    currentStage() >= 6 &&
    hasCurrentRunTrack('defense_wall_hp') &&
    !hasBuilding(EntityKind.Wall)
  ) {
    return prioritizeBuildResources(EntityKind.Wall, sorted);
  }

  if (
    currentStage() >= 6 &&
    hasCurrentRunTrack('defense_tower_damage') &&
    !hasBuilding(EntityKind.Tower)
  ) {
    return prioritizeBuildResources(EntityKind.Tower, sorted);
  }

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

function gatherAssignableMudpaws(plan: GatherPlan): RosterUnit[] {
  const gatherers = getGovernorGatherUnits(store.unitRoster.value).filter(
    (unit) => unit.task === 'idle' || isGatherTask(unit.task),
  );
  if (!plan.hardFocusPrimary) {
    return gatherers.filter((unit) => unit.task === 'idle' && !unit.hasOverride);
  }
  return gatherers;
}

export function needsGatherRebalance(): boolean {
  const plan = preferredGatherPlan();
  if (!plan.hardFocusPrimary) return false;

  const gatherers = gatherAssignableMudpaws(plan);
  if (gatherers.length === 0) return false;

  const allowedTasks = new Set(plan.tasks);
  if (
    gatherers.some(
      (unit) => unit.task !== 'idle' && isGatherTask(unit.task) && !allowedTasks.has(unit.task),
    )
  ) {
    return true;
  }

  if (!plan.rotateAssignments) {
    const primary = plan.tasks[0];
    return gatherers.some((unit) => unit.task !== primary);
  }

  const primary = plan.tasks[0];
  const secondary = plan.tasks[1];
  const primaryWeight = plan.tasks.filter((task) => task === primary).length;
  const targetPrimaryCount = Math.max(
    1,
    Math.round((gatherers.length * primaryWeight) / plan.tasks.length),
  );

  const currentPrimaryCount = gatherers.filter((unit) => unit.task === primary).length;
  const currentSecondaryCount = gatherers.filter((unit) => unit.task === secondary).length;
  return (
    currentPrimaryCount < targetPrimaryCount ||
    (gatherers.length >= 2 && currentSecondaryCount === 0)
  );
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
    const plan = preferredGatherPlan();
    const gatherers = gatherAssignableMudpaws(plan);
    if (gatherers.length === 0) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    // Assign each idle Mudpaw to the lowest-stockpiled resource, but prefer
    // nearby available nodes so early-stage layouts do not send Mudpaws on
    // dead-end marches toward distant or absent resource types. When the
    // next build is resource-gated, retask the active economy instead of
    // waiting for every Mudpaw to go fully idle first.
    for (let i = 0; i < gatherers.length; i++) {
      let fallbackTask: (typeof GATHER_TASKS)[number]['task'] | null = null;
      let fallbackDistSq = Infinity;

      const offset = plan.rotateAssignments ? i : 0;
      for (let attempt = 0; attempt < plan.tasks.length; attempt += 1) {
        const task = plan.tasks[(offset + attempt) % plan.tasks.length];
        const candidate = findNearestGatherTaskTarget(game.world, gatherers[i].eid, task);
        if (candidate == null || candidate.target === -1) continue;

        if (candidate.distanceSq <= preferredGatherDistanceSq()) {
          dispatchTaskOverride(game.world, gatherers[i].eid, task);
          fallbackTask = null;
          break;
        }

        if (plan.hardFocusPrimary && attempt === 0) {
          dispatchTaskOverride(game.world, gatherers[i].eid, task);
          fallbackTask = null;
          break;
        }

        if (candidate.distanceSq < fallbackDistSq) {
          fallbackDistSq = candidate.distanceSq;
          fallbackTask = task;
        }
      }

      if (fallbackTask !== null) {
        dispatchTaskOverride(game.world, gatherers[i].eid, fallbackTask);
      }
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

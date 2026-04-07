/**
 * GatherGoal — Assigns idle Mudpaws to resource collection.
 *
 * Reads unitRoster from the store to find idle Mudpaws, then dispatches
 * gathering tasks through the same API the Forces tab uses.
 */

import { Goal } from 'yuka';
import { game } from '@/game';
import { dispatchTaskOverride, findNearestGatherTaskTarget } from '@/game/task-dispatch';
import { getGovernorGatherUnits } from '@/governor/roster-units';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

/** Resource tasks in priority order: fish first, then logs, then rocks. */
const GATHER_TASKS = [
  { task: 'gathering-fish' as const, signal: () => store.fish.value },
  { task: 'gathering-logs' as const, signal: () => store.logs.value },
  { task: 'gathering-rocks' as const, signal: () => store.rocks.value },
];

const PREFERRED_GATHER_DISTANCE_SQ = 450 * 450;

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
    // dead-end marches toward distant or absent resource types.
    const sorted = [...GATHER_TASKS].sort((a, b) => a.signal() - b.signal());
    for (let i = 0; i < idle.length; i++) {
      let fallbackTask: (typeof GATHER_TASKS)[number]['task'] | null = null;
      let fallbackDistSq = Infinity;

      for (let attempt = 0; attempt < sorted.length; attempt += 1) {
        const task = sorted[(i + attempt) % sorted.length].task;
        const candidate = findNearestGatherTaskTarget(game.world, idle[i].eid, task);
        if (candidate == null || candidate.target === -1) continue;

        if (candidate.distanceSq <= PREFERRED_GATHER_DISTANCE_SQ) {
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

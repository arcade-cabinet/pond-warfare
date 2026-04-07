/**
 * GatherGoal — Assigns idle gatherers to resource collection.
 *
 * Reads unitRoster from the store to find idle gatherers, then dispatches
 * gathering tasks through the same API the Forces tab uses.
 */

import { Goal } from 'yuka';
import { game } from '@/game';
import { dispatchTaskOverride, findNearestGatherTaskTarget } from '@/game/task-dispatch';
import { EntityKind } from '@/types';
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
 * Find truly idle gatherers — those not yet assigned to any task.
 * Gatherers with a TaskOverride are between gather trips (idle momentarily
 * after depositing), not truly unassigned. Excluding them prevents
 * GatherEval from blocking TrainEval when the economy is running.
 */
export function findIdleGatherers(): RosterUnit[] {
  return store.unitRoster.value
    .flatMap((g) => g.units)
    .filter((u) => u.task === 'idle' && u.kind === EntityKind.Gatherer && !u.hasOverride);
}

export class GatherGoal extends Goal {
  override activate(): void {
    const idle = findIdleGatherers();
    if (idle.length === 0) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    // Assign each idle gatherer to the lowest-stockpiled resource, but prefer
    // nearby available nodes so early-stage layouts do not send gatherers on
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

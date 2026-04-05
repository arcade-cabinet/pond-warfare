/**
 * GatherGoal — Assigns idle gatherers to resource collection.
 *
 * Reads unitRoster from the store to find idle gatherers, then dispatches
 * gathering tasks through the same API the Forces tab uses.
 */

import { Goal } from 'yuka';
import { game } from '@/game';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

/** Resource tasks in priority order: fish first, then logs, then rocks. */
const GATHER_TASKS = [
  { task: 'gathering-fish' as const, signal: () => store.fish.value },
  { task: 'gathering-logs' as const, signal: () => store.logs.value },
  { task: 'gathering-rocks' as const, signal: () => store.rocks.value },
];

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

    // Assign each idle gatherer to the lowest-stockpiled resource
    const sorted = [...GATHER_TASKS].sort((a, b) => a.signal() - b.signal());
    for (let i = 0; i < idle.length; i++) {
      const task = sorted[i % sorted.length].task;
      dispatchTaskOverride(game.world, idle[i].eid, task);
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

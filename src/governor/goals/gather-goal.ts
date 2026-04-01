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

/** Resource tasks in priority order: clams first, then twigs, then pearls. */
const GATHER_TASKS = [
  { task: 'gathering-clams' as const, signal: () => store.clams.value },
  { task: 'gathering-twigs' as const, signal: () => store.twigs.value },
  { task: 'gathering-pearls' as const, signal: () => store.pearls.value },
];

/** Find all idle gatherers from the unit roster signal. */
export function findIdleGatherers(): RosterUnit[] {
  return store.unitRoster.value
    .flatMap((g) => g.units)
    .filter((u) => u.task === 'idle' && u.kind === EntityKind.Gatherer);
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

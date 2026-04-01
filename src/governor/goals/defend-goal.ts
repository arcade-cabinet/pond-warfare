/**
 * DefendGoal — Rallies combat units to defend the base.
 *
 * Activates when the base is under attack. Finds idle or patrolling
 * combat units and assigns them to 'defending' task.
 */

import { Goal } from 'yuka';
import { game } from '@/game';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

/** Find combat units that can be redirected to defense. */
function availableDefenders(): RosterUnit[] {
  return store.unitRoster.value
    .filter((g) => g.role === 'combat')
    .flatMap((g) => g.units)
    .filter((u) => u.task === 'idle' || u.task === 'patrolling');
}

export class DefendGoal extends Goal {
  override activate(): void {
    const defenders = availableDefenders();
    if (defenders.length === 0) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    for (const u of defenders) {
      dispatchTaskOverride(game.world, u.eid, 'defending');
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

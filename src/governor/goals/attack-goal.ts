/**
 * AttackGoal — Sends the army to attack enemy positions.
 *
 * Activates when army size is large enough and no immediate threats.
 * Assigns idle combat units to 'attacking' task.
 */

import { Goal } from 'yuka';
import { game } from '@/game';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

/** Minimum army size before considering attack. */
export const MIN_ATTACK_ARMY = 3;

/** Find combat units available for an attack mission. */
function availableAttackers(): RosterUnit[] {
  return store.unitRoster.value
    .filter((g) => g.role === 'combat')
    .flatMap((g) => g.units)
    .filter((u) => u.task === 'idle' || u.task === 'defending' || u.task === 'patrolling');
}

export class AttackGoal extends Goal {
  override activate(): void {
    const attackers = availableAttackers();
    if (attackers.length < MIN_ATTACK_ARMY) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    for (const u of attackers) {
      dispatchTaskOverride(game.world, u.eid, 'attacking');
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

/**
 * AttackGoal — Sends the army to attack enemy positions.
 *
 * Activates when army size is large enough and no immediate threats.
 * Assigns idle combat units to 'attacking' task.
 */

import { Goal } from 'yuka';
import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { game } from '@/game';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { getGovernorCombatUnits } from '@/governor/roster-units';
import { EntityKind, Faction } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import { canAttackWith } from './combat-roster';

/** Minimum army size before considering attack. */
export const MIN_ATTACK_ARMY = 3;

/** Find combat units available for an attack mission. */
export function availableAttackers(): RosterUnit[] {
  return getGovernorCombatUnits(store.unitRoster.value).filter(canAttackWith);
}

export function countAvailableAttackers(): number {
  return availableAttackers().length;
}

function pickAttackTarget(attackers: RosterUnit[]): number {
  if (attackers.length === 0) return -1;

  const attackerCount = attackers.length;
  let centerX = 0;
  let centerY = 0;
  for (const attacker of attackers) {
    centerX += Position.x[attacker.eid];
    centerY += Position.y[attacker.eid];
  }
  centerX /= attackerCount;
  centerY /= attackerCount;

  const enemies = query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const eid of enemies) {
    if (FactionTag.faction[eid] !== Faction.Enemy || Health.current[eid] <= 0) continue;

    const dx = Position.x[eid] - centerX;
    const dy = Position.y[eid] - centerY;
    const distanceScore = dx * dx + dy * dy;
    const hpScore = Health.current[eid] * 12;
    const buildingPenalty =
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest ? 25_000 : 0;
    const score = distanceScore + hpScore + buildingPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = eid;
    }
  }

  return best;
}

export class AttackGoal extends Goal {
  override activate(): void {
    const attackers = availableAttackers();
    if (attackers.length < MIN_ATTACK_ARMY) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    const attackTarget = pickAttackTarget(attackers);
    if (attackTarget === -1) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    for (const u of attackers) {
      dispatchTaskOverride(game.world, u.eid, 'attacking', attackTarget);
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

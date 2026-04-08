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
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { getGovernorCombatUnits } from '@/governor/roster-units';
import { hasCurrentRunTrack } from '@/governor/current-run-upgrades';
import { EntityKind, Faction } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
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

export function countAvailableSiegeAttackers(): number {
  return availableAttackers().filter((unit) => unit.kind === SAPPER_KIND).length;
}

function demolishRaidReady(attackers: RosterUnit[]): boolean {
  return (
    hasCurrentRunTrack('siege_demolish_power') &&
    storeV3.progressionLevel.value >= 6 &&
    attackers.filter((unit) => unit.kind === SAPPER_KIND).length >= 2
  );
}

function requiredAttackers(attackers: RosterUnit[]): number {
  return demolishRaidReady(attackers) ? 2 : MIN_ATTACK_ARMY;
}

function pickAttackTarget(attackers: RosterUnit[], demolishRaid: boolean): number {
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

    const targetKind = EntityTypeTag.kind[eid] as EntityKind;
    const dx = Position.x[eid] - centerX;
    const dy = Position.y[eid] - centerY;
    const distanceScore = dx * dx + dy * dy;
    const hpScore = Health.current[eid] * 12;
    const buildingPenalty = demolishRaid
      ? targetKind === EntityKind.Tower
        ? -40_000
        : targetKind === EntityKind.Burrow
          ? -35_000
          : targetKind === EntityKind.PredatorNest
            ? -15_000
            : 0
      : targetKind === EntityKind.PredatorNest
        ? 25_000
        : 0;
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
    const attackThreshold = requiredAttackers(attackers);
    const demolishRaid = attackThreshold < MIN_ATTACK_ARMY;
    if (attackers.length < attackThreshold) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    const attackTarget = pickAttackTarget(attackers, demolishRaid);
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

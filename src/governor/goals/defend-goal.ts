/**
 * DefendGoal — Rallies combat units to defend the base.
 *
 * Activates when the base is under attack. Finds idle or patrolling
 * combat units and assigns them to 'defending' task.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import {
  findPlayerLodge,
  LODGE_REPAIR_LOG_COST,
  repairPlayerLodge,
} from '@/game/lodge-repair';
import { Health } from '@/ecs/components';
import { getGovernorCombatUnits } from '@/governor/roster-units';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import { canDefendWith } from './combat-roster';
import { hasCurrentRunTrack } from '../current-run-upgrades';
import { getGovernorReservedBuildKind } from '../train-policy';

/** Find combat units that can be redirected to defense. */
function availableDefenders(): RosterUnit[] {
  return getGovernorCombatUnits(store.unitRoster.value).filter(canDefendWith);
}

function shouldPreserveLogsForReservedDefenseBuild(): boolean {
  const reservedBuildKind = getGovernorReservedBuildKind();
  const towerTrackActive =
    hasCurrentRunTrack('defense_tower_damage') &&
    !store.buildingRoster.value.some((building) => building.kind === EntityKind.Tower);
  const preserveForTowerTrack =
    towerTrackActive && (reservedBuildKind === null || reservedBuildKind === EntityKind.Tower);
  if (
    reservedBuildKind !== EntityKind.Wall &&
    reservedBuildKind !== EntityKind.Tower &&
    !preserveForTowerTrack
  ) {
    return false;
  }

  const lodgeEid = findPlayerLodge(game.world);
  if (lodgeEid < 0 || Health.max[lodgeEid] <= 0) return false;

  const lodgeHpRatio = Health.current[lodgeEid] / Health.max[lodgeEid];
  if (preserveForTowerTrack) {
    if (lodgeHpRatio < 0.9) return false;
    const towerLogs = ENTITY_DEFS[EntityKind.Tower].logCost ?? 0;
    return game.world.resources.logs < towerLogs;
  }

  if (lodgeHpRatio < 0.8) return false;
  const buildLogs = ENTITY_DEFS[reservedBuildKind!].logCost ?? 0;
  const logs = game.world.resources.logs;
  return logs >= Math.max(0, buildLogs - LODGE_REPAIR_LOG_COST);
}

export class DefendGoal extends Goal {
  override activate(): void {
    const lodgeRepair = shouldPreserveLogsForReservedDefenseBuild()
      ? { success: false as const, reason: 'not_enough_logs' as const }
      : repairPlayerLodge(game.world);
    const defenders = availableDefenders();
    if (defenders.length === 0 && !lodgeRepair.success) {
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

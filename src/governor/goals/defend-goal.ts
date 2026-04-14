/**
 * DefendGoal — Rallies combat units to defend the base.
 *
 * Activates when the base is under attack. Finds idle or patrolling
 * combat units and assigns them to 'defending' task.
 */

import { query } from 'bitecs';
import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import { game } from '@/game';
import { findPlayerLodge, LODGE_REPAIR_LOG_COST, repairPlayerLodge } from '@/game/lodge-repair';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { getGovernorCombatUnits, getGovernorGatherUnits } from '@/governor/roster-units';
import { EntityKind, Faction, UnitState } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import { hasCurrentRunTrack } from '../current-run-upgrades';
import { getGovernorReservedBuildKind, shouldPreserveEarlyArmoryLogLane } from '../train-policy';
import { canDefendWith } from './combat-roster';

/** Find combat units that can be redirected to defense. */
function availableDefenders(): RosterUnit[] {
  return getGovernorCombatUnits(store.unitRoster.value).filter(canDefendWith);
}

const REPAIR_TASK_PRIORITY = [
  'gathering-logs',
  'idle',
  'gathering-fish',
  'gathering-rocks',
  'defending',
  'patrolling',
] as const;

function findDamagedDefenseBuilding(): number {
  if (!hasCurrentRunTrack('defense_repair_speed')) return -1;
  if (shouldPreserveLogsForReservedDefenseBuild()) return -1;
  if (game.world.resources.logs < 4) return -1;

  const buildings = query(game.world.ecs, [FactionTag, EntityTypeTag, Health, Position]);
  let best = -1;
  let bestPriority = -Infinity;

  for (const eid of buildings) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0 || Health.current[eid] >= Health.max[eid]) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind !== EntityKind.Tower && kind !== EntityKind.Wall) continue;

    const missingHp = Health.max[eid] - Health.current[eid];
    const priorityBase = kind === EntityKind.Tower ? 1000 : 0;
    const priority = priorityBase + missingHp;
    if (priority > bestPriority) {
      bestPriority = priority;
      best = eid;
    }
  }

  return best;
}

function assignRepairOrder(unit: RosterUnit, target: number): void {
  TaskOverride.active[unit.eid] = 0;
  TaskOverride.task[unit.eid] = 0;
  TaskOverride.targetEntity[unit.eid] = 0;
  UnitStateMachine.targetEntity[unit.eid] = target;
  UnitStateMachine.targetX[unit.eid] = Position.x[target];
  UnitStateMachine.targetY[unit.eid] = Position.y[target];
  UnitStateMachine.state[unit.eid] = UnitState.RepairMove;
}

function findRepairer(defenders: RosterUnit[]): RosterUnit | undefined {
  if (defenders.length <= 0) return undefined;
  const mudpaws = getGovernorGatherUnits(store.unitRoster.value).filter(
    (unit) => !unit.hasOverride,
  );
  for (const task of REPAIR_TASK_PRIORITY) {
    const candidate = mudpaws.find(
      (unit) => unit.task === task && defenders.some((defender) => defender.eid !== unit.eid),
    );
    if (candidate) return candidate;
  }
  return undefined;
}

function shouldPreserveLogsForReservedDefenseBuild(): boolean {
  const reservedBuildKind = getGovernorReservedBuildKind();
  const towerTrackActive =
    hasCurrentRunTrack('defense_tower_damage') &&
    !store.buildingRoster.value.some((building) => building.kind === EntityKind.Tower);
  const wallTrackActive =
    hasCurrentRunTrack('defense_wall_hp') &&
    !store.buildingRoster.value.some((building) => building.kind === EntityKind.Wall);
  const demolishTrackActive = hasCurrentRunTrack('siege_demolish_power');
  const armoryMissing = !store.buildingRoster.value.some(
    (building) => building.kind === EntityKind.Armory,
  );
  const preserveForTowerTrack =
    towerTrackActive && (reservedBuildKind === null || reservedBuildKind === EntityKind.Tower);
  const preserveForArmory = reservedBuildKind === EntityKind.Armory;
  const preserveForPreArmoryLogLane =
    shouldPreserveEarlyArmoryLogLane() &&
    armoryMissing &&
    !towerTrackActive &&
    !wallTrackActive &&
    !demolishTrackActive;
  if (
    !preserveForPreArmoryLogLane &&
    !preserveForArmory &&
    reservedBuildKind !== EntityKind.Wall &&
    reservedBuildKind !== EntityKind.Tower &&
    !preserveForTowerTrack
  ) {
    return false;
  }

  const lodgeEid = findPlayerLodge(game.world);
  if (lodgeEid < 0 || Health.max[lodgeEid] <= 0) return false;

  const lodgeHpRatio = Health.current[lodgeEid] / Health.max[lodgeEid];
  if (preserveForPreArmoryLogLane) {
    if (lodgeHpRatio < 0.95) return false;
    const armoryLogs = ENTITY_DEFS[EntityKind.Armory].logCost ?? 0;
    return game.world.resources.logs >= Math.max(0, armoryLogs - 30);
  }
  if (preserveForArmory) {
    // The Armory path is a pre-siege economy pivot. Preserve its log budget while
    // the Lodge is still healthy, otherwise repeated repairs can consume every
    // staged log pickup before the wing ever becomes placeable.
    return lodgeHpRatio >= 0.95;
  }
  if (preserveForTowerTrack) {
    if (lodgeHpRatio < 0.9) return false;
    const towerLogs = ENTITY_DEFS[EntityKind.Tower].logCost ?? 0;
    return game.world.resources.logs < towerLogs;
  }

  if (reservedBuildKind === null) return false;
  if (lodgeHpRatio < 0.8) return false;
  const buildLogs = ENTITY_DEFS[reservedBuildKind].logCost ?? 0;
  const logs = game.world.resources.logs;
  return logs >= Math.max(0, buildLogs - LODGE_REPAIR_LOG_COST);
}

export class DefendGoal extends Goal {
  override activate(): void {
    const defenders = availableDefenders();
    const lodgeRepair = shouldPreserveLogsForReservedDefenseBuild()
      ? { success: false as const, reason: 'not_enough_logs' as const }
      : repairPlayerLodge(game.world);
    const repairTarget = findDamagedDefenseBuilding();
    const repairer = repairTarget !== -1 ? findRepairer(defenders) : undefined;
    if (repairer && repairTarget !== -1) {
      assignRepairOrder(repairer, repairTarget);
    }

    const rallyDefenders = repairer
      ? defenders.filter((unit) => unit.eid !== repairer.eid)
      : defenders;

    if (rallyDefenders.length === 0 && !lodgeRepair.success && !repairer) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    for (const u of rallyDefenders) {
      dispatchTaskOverride(game.world, u.eid, 'defending');
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}

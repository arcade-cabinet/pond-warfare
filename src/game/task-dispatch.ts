/**
 * Task Dispatch -- dispatches manual task overrides from the Forces tab.
 *
 * When a player assigns a task to a unit via the Forces tab dropdown, this
 * module sets the TaskOverride component so the auto-behavior system skips
 * the unit, and updates the UnitStateMachine to the appropriate state.
 */

import { query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Resource,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import type { UnitTask } from '@/ui/roster-types';

/** Map UnitTask strings to UnitState values. */
const TASK_TO_STATE: Record<UnitTask, UnitState> = {
  idle: UnitState.Idle,
  'gathering-fish': UnitState.GatherMove,
  'gathering-logs': UnitState.GatherMove,
  'gathering-rocks': UnitState.GatherMove,
  building: UnitState.Building,
  moving: UnitState.Move,
  attacking: UnitState.AttackMove,
  defending: UnitState.AttackMovePatrol,
  patrolling: UnitState.AttackMovePatrol,
  healing: UnitState.Move,
  scouting: UnitState.AttackMovePatrol,
  dead: UnitState.Idle, // dead units can't do anything
};

/** Map gathering task names to the EntityKind of the resource they target. */
const GATHER_TASK_TO_KIND: Partial<Record<UnitTask, EntityKind>> = {
  'gathering-fish': EntityKind.Clambed,
  'gathering-logs': EntityKind.Cattail,
  'gathering-rocks': EntityKind.PearlBed,
};

export interface GatherTaskTarget {
  target: number;
  distanceSq: number;
}

/** Dispatch a task override for a unit from the Forces tab. */
export function dispatchTaskOverride(world: GameWorld, eid: number, task: UnitTask): boolean {
  // For idle, clear override and stop the unit
  if (task === 'idle') {
    clearTaskOverride(eid);
    UnitStateMachine.state[eid] = UnitState.Idle;
    UnitStateMachine.targetEntity[eid] = 0;
    UnitStateMachine.hasAttackMoveTarget[eid] = 0;
    return true;
  }

  // For gathering tasks, find nearest resource BEFORE changing state.
  // If no resource exists, stay idle instead of walking to (0,0).
  const gatherKind = GATHER_TASK_TO_KIND[task];
  if (gatherKind !== undefined) {
    const candidate = findNearestResource(world, eid, gatherKind);
    if (candidate.target === -1) return false; // No resource available — stay in current state
    const target = candidate.target;
    TaskOverride.active[eid] = 1;
    TaskOverride.task[eid] = TASK_TO_STATE[task];
    TaskOverride.targetEntity[eid] = target;
    TaskOverride.resourceKind[eid] = gatherKind;
    UnitStateMachine.state[eid] = UnitState.GatherMove;
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    return true;
  }

  // For attacking, find nearest enemy BEFORE changing state
  if (task === 'attacking') {
    const enemy = findNearestEnemy(world, eid);
    if (enemy === -1) return false; // No enemy available — stay in current state
    TaskOverride.active[eid] = 1;
    TaskOverride.task[eid] = TASK_TO_STATE[task];
    TaskOverride.targetEntity[eid] = enemy;
    TaskOverride.resourceKind[eid] = 0;
    UnitStateMachine.state[eid] = UnitState.AttackMove;
    UnitStateMachine.targetEntity[eid] = enemy;
    UnitStateMachine.targetX[eid] = Position.x[enemy];
    UnitStateMachine.targetY[eid] = Position.y[enemy];
    return true;
  }

  // For defending, rally the unit back to the player's Lodge so AttackMovePatrol
  // can scan and intercept nearby threats instead of patrolling toward stale coords.
  if (task === 'defending') {
    const lodge = findPlayerLodge(world);
    if (lodge === -1) return false;
    TaskOverride.active[eid] = 1;
    TaskOverride.task[eid] = TASK_TO_STATE[task];
    TaskOverride.targetEntity[eid] = lodge;
    TaskOverride.resourceKind[eid] = 0;
    UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
    UnitStateMachine.targetEntity[eid] = lodge;
    UnitStateMachine.targetX[eid] = Position.x[lodge];
    UnitStateMachine.targetY[eid] = Position.y[lodge];
    return true;
  }

  // All other tasks: set state directly
  TaskOverride.active[eid] = 1;
  TaskOverride.task[eid] = TASK_TO_STATE[task];
  TaskOverride.resourceKind[eid] = 0;
  UnitStateMachine.state[eid] = TASK_TO_STATE[task];
  return true;
}

export function findNearestGatherTaskTarget(
  world: GameWorld,
  eid: number,
  task: UnitTask,
): GatherTaskTarget | null {
  const gatherKind = GATHER_TASK_TO_KIND[task];
  if (gatherKind === undefined) return null;
  return findNearestResource(world, eid, gatherKind);
}

/** Clear task override, returning unit to auto-behavior pool. */
export function clearTaskOverride(eid: number): void {
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = 0;
  TaskOverride.targetEntity[eid] = 0;
  TaskOverride.resourceKind[eid] = 0;
}

/** Find nearest resource of a specific EntityKind with remaining amount. */
function findNearestResource(world: GameWorld, eid: number, kind: EntityKind): GatherTaskTarget {
  const resources = query(world.ecs, [Position, Health, IsResource, Resource, EntityTypeTag]);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < resources.length; i++) {
    const rid = resources[i];
    if ((EntityTypeTag.kind[rid] as EntityKind) !== kind) continue;
    if (Resource.amount[rid] <= 0) continue;
    const dx = Position.x[rid] - Position.x[eid];
    const dy = Position.y[rid] - Position.y[eid];
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = rid;
    }
  }
  return { target: best, distanceSq: bestDist };
}

/** Find nearest enemy unit with health remaining. */
function findNearestEnemy(world: GameWorld, eid: number): number {
  const enemies = query(world.ecs, [Position, Health, FactionTag]);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const eid2 = enemies[i];
    if (FactionTag.faction[eid2] !== Faction.Enemy) continue;
    if (Health.current[eid2] <= 0) continue;
    const dx = Position.x[eid2] - Position.x[eid];
    const dy = Position.y[eid2] - Position.y[eid];
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = eid2;
    }
  }
  return best;
}

function findPlayerLodge(world: GameWorld): number {
  const entities = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < entities.length; i++) {
    const candidate = entities[i];
    if (FactionTag.faction[candidate] !== Faction.Player) continue;
    if (Health.current[candidate] <= 0) continue;
    if ((EntityTypeTag.kind[candidate] as EntityKind) !== EntityKind.Lodge) continue;
    return candidate;
  }
  return -1;
}

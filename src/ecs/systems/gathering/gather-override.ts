import { hasComponent, query } from 'bitecs';
import {
  Carrying,
  EntityTypeTag,
  Position,
  Resource,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import {
  findNearestAssignedResource,
  getSpecialistOperatingArea,
} from '@/game/specialist-assignment-queries';
import { type EntityKind, ResourceType, UnitState } from '@/types';

function getGatherTargetKind(world: GameWorld, eid: number): EntityKind | null {
  if (TaskOverride.resourceKind[eid] > 0) {
    return TaskOverride.resourceKind[eid] as EntityKind;
  }

  const overrideTarget = TaskOverride.targetEntity[eid];
  if (overrideTarget >= 0 && hasComponent(world.ecs, overrideTarget, EntityTypeTag)) {
    return EntityTypeTag.kind[overrideTarget] as EntityKind;
  }

  const currentTarget = UnitStateMachine.targetEntity[eid];
  if (currentTarget >= 0 && hasComponent(world.ecs, currentTarget, EntityTypeTag)) {
    return EntityTypeTag.kind[currentTarget] as EntityKind;
  }

  return null;
}

export function retargetGatherOverride(world: GameWorld, eid: number): boolean {
  if (TaskOverride.active[eid] !== 1 || TaskOverride.task[eid] !== UnitState.GatherMove) {
    return false;
  }

  const targetKind = getGatherTargetKind(world, eid);
  if (targetKind == null) return false;

  if (getSpecialistOperatingArea(world, eid)) {
    const assignedTarget = findNearestAssignedResource(world, eid, targetKind);
    if (assignedTarget === -1) return false;
    TaskOverride.targetEntity[eid] = assignedTarget;
    UnitStateMachine.targetEntity[eid] = assignedTarget;
    UnitStateMachine.targetX[eid] = Position.x[assignedTarget];
    UnitStateMachine.targetY[eid] = Position.y[assignedTarget];
    UnitStateMachine.state[eid] = UnitState.GatherMove;
    return true;
  }

  let closest = -1;
  let minDistSq = Infinity;
  for (const resource of query(world.ecs, [Position, Resource, EntityTypeTag])) {
    if ((EntityTypeTag.kind[resource] as EntityKind) !== targetKind) continue;
    if (Resource.amount[resource] <= 0) continue;

    const dx = Position.x[resource] - Position.x[eid];
    const dy = Position.y[resource] - Position.y[eid];
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = resource;
    }
  }

  if (closest === -1) return false;

  TaskOverride.targetEntity[eid] = closest;
  UnitStateMachine.targetEntity[eid] = closest;
  UnitStateMachine.targetX[eid] = Position.x[closest];
  UnitStateMachine.targetY[eid] = Position.y[closest];
  UnitStateMachine.state[eid] = UnitState.GatherMove;
  return true;
}

export function resumeGatherOverride(world: GameWorld, eid: number): boolean {
  if (TaskOverride.active[eid] !== 1 || TaskOverride.task[eid] !== UnitState.GatherMove) {
    return false;
  }

  const returnEnt = UnitStateMachine.returnEntity[eid];
  if (
    Carrying.resourceType[eid] !== ResourceType.None &&
    returnEnt >= 0 &&
    hasComponent(world.ecs, returnEnt, Position)
  ) {
    UnitStateMachine.targetEntity[eid] = returnEnt;
    UnitStateMachine.targetX[eid] = Position.x[returnEnt];
    UnitStateMachine.targetY[eid] = Position.y[returnEnt];
    UnitStateMachine.state[eid] = UnitState.ReturnMove;
    return true;
  }

  return retargetGatherOverride(world, eid);
}

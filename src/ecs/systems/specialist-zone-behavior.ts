import { query } from 'bitecs';
import {
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  Patrol,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import { startPatrol } from '@/ecs/systems/patrol';
import type { GameWorld } from '@/ecs/world';
import { getSpecialistAssignment } from '@/game/specialist-assignment';
import {
  buildSpecialistAreaPatrol,
  findNearestAssignedResource,
  getDistanceToSpecialistAreaCenter,
  getSpecialistOperatingArea,
  shouldRefreshSpecialistPatrol,
} from '@/game/specialist-assignment-queries';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

const UPDATE_INTERVAL = 20;

export function specialistZoneBehaviorSystem(world: GameWorld): void {
  if (world.frameCount % UPDATE_INTERVAL !== 0) return;

  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, UnitStateMachine]);
  for (const eid of units) {
    if (Health.current[eid] <= 0) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;

    const assignment = getSpecialistAssignment(world, eid);
    if (!assignment) continue;

    switch (assignment.canonicalId) {
      case 'fisher':
        handleGatherSpecialist(world, eid, EntityKind.Clambed);
        break;
      case 'logger':
        handleGatherSpecialist(world, eid, EntityKind.Cattail);
        break;
      case 'digger':
        handleGatherSpecialist(world, eid, EntityKind.PearlBed);
        break;
      case 'guard':
        handleAreaCombatSpecialist(world, eid);
        break;
      case 'ranger':
      case 'bombardier':
        handleDualZoneCombatSpecialist(world, eid);
        break;
      case 'lookout':
        syncAreaPatrol(world, eid);
        break;
      case 'shaman':
        handleAreaSupportSpecialist(world, eid);
        break;
      default:
        break;
    }
  }
}

function handleGatherSpecialist(world: GameWorld, eid: number, resourceKind: EntityKind): void {
  if (Carrying.resourceType[eid] !== ResourceType.None) return;

  const state = UnitStateMachine.state[eid] as UnitState;
  if (state === UnitState.Gathering || state === UnitState.ReturnMove) return;

  const target = findNearestAssignedResource(world, eid, resourceKind);
  if (target !== -1) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.GatherMove;
    return;
  }

  moveTowardSpecialistArea(world, eid, 18);
}

function handleAreaCombatSpecialist(world: GameWorld, eid: number): void {
  const state = UnitStateMachine.state[eid] as UnitState;
  if (state === UnitState.Attacking || state === UnitState.AttackMove) return;

  if (moveTowardSpecialistArea(world, eid, 24)) return;

  const area = getSpecialistOperatingArea(world, eid);
  if (!area) return;
  if (state === UnitState.Idle || state === UnitState.Move) {
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.targetX[eid] = area.centerX;
    UnitStateMachine.targetY[eid] = area.centerY;
    UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
  }
}

function handleDualZoneCombatSpecialist(world: GameWorld, eid: number): void {
  const assignment = getSpecialistAssignment(world, eid);
  if (!assignment) return;

  const state = UnitStateMachine.state[eid] as UnitState;
  if (state === UnitState.Attacking || state === UnitState.AttackMove) return;

  const distanceToAnchor = Math.hypot(
    Position.x[eid] - assignment.anchorX,
    Position.y[eid] - assignment.anchorY,
  );
  const anchorPadding = Math.max(24, assignment.anchorRadius * 0.2);
  if (distanceToAnchor > assignment.anchorRadius + anchorPadding) {
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.targetX[eid] = assignment.anchorX;
    UnitStateMachine.targetY[eid] = assignment.anchorY;
    UnitStateMachine.state[eid] = UnitState.Move;
    return;
  }

  if (state === UnitState.Idle || state === UnitState.Move) {
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.targetX[eid] = Position.x[eid];
    UnitStateMachine.targetY[eid] = Position.y[eid];
    UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
  }
}

function handleAreaSupportSpecialist(world: GameWorld, eid: number): void {
  const state = UnitStateMachine.state[eid] as UnitState;
  if (state === UnitState.Move && UnitStateMachine.targetEntity[eid] >= 0) return;
  moveTowardSpecialistArea(world, eid, 20);
}

function syncAreaPatrol(world: GameWorld, eid: number): void {
  const waypoints = buildSpecialistAreaPatrol(world, eid);
  if (waypoints.length === 0) return;
  if (!Patrol.active[eid] || shouldRefreshSpecialistPatrol(world, eid, waypoints)) {
    startPatrol(world, eid, waypoints);
  }
}

function moveTowardSpecialistArea(world: GameWorld, eid: number, threshold: number): boolean {
  const area = getSpecialistOperatingArea(world, eid);
  if (!area) return false;

  const distance = getDistanceToSpecialistAreaCenter(world, eid, Position.x[eid], Position.y[eid]);
  if (distance == null || distance <= Math.max(threshold, area.radius * 0.35)) return false;

  UnitStateMachine.targetEntity[eid] = -1;
  UnitStateMachine.targetX[eid] = area.centerX;
  UnitStateMachine.targetY[eid] = area.centerY;
  UnitStateMachine.state[eid] = UnitState.Move;
  return true;
}

import { hasComponent, query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, type Faction } from '@/types';
import { getSpecialistAssignment } from './specialist-assignment';

export interface SpecialistOperatingArea {
  centerX: number;
  centerY: number;
  radius: number;
}

export function getSpecialistOperatingArea(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): SpecialistOperatingArea | null {
  const assignment = getSpecialistAssignment(world, eid);
  if (!assignment) return null;

  return assignment.mode === 'dual_zone'
    ? {
        centerX: assignment.engagementX,
        centerY: assignment.engagementY,
        radius: assignment.engagementRadius,
      }
    : {
        centerX: assignment.centerX,
        centerY: assignment.centerY,
        radius: assignment.operatingRadius,
      };
}

export function isPointInSpecialistArea(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
  x: number,
  y: number,
  padding = 0,
): boolean {
  const area = getSpecialistOperatingArea(world, eid);
  if (!area) return true;
  const dx = x - area.centerX;
  const dy = y - area.centerY;
  return dx * dx + dy * dy <= (area.radius + padding) * (area.radius + padding);
}

export function getDistanceToSpecialistAreaCenter(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
  x: number,
  y: number,
): number | null {
  const area = getSpecialistOperatingArea(world, eid);
  if (!area) return null;
  return Math.hypot(x - area.centerX, y - area.centerY);
}

export function buildSpecialistAreaPatrol(
  world: Pick<GameWorld, 'specialistAssignments' | 'worldWidth' | 'worldHeight'>,
  eid: number,
): { x: number; y: number }[] {
  const area = getSpecialistOperatingArea(world, eid);
  if (!area) return [];

  const patrolRadius = Math.max(40, area.radius * 0.65);
  return [
    { x: clamp(area.centerX, patrolRadius, world.worldWidth - patrolRadius), y: clamp(area.centerY - patrolRadius, patrolRadius, world.worldHeight - patrolRadius) },
    { x: clamp(area.centerX + patrolRadius, patrolRadius, world.worldWidth - patrolRadius), y: clamp(area.centerY, patrolRadius, world.worldHeight - patrolRadius) },
    { x: clamp(area.centerX, patrolRadius, world.worldWidth - patrolRadius), y: clamp(area.centerY + patrolRadius, patrolRadius, world.worldHeight - patrolRadius) },
    { x: clamp(area.centerX - patrolRadius, patrolRadius, world.worldWidth - patrolRadius), y: clamp(area.centerY, patrolRadius, world.worldHeight - patrolRadius) },
  ];
}

export function shouldRefreshSpecialistPatrol(
  world: Pick<GameWorld, 'patrolWaypoints'>,
  eid: number,
  waypoints: { x: number; y: number }[],
): boolean {
  const existing = world.patrolWaypoints.get(eid);
  if (!existing || existing.length !== waypoints.length) return true;
  if (existing.length === 0) return false;
  return Math.hypot(existing[0].x - waypoints[0].x, existing[0].y - waypoints[0].y) > 18;
}

export function findNearestAssignedResource(
  world: GameWorld,
  eid: number,
  kind: EntityKind,
): number {
  const resources = query(world.ecs, [Position, Resource, EntityTypeTag, IsResource]);
  let best = -1;
  let bestDist = Infinity;

  for (const rid of resources) {
    if ((EntityTypeTag.kind[rid] as EntityKind) !== kind) continue;
    if (Resource.amount[rid] <= 0) continue;
    if (!isPointInSpecialistArea(world, eid, Position.x[rid], Position.y[rid])) continue;

    const dx = Position.x[rid] - Position.x[eid];
    const dy = Position.y[rid] - Position.y[eid];
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDist) {
      bestDist = distSq;
      best = rid;
    }
  }

  return best;
}

export function findNearestAssignedWoundedAlly(
  world: GameWorld,
  eid: number,
  faction: Faction,
  searchRadius: number,
): number {
  const ex = Position.x[eid];
  const ey = Position.y[eid];
  const candidates = world.spatialHash
    ? world.spatialHash.query(ex, ey, searchRadius)
    : query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let best = -1;
  let bestDistSq = searchRadius * searchRadius;

  for (const candidate of candidates) {
    if (candidate === eid) continue;
    if (!hasComponent(world.ecs, candidate, FactionTag) || FactionTag.faction[candidate] !== faction) {
      continue;
    }
    if (!hasComponent(world.ecs, candidate, Health) || Health.current[candidate] <= 0) continue;
    if (Health.current[candidate] >= Health.max[candidate]) continue;
    if (hasComponent(world.ecs, candidate, IsBuilding) || hasComponent(world.ecs, candidate, IsResource)) {
      continue;
    }
    if (!isPointInSpecialistArea(world, eid, Position.x[candidate], Position.y[candidate])) continue;

    const dx = Position.x[candidate] - ex;
    const dy = Position.y[candidate] - ey;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = candidate;
    }
  }

  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

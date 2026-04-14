import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getSpecialistZoneBonus } from './specialist-blueprints';

export type SpecialistZoneMode = 'single_zone' | 'dual_zone';

export interface SpecialistAssignment {
  runtimeId: string;
  canonicalId: string;
  label: string;
  mode: SpecialistZoneMode;
  operatingRadius: number;
  centerX: number;
  centerY: number;
  anchorX: number;
  anchorY: number;
  anchorRadius: number;
  engagementRadius: number;
  engagementX: number;
  engagementY: number;
  projectionRange: number;
}

export interface PendingSpecialistAssignment {
  eid: number;
  mode: SpecialistZoneMode;
}

interface SpecialistProfile {
  canonicalId: string;
  label: string;
  mode: SpecialistZoneMode;
  operatingRadius: number;
  anchorRadius: number;
  engagementRadius: number;
  projectionRange: number;
}

const SPECIALIST_PROFILES: Record<string, SpecialistProfile> = {
  fisher: makeSingleZoneProfile('fisher', 'Fisher', 160),
  logger: makeSingleZoneProfile('logger', 'Logger', 170),
  digger: makeSingleZoneProfile('digger', 'Digger', 150),
  guard: makeSingleZoneProfile('guard', 'Guard', 140),
  ranger: makeDualZoneProfile('ranger', 'Ranger', 90, 160, 220),
  bombardier: makeDualZoneProfile('bombardier', 'Bombardier', 80, 150, 250),
  shaman: makeSingleZoneProfile('shaman', 'Shaman', 140),
  lookout: makeSingleZoneProfile('lookout', 'Lookout', 210),
};

function makeSingleZoneProfile(
  canonicalId: string,
  label: string,
  operatingRadius: number,
): SpecialistProfile {
  return {
    canonicalId,
    label,
    mode: 'single_zone',
    operatingRadius,
    anchorRadius: 0,
    engagementRadius: 0,
    projectionRange: 0,
  };
}

function makeDualZoneProfile(
  canonicalId: string,
  label: string,
  anchorRadius: number,
  engagementRadius: number,
  projectionRange: number,
): SpecialistProfile {
  return {
    canonicalId,
    label,
    mode: 'dual_zone',
    operatingRadius: 0,
    anchorRadius,
    engagementRadius,
    projectionRange,
  };
}

export function registerSpecialistEntity(world: GameWorld, eid: number, runtimeId: string): void {
  const profile = resolveSpecialistProfile(runtimeId);
  if (!profile) return;

  const x = Position.x[eid];
  const y = Position.y[eid];
  const commanderProjectionBonus = getCommanderProjectionBonus(world, runtimeId);
  const projectionMult = runtimeId === 'bombardier' ? world.playerSiegeRangeMultiplier : 1;
  world.specialistAssignments.set(eid, {
    runtimeId,
    canonicalId: profile.canonicalId,
    label: profile.label,
    mode: profile.mode,
    operatingRadius:
      profile.operatingRadius + getSpecialistZoneBonus(world, runtimeId, 'operating_radius'),
    centerX: x,
    centerY: y,
    anchorX: x,
    anchorY: y,
    anchorRadius: profile.anchorRadius + getSpecialistZoneBonus(world, runtimeId, 'anchor_radius'),
    engagementRadius:
      profile.engagementRadius + getSpecialistZoneBonus(world, runtimeId, 'engagement_radius'),
    engagementX: x,
    engagementY: y,
    projectionRange: Math.round(
      (profile.projectionRange + getSpecialistZoneBonus(world, runtimeId, 'projection_range')) *
        (1 + commanderProjectionBonus) *
        projectionMult,
    ),
  });
}

export function beginSpecialistAssignment(world: GameWorld, eid: number): string | null {
  const assignment = world.specialistAssignments.get(eid);
  if (!assignment) return null;
  world.pendingSpecialistAssignment = { eid, mode: assignment.mode };
  return assignment.mode === 'dual_zone'
    ? 'Tap terrain to set engagement zone'
    : 'Tap terrain to set operating area';
}

export function cancelPendingSpecialistAssignment(world: GameWorld): void {
  world.pendingSpecialistAssignment = null;
}

export function placePendingSpecialistAssignment(
  world: GameWorld,
  worldX: number,
  worldY: number,
): boolean {
  const pending = world.pendingSpecialistAssignment;
  if (!pending) return false;

  const assignment = world.specialistAssignments.get(pending.eid);
  if (!assignment) {
    world.pendingSpecialistAssignment = null;
    return false;
  }

  if (assignment.mode === 'dual_zone') {
    assignment.anchorX = Position.x[pending.eid];
    assignment.anchorY = Position.y[pending.eid];
    const { x, y } = clampToProjectionRange(
      assignment.anchorX,
      assignment.anchorY,
      worldX,
      worldY,
      assignment.projectionRange,
    );
    assignment.engagementX = x;
    assignment.engagementY = y;
  } else {
    assignment.centerX = worldX;
    assignment.centerY = worldY;
  }

  world.specialistAssignments.set(pending.eid, assignment);
  world.pendingSpecialistAssignment = null;
  return true;
}

export function getSpecialistAssignment(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): SpecialistAssignment | null {
  return world.specialistAssignments.get(eid) ?? null;
}

export function getSpecialistMenuMode(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): SpecialistZoneMode | null {
  return world.specialistAssignments.get(eid)?.mode ?? null;
}

export function isSpecialistEntity(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): boolean {
  return world.specialistAssignments.has(eid);
}

function resolveSpecialistProfile(runtimeId: string): SpecialistProfile | null {
  return SPECIALIST_PROFILES[runtimeId] ?? null;
}

function getCommanderProjectionBonus(
  world: Pick<GameWorld, 'commanderModifiers'>,
  runtimeId: string,
): number {
  if (runtimeId === 'ranger') return world.commanderModifiers.passiveRangerProjectionBonus;
  if (runtimeId === 'bombardier') {
    return world.commanderModifiers.passiveBombardierProjectionBonus;
  }
  return 0;
}

function clampToProjectionRange(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  projectionRange: number,
): { x: number; y: number } {
  if (projectionRange <= 0) return { x: targetX, y: targetY };

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy);
  if (distance <= projectionRange || distance === 0) {
    return { x: targetX, y: targetY };
  }

  const scale = projectionRange / distance;
  return {
    x: sourceX + dx * scale,
    y: sourceY + dy * scale,
  };
}

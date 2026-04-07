import { addComponent, query } from 'bitecs';
import { getUnitDef } from '@/config/config-loader';
import {
  AutonomousSpecialist,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  PrestigeAutoDeploy,
  Resource,
  Stance,
  StanceMode,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { startPatrol } from '@/ecs/systems/patrol';
import type { GameWorld } from '@/ecs/world';
import {
  buildSpecialistAreaPatrol,
  shouldRefreshSpecialistPatrol,
} from '@/game/specialist-assignment-queries';
import {
  getSpecialistAssignment,
  registerSpecialistEntity,
} from '@/game/specialist-assignment';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction, UnitState } from '@/types';

export type SpecialistSpawnMode = 'blueprint' | 'prestige_auto_deploy';

const SPECIALIST_KIND_MAP: Record<string, EntityKind> = {
  fisher: EntityKind.Gatherer,
  digger: EntityKind.Gatherer,
  logger: EntityKind.Gatherer,
  guard: EntityKind.Brawler,
  ranger: EntityKind.Scout,
  shaman: EntityKind.Shaman,
  lookout: EntityKind.Scout,
  bombardier: EntityKind.Engineer,
};

const SPECIALIST_STANCE_MAP: Partial<Record<string, number>> = {
  fisher: StanceMode.Defensive,
  digger: StanceMode.Defensive,
  logger: StanceMode.Defensive,
  guard: StanceMode.Defensive,
  shaman: StanceMode.Defensive,
  lookout: StanceMode.Defensive,
};

const SPECIALIST_GATHER_TASK_MAP = {
  fisher: 'gathering-fish',
  digger: 'gathering-rocks',
  logger: 'gathering-logs',
} as const;

export function getSpecialistSpawnKind(runtimeId: string): EntityKind | null {
  return SPECIALIST_KIND_MAP[runtimeId] ?? null;
}

export function spawnSpecialistUnit(
  world: GameWorld,
  runtimeId: string,
  lodgeEid: number,
  x: number,
  y: number,
  mode: SpecialistSpawnMode,
): number | null {
  const kind = getSpecialistSpawnKind(runtimeId);
  if (kind == null) return null;

  const eid = spawnEntity(world, kind, x, y, Faction.Player);
  if (mode === 'prestige_auto_deploy') {
    addComponent(world.ecs, eid, PrestigeAutoDeploy);
  } else {
    addComponent(world.ecs, eid, AutonomousSpecialist);
  }

  registerSpecialistEntity(world, eid, runtimeId);
  applySpecialistStats(world, eid, runtimeId);
  seedSpecialistAssignment(world, eid, runtimeId, lodgeEid);
  initializeSpecialistBehavior(world, eid, runtimeId, lodgeEid);
  return eid;
}

function applySpecialistStats(world: GameWorld, eid: number, runtimeId: string): void {
  const def = getUnitDef(runtimeId);

  let hp = def.hp;
  if (world.playerUnitHpMultiplier > 1) {
    hp = Math.round(hp * world.playerUnitHpMultiplier);
  }
  Health.max[eid] = hp;
  Health.current[eid] = hp;

  let damage = def.damage;
  if (world.tech.sharpSticks && damage > 0) damage += 2;
  if (world.playerUnitDamageMultiplier > 1 && damage > 0) {
    damage = Math.round(damage * world.playerUnitDamageMultiplier);
  }
  Combat.damage[eid] = damage;

  let speed = def.speed;
  if (world.tech.swiftPaws) speed *= 1.15;
  Velocity.speed[eid] = speed;

  Stance.mode[eid] = SPECIALIST_STANCE_MAP[runtimeId] ?? StanceMode.Aggressive;
}

function seedSpecialistAssignment(
  world: GameWorld,
  eid: number,
  runtimeId: string,
  lodgeEid: number,
): void {
  const assignment = getSpecialistAssignment(world, eid);
  if (!assignment) return;

  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];

  if (runtimeId === 'fisher') {
    setSingleZoneTarget(world, assignment, EntityKind.Clambed, lodgeX, lodgeY);
  } else if (runtimeId === 'logger') {
    setSingleZoneTarget(world, assignment, EntityKind.Cattail, lodgeX, lodgeY);
  } else if (runtimeId === 'digger') {
    setSingleZoneTarget(world, assignment, EntityKind.PearlBed, lodgeX, lodgeY);
  } else if (runtimeId === 'guard' || runtimeId === 'shaman') {
    assignment.centerX = lodgeX;
    assignment.centerY = clampY(world, lodgeY - 80);
  } else if (runtimeId === 'lookout') {
    assignment.centerX = lodgeX;
    assignment.centerY = clampY(world, lodgeY - Math.max(140, world.worldHeight * 0.14));
  } else if (runtimeId === 'ranger') {
    assignment.engagementX = lodgeX;
    assignment.engagementY = clampY(world, lodgeY - Math.max(180, world.worldHeight * 0.18));
  } else if (runtimeId === 'bombardier') {
    assignment.engagementX = lodgeX;
    assignment.engagementY = clampY(world, lodgeY - Math.max(220, world.worldHeight * 0.22));
  }

  world.specialistAssignments.set(eid, assignment);
}

function initializeSpecialistBehavior(
  world: GameWorld,
  eid: number,
  runtimeId: string,
  lodgeEid: number,
): void {
  const gatherTask = SPECIALIST_GATHER_TASK_MAP[runtimeId as keyof typeof SPECIALIST_GATHER_TASK_MAP];
  if (gatherTask) {
    dispatchTaskOverride(world, eid, gatherTask);
    return;
  }

  switch (runtimeId) {
    case 'guard':
      dispatchTaskOverride(world, eid, 'defending');
      return;
    case 'ranger':
    case 'lookout':
      ensurePatrol(world, eid);
      lockSpecialistRole(eid, UnitState.AttackMovePatrol, lodgeEid);
      return;
    case 'shaman':
      lockSpecialistRole(eid, UnitState.Idle, 0);
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.targetEntity[eid] = -1;
      return;
    case 'bombardier':
      if (!dispatchTaskOverride(world, eid, 'attacking')) {
        lockSpecialistRole(eid, UnitState.Idle, 0);
        UnitStateMachine.state[eid] = UnitState.Idle;
        UnitStateMachine.targetEntity[eid] = -1;
      }
      return;
    default:
      return;
  }
}

function ensurePatrol(world: GameWorld, eid: number): void {
  const waypoints = buildSpecialistAreaPatrol(world, eid);
  if (waypoints.length === 0) return;
  if (!shouldRefreshSpecialistPatrol(world, eid, waypoints)) return;
  startPatrol(world, eid, waypoints);
}

function setSingleZoneTarget(
  world: GameWorld,
  assignment: NonNullable<ReturnType<typeof getSpecialistAssignment>>,
  resourceKind: EntityKind,
  fallbackX: number,
  fallbackY: number,
): void {
  const resource = findNearestResourceEntity(world, resourceKind, fallbackX, fallbackY);
  if (resource >= 0) {
    assignment.centerX = Position.x[resource];
    assignment.centerY = Position.y[resource];
    return;
  }
  assignment.centerX = fallbackX;
  assignment.centerY = clampY(world, fallbackY - 80);
}

function findNearestResourceEntity(
  world: GameWorld,
  resourceKind: EntityKind,
  sourceX: number,
  sourceY: number,
): number {
  const resources = query(world.ecs, [Position, Resource, EntityTypeTag, IsResource]);
  let best = -1;
  let bestDistSq = Infinity;

  for (const eid of resources) {
    if ((EntityTypeTag.kind[eid] as EntityKind) !== resourceKind) continue;
    if (Resource.amount[eid] <= 0) continue;

    const dx = Position.x[eid] - sourceX;
    const dy = Position.y[eid] - sourceY;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      best = eid;
      bestDistSq = distSq;
    }
  }

  return best;
}

function clampY(world: GameWorld, value: number): number {
  const minY = 40;
  const maxY = world.worldHeight > 0 ? world.worldHeight - 40 : value;
  return Math.max(minY, Math.min(maxY, value));
}

function lockSpecialistRole(eid: number, task: UnitState, targetEntity: number): void {
  TaskOverride.active[eid] = 1;
  TaskOverride.task[eid] = task;
  TaskOverride.targetEntity[eid] = targetEntity;
  TaskOverride.resourceKind[eid] = 0;
}

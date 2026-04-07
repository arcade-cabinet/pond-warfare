/**
 * Specialist Auto-Deploy at Match Start (v3.0 -- US11)
 *
 * Reads Pearl upgrades from prestige state. For each auto-deploy
 * upgrade with rank > 0, spawns that many specialist units near
 * the Lodge.
 *
 * Uses specialist-deploy.ts computeSpecialistDeployPlan() and
 * getSpecialistSpawnPositions() for placement logic.
 */

import { addComponent } from 'bitecs';
import type { PrestigeState } from '@/config/prestige-logic';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Combat,
  Health,
  Position,
  PrestigeAutoDeploy,
  Stance,
  StanceMode,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { startPatrol } from '@/ecs/systems/patrol';
import {
  computeSpecialistDeployPlan,
  getSpecialistSpawnPositions,
  type SpecialistDeployPlan,
  type SpecialistSpawnRequest,
} from '@/ecs/systems/specialist-deploy';
import type { GameWorld } from '@/ecs/world';
import { registerSpecialistEntity } from '@/game/specialist-assignment';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind, Faction, UnitState } from '@/types';
import { pushGameEvent } from '@/ui/game-events';

/**
 * Specialist unit name -> EntityKind mapping.
 * Specialists reuse existing entity kinds where possible.
 */
const SPECIALIST_KIND_MAP: Record<string, EntityKind> = {
  fisher: EntityKind.Gatherer,
  digger: EntityKind.Gatherer,
  logger: EntityKind.Gatherer,
  guardian: EntityKind.Brawler,
  hunter: EntityKind.Brawler,
  ranger: EntityKind.Scout,
  shaman: EntityKind.Shaman,
  lookout: EntityKind.Scout,
  sapper: EntityKind.Engineer,
  saboteur: EntityKind.Diver,
};

const SPECIALIST_STANCE_MAP: Partial<Record<string, number>> = {
  fisher: StanceMode.Defensive,
  digger: StanceMode.Defensive,
  logger: StanceMode.Defensive,
  guardian: StanceMode.Defensive,
  shaman: StanceMode.Defensive,
  lookout: StanceMode.Defensive,
};

const SPECIALIST_GATHER_TASK_MAP = {
  fisher: 'gathering-fish',
  digger: 'gathering-rocks',
  logger: 'gathering-logs',
} as const;

/**
 * Deploy prestige specialist units near the Lodge at match start.
 *
 * @param world - The game world
 * @param prestigeState - Current prestige state from store-v3
 * @param lodgeEid - Entity ID of the player's Lodge
 */
export function deploySpecialistsAtMatchStart(
  world: GameWorld,
  prestigeState: PrestigeState,
  lodgeEid: number,
): void {
  const plan = computeSpecialistDeployPlan(prestigeState);

  if (plan.totalCount === 0) return;

  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];

  // Get spawn positions for all specialists in a semicircle below Lodge
  const allPositions = getSpecialistSpawnPositions(lodgeX, lodgeY, plan.totalCount);

  let posIdx = 0;
  for (const spawn of plan.spawns) {
    const kind = SPECIALIST_KIND_MAP[spawn.unitId] ?? EntityKind.Gatherer;

    for (let i = 0; i < spawn.count; i++) {
      const pos = allPositions[posIdx] ?? { x: lodgeX, y: lodgeY + 60 };
      const eid = spawnEntity(world, kind, pos.x, pos.y, Faction.Player);
      addComponent(world.ecs, eid, PrestigeAutoDeploy);
      registerSpecialistEntity(world, eid, spawn.unitId);
      applySpecialistStats(world, eid, spawn);
      initializeSpecialistBehavior(world, eid, spawn, lodgeEid, pos.x, pos.y);
      posIdx++;
    }
  }

  // Announce deployment
  if (plan.summary.length > 0) {
    pushGameEvent(`Specialists deployed: ${plan.summary.join(', ')}`, '#a78bfa', world.frameCount);
  }
}

function applySpecialistStats(world: GameWorld, eid: number, spawn: SpecialistSpawnRequest): void {
  let hp = spawn.hp;
  if (world.playerUnitHpMultiplier > 1) {
    hp = Math.round(hp * world.playerUnitHpMultiplier);
  }
  Health.max[eid] = hp;
  Health.current[eid] = hp;

  let damage = spawn.damage;
  if (world.tech.sharpSticks && damage > 0) damage += 2;
  if (world.playerUnitDamageMultiplier > 1 && damage > 0) {
    damage = Math.round(damage * world.playerUnitDamageMultiplier);
  }
  Combat.damage[eid] = damage;

  let speed = spawn.speed;
  if (world.tech.swiftPaws) speed *= 1.15;
  Velocity.speed[eid] = speed;

  Stance.mode[eid] = SPECIALIST_STANCE_MAP[spawn.unitId] ?? StanceMode.Aggressive;
}

function initializeSpecialistBehavior(
  world: GameWorld,
  eid: number,
  spawn: SpecialistSpawnRequest,
  lodgeEid: number,
  spawnX: number,
  spawnY: number,
): void {
  const gatherTask = SPECIALIST_GATHER_TASK_MAP[spawn.unitId as keyof typeof SPECIALIST_GATHER_TASK_MAP];
  if (gatherTask) {
    dispatchTaskOverride(world, eid, gatherTask);
    return;
  }

  switch (spawn.unitId) {
    case 'guardian':
      dispatchTaskOverride(world, eid, 'defending');
      return;
    case 'hunter':
      if (!dispatchTaskOverride(world, eid, 'attacking')) {
        dispatchTaskOverride(world, eid, 'defending');
      }
      return;
    case 'ranger':
      startPatrol(world, eid, buildRangerPatrol(world, lodgeEid, spawnX, spawnY));
      lockSpecialistRole(eid, UnitState.AttackMovePatrol);
      return;
    case 'lookout':
      startPatrol(world, eid, buildLookoutPatrol(world, lodgeEid, spawnX, spawnY));
      lockSpecialistRole(eid, UnitState.AttackMovePatrol);
      return;
    case 'shaman':
      lockSpecialistRole(eid, UnitState.Idle);
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.targetEntity[eid] = -1;
      return;
    case 'sapper':
    case 'saboteur':
      if (!dispatchTaskOverride(world, eid, 'attacking')) {
        lockSpecialistRole(eid, UnitState.Idle);
        UnitStateMachine.state[eid] = UnitState.Idle;
        UnitStateMachine.targetEntity[eid] = -1;
      }
      return;
    default:
      return;
  }
}

function buildRangerPatrol(
  world: GameWorld,
  lodgeEid: number,
  spawnX: number,
  spawnY: number,
): { x: number; y: number }[] {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  const flank = clampToWorldX(world, Math.max(90, world.worldWidth * 0.16));
  const frontY = clampToWorldY(world, lodgeY - Math.max(120, world.worldHeight * 0.16));
  const midY = clampToWorldY(world, lodgeY - Math.max(70, world.worldHeight * 0.1));

  return [
    { x: clampToWorldX(world, lodgeX - flank), y: frontY },
    { x: clampToWorldX(world, lodgeX + flank), y: frontY },
    { x: clampToWorldX(world, lodgeX), y: midY },
    { x: spawnX, y: spawnY },
  ];
}

function buildLookoutPatrol(
  world: GameWorld,
  lodgeEid: number,
  spawnX: number,
  spawnY: number,
): { x: number; y: number }[] {
  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  const edgeInset = Math.max(90, world.worldWidth * 0.1);
  const highY = clampToWorldY(world, lodgeY - Math.max(180, world.worldHeight * 0.26));
  const ridgeY = clampToWorldY(world, lodgeY - Math.max(130, world.worldHeight * 0.18));

  return [
    { x: edgeInset, y: ridgeY },
    { x: clampToWorldX(world, lodgeX), y: highY },
    { x: clampToWorldX(world, world.worldWidth - edgeInset), y: ridgeY },
    { x: spawnX, y: spawnY },
  ];
}

function clampToWorldX(world: GameWorld, value: number): number {
  const maxX = world.worldWidth > 0 ? world.worldWidth - 40 : value;
  return Math.max(40, Math.min(maxX, value));
}

function clampToWorldY(world: GameWorld, value: number): number {
  const maxY = world.worldHeight > 0 ? world.worldHeight - 40 : value;
  return Math.max(40, Math.min(maxY, value));
}

function lockSpecialistRole(eid: number, task: UnitState): void {
  TaskOverride.active[eid] = 1;
  TaskOverride.task[eid] = task;
  TaskOverride.targetEntity[eid] = 0;
  TaskOverride.resourceKind[eid] = 0;
}

/** Re-export the deploy plan type for testing. */
export type { SpecialistDeployPlan };

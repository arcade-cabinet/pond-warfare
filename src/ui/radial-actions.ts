/**
 * Radial Action Dispatcher (v3.0 -- US9/US10)
 *
 * Handles actions dispatched from the radial menu:
 * - Lodge actions: queue unit training, fortify, repair
 * - Unit actions: gather, attack, heal, scout, hold, patrol, move
 *
 * Fort placement logic extracted to radial-fort-actions.ts (300 LOC).
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { getUnitDef } from '@/config/config-loader';
import type { GeneralistDef } from '@/config/v3-types';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { game } from '@/game';
import { EntityKind, Faction, UnitState } from '@/types';
import { pushGameEvent } from './game-events';
import { handleFortifyAction, handleFortTypeAction } from './radial-fort-actions';

// Re-export for pointer-click.ts
export { tryPlaceFortAtPosition } from './radial-fort-actions';

/** Unit kind mapping for training commands. */
const TRAIN_KIND_MAP: Record<string, EntityKind> = {
  train_gatherer: EntityKind.Gatherer,
  train_fighter: EntityKind.Brawler,
  train_medic: EntityKind.Healer,
  train_scout: EntityKind.Scout,
};

/** v3 generalist names for config lookup. */
const TRAIN_CONFIG_MAP: Record<string, string> = {
  train_gatherer: 'gatherer',
  train_fighter: 'fighter',
  train_medic: 'medic',
  train_scout: 'scout',
};

/**
 * Dispatch a radial menu action by ID.
 * Returns true if the action was successfully handled.
 */
export function dispatchRadialAction(actionId: string): boolean {
  const w = game.world;

  if (actionId.startsWith('train_')) return handleTrainAction(w, actionId);
  if (actionId.startsWith('fort_')) return handleFortTypeAction(w, actionId);
  if (actionId === 'fortify') return handleFortifyAction(w);
  if (actionId === 'repair') return handleRepairAction(w);
  if (actionId.startsWith('cmd_')) return handleUnitCommand(w, actionId);

  return false;
}

/** Queue a unit for training at the player's Lodge. */
function handleTrainAction(world: GameWorld, actionId: string): boolean {
  const unitKind = TRAIN_KIND_MAP[actionId];
  const configKey = TRAIN_CONFIG_MAP[actionId];
  if (unitKind === undefined || !configKey) return false;

  const def = getUnitDef(configKey) as GeneralistDef;
  const fishCost = def.cost.fish ?? 0;

  if (world.resources.clams < fishCost) {
    pushGameEvent('Not enough Fish!', '#f87171', world.frameCount);
    audio.error();
    return false;
  }

  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return false;

  world.resources.clams -= fishCost;

  const slots = trainingQueueSlots.get(lodgeEid) ?? [];
  slots.push(unitKind);
  trainingQueueSlots.set(lodgeEid, slots);
  TrainingQueue.count[lodgeEid] = slots.length;

  if (slots.length === 1) {
    TrainingQueue.timer[lodgeEid] = def.trainTime * 60;
  }

  const names: Record<string, string> = {
    train_gatherer: 'Gatherer',
    train_fighter: 'Fighter',
    train_medic: 'Medic',
    train_scout: 'Scout',
  };
  pushGameEvent(`Training ${names[actionId]}`, '#38bdf8', world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
}

/** Repair the Lodge using Logs (mapped to twigs). */
function handleRepairAction(world: GameWorld): boolean {
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return false;

  const logCost = 30;
  if (world.resources.twigs < logCost) {
    pushGameEvent('Not enough Logs!', '#f87171', world.frameCount);
    audio.error();
    return false;
  }

  const current = Health.current[lodgeEid];
  const max = Health.max[lodgeEid];
  if (current >= max) {
    pushGameEvent('Lodge is at full health', '#4ade80', world.frameCount);
    return false;
  }

  world.resources.twigs -= logCost;
  const healAmount = Math.min(100, max - current);
  Health.current[lodgeEid] = current + healAmount;
  pushGameEvent(`Lodge repaired (+${healAmount} HP)`, '#4ade80', world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
}

/** Handle unit command actions. */
function handleUnitCommand(world: GameWorld, actionId: string): boolean {
  switch (actionId) {
    case 'cmd_hold':
      haltSelected(world);
      return true;
    case 'cmd_amove':
      world.attackMoveMode = true;
      game.syncUIStore();
      return true;
    case 'cmd_patrol':
      import('./store').then((s) => {
        s.patrolModeActive.value = true;
      });
      return true;
    case 'cmd_stance':
      import('../game/input-setup').then(({ cycleStanceForSelection }) => {
        cycleStanceForSelection(world);
        game.syncUIStore();
      });
      return true;
    case 'cmd_return':
      returnToLodge(world);
      return true;
    case 'cmd_gather':
    case 'cmd_attack':
    case 'cmd_heal':
    case 'cmd_scout':
    case 'cmd_move':
      pushGameEvent('Tap target...', '#38bdf8', world.frameCount);
      return true;
    default:
      return false;
  }
}

function haltSelected(world: GameWorld): void {
  for (const eid of world.selection) {
    if (hasComponent(world.ecs, eid, UnitStateMachine)) {
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.targetEntity[eid] = -1;
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      world.yukaManager.removeUnit(eid);
    }
  }
  game.syncUIStore();
}

function returnToLodge(world: GameWorld): void {
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return;
  const lx = Position.x[lodgeEid];
  const ly = Position.y[lodgeEid];
  for (const eid of world.selection) {
    if (hasComponent(world.ecs, eid, UnitStateMachine)) {
      UnitStateMachine.targetX[eid] = lx;
      UnitStateMachine.targetY[eid] = ly;
      UnitStateMachine.state[eid] = UnitState.Move;
    }
  }
  game.syncUIStore();
}

function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [IsBuilding, FactionTag, EntityTypeTag, Health]);
  for (const eid of buildings) {
    if (
      FactionTag.faction[eid] === Faction.Player &&
      (EntityTypeTag.kind[eid] === EntityKind.Lodge ||
        EntityTypeTag.kind[eid] === EntityKind.PredatorNest) &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

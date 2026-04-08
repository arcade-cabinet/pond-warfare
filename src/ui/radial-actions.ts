/**
 * Radial Action Dispatcher (v3.0 -- US9/US10)
 *
 * Handles actions dispatched from the radial menu:
 * - Lodge actions: queue unit training, fortify, repair
 * - Unit actions: gather, attack, heal, recon, hold, patrol, move
 *
 * Fort placement logic extracted to radial-fort-actions.ts (300 LOC).
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { getUnitDef } from '@/config/config-loader';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { game } from '@/game';
import { cycleStanceForSelection } from '@/game/input-setup';
import { MEDIC_KIND, MUDPAW_KIND, SABOTEUR_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { beginSpecialistAssignment } from '@/game/specialist-assignment';
import { train } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';
import { COLORS } from '@/ui/design-tokens';
import { radialMenuTargetEntityId } from '@/ui/store-radial';
import { pushGameEvent } from './game-events';
import { handleFortifyAction, handleFortTypeAction } from './radial-fort-actions';
import * as store from './store';

// Re-export for pointer-click.ts
export { tryPlaceFortAtPosition } from './radial-fort-actions';

/** Unit kind mapping for training commands. */
const TRAIN_KIND_MAP: Record<string, EntityKind> = {
  train_mudpaw: MUDPAW_KIND,
  train_medic: MEDIC_KIND,
  train_sapper: SAPPER_KIND,
  train_saboteur: SABOTEUR_KIND,
};

/** v3 generalist names for config lookup. */
const TRAIN_CONFIG_MAP: Record<string, string> = {
  train_mudpaw: 'mudpaw',
  train_medic: 'medic',
  train_sapper: 'sapper',
  train_saboteur: 'saboteur',
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

  const def = getUnitDef(configKey);
  const fishCost = def.cost.fish ?? 0;
  const logCost = def.cost.logs ?? 0;
  const rocksCost = def.cost.rocks ?? 0;
  const foodCost = ENTITY_DEFS[unitKind].foodCost ?? 1;

  if (world.resources.fish < fishCost) {
    pushGameEvent('Not enough Fish!', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }
  if (logCost > 0 && world.resources.logs < logCost) {
    pushGameEvent('Not enough Logs!', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }
  if (rocksCost > 0 && world.resources.rocks < rocksCost) {
    pushGameEvent('Not enough Rocks!', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }

  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return false;

  train(world, lodgeEid, unitKind, fishCost, logCost, foodCost, rocksCost);

  const names: Record<string, string> = {
    train_mudpaw: 'Mudpaw',
    train_medic: 'Medic',
    train_sapper: 'Sapper',
    train_saboteur: 'Saboteur',
  };
  pushGameEvent(`Training ${names[actionId]}`, COLORS.feedbackInfo, world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
}

/** Repair the Lodge using Logs. */
function handleRepairAction(world: GameWorld): boolean {
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return false;

  const logCost = 30;
  if (world.resources.logs < logCost) {
    pushGameEvent('Not enough Logs!', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }

  const current = Health.current[lodgeEid];
  const max = Health.max[lodgeEid];
  if (current >= max) {
    pushGameEvent('Lodge is at full health', COLORS.feedbackSuccess, world.frameCount);
    return false;
  }

  world.resources.logs -= logCost;
  const healAmount = Math.min(100, max - current);
  Health.current[lodgeEid] = current + healAmount;
  pushGameEvent(`Lodge repaired (+${healAmount} HP)`, COLORS.feedbackSuccess, world.frameCount);
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
      store.patrolModeActive.value = true;
      return true;
    case 'cmd_stance':
      cycleStanceForSelection(world);
      game.syncUIStore();
      return true;
    case 'cmd_return':
      returnToLodge(world);
      return true;
    case 'cmd_assign_area':
      return beginSpecialistAreaAssignment(world);
    case 'cmd_gather':
      pushGameEvent('Tap resource node...', COLORS.feedbackInfo, world.frameCount);
      return true;
    case 'cmd_attack':
      pushGameEvent('Tap enemy...', COLORS.feedbackInfo, world.frameCount);
      return true;
    case 'cmd_heal':
      pushGameEvent('Tap wounded ally...', COLORS.feedbackInfo, world.frameCount);
      return true;
    case 'cmd_recon':
    case 'cmd_scout':
      pushGameEvent('Tap terrain to recon...', COLORS.feedbackInfo, world.frameCount);
      return true;
    case 'cmd_move':
      pushGameEvent('Tap terrain to move...', COLORS.feedbackInfo, world.frameCount);
      return true;
    default:
      return false;
  }
}

function beginSpecialistAreaAssignment(world: GameWorld): boolean {
  const targetEid = radialMenuTargetEntityId.value;
  if (targetEid < 0) return false;
  const prompt = beginSpecialistAssignment(world, targetEid);
  if (!prompt) return false;
  pushGameEvent(prompt, COLORS.feedbackInfo, world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
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

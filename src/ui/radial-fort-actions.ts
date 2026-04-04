/**
 * Radial Fortification Actions (v3.0 -- US7)
 *
 * Handles fortification-related actions from the radial menu:
 * placement mode, slot placement at pointer position.
 * Extracted from radial-actions.ts for 300 LOC compliance.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import {
  findClosestSlot,
  initFortificationState,
  placeFortification,
} from '@/ecs/systems/fortification';
import type { GameWorld } from '@/ecs/world';
import { game } from '@/game';
import { EntityKind, Faction } from '@/types';
import { COLORS } from '@/ui/design-tokens';
import { progressionLevel } from '@/ui/store-v3';
import { pushGameEvent } from './game-events';

/** Enter fortify placement mode -- next slot tap places a wall. */
export function handleFortifyAction(world: GameWorld): boolean {
  ensureFortState(world);

  // Check if any empty slots are available
  if (world.fortifications) {
    const emptySlots = world.fortifications.slots.filter((s) => s.status === 'empty');
    if (emptySlots.length === 0) {
      pushGameEvent('No empty fort slots!', COLORS.feedbackError, world.frameCount);
      return false;
    }
  }

  // v3: Rocks mapped to pearls internally
  if (world.resources.pearls < 15) {
    pushGameEvent('Not enough Rocks!', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }

  world.placingBuilding = 'fort_wood_wall';
  pushGameEvent('Tap slot to place wall', COLORS.feedbackWarn, world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
}

/** Handle specific fortification type placement. */
export function handleFortTypeAction(world: GameWorld, actionId: string): boolean {
  const fortType = actionId.replace('fort_', '');
  ensureFortState(world);

  world.placingBuilding = `fort_${fortType}`;
  pushGameEvent(
    `Tap slot to place ${fortType.replace('_', ' ')}`,
    COLORS.feedbackWarn,
    world.frameCount,
  );
  audio.click();
  game.syncUIStore();
  return true;
}

/**
 * Try to place a fortification at the closest slot to a world position.
 * Called from pointer-click when placingBuilding starts with "fort_".
 * Returns true if placement succeeded.
 */
export function tryPlaceFortAtPosition(world: GameWorld, worldX: number, worldY: number): boolean {
  ensureFortState(world);
  if (!world.fortifications) return false;

  const fortTypeRaw = world.placingBuilding?.replace('fort_', '') ?? 'wood_wall';
  world.placingBuilding = null;

  // Find closest empty slot to the tap
  const slot = findClosestSlot(world.fortifications, worldX, worldY, 'empty');
  if (!slot) {
    pushGameEvent('No empty slot near tap', COLORS.feedbackError, world.frameCount);
    return false;
  }

  // Check distance -- must be within ~120px of a slot (world space).
  // At low zoom, ensure at least 22px screen-space tap target (44px diameter).
  const zoom = world.zoomLevel;
  const minWorldRadius = 22 / zoom; // 22 screen-px → world-px
  const threshold = Math.max(120, minWorldRadius);
  const dx = slot.worldX - worldX;
  const dy = slot.worldY - worldY;
  if (dx * dx + dy * dy > threshold * threshold) {
    pushGameEvent('Too far from slot', COLORS.feedbackError, world.frameCount);
    return false;
  }

  // Rocks are stored in pearls field
  const result = placeFortification(
    world.fortifications,
    slot.index,
    fortTypeRaw,
    world.resources.pearls,
  );

  if (!result.success) {
    pushGameEvent(result.reason ?? 'Cannot place', COLORS.feedbackError, world.frameCount);
    audio.error();
    return false;
  }

  // Deduct rocks
  if (result.rockCost) {
    world.resources.pearls -= result.rockCost;
  }

  pushGameEvent(`Built ${fortTypeRaw.replace('_', ' ')}`, COLORS.feedbackSuccess, world.frameCount);
  audio.click();
  game.syncUIStore();
  return true;
}

/** Find the player Lodge entity. Returns EID or -1 if not found. */
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

/** Ensure fortification state is initialized on the world. */
function ensureFortState(world: GameWorld): void {
  if (world.fortifications) return;
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return;
  const lx = Position.x[lodgeEid];
  const ly = Position.y[lodgeEid];
  world.fortifications = initFortificationState(progressionLevel.value, lx, ly);
}

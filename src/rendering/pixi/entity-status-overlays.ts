/**
 * Entity Status Overlays
 *
 * Renders idle unit indicators ("z" pulse) and control group number badges
 * above entities on the game board. Called from entity-renderer per entity.
 */

import type { Container } from 'pixi.js';

import { FactionTag, UnitStateMachine } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';
import {
  removeCtrlGroupBadge,
  removeIdleIndicator,
  renderCtrlGroupBadge,
  renderIdleIndicator,
} from './entity-overlays';

// Idle frame tracker: maps entity ID -> consecutive idle frames
const entityIdleFrames = new Map<number, number>();

/** Get idle frame count for an entity (used by tests). */
export function getEntityIdleFrames(eid: number): number {
  return entityIdleFrames.get(eid) ?? 0;
}

/** Reset idle frame tracker (used by tests and game restarts). */
export function resetEntityIdleFrames(): void {
  entityIdleFrames.clear();
}

/** Update idle tracking and render idle "z" indicator for a player unit. */
export function updateIdleOverlay(
  eid: number,
  isBuilding: boolean,
  isResource: boolean,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  frameCount: number,
  entityLayer: Container,
): void {
  if (!isBuilding && !isResource && FactionTag.faction[eid] === Faction.Player) {
    const unitState = UnitStateMachine.state[eid] as UnitState;
    if (unitState === UnitState.Idle) {
      entityIdleFrames.set(eid, (entityIdleFrames.get(eid) ?? 0) + 1);
    } else {
      entityIdleFrames.delete(eid);
    }
    renderIdleIndicator(
      eid,
      entityIdleFrames.get(eid) ?? 0,
      ex,
      ey,
      sh,
      yOff,
      frameCount,
      entityLayer,
    );
  } else {
    removeIdleIndicator(eid, entityLayer);
    entityIdleFrames.delete(eid);
  }
}

/** Find which ctrl group (if any) the entity belongs to. */
function findCtrlGroup(world: GameWorld, eid: number): number | null {
  for (const [gnum, eids] of Object.entries(world.ctrlGroups)) {
    if (eids.includes(eid)) return Number(gnum);
  }
  return null;
}

/** Render ctrl group number badge above units assigned to control groups. */
export function updateCtrlGroupOverlay(
  eid: number,
  isResource: boolean,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  entityLayer: Container,
  world: GameWorld | null,
): void {
  if (!world || isResource) return;

  const groupNum = findCtrlGroup(world, eid);
  if (groupNum !== null) {
    renderCtrlGroupBadge(eid, groupNum, ex, ey, sh, yOff, entityLayer);
  } else {
    removeCtrlGroupBadge(eid, entityLayer);
  }
}

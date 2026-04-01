/**
 * Pointer Click Handler
 *
 * Single-click, double-click, attack-move, and shift-click logic.
 */

import { showSelectBark } from '@/config/barks';
import type { GameWorld } from '@/ecs/world';
import type { EntityKind } from '@/types';
import type { PointerCallbacks, PointerState } from './pointer';

const DOUBLE_CLICK_MS = 350;

export interface ClickState {
  lastClickTime: number;
  lastClickEntity: number | null;
}

export function handleClick(
  world: GameWorld,
  mouse: PointerState,
  cb: PointerCallbacks,
  clickState: ClickState,
  isShiftDown: () => boolean,
): void {
  if (world.attackMoveMode) {
    world.attackMoveMode = false;
    const clicked = cb.getEntityAt(mouse.worldX, mouse.worldY);
    if (clicked !== null && cb.isEnemyFaction(clicked)) cb.issueContextCommand(clicked);
    else cb.issueContextCommand(null);
    world.groundPings.push({
      x: mouse.worldX,
      y: mouse.worldY,
      life: 20,
      maxLife: 20,
      color: 'rgba(239, 68, 68, 0.8)',
    });
    return;
  }

  const clicked = cb.getEntityAt(mouse.worldX, mouse.worldY);
  const now = performance.now();

  if (clicked !== null) {
    if (cb.isBuildingEntity(clicked)) cb.onPlaySound('selectBuild');
    else cb.onPlaySound('selectUnit');

    if (
      now - clickState.lastClickTime < DOUBLE_CLICK_MS &&
      clickState.lastClickEntity !== null &&
      cb.getEntityKind(clickState.lastClickEntity) === cb.getEntityKind(clicked) &&
      cb.isPlayerUnit(clicked)
    ) {
      cb.deselectAll();
      const kind = cb.getEntityKind(clicked);
      const sameType = cb.getAllPlayerUnitsOfKind(kind);
      world.selection = sameType.filter((eid) => cb.isEntityOnScreen(eid));
      for (const eid of world.selection) cb.selectEntity(eid);
      world.isTracking = true;
    } else if (cb.isPlayerUnit(clicked)) {
      if (isShiftDown()) {
        const idx = world.selection.indexOf(clicked);
        if (idx > -1) {
          cb.deselectEntity(clicked);
          world.selection.splice(idx, 1);
        } else {
          cb.selectEntity(clicked);
          world.selection.push(clicked);
        }
      } else {
        cb.deselectAll();
        world.selection = [clicked];
        cb.selectEntity(clicked);
        world.isTracking = true;
      }
      const pos = cb.getEntityPosition(clicked);
      if (pos)
        showSelectBark(world, clicked, pos.x, pos.y, cb.getEntityKind(clicked) as EntityKind);
    } else {
      if (cb.hasPlayerUnitsSelected()) cb.issueContextCommand(clicked);
      else {
        cb.deselectAll();
        world.selection = [clicked];
        cb.selectEntity(clicked);
        world.isTracking = true;
      }
    }
  } else {
    if (cb.hasPlayerUnitsSelected()) cb.issueContextCommand(null);
    else {
      cb.deselectAll();
      world.selection = [];
      world.isTracking = false;
    }
  }

  clickState.lastClickTime = now;
  clickState.lastClickEntity = clicked;
  cb.onUpdateUI();
}

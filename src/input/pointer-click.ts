/**
 * Pointer Click Handler
 *
 * Single-click, double-click, attack-move, and shift-click logic.
 * Also opens the radial menu on Lodge or selected-unit taps.
 * v3: handles fortification slot placement when placingBuilding starts with "fort_".
 *
 * Fix: when re-tapping a selected gatherer near a resource node, dispatch
 * a gather command instead of opening the radial menu.
 */

import { showSelectBark } from '@/config/barks';
import { AutoSymbol } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { hitTestAutoSymbol } from '@/rendering/pixi/auto-symbol-overlay';
import { EntityKind, type EntityKind as EntityKindType } from '@/types';
import { tryPlaceFortAtPosition } from '@/ui/radial-actions';
import { entityKindToRole } from '@/ui/radial-menu-options';
import { openRadialMenu } from '@/ui/store-radial';
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
  // Auto-symbol tap: confirm a unit's auto-behavior icon
  const symbolEid = hitTestAutoSymbol(mouse.worldX, mouse.worldY);
  if (symbolEid !== -1 && AutoSymbol.active[symbolEid] === 1) {
    AutoSymbol.confirmed[symbolEid] = 1;
    cb.onUpdateUI();
    return;
  }

  // v3: Fortification slot placement mode
  if (world.placingBuilding?.startsWith('fort_')) {
    tryPlaceFortAtPosition(world, mouse.worldX, mouse.worldY);
    cb.onUpdateUI();
    return;
  }

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
      // Check if this unit was already selected
      const wasAlreadySelected = world.selection.includes(clicked);

      // When re-tapping an already-selected unit, check for a resource
      // underneath. If the selection contains gatherers, prefer gathering
      // over opening the radial menu -- this is the core gameplay loop.
      if (wasAlreadySelected && !isShiftDown()) {
        const resourceUnder = cb.getResourceAt(mouse.worldX, mouse.worldY);
        const hasGatherer = world.selection.some(
          (eid) => cb.getEntityKind(eid) === EntityKind.Gatherer,
        );
        if (resourceUnder !== null && hasGatherer) {
          cb.issueContextCommand(resourceUnder);
          clickState.lastClickTime = now;
          clickState.lastClickEntity = clicked;
          cb.onUpdateUI();
          return;
        }
      }

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
        showSelectBark(world, clicked, pos.x, pos.y, cb.getEntityKind(clicked) as EntityKindType);

      // Open unit radial on re-tap of an already-selected unit
      if (wasAlreadySelected && !isShiftDown()) {
        const kind = cb.getEntityKind(clicked);
        const role = entityKindToRole(kind);
        openRadialMenu(mouse.screenX, mouse.screenY, 'unit', role);
      }
    } else if (cb.isPlayerBuilding(clicked)) {
      // Player building tap: select it and open radial for Lodge
      cb.deselectAll();
      world.selection = [clicked];
      cb.selectEntity(clicked);
      world.isTracking = true;

      const kind = cb.getEntityKind(clicked);
      if (kind === EntityKind.Lodge) {
        openRadialMenu(mouse.screenX, mouse.screenY, 'lodge', null);
      }
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

/**
 * Panel Actions -- shared helpers for Forces and Buildings tabs.
 *
 * Provides panToEntity, selectEntity, and selectBuilding so that tapping
 * a unit or building row in the command panel pans the camera and selects
 * the entity using the same code paths as direct game-board clicks.
 */

import { hasComponent } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { canDockPanels } from '@/platform';
import * as store from '@/ui/store';

/** Pan camera smoothly to an entity's current position. */
export function panToEntity(eid: number): void {
  const x = Position.x[eid];
  const y = Position.y[eid];
  game.smoothPanTo(x, y);
}

/**
 * Select a single unit: clear existing selection, mark the entity as
 * selected, pan the camera, and close the mobile panel if not docked.
 */
export function selectEntity(eid: number): void {
  const w = game.world;

  // Clear current selection
  for (const sel of w.selection) {
    if (hasComponent(w.ecs, sel, Selectable)) {
      Selectable.selected[sel] = 0;
    }
  }

  // Select the new entity
  w.selection = [eid];
  if (hasComponent(w.ecs, eid, Selectable)) {
    Selectable.selected[eid] = 1;
  }
  w.isTracking = true;

  // Pan camera
  panToEntity(eid);

  // Audio feedback
  audio.selectUnit();

  // Sync UI store so selection signals update
  game.syncUIStore();

  // Close mobile panel when not docked
  if (!canDockPanels.value) {
    store.mobilePanelOpen.value = false;
  }
}

/**
 * Select a building: identical flow to selectEntity but kept as a
 * separate entry point so callers read clearly and future building-
 * specific logic (e.g. showing production queue) can diverge.
 */
export function selectBuilding(eid: number): void {
  selectEntity(eid);
}

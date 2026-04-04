/**
 * Lodge Visual Overlays — Wings & Fort Slots
 *
 * Renders Lodge wing attachments (dock, barracks, watchtower, healing_pool)
 * and fortification slot markers (empty = gold outline, built = filled rect/tower)
 * on the PixiJS entity layer.
 *
 * Called from the main render loop after entities are drawn.
 */

import type { Graphics } from 'pixi.js';

import type { FortificationState, FortSlot } from '@/ecs/systems/fortification';
import {
  generateFortSlotPositions,
  getActiveWings,
  getFortSlotCount,
  type LodgeVisualState,
} from '@/rendering/lodge-renderer';
import { getEntityOverlayGfx } from './init';

// ── Wing Colors ─────────────────────────────────────────────────

const WING_COLORS: Record<string, number> = {
  dock: 0x38bdf8, // sky blue
  barracks: 0xef4444, // red
  watchtower: 0xfbbf24, // gold
  healing_pool: 0x4ade80, // green
};

const WING_FILL_ALPHA = 0.5;
const WING_STROKE_ALPHA = 0.8;

// ── Fort Slot Colors ────────────────────────────────────────────

const SLOT_EMPTY_COLOR = 0xfbbf24; // gold outline
const SLOT_EMPTY_ALPHA = 0.3;
const SLOT_EMPTY_RADIUS = 6;

const SLOT_WALL_COLOR = 0x92400e; // brown
const SLOT_WALL_ALPHA = 0.7;
const SLOT_WALL_SIZE = 10;

const SLOT_TOWER_COLOR = 0x6a7a7a; // steel
const SLOT_TOWER_ALPHA = 0.8;
const SLOT_TOWER_SIZE = 8;

const SLOT_DESTROYED_COLOR = 0x4b5563; // grey
const SLOT_DESTROYED_ALPHA = 0.25;

// ── Public API ──────────────────────────────────────────────────

/**
 * Render Lodge wing attachments at the Lodge position.
 * Wings show as colored rectangles attached to the Lodge sprite.
 */
export function renderLodgeWings(lodgeX: number, lodgeY: number, state: LodgeVisualState): void {
  const gfx = getEntityOverlayGfx();
  const wings = getActiveWings(state);

  for (const wing of wings) {
    const color = WING_COLORS[wing.wingId] ?? 0xffffff;
    const wx = lodgeX + wing.offsetX;
    const wy = lodgeY + wing.offsetY;

    // Filled rectangle with border
    gfx.rect(wx - wing.width / 2, wy - wing.height / 2, wing.width, wing.height);
    gfx.fill({ color, alpha: WING_FILL_ALPHA });
    gfx.rect(wx - wing.width / 2, wy - wing.height / 2, wing.width, wing.height);
    gfx.stroke({ width: 1, color, alpha: WING_STROKE_ALPHA });
  }
}

/**
 * Render fort slot visual markers around the Lodge.
 * Empty slots: subtle gold circle outlines.
 * Built walls: filled brown rectangles.
 * Built towers: filled steel squares.
 * Destroyed: faint grey circle.
 */
export function renderFortSlotMarkers(
  lodgeX: number,
  lodgeY: number,
  fortState: FortificationState | null,
  progressionLevel: number,
): void {
  const gfx = getEntityOverlayGfx();

  if (fortState) {
    // Render from actual fort state
    for (const slot of fortState.slots) {
      const sx = slot.worldX;
      const sy = slot.worldY;
      renderSingleSlot(gfx, sx, sy, slot);
    }
  } else {
    // No fort state yet — show empty slot positions
    const slotCount = getFortSlotCount(progressionLevel);
    const positions = generateFortSlotPositions(slotCount);
    for (const pos of positions) {
      const sx = lodgeX + pos.x;
      const sy = lodgeY + pos.y;
      gfx.circle(sx, sy, SLOT_EMPTY_RADIUS);
      gfx.stroke({ width: 1, color: SLOT_EMPTY_COLOR, alpha: SLOT_EMPTY_ALPHA });
    }
  }
}

function renderSingleSlot(gfx: Graphics, sx: number, sy: number, slot: FortSlot): void {
  switch (slot.status) {
    case 'empty':
      gfx.circle(sx, sy, SLOT_EMPTY_RADIUS);
      gfx.stroke({ width: 1, color: SLOT_EMPTY_COLOR, alpha: SLOT_EMPTY_ALPHA });
      break;

    case 'building': {
      // Pulsing outline during construction
      gfx.circle(sx, sy, SLOT_EMPTY_RADIUS);
      gfx.stroke({ width: 2, color: SLOT_EMPTY_COLOR, alpha: 0.5 });
      break;
    }

    case 'active':
      if (slot.fortType === 'wall') {
        gfx.rect(sx - SLOT_WALL_SIZE / 2, sy - SLOT_WALL_SIZE / 2, SLOT_WALL_SIZE, SLOT_WALL_SIZE);
        gfx.fill({ color: SLOT_WALL_COLOR, alpha: SLOT_WALL_ALPHA });
      } else {
        // Tower — small square with range indicator dot
        gfx.rect(
          sx - SLOT_TOWER_SIZE / 2,
          sy - SLOT_TOWER_SIZE / 2,
          SLOT_TOWER_SIZE,
          SLOT_TOWER_SIZE,
        );
        gfx.fill({ color: SLOT_TOWER_COLOR, alpha: SLOT_TOWER_ALPHA });
        gfx.circle(sx, sy - SLOT_TOWER_SIZE / 2 - 3, 2);
        gfx.fill({ color: 0xef4444, alpha: 0.6 });
      }
      break;

    case 'destroyed':
      gfx.circle(sx, sy, SLOT_EMPTY_RADIUS - 1);
      gfx.stroke({ width: 1, color: SLOT_DESTROYED_COLOR, alpha: SLOT_DESTROYED_ALPHA });
      break;
  }
}

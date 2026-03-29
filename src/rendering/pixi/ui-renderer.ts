/**
 * PixiJS UI Renderer
 *
 * Selection rectangle, building placement preview, rally points, and range rings.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import { Building, Combat, EntityTypeTag, Position, Selectable } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, SpriteId, type SpriteId as SpriteIdType } from '@/types';
import { drawDashedCircle, drawDashedLine, getScreenGfx, getTexture, getUiGfx } from './init';

// ---------------------------------------------------------------------------
// Rally points & range rings
// ---------------------------------------------------------------------------

export function renderRallyAndRange(world: GameWorld, frameCount: number): void {
  const uiGfx = getUiGfx();

  // Rally point display
  if (world.selection.length === 1) {
    const selEid = world.selection[0];
    const kind = EntityTypeTag.kind[selEid] as EntityKind;
    const def = ENTITY_DEFS[kind];
    if (def.isBuilding && Building.hasRally[selEid] === 1) {
      const bx = Position.x[selEid];
      const by = Position.y[selEid];
      const rx = Building.rallyX[selEid];
      const ry = Building.rallyY[selEid];

      // Dashed line: approximate with short segments
      drawDashedLine(uiGfx, bx, by, rx, ry, 5, 5, 0x38bdf8, 2);

      // Rally dot
      uiGfx.circle(rx, ry, 4);
      uiGfx.fill(0x38bdf8);

      // Flag
      const flagBob = Math.sin(frameCount * 0.1) * 2;
      uiGfx.rect(rx, ry - 14 + flagBob, 8, 6);
      uiGfx.fill(0x38bdf8);
      uiGfx.rect(rx, ry - 14, 1, 14);
      uiGfx.fill(0x38bdf8);
    }
  }

  // Range rings for towers/snipers
  for (const selEid of world.selection) {
    if (Selectable.selected[selEid] !== 1) continue;
    const atkRange = Combat.attackRange[selEid];
    if (atkRange > 60) {
      const ex = Position.x[selEid];
      const ey = Position.y[selEid];
      drawDashedCircle(uiGfx, ex, ey, atkRange, 4, 4, 0xef4444, 1, 0.25);
    }
  }
}

// ---------------------------------------------------------------------------
// Selection rectangle
// ---------------------------------------------------------------------------

export function renderSelectionRect(
  sr: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  },
  camX: number,
  camY: number,
): void {
  const screenGfx = getScreenGfx();

  // Convert world-space coordinates to screen space for the screenLayer.
  const x = Math.min(sr.startX, sr.endX) - camX;
  const y = Math.min(sr.startY, sr.endY) - camY;
  const rw = Math.abs(sr.endX - sr.startX);
  const rh = Math.abs(sr.endY - sr.startY);

  // Fill
  screenGfx.rect(x, y, rw, rh);
  screenGfx.fill({ color: 0x22c55e, alpha: 0.15 });
  // Stroke
  screenGfx.rect(x, y, rw, rh);
  screenGfx.stroke({ width: 1, color: 0x22c55e });

  // Corner dots
  const corners: [number, number][] = [
    [x, y],
    [x + rw, y],
    [x, y + rh],
    [x + rw, y + rh],
  ];
  for (const [px, py] of corners) {
    screenGfx.circle(px, py, 3);
    screenGfx.fill(0x22c55e);
  }
}

// ---------------------------------------------------------------------------
// Building placement preview
// ---------------------------------------------------------------------------

export function renderPlacementPreview(
  placement: {
    worldX: number;
    worldY: number;
    buildingType: string;
    canPlace: boolean;
  },
  spriteCanvases: Map<SpriteIdType, HTMLCanvasElement>,
): void {
  const uiGfx = getUiGfx();

  const { worldX, worldY, buildingType, canPlace } = placement;
  const bx = Math.round(worldX / TILE_SIZE) * TILE_SIZE;
  const by = Math.round(worldY / TILE_SIZE) * TILE_SIZE;

  let placeSpriteId: SpriteIdType | null = null;
  if (buildingType === 'burrow') placeSpriteId = SpriteId.Burrow;
  else if (buildingType === 'armory') placeSpriteId = SpriteId.Armory;
  else if (buildingType === 'tower') placeSpriteId = SpriteId.Tower;
  else if (buildingType === 'watchtower') placeSpriteId = SpriteId.Watchtower;
  else if (buildingType === 'lodge') placeSpriteId = SpriteId.Lodge;
  else if (buildingType === 'wall') placeSpriteId = SpriteId.Wall;
  else if (buildingType === 'scout_post') placeSpriteId = SpriteId.ScoutPost;

  if (placeSpriteId !== null) {
    const sprCanvas = spriteCanvases.get(placeSpriteId);
    const tex = getTexture(placeSpriteId);
    if (sprCanvas && tex) {
      const sw = sprCanvas.width;
      const sh = sprCanvas.height;

      // Ghost sprite
      uiGfx.rect(bx - sw / 2, by - sh / 2, sw, sh);
      uiGfx.fill({
        color: canPlace ? 0x00ff00 : 0xff0000,
        alpha: canPlace ? 0.3 : 0.5,
      });
    }
  }
}

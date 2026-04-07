/**
 * PixiJS UI Renderer
 *
 * Selection rectangle, building placement preview, rally points, and range rings.
 */

import { Sprite } from 'pixi.js';

import { ENTITY_DEFS } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import { Building, Combat, EntityTypeTag, Patrol, Position, Selectable } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, SpriteId, type SpriteId as SpriteIdType } from '@/types';
import {
  drawDashedCircle,
  drawDashedLine,
  getScreenGfx,
  getTexture,
  getUiGfx,
  getUiLayer,
} from './init';
import { renderSpecialistAssignments } from './specialist-assignment-overlay';

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

  // Patrol routes for selected units with active patrols
  renderPatrolRoutes(world, uiGfx, frameCount);
  renderSpecialistAssignments(world, uiGfx);
}

/** Render dashed patrol route lines for selected units with active patrols. */
function renderPatrolRoutes(
  world: GameWorld,
  uiGfx: ReturnType<typeof getUiGfx>,
  frameCount: number,
): void {
  for (const selEid of world.selection) {
    if (Patrol.active[selEid] !== 1) continue;
    const waypoints = world.patrolWaypoints.get(selEid);
    if (!waypoints || waypoints.length < 2) continue;

    // Draw dashed lines between consecutive waypoints (looping)
    const color = 0x6dbb58; // --pw-moss-bright green
    for (let i = 0; i < waypoints.length; i++) {
      const from = waypoints[i];
      const to = waypoints[(i + 1) % waypoints.length];
      drawDashedLine(uiGfx, from.x, from.y, to.x, to.y, 6, 4, color, 1.5);
    }

    // Draw small dots at each waypoint
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const isCurrent = i === Patrol.currentWaypoint[selEid];
      const dotSize = isCurrent ? 4 : 3;
      const alpha = isCurrent ? 0.6 + 0.4 * Math.abs(Math.sin(frameCount * 0.08)) : 0.5;
      uiGfx.circle(wp.x, wp.y, dotSize);
      uiGfx.fill({ color, alpha });
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
// Building placement preview — ghost sprite with validity tinting
// ---------------------------------------------------------------------------

let ghostSprite: Sprite | null = null;
let ghostSpriteId: SpriteIdType | null = null;

function resolvePlacementSpriteId(buildingType: string): SpriteIdType | null {
  if (buildingType === 'burrow') return SpriteId.Burrow;
  if (buildingType === 'armory') return SpriteId.Armory;
  if (buildingType === 'tower') return SpriteId.Tower;
  if (buildingType === 'watchtower') return SpriteId.Watchtower;
  if (buildingType === 'lodge') return SpriteId.Lodge;
  if (buildingType === 'wall') return SpriteId.Wall;
  if (buildingType === 'scout_post') return SpriteId.ScoutPost;
  return null;
}

export function renderPlacementPreview(
  placement: {
    worldX: number;
    worldY: number;
    buildingType: string;
    canPlace: boolean;
  },
  _spriteCanvases: Map<SpriteIdType, HTMLCanvasElement>,
): void {
  const { worldX, worldY, buildingType, canPlace } = placement;
  const bx = Math.round(worldX / TILE_SIZE) * TILE_SIZE;
  const by = Math.round(worldY / TILE_SIZE) * TILE_SIZE;

  const placeSpriteId = resolvePlacementSpriteId(buildingType);
  if (placeSpriteId === null) {
    hidePlacementGhost();
    return;
  }

  const tex = getTexture(placeSpriteId);
  if (!tex) {
    hidePlacementGhost();
    return;
  }

  // Create or update the ghost sprite
  if (!ghostSprite || ghostSpriteId !== placeSpriteId) {
    if (ghostSprite) getUiLayer().removeChild(ghostSprite);
    ghostSprite = new Sprite(tex);
    ghostSprite.anchor.set(0.5, 0.5);
    getUiLayer().addChild(ghostSprite);
    ghostSpriteId = placeSpriteId;
  }

  ghostSprite.visible = true;
  ghostSprite.position.set(bx, by);
  ghostSprite.alpha = canPlace ? 0.35 : 0.45;
  ghostSprite.tint = canPlace ? 0x44ff44 : 0xff4444;
}

export function hidePlacementGhost(): void {
  if (ghostSprite) ghostSprite.visible = false;
}

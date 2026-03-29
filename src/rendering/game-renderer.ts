/**
 * Main Game Renderer
 *
 * Faithful port of the draw() function (lines 1329-1429) and Entity.draw()
 * (lines 1846-1920) from the original pond_craft.html.
 *
 * Uses Canvas2D rendering because the original game heavily relies on
 * Canvas2D features: globalCompositeOperation, createRadialGradient,
 * setLineDash, fillText with strokeText outlines, ellipse shadows, etc.
 *
 * The renderer draws in world-space (camera-translated), in this order:
 *  1. Black clear + background canvas
 *  2. Corpses with fade
 *  3. Entities Y-sorted: shadow, selection brackets, sprite (with facingLeft
 *     flip, damage flash, construction reveal), health bar, veterancy stars,
 *     carried resource indicator
 *  4. Ground pings (expanding rings)
 *  5. Particles
 *  6. Projectiles (with trails)
 *  7. Rally point lines and animated flags
 *  8. Range rings for towers/snipers
 *  9. Floating text with outlines
 * 10. Selection rectangle with corner dots
 * 11. Building placement preview with validity colouring
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import { CB_PALETTE, PALETTE, TILE_SIZE } from '@/constants';
import {
  Building,
  Carrying,
  Combat,
  EntityTypeTag,
  Health,
  Position,
  Selectable,
  Sprite,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { Corpse, GroundPing } from '@/types';
import { type EntityKind, ResourceType, SpriteId } from '@/types';
import { entityScales } from './animations';
import type { CameraShake } from './camera';
import {
  drawFloatingTexts,
  drawParticles,
  drawProjectiles,
  type ProjectileRenderData,
  updateProjectileTrails,
} from './particles';

/** Module-level color blind mode flag (avoids per-entity signal reads). */
let cbMode = false;

/** Set color blind mode on/off. Called by game.ts when the signal changes. */
export function setColorBlindMode(enabled: boolean): void {
  cbMode = enabled;
}

/** Data needed to draw the selection rectangle. */
export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/** Data needed for building placement preview. */
export interface PlacementPreview {
  worldX: number;
  worldY: number;
  buildingType: string;
  canPlace: boolean;
}

/** Full set of render inputs consumed each frame. */
export interface RenderFrameData {
  /** All live entity IDs, sorted by Y position. */
  sortedEids: number[];
  /** Corpses to draw. */
  corpses: Corpse[];
  /** Ground pings (move/attack markers). */
  groundPings: GroundPing[];
  /** Projectile render data. */
  projectiles: ProjectileRenderData[];
  /** Current frame number for animations. */
  frameCount: number;
  /** Camera shake offset. */
  shake: CameraShake;
  /** Selection rectangle (when dragging). */
  selectionRect: SelectionRect | null;
  /** Building placement preview. */
  placement: PlacementPreview | null;
  /** Whether mouse is down and not placing a building. */
  isDragging: boolean;
}

/**
 * Draw a single entity (port of Entity.draw, lines 1846-1920).
 */
function drawEntity(
  ctx: CanvasRenderingContext2D,
  eid: number,
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
  frameCount: number,
): void {
  const spriteId = Sprite.textureId[eid] as SpriteId;
  const sprite = spriteCanvases.get(spriteId);
  if (!sprite) return;

  const ex = Position.x[eid];
  const ey = Position.y[eid];
  const sw = Sprite.width[eid];
  const sh = Sprite.height[eid];
  const yOff = Sprite.yOffset[eid];
  const facingLeft = Sprite.facingLeft[eid] === 1;
  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const def = ENTITY_DEFS[kind];
  const isBuilding = def.isBuilding;
  const isResource = def.isResource;
  const selected = Selectable.selected[eid] === 1;
  const hp = Health.current[eid];
  const maxHp = Health.max[eid];
  const flashTimer = Health.flashTimer[eid];
  const progress = isBuilding ? Building.progress[eid] : 100;

  const dx = ex - sw / 2;
  const dy = ey - sh / 2 + yOff;

  // --- Shadow ---
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  const radius = sw / 2.5;
  ctx.ellipse(ex, ey + sh / 2 - 2, radius, radius / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Selection brackets ---
  if (selected) {
    const pad = 2;
    const bx = dx - pad;
    const by = dy - pad;
    const bw = sw + pad * 2;
    const bh = sh + pad * 2;
    const l = 6;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(bx, by + l);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + l, by);
    // Top-right corner
    ctx.moveTo(bx + bw - l, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + l);
    // Bottom-left corner
    ctx.moveTo(bx, by + bh - l);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + l, by + bh);
    // Bottom-right corner
    ctx.moveTo(bx + bw - l, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + bw, by + bh - l);
    ctx.stroke();
  }

  // --- Sprite (with flip, damage flash, construction reveal, squish) ---
  ctx.save();

  // Apply anime.js squish-stretch scale if active
  const animScale = entityScales.get(eid);
  if (animScale) {
    ctx.translate(ex, ey);
    ctx.scale(animScale.scaleX, animScale.scaleY);
    ctx.translate(-ex, -ey);
  }

  if (facingLeft && !isBuilding) {
    ctx.translate(ex, ey);
    ctx.scale(-1, 1);
    ctx.translate(-ex, -ey);
  }

  // Damage flash: reduce opacity before drawing
  if (flashTimer > 0) {
    ctx.globalAlpha = 0.7;
  }

  if (isBuilding && progress < 100) {
    // Construction reveal: draw partial sprite from bottom up
    ctx.globalAlpha = 0.5 + progress / 200;
    const revealH = sh * (progress / 100);
    const srcY = sprite.height * (1 - progress / 100);
    const srcH = sprite.height * (progress / 100);
    ctx.drawImage(sprite, 0, srcY, sprite.width, srcH, dx, dy + sh - revealH, sw, revealH);
    ctx.globalAlpha = 1.0;
    // Construction frame outline
    ctx.strokeStyle = '#b45309';
    ctx.strokeRect(dx, dy, sw, sh);
    // Construction progress percentage text
    ctx.font = "bold 10px 'Courier New'";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${Math.floor(progress)}%`, ex, dy - 4);
  } else {
    ctx.drawImage(sprite, dx, dy);
  }

  // Red tint overlay when taking damage (source-atop compositing)
  if (flashTimer > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 60, 60, ${flashTimer / 12})`;
    ctx.fillRect(dx, dy, sw, sh);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.globalAlpha = 1.0;
  ctx.restore();

  // --- Carried resource indicator ---
  const carriedRes = Carrying.resourceType[eid] as ResourceType;
  if (carriedRes !== undefined && carriedRes !== ResourceType.None) {
    ctx.fillStyle = carriedRes === ResourceType.Clams ? PALETTE.clamShell : PALETTE.reedBrown;
    ctx.fillRect(ex + 5, ey - 20, 6, 6);
    // Tiny sparkle on carried resource
    if (frameCount % 20 < 5) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(ex + 7, ey - 22, 2, 2);
    }
  }

  // --- Health bar ---
  if (selected || (hp < maxHp && !isResource)) {
    const bw = sw * 0.8;
    const bh = 4;
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(ex - bw / 2, dy - 8, bw, bh);
    const hpPct = hp / maxHp;
    ctx.fillStyle = cbMode
      ? hpPct > 0.6
        ? CB_PALETTE.healthHigh
        : hpPct > 0.3
          ? CB_PALETTE.healthMid
          : CB_PALETTE.healthLow
      : hpPct > 0.6
        ? '#22c55e'
        : hpPct > 0.3
          ? '#eab308'
          : '#ef4444';
    ctx.fillRect(ex - bw / 2, dy - 8, bw * hpPct, bh);
  }

  // --- Veterancy stars ---
  if (!isBuilding && !isResource) {
    const kills = Combat.kills[eid];
    if (kills !== undefined && kills >= 3) {
      const stars = Math.min(3, Math.floor(kills / 3));
      ctx.font = "8px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('\u2605'.repeat(stars), ex, dy - 12);
    }
  }
}

/**
 * Main draw call. Renders the full game scene onto the provided canvas context.
 *
 * @param ctx            - The main game canvas 2D context.
 * @param world          - Game world state.
 * @param bgCanvas       - Pre-rendered background canvas.
 * @param spriteCanvases - Map of SpriteId to HTMLCanvasElement for all sprites.
 * @param data           - Per-frame render data (sorted entities, corpses, etc).
 */
export function drawGame(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  bgCanvas: HTMLCanvasElement,
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
  data: RenderFrameData,
): void {
  const { camX, camY, viewWidth: w, viewHeight: h } = world;
  const { shake, frameCount } = data;

  // --- Clear ---
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  ctx.save();

  // --- Camera translation with screen shake ---
  ctx.translate(-Math.floor(camX) + shake.offsetX, -Math.floor(camY) + shake.offsetY);

  // --- Background ---
  ctx.drawImage(bgCanvas, 0, 0);

  // --- Corpses & Ruins ---
  for (const cp of data.corpses) {
    if (cp.x + 100 < camX || cp.x - 100 > camX + w || cp.y + 100 < camY || cp.y - 100 > camY + h) {
      continue;
    }
    ctx.globalAlpha = Math.min(1, cp.life / 60) * 0.7;
    const sprite = spriteCanvases.get(cp.spriteId);
    if (sprite) {
      const yAdj = cp.spriteId === SpriteId.Bones ? 4 : 0;
      ctx.drawImage(sprite, cp.x - sprite.width / 2, cp.y - sprite.height / 2 + yAdj);
    }
    ctx.globalAlpha = 1.0;
  }

  // --- Entities (Y-sorted) ---
  for (const eid of data.sortedEids) {
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    if (ex + 100 < camX || ex - 100 > camX + w || ey + 100 < camY || ey - 100 > camY + h) {
      continue;
    }
    drawEntity(ctx, eid, spriteCanvases, frameCount);
  }

  // --- Ground pings (expanding rings) ---
  for (const p of data.groundPings) {
    const progress = 1 - p.life / p.maxLife;
    ctx.strokeStyle = `rgba(${p.color}, ${1 - progress})`;
    ctx.lineWidth = 2;
    // Outer ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, progress * 15, 0, Math.PI * 2);
    ctx.stroke();
    // Inner ring (more visible)
    ctx.beginPath();
    ctx.arc(p.x, p.y, progress * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Particles ---
  drawParticles(ctx, world.particles);

  // --- Projectiles ---
  updateProjectileTrails(data.projectiles);
  drawProjectiles(ctx, data.projectiles);

  // --- Rally point display ---
  if (world.selection.length === 1) {
    const selEid = world.selection[0];
    const kind = EntityTypeTag.kind[selEid] as EntityKind;
    const def = ENTITY_DEFS[kind];
    if (def.isBuilding && Building.hasRally[selEid] === 1) {
      const bx = Position.x[selEid];
      const by = Position.y[selEid];
      const rx = Building.rallyX[selEid];
      const ry = Building.rallyY[selEid];

      // Dashed line from building to rally point
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);

      // Rally point circle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();

      // Animated rally flag
      const flagBob = Math.sin(frameCount * 0.1) * 2;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(rx, ry - 14 + flagBob, 8, 6);
      ctx.fillRect(rx, ry - 14, 1, 14);
    }
  }

  // --- Range rings for towers/snipers ---
  for (const selEid of world.selection) {
    if (Selectable.selected[selEid] !== 1) continue;
    const atkRange = Combat.attackRange[selEid];
    if (atkRange > 60) {
      const ex = Position.x[selEid];
      const ey = Position.y[selEid];
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(ex, ey, atkRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // --- Floating text ---
  drawFloatingTexts(ctx, world.floatingTexts);

  // --- Selection rectangle ---
  if (data.selectionRect && data.isDragging) {
    const sr = data.selectionRect;
    const x = Math.min(sr.startX, sr.endX);
    const y = Math.min(sr.startY, sr.endY);
    const rw = Math.abs(sr.endX - sr.startX);
    const rh = Math.abs(sr.endY - sr.startY);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, rw, rh);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
    ctx.fillRect(x, y, rw, rh);

    // Corner dots
    ctx.fillStyle = '#22c55e';
    const corners: [number, number][] = [
      [x, y],
      [x + rw, y],
      [x, y + rh],
      [x + rw, y + rh],
    ];
    for (const [px, py] of corners) {
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Building placement preview ---
  if (data.placement) {
    const { worldX, worldY, buildingType, canPlace } = data.placement;
    const bx = Math.round(worldX / TILE_SIZE) * TILE_SIZE;
    const by = Math.round(worldY / TILE_SIZE) * TILE_SIZE;

    // Find the sprite for this building type
    let placeSpriteId: SpriteId | null = null;
    if (buildingType === 'burrow') placeSpriteId = SpriteId.Burrow;
    else if (buildingType === 'armory') placeSpriteId = SpriteId.Armory;
    else if (buildingType === 'tower') placeSpriteId = SpriteId.Tower;

    if (placeSpriteId !== null) {
      const spr = spriteCanvases.get(placeSpriteId);
      if (spr) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(spr, bx - spr.width / 2, by - spr.height / 2);
        ctx.fillStyle = canPlace ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.5)';
        ctx.fillRect(bx - spr.width / 2, by - spr.height / 2, spr.width, spr.height);
        ctx.globalAlpha = 1.0;

        // Placement text
        ctx.font = "bold 11px 'Courier New'";
        ctx.textAlign = 'center';
        ctx.fillStyle = canPlace ? '#22c55e' : '#ef4444';
        ctx.fillText(
          canPlace ? 'Click to place (Esc cancel)' : 'Blocked!',
          bx,
          by - spr.height / 2 - 8,
        );
      }
    }
  }

  ctx.restore();
}
/**
 * PixiJS Entity Renderer
 *
 * Handles renderEntity() function, sprite management, health bars,
 * selection brackets, veteran stars, carried resource indicators,
 * construction progress overlays, veterancy recoloring, and status
 * effect tints (champion, poison, enrage).
 */

import { Sprite, Text, Texture } from 'pixi.js';

import { ENTITY_DEFS } from '@/config/entity-defs';
import { CB_PALETTE, PALETTE } from '@/constants';
import {
  Building,
  Carrying,
  EntityTypeTag,
  Health,
  Position,
  Resource,
  Selectable,
  Sprite as SpriteComp,
  Veterancy,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import {
  EntityKind,
  type EntityKind as EntityKindType,
  ResourceType,
  type SpriteId,
} from '@/types';
import { entityScales } from '../animations';
import { getRecoloredSprite, type RecolorPreset, veterancyPreset } from '../recolor';
import {
  colorToHex,
  drawStar,
  getBuildingProgressTexts,
  getCbMode,
  getEntityLayer,
  getEntityOverlayGfx,
  getEntitySprites,
  getTexture,
  getUnitLabelTexts,
  LABEL_STYLE,
  lerpTint,
  PROGRESS_STYLE,
  setDestroyRecoloredTexturesCallback,
} from './init';

// ---------------------------------------------------------------------------
// Recolored texture cache: cacheKey -> PixiJS Texture
// ---------------------------------------------------------------------------
const recoloredTextureCache = new Map<string, Texture>();

/** Get or create a PixiJS Texture for a recolored sprite. */
function getRecoloredTexture(
  spriteId: number,
  preset: RecolorPreset,
  sourceCanvas: HTMLCanvasElement,
): Texture {
  const key = `${spriteId}:${preset}`;
  let tex = recoloredTextureCache.get(key);
  if (!tex) {
    const recoloredCanvas = getRecoloredSprite(spriteId, preset, sourceCanvas);
    tex = Texture.from({ resource: recoloredCanvas, antialias: false });
    recoloredTextureCache.set(key, tex);
  }
  return tex;
}

// ---------------------------------------------------------------------------
// Sprite pool: reuse Sprite objects instead of create/destroy per entity
// ---------------------------------------------------------------------------
const spritePool: Sprite[] = [];

/** Acquire a sprite from the pool or create a new one. */
export function acquireSprite(tex: Texture): Sprite {
  const spr = spritePool.pop();
  if (spr) {
    spr.texture = tex;
    spr.visible = true;
    spr.alpha = 1;
    spr.tint = 0xffffff;
    spr.scale.set(1, 1);
    return spr;
  }
  const newSpr = new Sprite(tex);
  newSpr.anchor.set(0.5, 0.5);
  return newSpr;
}

/** Return a sprite to the pool instead of destroying it. */
export function releaseSprite(spr: Sprite): void {
  spr.visible = false;
  spritePool.push(spr);
}

// ---------------------------------------------------------------------------
// World reference (set each frame from renderEntity caller)
// ---------------------------------------------------------------------------
let _world: GameWorld | null = null;
let _spriteCanvases: Map<SpriteId, HTMLCanvasElement> | null = null;

/** Set world reference for status-effect queries during rendering. */
export function setEntityRendererContext(
  world: GameWorld,
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
): void {
  _world = world;
  _spriteCanvases = spriteCanvases;
}

/** Clear the recolored texture cache (call on game restart). */
export function clearRecoloredTextureCache(): void {
  for (const tex of recoloredTextureCache.values()) {
    tex.destroy(true);
  }
  recoloredTextureCache.clear();
}

// Register cleanup callback so destroyPixiApp can clear our cache
setDestroyRecoloredTexturesCallback(clearRecoloredTextureCache);

/** Render a single entity: sprite, health bar, selection brackets, etc. */
export function renderEntity(eid: number, frameCount: number): void {
  const spriteId = SpriteComp.textureId[eid] as SpriteId;
  const tex = getTexture(spriteId);
  if (!tex) return;

  const entityLayer = getEntityLayer();
  const entityOverlayGfx = getEntityOverlayGfx();
  const entitySprites = getEntitySprites();
  const buildingProgressTexts = getBuildingProgressTexts();
  const cbMode = getCbMode();

  const ex = Position.x[eid];
  const ey = Position.y[eid];

  // Viewport culling: skip rendering for off-screen entities
  if (_world) {
    const margin = 64;
    if (
      ex < _world.camX - margin ||
      ex > _world.camX + _world.viewWidth + margin ||
      ey < _world.camY - margin ||
      ey > _world.camY + _world.viewHeight + margin
    ) {
      const spr = getEntitySprites().get(eid);
      if (spr) spr.visible = false;
      return;
    }
  }

  const sw = SpriteComp.width[eid];
  const sh = SpriteComp.height[eid];
  const yOff = SpriteComp.yOffset[eid];
  const facingLeft = SpriteComp.facingLeft[eid] === 1;
  const kind = EntityTypeTag.kind[eid] as EntityKindType;
  const def = ENTITY_DEFS[kind];
  const isBuilding = def.isBuilding;
  const isResource = def.isResource;
  const selected = Selectable.selected[eid] === 1;
  const hp = Health.current[eid];
  const maxHp = Health.max[eid];
  const flashTimer = Health.flashTimer[eid];
  const progress = isBuilding ? Building.progress[eid] : 100;

  // --- Determine effective texture (may be recolored for veterans) ---
  let effectiveTex = tex;
  const vetRank = !isBuilding && !isResource ? (Veterancy.rank[eid] ?? 0) : 0;
  if (vetRank > 0 && _spriteCanvases) {
    const preset = veterancyPreset(vetRank);
    if (preset) {
      const sourceCanvas = _spriteCanvases.get(spriteId);
      if (sourceCanvas) {
        effectiveTex = getRecoloredTexture(spriteId, preset, sourceCanvas);
      }
    }
  }

  // --- Get or create sprite (pooled) ---
  let spr = entitySprites.get(eid);
  if (!spr) {
    spr = acquireSprite(effectiveTex);
    entitySprites.set(eid, spr);
    entityLayer.addChild(spr);
  } else {
    if (spr.texture !== effectiveTex) {
      spr.texture = effectiveTex;
    }
    // Re-show sprite that may have been hidden by viewport culling
    spr.visible = true;
  }

  // --- Position and Y-sort ---
  spr.position.set(ex, ey + yOff);
  spr.zIndex = ey;

  // --- Facing direction ---
  const animScale = entityScales.get(eid);
  let scaleX = 1;
  let scaleY = 1;
  if (animScale) {
    scaleX = animScale.scaleX;
    scaleY = animScale.scaleY;
  }
  if (facingLeft && !isBuilding) {
    scaleX = -scaleX;
  }
  spr.scale.set(scaleX, scaleY);

  // --- Alpha / flash / status effect tints ---
  if (flashTimer > 0) {
    spr.alpha = 0.7;
    spr.tint = lerpTint(0xffffff, 0xff3c3c, Math.min(1, flashTimer / 12));
  } else {
    spr.alpha = 1;
    // Determine tint from status effects
    const statusTint = getStatusTint(eid, kind);
    spr.tint = statusTint;
  }

  // --- Construction reveal ---
  if (isBuilding && progress < 100) {
    spr.alpha = 0.5 + progress / 200;
  }

  // --- Resource depletion fade ---
  if (isResource) {
    const maxAmount = def.resourceAmount ?? 1;
    const curAmount = Resource.amount[eid];
    const ratio = Math.max(0, curAmount / maxAmount);
    // Fade from full alpha to 0.3 as resource depletes
    spr.alpha = 0.3 + 0.7 * ratio;
  }

  // --- Shadow (drawn into entityOverlayGfx) ---
  const radius = sw / 2.5;
  entityOverlayGfx.ellipse(ex, ey + sh / 2 - 2, radius, radius / 2);
  entityOverlayGfx.fill({ color: 0x000000, alpha: 0.4 });

  // --- Selection brackets ---
  if (selected) {
    const dx = ex - sw / 2;
    const dy = ey - sh / 2 + yOff;
    const pad = 2;
    const bx = dx - pad;
    const by = dy - pad;
    const bw = sw + pad * 2;
    const bh = sh + pad * 2;
    const l = 6;

    entityOverlayGfx.setStrokeStyle({ width: 2, color: 0x38bdf8 });
    // Top-left
    entityOverlayGfx.moveTo(bx, by + l);
    entityOverlayGfx.lineTo(bx, by);
    entityOverlayGfx.lineTo(bx + l, by);
    entityOverlayGfx.stroke();
    // Top-right
    entityOverlayGfx.moveTo(bx + bw - l, by);
    entityOverlayGfx.lineTo(bx + bw, by);
    entityOverlayGfx.lineTo(bx + bw, by + l);
    entityOverlayGfx.stroke();
    // Bottom-left
    entityOverlayGfx.moveTo(bx, by + bh - l);
    entityOverlayGfx.lineTo(bx, by + bh);
    entityOverlayGfx.lineTo(bx + l, by + bh);
    entityOverlayGfx.stroke();
    // Bottom-right
    entityOverlayGfx.moveTo(bx + bw - l, by + bh);
    entityOverlayGfx.lineTo(bx + bw, by + bh);
    entityOverlayGfx.lineTo(bx + bw, by + bh - l);
    entityOverlayGfx.stroke();
  }

  // --- Carried resource indicator ---
  const carriedRes = Carrying.resourceType[eid] as ResourceType;
  if (carriedRes !== ResourceType.None) {
    const color = carriedRes === ResourceType.Clams ? PALETTE.clamShell : PALETTE.reedBrown;
    entityOverlayGfx.rect(ex + 5, ey - 20, 6, 6);
    entityOverlayGfx.fill(colorToHex(color));
    if (frameCount % 20 < 5) {
      entityOverlayGfx.rect(ex + 7, ey - 22, 2, 2);
      entityOverlayGfx.fill(0xffffff);
    }
  }

  // --- Health bar ---
  if (selected || (hp < maxHp && !isResource)) {
    const dy = ey - sh / 2 + yOff;
    const bw = sw * 0.8;
    const bh = 4;
    // Background
    entityOverlayGfx.rect(ex - bw / 2, dy - 8, bw, bh);
    entityOverlayGfx.fill(0x7f1d1d);
    // Fill
    const hpPct = hp / maxHp;
    let barColor: number;
    if (cbMode) {
      barColor =
        hpPct > 0.6
          ? colorToHex(CB_PALETTE.healthHigh)
          : hpPct > 0.3
            ? colorToHex(CB_PALETTE.healthMid)
            : colorToHex(CB_PALETTE.healthLow);
    } else {
      barColor = hpPct > 0.6 ? 0x22c55e : hpPct > 0.3 ? 0xeab308 : 0xef4444;
    }
    entityOverlayGfx.rect(ex - bw / 2, dy - 8, bw * hpPct, bh);
    entityOverlayGfx.fill(barColor);
  }

  // --- Veterancy stars (read from Veterancy component) ---
  if (!isBuilding && !isResource) {
    const rank = Veterancy.rank[eid] ?? 0;
    if (rank > 0) {
      const stars = rank; // 1=Veteran, 2=Elite, 3=Hero
      const dy = ey - sh / 2 + yOff;
      for (let s = 0; s < stars; s++) {
        const sx = ex - (stars * 6) / 2 + s * 6 + 3;
        const sy = dy - 14;
        drawStar(entityOverlayGfx, sx, sy, 3, 0xfbbf24);
      }
    }
  }

  // --- Selected unit name label ---
  const unitLabelTexts = getUnitLabelTexts();
  if (selected && !isResource) {
    let label = unitLabelTexts.get(eid);
    if (!label) {
      label = new Text({ text: '', style: LABEL_STYLE });
      label.anchor.set(0.5, 1);
      entityLayer.addChild(label);
      unitLabelTexts.set(eid, label);
    }
    label.text = EntityKind[kind] ?? '';
    const labelY = ey - sh / 2 + yOff - 16;
    label.position.set(ex, labelY);
    label.zIndex = ey + 1;
    label.visible = true;
  } else {
    const label = unitLabelTexts.get(eid);
    if (label) {
      entityLayer.removeChild(label);
      label.destroy();
      unitLabelTexts.delete(eid);
    }
  }

  // --- Construction frame outline & percentage ---
  if (isBuilding && progress < 100) {
    const dx = ex - sw / 2;
    const dy = ey - sh / 2 + yOff;
    entityOverlayGfx.rect(dx, dy, sw, sh);
    entityOverlayGfx.stroke({ width: 1, color: 0xb45309 });

    // Progress percentage text centered on building
    let progText = buildingProgressTexts.get(eid);
    if (!progText) {
      progText = new Text({ text: '', style: PROGRESS_STYLE });
      progText.anchor.set(0.5, 0.5);
      entityLayer.addChild(progText);
      buildingProgressTexts.set(eid, progText);
    }
    progText.text = `${Math.floor(progress)}%`;
    progText.position.set(ex, ey);
    progText.zIndex = ey + 1;
    progText.visible = true;
  } else {
    // Remove progress text if building is complete or not a building
    const progText = buildingProgressTexts.get(eid);
    if (progText) {
      entityLayer.removeChild(progText);
      progText.destroy();
      buildingProgressTexts.delete(eid);
    }
  }
}

// ---------------------------------------------------------------------------
// Status-effect tint helper
// ---------------------------------------------------------------------------

// Tint constants for status effects (PixiJS multiply-style tints)
const TINT_CHAMPION = 0xcc88ff; // Purple tint for champion enemies
const TINT_POISONED = 0x66ee66; // Green tint for poisoned units
const TINT_ENRAGED = 0xff6644; // Red-orange tint for enraged BossCroc
const TINT_NORMAL = 0xffffff; // No tint

/**
 * Determine the PixiJS tint color for an entity based on active status effects.
 * Priority: enraged > poisoned > champion > normal.
 */
function getStatusTint(eid: number, kind: EntityKindType): number {
  if (!_world) return TINT_NORMAL;

  // Enraged BossCroc (below 30% HP)
  if (kind === EntityKind.BossCroc) {
    const maxHp = Health.max[eid];
    if (maxHp > 0 && Health.current[eid] < maxHp * 0.3) {
      return TINT_ENRAGED;
    }
  }

  // Poisoned (VenomSnake poison)
  if (_world.poisonTimers.has(eid)) {
    return TINT_POISONED;
  }

  // Champion enemy
  if (_world.championEnemies.has(eid)) {
    return TINT_CHAMPION;
  }

  return TINT_NORMAL;
}

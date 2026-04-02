/**
 * PixiJS Entity Renderer
 *
 * Handles renderEntity(), sprite management, veterancy recoloring, and
 * status effect tints. Overlay drawing (brackets, health, labels, progress)
 * is in entity-overlays.ts. Status tints are in entity-tints.ts.
 */

import { Sprite, Texture } from 'pixi.js';

import { ENTITY_DEFS } from '@/config/entity-defs';
import { PALETTE } from '@/constants';
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
import { type EntityKind as EntityKindType, ResourceType, type SpriteId } from '@/types';
import { entityScales } from '../animations';
import { getRecoloredSprite, type RecolorPreset, veterancyPreset } from '../recolor';
import { getAnimVisuals, tickAnimation } from '../sprite-animation';
import {
  drawHealthBar,
  drawSelectionBrackets,
  renderBuildingProgress,
  renderUnitLabel,
} from './entity-overlays';
import { getStatusTint } from './entity-tints';
import {
  colorToHex,
  drawStar,
  getBuildingProgressTexts,
  getCbMode,
  getEntityLayer,
  getEntityOverlayGfx,
  getEntitySprites,
  getTexture,
  lerpTint,
  setDestroyRecoloredTexturesCallback,
} from './init';

// ---------------------------------------------------------------------------
// Recolored texture cache
// ---------------------------------------------------------------------------
const recoloredTextureCache = new Map<string, Texture>();

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
// Sprite pool
// ---------------------------------------------------------------------------
const spritePool: Sprite[] = [];

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

export function releaseSprite(spr: Sprite): void {
  spr.visible = false;
  spritePool.push(spr);
}

// ---------------------------------------------------------------------------
// World reference
// ---------------------------------------------------------------------------
let _world: GameWorld | null = null;
let _spriteCanvases: Map<SpriteId, HTMLCanvasElement> | null = null;

export function setEntityRendererContext(
  world: GameWorld,
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
): void {
  _world = world;
  _spriteCanvases = spriteCanvases;
}

export function clearRecoloredTextureCache(): void {
  for (const tex of recoloredTextureCache.values()) tex.destroy(true);
  recoloredTextureCache.clear();
}

setDestroyRecoloredTexturesCallback(clearRecoloredTextureCache);

/** Render a single entity: sprite, health bar, selection brackets, etc. */
export function renderEntity(eid: number, frameCount: number): void {
  const spriteId = SpriteComp.textureId[eid] as SpriteId;
  const tex = getTexture(spriteId);
  if (!tex) return;

  const entityLayer = getEntityLayer();
  const entityOverlayGfx = getEntityOverlayGfx();
  const entitySprites = getEntitySprites();
  const cbMode = getCbMode();

  const ex = Position.x[eid];
  const ey = Position.y[eid];

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

  let effectiveTex = tex;
  const vetRank = !isBuilding && !isResource ? (Veterancy.rank[eid] ?? 0) : 0;
  if (vetRank > 0 && _spriteCanvases) {
    const preset = veterancyPreset(vetRank);
    if (preset) {
      const sourceCanvas = _spriteCanvases.get(spriteId);
      if (sourceCanvas) effectiveTex = getRecoloredTexture(spriteId, preset, sourceCanvas);
    }
  }

  let spr = entitySprites.get(eid);
  if (!spr) {
    spr = acquireSprite(effectiveTex);
    entitySprites.set(eid, spr);
    entityLayer.addChild(spr);
  } else {
    if (spr.texture !== effectiveTex) spr.texture = effectiveTex;
    spr.visible = true;
  }

  spr.zIndex = ey;

  const animScale = entityScales.get(eid);
  let scaleX = 1;
  let scaleY = 1;
  if (animScale) {
    scaleX = animScale.scaleX;
    scaleY = animScale.scaleY;
  }

  // Apply sprite animation (walk/attack/idle) for non-building, non-resource entities
  let animYOff = 0;
  let animRotation = 0;
  if (!isBuilding && !isResource) {
    tickAnimation(eid);
    const anim = getAnimVisuals(eid);
    animYOff = anim.yOffset;
    scaleX *= anim.scaleX;
    scaleY *= anim.scaleY;
    animRotation = anim.rotation;
  }

  spr.position.set(ex, ey + yOff + animYOff);
  if (facingLeft && !isBuilding) scaleX = -scaleX;
  spr.scale.set(scaleX, scaleY);
  spr.rotation = animRotation;

  if (flashTimer > 0) {
    spr.alpha = 0.7;
    spr.tint = lerpTint(0xffffff, 0xff3c3c, Math.min(1, flashTimer / 12));
  } else {
    spr.alpha = 1;
    spr.tint = getStatusTint(eid, kind, _world);
  }

  if (isBuilding && progress < 100) spr.alpha = 0.5 + progress / 200;
  if (isResource) {
    const maxAmount = def.resourceAmount ?? 1;
    const resRatio = Math.max(0, Resource.amount[eid] / maxAmount);
    spr.alpha = 0.3 + 0.7 * resRatio;
    // Subtle pulse when resource is running low (< 20%)
    if (resRatio > 0 && resRatio < 0.2) {
      const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.15);
      spr.alpha = Math.max(0.2, spr.alpha * (0.6 + 0.4 * pulse));
      spr.tint = lerpTint(0xffffff, 0xff6600, 0.3 + 0.2 * pulse);
    }
  }

  // Shadow
  entityOverlayGfx.ellipse(ex, ey + sh / 2 - 2, sw / 2.5, sw / 2.5 / 2);
  entityOverlayGfx.fill({ color: 0x000000, alpha: 0.4 });

  if (selected) drawSelectionBrackets(entityOverlayGfx, ex, ey, sw, sh, yOff);

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

  if (selected || (hp < maxHp && !isResource))
    drawHealthBar(entityOverlayGfx, ex, ey, sw, sh, yOff, hp, maxHp, cbMode);

  if (!isBuilding && !isResource) {
    const rank = Veterancy.rank[eid] ?? 0;
    if (rank > 0) {
      const dy = ey - sh / 2 + yOff;
      for (let s = 0; s < rank; s++)
        drawStar(entityOverlayGfx, ex - (rank * 6) / 2 + s * 6 + 3, dy - 14, 3, 0xfbbf24);
    }
  }

  renderUnitLabel(eid, kind, isResource, selected, ex, ey, sh, yOff, entityLayer);
  renderBuildingProgress(
    eid,
    isBuilding,
    progress,
    ex,
    ey,
    sw,
    sh,
    yOff,
    entityOverlayGfx,
    getBuildingProgressTexts(),
    entityLayer,
  );
}

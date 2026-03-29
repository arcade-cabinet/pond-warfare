/**
 * PixiJS Entity Renderer
 *
 * Handles renderEntity() function, sprite management, health bars,
 * selection brackets, veteran stars, carried resource indicators,
 * and construction progress overlays.
 */

import { Sprite, Text } from 'pixi.js';

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
import { type EntityKind, ResourceType, type SpriteId } from '@/types';
import { entityScales } from '../animations';
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
  PROGRESS_STYLE,
} from './init';

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
  const sw = SpriteComp.width[eid];
  const sh = SpriteComp.height[eid];
  const yOff = SpriteComp.yOffset[eid];
  const facingLeft = SpriteComp.facingLeft[eid] === 1;
  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const def = ENTITY_DEFS[kind];
  const isBuilding = def.isBuilding;
  const isResource = def.isResource;
  const selected = Selectable.selected[eid] === 1;
  const hp = Health.current[eid];
  const maxHp = Health.max[eid];
  const flashTimer = Health.flashTimer[eid];
  const progress = isBuilding ? Building.progress[eid] : 100;

  // --- Get or create sprite ---
  let spr = entitySprites.get(eid);
  if (!spr) {
    spr = new Sprite(tex);
    spr.anchor.set(0.5, 0.5);
    entitySprites.set(eid, spr);
    entityLayer.addChild(spr);
  } else if (spr.texture !== tex) {
    spr.texture = tex;
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

  // --- Alpha / flash ---
  if (flashTimer > 0) {
    spr.alpha = 0.7;
    spr.tint = lerpTint(0xffffff, 0xff3c3c, Math.min(1, flashTimer / 12));
  } else {
    spr.alpha = 1;
    spr.tint = 0xffffff;
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

/**
 * Entity Overlay Renderers
 *
 * Selection brackets, health bars, unit name labels, and building progress.
 */

import { type Container, type Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { CB_PALETTE } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { getEntityDisplayName } from '@/game/unit-display';
import type { EntityKind as EntityKindType } from '@/types';
import { cleanupAutoSymbols } from './auto-symbol-overlay';
import {
  colorToHex,
  getUnitLabelTexts,
  LABEL_STYLE,
  PROGRESS_STYLE,
  setDestroyOverlayTextsCallback,
} from './init';

// Idle indicator "Z" text style (amber/warning color)
const IDLE_Z_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 12,
  fontWeight: 'bold',
  fill: 0xe8a030, // --pw-warning
  stroke: { color: 0x000000, width: 2 },
};

// Ctrl group badge text style
const CTRL_GROUP_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 9,
  fontWeight: 'bold',
  fill: 0x38bdf8, // --pw-accent
  stroke: { color: 0x000000, width: 2 },
};

// Idle indicator text cache
const idleZTexts = new Map<number, Text>();

// Ctrl group badge text cache
const ctrlGroupTexts = new Map<number, Text>();

/** Render a pulsing "Z" indicator above idle player units (idle > 180 frames). */
export function renderIdleIndicator(
  eid: number,
  idleFrames: number,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  frameCount: number,
  entityLayer: Container,
): void {
  if (idleFrames < 180) {
    removeIdleIndicator(eid, entityLayer);
    return;
  }

  let label = idleZTexts.get(eid);
  if (!label) {
    label = new Text({ text: 'z', style: IDLE_Z_STYLE });
    label.anchor.set(0.5, 1);
    entityLayer.addChild(label);
    idleZTexts.set(eid, label);
  }

  // Pulsing fade in/out animation
  const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frameCount * 0.08));
  label.alpha = pulse;
  label.position.set(ex + 8, ey - sh / 2 + yOff - 18);
  label.zIndex = ey + 2;
  label.visible = true;
}

/** Remove idle indicator for an entity. */
export function removeIdleIndicator(eid: number, entityLayer: Container): void {
  const label = idleZTexts.get(eid);
  if (label) {
    entityLayer.removeChild(label);
    label.destroy();
    idleZTexts.delete(eid);
  }
}

/** Render a ctrl group number badge above a unit. */
export function renderCtrlGroupBadge(
  eid: number,
  groupNum: number,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  entityLayer: Container,
): void {
  let label = ctrlGroupTexts.get(eid);
  if (!label) {
    label = new Text({ text: '', style: CTRL_GROUP_STYLE });
    label.anchor.set(0.5, 1);
    entityLayer.addChild(label);
    ctrlGroupTexts.set(eid, label);
  }
  label.text = String(groupNum);
  label.position.set(ex - 8, ey - sh / 2 + yOff - 18);
  label.zIndex = ey + 2;
  label.visible = true;
}

/** Remove ctrl group badge for an entity. */
export function removeCtrlGroupBadge(eid: number, entityLayer: Container): void {
  const label = ctrlGroupTexts.get(eid);
  if (label) {
    entityLayer.removeChild(label);
    label.destroy();
    ctrlGroupTexts.delete(eid);
  }
}

/** Clean up all cached overlay texts (call on destroy). */
export function cleanupOverlayTexts(): void {
  for (const t of idleZTexts.values()) t.destroy();
  idleZTexts.clear();
  for (const t of ctrlGroupTexts.values()) t.destroy();
  ctrlGroupTexts.clear();
  for (const t of getUnitLabelTexts().values()) t.destroy();
  getUnitLabelTexts().clear();
  cleanupAutoSymbols();
}

setDestroyOverlayTextsCallback(cleanupOverlayTexts);

export function drawSelectionBrackets(
  gfx: Graphics,
  ex: number,
  ey: number,
  sw: number,
  sh: number,
  yOff: number,
): void {
  const dx = ex - sw / 2;
  const dy = ey - sh / 2 + yOff;
  const pad = 2;
  const bx = dx - pad;
  const by = dy - pad;
  const bw = sw + pad * 2;
  const bh = sh + pad * 2;
  const l = 6;

  gfx.setStrokeStyle({ width: 2, color: 0x38bdf8 });
  gfx.moveTo(bx, by + l);
  gfx.lineTo(bx, by);
  gfx.lineTo(bx + l, by);
  gfx.stroke();
  gfx.moveTo(bx + bw - l, by);
  gfx.lineTo(bx + bw, by);
  gfx.lineTo(bx + bw, by + l);
  gfx.stroke();
  gfx.moveTo(bx, by + bh - l);
  gfx.lineTo(bx, by + bh);
  gfx.lineTo(bx + l, by + bh);
  gfx.stroke();
  gfx.moveTo(bx + bw - l, by + bh);
  gfx.lineTo(bx + bw, by + bh);
  gfx.lineTo(bx + bw, by + bh - l);
  gfx.stroke();
}

export function drawHealthBar(
  gfx: Graphics,
  ex: number,
  ey: number,
  sw: number,
  sh: number,
  yOff: number,
  hp: number,
  maxHp: number,
  cbMode: boolean,
): void {
  const dy = ey - sh / 2 + yOff;
  const bw = sw * 0.8;
  const bh = 4;
  gfx.rect(ex - bw / 2, dy - 8, bw, bh);
  gfx.fill(0x7f1d1d);
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
  gfx.rect(ex - bw / 2, dy - 8, bw * hpPct, bh);
  gfx.fill(barColor);
}

export function renderUnitLabel(
  world: Pick<GameWorld, 'specialistAssignments'> | null,
  eid: number,
  kind: EntityKindType,
  isResource: boolean,
  selected: boolean,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  entityLayer: Container,
): void {
  const unitLabelTexts = getUnitLabelTexts();
  if (selected && !isResource) {
    let label = unitLabelTexts.get(eid);
    if (!label) {
      label = new Text({ text: '', style: LABEL_STYLE });
      label.anchor.set(0.5, 1);
      entityLayer.addChild(label);
      unitLabelTexts.set(eid, label);
    }
    label.text = world ? getEntityDisplayName(world, eid) : String(kind);
    label.position.set(ex, ey - sh / 2 + yOff - 16);
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
}

export function renderBuildingProgress(
  eid: number,
  isBuilding: boolean,
  progress: number,
  ex: number,
  ey: number,
  sw: number,
  sh: number,
  yOff: number,
  entityOverlayGfx: Graphics,
  buildingProgressTexts: Map<number, Text>,
  entityLayer: Container,
): void {
  if (isBuilding && progress < 100) {
    entityOverlayGfx.rect(ex - sw / 2, ey - sh / 2 + yOff, sw, sh);
    entityOverlayGfx.stroke({ width: 1, color: 0xb45309 });

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
    const progText = buildingProgressTexts.get(eid);
    if (progText) {
      entityLayer.removeChild(progText);
      progText.destroy();
      buildingProgressTexts.delete(eid);
    }
  }
}

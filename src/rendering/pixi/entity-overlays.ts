/**
 * Entity Overlay Renderers
 *
 * Selection brackets, health bars, unit name labels, and building progress.
 */

import { type Container, type Graphics, Text } from 'pixi.js';
import { CB_PALETTE } from '@/constants';
import { EntityKind, type EntityKind as EntityKindType } from '@/types';
import { colorToHex, getUnitLabelTexts, LABEL_STYLE, PROGRESS_STYLE } from './init';

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
    label.text = EntityKind[kind] ?? '';
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

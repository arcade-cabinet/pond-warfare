/**
 * PixiJS Effects Renderer
 *
 * Particles, projectiles, floating text, ground pings, and corpses.
 */

import { Sprite, Text } from 'pixi.js';

import { PALETTE } from '@/constants';
import type { Corpse, FloatingText, GroundPing, Particle } from '@/types';
import { SpriteId, type SpriteId as SpriteIdType } from '@/types';
import type { ProjectileRenderData } from '../particles';
import {
  colorToHex,
  COURIER_STYLE,
  getBgLayer,
  getCorpseSprites,
  getEffectGfx,
  getEffectLayer,
  getFloatingTextPool,
  getFloatingTextSprites,
  getTexture,
  parseRgbString,
} from './init';

// ---------------------------------------------------------------------------
// Corpse rendering
// ---------------------------------------------------------------------------

export function renderCorpses(
  corpses: Corpse[],
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  _spriteCanvases: Map<SpriteIdType, HTMLCanvasElement>,
): void {
  const bgLayer = getBgLayer();
  const corpseSprites = getCorpseSprites();

  // Track which corpse indices are present
  const usedKeys = new Set<number>();

  for (let i = 0; i < corpses.length; i++) {
    const cp = corpses[i];
    if (
      cp.x + 100 < camX ||
      cp.x - 100 > camX + vw ||
      cp.y + 100 < camY ||
      cp.y - 100 > camY + vh
    ) {
      continue;
    }

    // Use corpse's stable unique ID as key
    const key = cp.id;
    usedKeys.add(key);

    let spr = corpseSprites.get(key);
    if (!spr) {
      const tex = getTexture(cp.spriteId);
      if (!tex) continue;
      spr = new Sprite(tex);
      spr.anchor.set(0.5, 0.5);
      corpseSprites.set(key, spr);
      bgLayer.addChild(spr);
    }

    const yAdj = cp.spriteId === SpriteId.Bones ? 4 : 0;
    spr.position.set(cp.x, cp.y + yAdj);
    spr.alpha = Math.min(1, cp.life / 60) * 0.7;
    spr.visible = true;
  }

  // Hide/remove corpse sprites no longer needed
  for (const [key, spr] of corpseSprites) {
    if (!usedKeys.has(key)) {
      bgLayer.removeChild(spr);
      spr.destroy();
      corpseSprites.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Ground pings
// ---------------------------------------------------------------------------

export function renderGroundPings(pings: GroundPing[]): void {
  const effectGfx = getEffectGfx();

  for (const p of pings) {
    const progress = 1 - p.life / p.maxLife;
    const alpha = 1 - progress;
    const color = parseRgbString(p.color);

    effectGfx.setStrokeStyle({ width: 2, color, alpha });
    // Outer ring
    effectGfx.circle(p.x, p.y, progress * 15);
    effectGfx.stroke();
    // Inner ring
    effectGfx.circle(p.x, p.y, progress * 8);
    effectGfx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function renderParticles(particles: Particle[]): void {
  const effectGfx = getEffectGfx();

  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / 10));
    effectGfx.rect(p.x, p.y, p.size, p.size);
    effectGfx.fill({ color: colorToHex(p.color), alpha });
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export function renderProjectiles(projectiles: ProjectileRenderData[]): void {
  const effectGfx = getEffectGfx();

  for (const proj of projectiles) {
    // Trail
    for (const t of proj.trail) {
      const alpha = (t.life / 8) * 0.6;
      effectGfx.rect(t.x - 1, t.y - 1, 2, 2);
      effectGfx.fill({ color: 0x9ca3af, alpha });
    }
    // Body
    effectGfx.rect(proj.x - 2, proj.y - 2, 4, 4);
    effectGfx.fill(colorToHex(PALETTE.stone));
    effectGfx.rect(proj.x - 1, proj.y - 1, 2, 2);
    effectGfx.fill(0xffffff);
  }
}

// ---------------------------------------------------------------------------
// Floating text
// ---------------------------------------------------------------------------

export function renderFloatingTexts(texts: FloatingText[]): void {
  const effectLayer = getEffectLayer();
  const floatingTextSprites = getFloatingTextSprites();
  const floatingTextPool = getFloatingTextPool();

  // Return unused text objects to pool
  while (floatingTextSprites.length > texts.length) {
    const t = floatingTextSprites.pop();
    if (!t) break;
    t.visible = false;
    floatingTextPool.push(t);
  }

  for (let i = 0; i < texts.length; i++) {
    const f = texts[i];
    let textObj: Text;
    if (i < floatingTextSprites.length) {
      textObj = floatingTextSprites[i];
    } else {
      const pooled = floatingTextPool.pop();
      if (pooled) {
        textObj = pooled;
      } else {
        textObj = new Text({ text: '', style: COURIER_STYLE });
        textObj.anchor.set(0.5, 0.5);
        effectLayer.addChild(textObj);
      }
      floatingTextSprites.push(textObj);
    }

    textObj.text = f.text;
    textObj.style.fill = colorToHex(f.color);
    textObj.position.set(f.x, f.y);
    textObj.alpha = Math.max(0, Math.min(1, f.life / 30));
    textObj.visible = true;
  }
}

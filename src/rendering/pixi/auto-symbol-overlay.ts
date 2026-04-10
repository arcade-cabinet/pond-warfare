/**
 * Auto-Symbol Overlay Renderer
 *
 * Renders a small tappable icon above units that have an active AutoSymbol.
 * Icons pulse gently and fade as the timer expires. Tapping an icon
 * sets AutoSymbol.confirmed=1, causing the ECS system to re-issue the
 * unit's last command as a looping behavior.
 */

import { type Container, Text, type TextStyleOptions } from 'pixi.js';

import { AutoSymbol, SymbolType } from '@/ecs/components';
import { AUTO_SYMBOL_DURATION } from '@/ecs/systems/auto-symbol';

/** Map symbol type to a themed character. */
const SYMBOL_CHARS: Record<number, string> = {
  [SymbolType.Gather]: '\u{1F41F}', // Fish
  [SymbolType.Attack]: '\u{2694}', // Crossed swords
  [SymbolType.Heal]: '\u{271A}', // Heavy Greek cross
  [SymbolType.Recon]: '\u{1F441}', // Eye
};

const SYMBOL_STYLE: TextStyleOptions = {
  fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
  fontSize: 16,
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
};

/** Cached Text objects per entity. */
const symbolTexts = new Map<number, Text>();

/**
 * Render (or update) the auto-symbol icon above a unit.
 * Called per-entity from the entity renderer.
 */
export function renderAutoSymbol(
  eid: number,
  ex: number,
  ey: number,
  sh: number,
  yOff: number,
  frameCount: number,
  entityLayer: Container,
): void {
  const active = AutoSymbol.active[eid] === 1;
  const timer = AutoSymbol.timer[eid];

  if (!active || timer <= 0) {
    removeAutoSymbol(eid, entityLayer);
    return;
  }

  const symType = AutoSymbol.symbolType[eid];
  const char = SYMBOL_CHARS[symType] ?? '?';

  let label = symbolTexts.get(eid);
  if (!label) {
    label = new Text({ text: char, style: SYMBOL_STYLE });
    label.anchor.set(0.5, 1);
    label.eventMode = 'static';
    label.cursor = 'pointer';
    label.on('pointerdown', () => {
      AutoSymbol.confirmed[eid] = 1;
    });
    entityLayer.addChild(label);
    symbolTexts.set(eid, label);
  }

  // Update character in case symbol type changed
  if (label.text !== char) label.text = char;

  // Position above the unit (above idle Z / vet stars)
  label.position.set(ex, ey - sh / 2 + yOff - 26);
  label.zIndex = ey + 3;

  // Pulse animation: scale oscillates 1.0 -> 1.15 -> 1.0
  const pulse = 1.0 + 0.15 * Math.sin(frameCount * 0.1);
  label.scale.set(pulse, pulse);

  // Fade as timer approaches 0
  label.alpha = Math.min(1, timer / (AUTO_SYMBOL_DURATION * 0.25));
  label.visible = true;
}

/** Remove auto-symbol overlay for an entity. */
export function removeAutoSymbol(eid: number, entityLayer: Container): void {
  const label = symbolTexts.get(eid);
  if (label) {
    entityLayer.removeChild(label);
    label.destroy();
    symbolTexts.delete(eid);
  }
}

/** Clean up all cached auto-symbol texts (call on destroy/restart). */
export function cleanupAutoSymbols(): void {
  for (const t of symbolTexts.values()) t.destroy();
  symbolTexts.clear();
}

/**
 * Check if a screen-space point hits any auto-symbol icon.
 * Returns the entity ID if hit, or -1.
 * Used by pointer-click to intercept taps on symbols.
 */
export function hitTestAutoSymbol(worldX: number, worldY: number): number {
  for (const [eid, label] of symbolTexts) {
    if (!label.visible) continue;
    const bounds = label.getBounds();
    if (
      worldX >= bounds.x &&
      worldX <= bounds.x + bounds.width &&
      worldY >= bounds.y &&
      worldY <= bounds.y + bounds.height
    ) {
      return eid;
    }
  }
  return -1;
}

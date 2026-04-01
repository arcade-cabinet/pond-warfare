/**
 * PixiJS Drawing Utilities
 *
 * Shared drawing helpers for color conversion, tint interpolation,
 * dashed lines, dashed circles, and star shapes.
 */

import type { Graphics } from 'pixi.js';

/** Convert a CSS hex color string (e.g. "#22c55e") to a numeric hex value. */
export function colorToHex(color: string): number {
  if (color.startsWith('#')) {
    return Number.parseInt(color.slice(1), 16);
  }
  if (color.startsWith('rgb')) return parseRgbString(color);
  return 0xffffff;
}

/** Parse "r, g, b" or "rgba(r, g, b, a)" string to a hex number. */
export function parseRgbString(rgb: string): number {
  const inner = rgb.replace(/^rgba?\(/, '').replace(/\)$/, '');
  const parts = inner
    .split(',')
    .map((s) => Math.max(0, Math.min(255, Math.round(parseFloat(s.trim())))));
  if (parts.length >= 3) {
    return (parts[0] << 16) | (parts[1] << 8) | parts[2];
  }
  return 0xffffff;
}

/** Linearly interpolate between two tint colors. */
export function lerpTint(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Draw a small 5-pointed star shape. */
export function drawStar(gfx: Graphics, cx: number, cy: number, r: number, color: number): void {
  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.4;
    points.push(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
  }
  gfx.poly(points, true);
  gfx.fill(color);
}

/** Draw a dashed line between two points. */
export function drawDashedLine(
  gfx: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLen: number,
  gapLen: number,
  color: number,
  width: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist;
  const uy = dy / dist;
  const segLen = dashLen + gapLen;
  let d = 0;

  gfx.setStrokeStyle({ width, color });
  while (d < dist) {
    const end = Math.min(d + dashLen, dist);
    gfx.moveTo(x1 + ux * d, y1 + uy * d);
    gfx.lineTo(x1 + ux * end, y1 + uy * end);
    gfx.stroke();
    d += segLen;
  }
}

/** Draw a dashed circle. */
export function drawDashedCircle(
  gfx: Graphics,
  cx: number,
  cy: number,
  radius: number,
  dashLen: number,
  gapLen: number,
  color: number,
  width: number,
  alpha: number,
): void {
  const circumference = 2 * Math.PI * radius;
  const segLen = dashLen + gapLen;
  const segments = Math.floor(circumference / segLen);
  const dashAngle = (dashLen / circumference) * Math.PI * 2;
  const segAngle = (Math.PI * 2) / segments;

  gfx.setStrokeStyle({ width, color, alpha });
  for (let i = 0; i < segments; i++) {
    const startAngle = i * segAngle;
    const endAngle = startAngle + dashAngle;
    gfx.arc(cx, cy, radius, startAngle, endAngle);
    gfx.stroke();
  }
}

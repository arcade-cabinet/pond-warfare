/**
 * PixiJS Application - Initialization & Shared State
 *
 * Creates and manages the PixiJS 8 Application for the main game canvas.
 * Exposes layer containers, texture cache, and sprite pools that are
 * imported by the other pixi sub-modules.
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  type Text,
  type TextStyleOptions,
  Texture,
} from 'pixi.js';

import type { SpriteId } from '@/types';

// ---------------------------------------------------------------------------
// Color blind mode flag
// ---------------------------------------------------------------------------
let cbMode = false;

export function setCbMode(enabled: boolean): void {
  cbMode = enabled;
}

export function getCbMode(): boolean {
  return cbMode;
}

// ---------------------------------------------------------------------------
// PlacementPreview type (used by Game orchestrator)
// ---------------------------------------------------------------------------
export interface PlacementPreview {
  buildingType: string;
  worldX: number;
  worldY: number;
  canPlace: boolean;
}

// ---------------------------------------------------------------------------
// Layer containers (added to app.stage in init)
// ---------------------------------------------------------------------------
let bgLayer: Container;
let entityLayer: Container;
let effectLayer: Container;
let uiLayer: Container;
/** Screen-space layer: child of stage but positioned inversely to cancel camera transform. */
let screenLayer: Container;

export function getBgLayer(): Container {
  return bgLayer;
}
export function getEntityLayer(): Container {
  return entityLayer;
}
export function getEffectLayer(): Container {
  return effectLayer;
}
export function getUiLayer(): Container {
  return uiLayer;
}
export function getScreenLayer(): Container {
  return screenLayer;
}

// ---------------------------------------------------------------------------
// PixiJS Application singleton
// ---------------------------------------------------------------------------
let app: Application;

export function getApp(): Application {
  return app;
}

/** Whether the PixiJS application has been initialised. */
let initialised = false;

export function isInitialised(): boolean {
  return initialised;
}

// ---------------------------------------------------------------------------
// Sprite texture cache (canvas -> Texture)
// ---------------------------------------------------------------------------
const textureCache = new Map<SpriteId, Texture>();

/** Convert a procedural sprite canvas to a PixiJS Texture and cache it. */
export function registerSpriteTexture(id: SpriteId, canvas: HTMLCanvasElement): void {
  const tex = Texture.from({ resource: canvas, antialias: false });
  textureCache.set(id, tex);
}

/** Get a cached PixiJS Texture for a SpriteId. */
export function getTexture(id: SpriteId): Texture | undefined {
  return textureCache.get(id);
}

// ---------------------------------------------------------------------------
// Background sprite (single large Sprite covering the world)
// ---------------------------------------------------------------------------
let bgSprite: Sprite | null = null;

// ---------------------------------------------------------------------------
// Entity sprite pool: ECS entity ID -> PixiJS Sprite
// ---------------------------------------------------------------------------
const entitySprites = new Map<number, Sprite>();

export function getEntitySprites(): Map<number, Sprite> {
  return entitySprites;
}

// ---------------------------------------------------------------------------
// Reusable Graphics objects for overlays drawn every frame
// ---------------------------------------------------------------------------
let entityOverlayGfx: Graphics;
let effectGfx: Graphics;
let uiGfx: Graphics;
/** Graphics drawn in screen space (selection rect, etc.) */
let screenGfx: Graphics;

export function getEntityOverlayGfx(): Graphics {
  return entityOverlayGfx;
}
export function getEffectGfx(): Graphics {
  return effectGfx;
}
export function getUiGfx(): Graphics {
  return uiGfx;
}
export function getScreenGfx(): Graphics {
  return screenGfx;
}

// ---------------------------------------------------------------------------
// Building progress text pool
// ---------------------------------------------------------------------------
const buildingProgressTexts = new Map<number, Text>();

export function getBuildingProgressTexts(): Map<number, Text> {
  return buildingProgressTexts;
}

// ---------------------------------------------------------------------------
// Floating text pool
// ---------------------------------------------------------------------------
const floatingTextSprites: Text[] = [];
const floatingTextPool: Text[] = [];

export function getFloatingTextSprites(): Text[] {
  return floatingTextSprites;
}
export function getFloatingTextPool(): Text[] {
  return floatingTextPool;
}

export const COURIER_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 14,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 1 },
};

export const PROGRESS_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 12,
  fontWeight: 'bold',
  fill: 0xfbbf24,
  stroke: { color: 0x000000, width: 2 },
};

// ---------------------------------------------------------------------------
// Corpse sprite pool
// ---------------------------------------------------------------------------
const corpseSprites = new Map<number, Sprite>();

export function getCorpseSprites(): Map<number, Sprite> {
  return corpseSprites;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise the PixiJS Application.
 *
 * Must be called once after DOM canvases exist. The PixiJS app renders onto
 * the provided `gameCanvas` element.
 */
export async function initPixiApp(
  gameCanvas: HTMLCanvasElement,
  viewWidth: number,
  viewHeight: number,
): Promise<Application> {
  app = new Application();
  await app.init({
    canvas: gameCanvas,
    width: viewWidth,
    height: viewHeight,
    backgroundColor: 0x000000,
    antialias: false,
    resolution: 1,
    autoDensity: false,
    preference: 'webgl',
  });

  // Create layer containers
  bgLayer = new Container();
  bgLayer.label = 'bgLayer';

  entityLayer = new Container();
  entityLayer.label = 'entityLayer';
  entityLayer.sortableChildren = true;

  effectLayer = new Container();
  effectLayer.label = 'effectLayer';

  uiLayer = new Container();
  uiLayer.label = 'uiLayer';

  // Screen-space layer: positioned inversely each frame so its children
  // are effectively in screen coordinates (not affected by camera pan).
  screenLayer = new Container();
  screenLayer.label = 'screenLayer';

  app.stage.addChild(bgLayer, entityLayer, effectLayer, uiLayer, screenLayer);

  // Reusable Graphics objects
  entityOverlayGfx = new Graphics();
  entityLayer.addChild(entityOverlayGfx);
  // Push it to the very top of entity layer so it draws above sprites
  entityOverlayGfx.zIndex = 999999;

  effectGfx = new Graphics();
  effectLayer.addChild(effectGfx);

  uiGfx = new Graphics();
  uiLayer.addChild(uiGfx);

  screenGfx = new Graphics();
  screenLayer.addChild(screenGfx);

  initialised = true;
  return app;
}

/** Resize the PixiJS renderer to match the new viewport dimensions. */
export function resizePixiApp(width: number, height: number): void {
  if (!initialised) return;
  app.renderer.resize(width, height);
}

/** Set the background terrain canvas. Call once after buildBackground(). */
export function setBackground(bgCanvas: HTMLCanvasElement): void {
  if (!initialised) return;
  const tex = Texture.from({ resource: bgCanvas, antialias: false });
  bgSprite = new Sprite(tex);
  bgLayer.addChild(bgSprite);
}

/** Destroy the PixiJS application and free resources. */
export function destroyPixiApp(): void {
  if (!initialised) return;
  // Clean up sprite pool
  for (const spr of entitySprites.values()) {
    spr.destroy();
  }
  entitySprites.clear();
  // Clean up building progress texts
  for (const t of buildingProgressTexts.values()) t.destroy();
  buildingProgressTexts.clear();
  // Clean up corpse sprites
  for (const spr of corpseSprites.values()) spr.destroy();
  corpseSprites.clear();
  // Clean up floating text pool
  for (const t of floatingTextSprites) t.destroy();
  floatingTextSprites.length = 0;
  for (const t of floatingTextPool) t.destroy();
  floatingTextPool.length = 0;
  bgSprite = null;
  app.destroy(false, { children: true, texture: false });
  initialised = false;
}

// ---------------------------------------------------------------------------
// Utility helpers (shared across sub-modules)
// ---------------------------------------------------------------------------

/** Convert a CSS hex color string (e.g. "#22c55e") to a numeric hex value. */
export function colorToHex(color: string): number {
  if (color.startsWith('#')) {
    return Number.parseInt(color.slice(1), 16);
  }
  if (color.startsWith('rgb')) return parseRgbString(color);
  // Fallback - return white for unknown formats
  return 0xffffff;
}

/** Parse "r, g, b" or "rgba(r, g, b, a)" string (used by GroundPing.color) to a hex number. */
export function parseRgbString(rgb: string): number {
  // Strip rgba(...) or rgb(...) wrapper if present
  const inner = rgb.replace(/^rgba?\(/, '').replace(/\)$/, '');
  const parts = inner
    .split(',')
    .map((s) => Math.max(0, Math.min(255, Math.round(parseFloat(s.trim())))));
  if (parts.length >= 3) {
    return (parts[0] << 16) | (parts[1] << 8) | parts[2];
  }
  return 0xffffff;
}

/**
 * Linearly interpolate between two tint colors.
 * Used for damage flash effect.
 */
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

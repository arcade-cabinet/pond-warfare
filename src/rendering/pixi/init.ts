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

// Color blind mode flag
let cbMode = false;
export function setCbMode(enabled: boolean): void {
  cbMode = enabled;
}
export function getCbMode(): boolean {
  return cbMode;
}

export interface PlacementPreview {
  buildingType: string;
  worldX: number;
  worldY: number;
  canPlace: boolean;
}

// Layer containers
let bgLayer: Container;
let entityLayer: Container;
let effectLayer: Container;
let uiLayer: Container;
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

// PixiJS Application singleton
let app: Application;
export function getApp(): Application {
  return app;
}

let initialised = false;
export function isInitialised(): boolean {
  return initialised;
}

// Sprite texture cache
const textureCache = new Map<SpriteId, Texture>();

export function registerSpriteTexture(id: SpriteId, canvas: HTMLCanvasElement): void {
  const tex = Texture.from({ resource: canvas, antialias: false });
  textureCache.set(id, tex);
}

export function getTexture(id: SpriteId): Texture | undefined {
  return textureCache.get(id);
}

let bgSprite: Sprite | null = null;

// Entity sprite pool
const entitySprites = new Map<number, Sprite>();
export function getEntitySprites(): Map<number, Sprite> {
  return entitySprites;
}

// Reusable Graphics objects for overlays drawn every frame
let entityOverlayGfx: Graphics;
let effectGfx: Graphics;
let uiGfx: Graphics;
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

// Text pools
const buildingProgressTexts = new Map<number, Text>();
export function getBuildingProgressTexts(): Map<number, Text> {
  return buildingProgressTexts;
}

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

export const LABEL_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 10,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
};

const unitLabelTexts = new Map<number, Text>();
export function getUnitLabelTexts(): Map<number, Text> {
  return unitLabelTexts;
}

const corpseSprites = new Map<number, Sprite>();
export function getCorpseSprites(): Map<number, Sprite> {
  return corpseSprites;
}

// Initialisation

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
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
  });

  bgLayer = new Container();
  bgLayer.label = 'bgLayer';
  entityLayer = new Container();
  entityLayer.label = 'entityLayer';
  entityLayer.sortableChildren = true;
  effectLayer = new Container();
  effectLayer.label = 'effectLayer';
  uiLayer = new Container();
  uiLayer.label = 'uiLayer';
  screenLayer = new Container();
  screenLayer.label = 'screenLayer';

  app.stage.addChild(bgLayer, entityLayer, effectLayer, uiLayer, screenLayer);

  entityOverlayGfx = new Graphics();
  entityLayer.addChild(entityOverlayGfx);
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

export function resizePixiApp(width: number, height: number): void {
  if (!initialised) return;
  app.renderer.resize(width, height);
}

export function setBackground(bgCanvas: HTMLCanvasElement): void {
  if (!initialised) return;
  const tex = Texture.from({ resource: bgCanvas, antialias: false });
  bgSprite = new Sprite(tex);
  bgLayer.addChild(bgSprite);
}

export function destroyPixiApp(): void {
  if (!initialised) return;
  for (const spr of entitySprites.values()) spr.destroy();
  entitySprites.clear();
  for (const t of buildingProgressTexts.values()) t.destroy();
  buildingProgressTexts.clear();
  for (const spr of corpseSprites.values()) spr.destroy();
  corpseSprites.clear();
  for (const t of floatingTextSprites) t.destroy();
  floatingTextSprites.length = 0;
  for (const t of floatingTextPool) t.destroy();
  floatingTextPool.length = 0;
  _destroyRecoloredTextures?.();
  bgSprite = null;
  app.destroy(false, { children: true, texture: false });
  initialised = false;
}

let _destroyRecoloredTextures: (() => void) | null = null;
export function setDestroyRecoloredTexturesCallback(cb: () => void): void {
  _destroyRecoloredTextures = cb;
}

// Utility helpers - re-exported from draw-utils.ts
export {
  colorToHex,
  drawDashedCircle,
  drawDashedLine,
  drawStar,
  lerpTint,
  parseRgbString,
} from './draw-utils';

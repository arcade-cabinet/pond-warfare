/**
 * PixiJS Application Manager
 *
 * Creates and manages the PixiJS 8 Application for the main game canvas.
 * Uses layer containers for rendering order:
 *   bgLayer      -> Background terrain
 *   entityLayer  -> Y-sorted entities (sprites, health bars, selection brackets)
 *   effectLayer  -> Particles, projectiles, ground pings, floating text
 *   uiLayer      -> Selection rectangle, building placement preview, rally lines
 *
 * Fog-of-war, dynamic lighting, and minimap remain Canvas2D overlays
 * (they rely on CSS mix-blend-mode compositing that PixiJS cannot replicate).
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  type TextStyleOptions,
  Texture,
} from 'pixi.js';

import { ENTITY_DEFS } from '@/config/entity-defs';
import { CB_PALETTE, PALETTE, TILE_SIZE } from '@/constants';
import {
  Building,
  Carrying,
  Combat,
  EntityTypeTag,
  Health,
  Position,
  Resource,
  Selectable,
  Sprite as SpriteComp,
  Veterancy,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { Corpse, FloatingText, GroundPing, Particle } from '@/types';
import { type EntityKind, ResourceType, SpriteId } from '@/types';
import { entityScales } from './animations';
import type { CameraShake } from './camera';
import type { ProjectileRenderData } from './particles';

// ---------------------------------------------------------------------------
// Color blind mode flag
// ---------------------------------------------------------------------------
let cbMode = false;

export function setColorBlindMode(enabled: boolean): void {
  cbMode = enabled;
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

// ---------------------------------------------------------------------------
// PixiJS Application singleton
// ---------------------------------------------------------------------------
let app: Application;

/** Whether the PixiJS application has been initialised. */
let initialised = false;

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

// ---------------------------------------------------------------------------
// Reusable Graphics objects for overlays drawn every frame
// ---------------------------------------------------------------------------
let entityOverlayGfx: Graphics;
let effectGfx: Graphics;
let uiGfx: Graphics;

// ---------------------------------------------------------------------------
// Building progress text pool
// ---------------------------------------------------------------------------
const buildingProgressTexts = new Map<number, Text>();

// ---------------------------------------------------------------------------
// Floating text pool
// ---------------------------------------------------------------------------
const floatingTextSprites: Text[] = [];
const floatingTextPool: Text[] = [];

const COURIER_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 14,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 1 },
};

const PROGRESS_STYLE: TextStyleOptions = {
  fontFamily: 'Courier New',
  fontSize: 12,
  fontWeight: 'bold',
  fill: 0xfbbf24,
  stroke: { color: 0x000000, width: 2 },
};

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

  app.stage.addChild(bgLayer, entityLayer, effectLayer, uiLayer);

  // Reusable Graphics objects
  entityOverlayGfx = new Graphics();
  entityLayer.addChild(entityOverlayGfx);
  // Push it to the very top of entity layer so it draws above sprites
  entityOverlayGfx.zIndex = 999999;

  effectGfx = new Graphics();
  effectLayer.addChild(effectGfx);

  uiGfx = new Graphics();
  uiLayer.addChild(uiGfx);

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
// Per-frame render
// ---------------------------------------------------------------------------

/** Full per-frame render data consumed by renderPixiFrame. */
export interface PixiRenderFrameData {
  sortedEids: number[];
  corpses: Corpse[];
  groundPings: GroundPing[];
  projectiles: ProjectileRenderData[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  frameCount: number;
  shake: CameraShake;
  selectionRect: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  placement: {
    worldX: number;
    worldY: number;
    buildingType: string;
    canPlace: boolean;
  } | null;
  isDragging: boolean;
}

/**
 * Render a single frame using PixiJS.
 *
 * This replaces the old Canvas2D `drawGame()` call. Camera transform, entity
 * sprites, health bars, selection brackets, particles, projectiles, rally
 * lines, range rings, floating text, selection rect, and placement preview
 * are all rendered through PixiJS layer containers.
 */
export function renderPixiFrame(
  world: GameWorld,
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
  data: PixiRenderFrameData,
): void {
  if (!initialised) return;

  const { camX, camY } = world;
  const { shake, frameCount } = data;

  // --- Camera transform (applied to stage) ---
  app.stage.position.set(-Math.floor(camX) + shake.offsetX, -Math.floor(camY) + shake.offsetY);

  // --- Clear reusable graphics ---
  entityOverlayGfx.clear();
  effectGfx.clear();
  uiGfx.clear();

  // --- Track which entity sprites are still alive this frame ---
  const aliveEids = new Set<number>();

  // --- Corpses ---
  renderCorpses(data.corpses, camX, camY, world.viewWidth, world.viewHeight, spriteCanvases);

  // --- Entities (Y-sorted) ---
  for (const eid of data.sortedEids) {
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    // Frustum cull
    if (
      ex + 100 < camX ||
      ex - 100 > camX + world.viewWidth ||
      ey + 100 < camY ||
      ey - 100 > camY + world.viewHeight
    ) {
      continue;
    }
    aliveEids.add(eid);
    renderEntity(eid, frameCount);
  }

  // --- Remove sprites for dead/removed entities ---
  for (const [eid, spr] of entitySprites) {
    if (!aliveEids.has(eid)) {
      entityLayer.removeChild(spr);
      spr.destroy();
      entitySprites.delete(eid);
      // Also clean up any building progress text
      const progText = buildingProgressTexts.get(eid);
      if (progText) {
        entityLayer.removeChild(progText);
        progText.destroy();
        buildingProgressTexts.delete(eid);
      }
    }
  }

  // --- Ground pings ---
  renderGroundPings(data.groundPings);

  // --- Particles ---
  renderParticles(data.particles);

  // --- Projectiles ---
  renderProjectiles(data.projectiles);

  // --- Rally points & range rings ---
  renderRallyAndRange(world, frameCount);

  // --- Floating text ---
  renderFloatingTexts(data.floatingTexts);

  // --- Selection rectangle ---
  if (data.selectionRect && data.isDragging) {
    renderSelectionRect(data.selectionRect);
  }

  // --- Building placement preview ---
  if (data.placement) {
    renderPlacementPreview(data.placement, spriteCanvases);
  }

  // --- Tell PixiJS to render ---
  app.render();
}

// ---------------------------------------------------------------------------
// Corpse rendering
// ---------------------------------------------------------------------------

const corpseSprites = new Map<number, Sprite>();

function renderCorpses(
  corpses: Corpse[],
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  _spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
): void {
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
      const tex = textureCache.get(cp.spriteId);
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
// Entity rendering
// ---------------------------------------------------------------------------

function renderEntity(eid: number, frameCount: number): void {
  const spriteId = SpriteComp.textureId[eid] as SpriteId;
  const tex = textureCache.get(spriteId);
  if (!tex) return;

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

// ---------------------------------------------------------------------------
// Ground pings
// ---------------------------------------------------------------------------

function renderGroundPings(pings: GroundPing[]): void {
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

function renderParticles(particles: Particle[]): void {
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / 10));
    effectGfx.rect(p.x, p.y, p.size, p.size);
    effectGfx.fill({ color: colorToHex(p.color), alpha });
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

function renderProjectiles(projectiles: ProjectileRenderData[]): void {
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
// Rally points & range rings
// ---------------------------------------------------------------------------

function renderRallyAndRange(world: GameWorld, frameCount: number): void {
  // Rally point display
  if (world.selection.length === 1) {
    const selEid = world.selection[0];
    const kind = EntityTypeTag.kind[selEid] as EntityKind;
    const def = ENTITY_DEFS[kind];
    if (def.isBuilding && Building.hasRally[selEid] === 1) {
      const bx = Position.x[selEid];
      const by = Position.y[selEid];
      const rx = Building.rallyX[selEid];
      const ry = Building.rallyY[selEid];

      // Dashed line: approximate with short segments
      drawDashedLine(uiGfx, bx, by, rx, ry, 5, 5, 0x38bdf8, 2);

      // Rally dot
      uiGfx.circle(rx, ry, 4);
      uiGfx.fill(0x38bdf8);

      // Flag
      const flagBob = Math.sin(frameCount * 0.1) * 2;
      uiGfx.rect(rx, ry - 14 + flagBob, 8, 6);
      uiGfx.fill(0x38bdf8);
      uiGfx.rect(rx, ry - 14, 1, 14);
      uiGfx.fill(0x38bdf8);
    }
  }

  // Range rings for towers/snipers
  for (const selEid of world.selection) {
    if (Selectable.selected[selEid] !== 1) continue;
    const atkRange = Combat.attackRange[selEid];
    if (atkRange > 60) {
      const ex = Position.x[selEid];
      const ey = Position.y[selEid];
      drawDashedCircle(uiGfx, ex, ey, atkRange, 4, 4, 0xef4444, 1, 0.25);
    }
  }
}

// ---------------------------------------------------------------------------
// Floating text
// ---------------------------------------------------------------------------

function renderFloatingTexts(texts: FloatingText[]): void {
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

// ---------------------------------------------------------------------------
// Selection rectangle
// ---------------------------------------------------------------------------

function renderSelectionRect(sr: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): void {
  const x = Math.min(sr.startX, sr.endX);
  const y = Math.min(sr.startY, sr.endY);
  const rw = Math.abs(sr.endX - sr.startX);
  const rh = Math.abs(sr.endY - sr.startY);

  // Fill
  uiGfx.rect(x, y, rw, rh);
  uiGfx.fill({ color: 0x22c55e, alpha: 0.15 });
  // Stroke
  uiGfx.rect(x, y, rw, rh);
  uiGfx.stroke({ width: 1, color: 0x22c55e });

  // Corner dots
  const corners: [number, number][] = [
    [x, y],
    [x + rw, y],
    [x, y + rh],
    [x + rw, y + rh],
  ];
  for (const [px, py] of corners) {
    uiGfx.circle(px, py, 3);
    uiGfx.fill(0x22c55e);
  }
}

// ---------------------------------------------------------------------------
// Building placement preview
// ---------------------------------------------------------------------------

function renderPlacementPreview(
  placement: {
    worldX: number;
    worldY: number;
    buildingType: string;
    canPlace: boolean;
  },
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>,
): void {
  const { worldX, worldY, buildingType, canPlace } = placement;
  const bx = Math.round(worldX / TILE_SIZE) * TILE_SIZE;
  const by = Math.round(worldY / TILE_SIZE) * TILE_SIZE;

  let placeSpriteId: SpriteId | null = null;
  if (buildingType === 'burrow') placeSpriteId = SpriteId.Burrow;
  else if (buildingType === 'armory') placeSpriteId = SpriteId.Armory;
  else if (buildingType === 'tower') placeSpriteId = SpriteId.Tower;
  else if (buildingType === 'watchtower') placeSpriteId = SpriteId.Watchtower;

  if (placeSpriteId !== null) {
    const sprCanvas = spriteCanvases.get(placeSpriteId);
    const tex = textureCache.get(placeSpriteId);
    if (sprCanvas && tex) {
      const sw = sprCanvas.width;
      const sh = sprCanvas.height;

      // Ghost sprite
      uiGfx.rect(bx - sw / 2, by - sh / 2, sw, sh);
      uiGfx.fill({
        color: canPlace ? 0x00ff00 : 0xff0000,
        alpha: canPlace ? 0.3 : 0.5,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Convert a CSS hex color string (e.g. "#22c55e") to a numeric hex value. */
function colorToHex(color: string): number {
  if (color.startsWith('#')) {
    return Number.parseInt(color.slice(1), 16);
  }
  // Fallback for rgb() strings - just return white
  return 0xffffff;
}

/** Parse "r, g, b" or "rgba(r, g, b, a)" string (used by GroundPing.color) to a hex number. */
function parseRgbString(rgb: string): number {
  // Strip rgba(...) or rgb(...) wrapper if present
  const inner = rgb.replace(/^rgba?\(/, '').replace(/\)$/, '');
  const parts = inner.split(',').map((s) => Number.parseInt(s.trim(), 10));
  if (parts.length >= 3) {
    return (parts[0] << 16) | (parts[1] << 8) | parts[2];
  }
  return 0xffffff;
}

/**
 * Linearly interpolate between two tint colors.
 * Used for damage flash effect.
 */
function lerpTint(a: number, b: number, t: number): number {
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
function drawStar(gfx: Graphics, cx: number, cy: number, r: number, color: number): void {
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
function drawDashedLine(
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
function drawDashedCircle(
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

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

import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { updateWaterRipples } from '@/rendering/water-ripple';
import type { Corpse, FloatingText, GroundPing, Particle, SpriteId } from '@/types';
import type { CameraShake } from '../camera';
import type { ProjectileRenderData } from '../particles';
import {
  renderCorpses,
  renderFloatingTexts,
  renderGroundPings,
  renderParticles,
  renderProjectiles,
} from './effects-renderer';
import { releaseSprite, renderEntity, setEntityRendererContext } from './entity-renderer';
import {
  getApp,
  getBuildingProgressTexts,
  getEffectGfx,
  getEntityLayer,
  getEntityOverlayGfx,
  getEntitySprites,
  getScreenGfx,
  getScreenLayer,
  getUiGfx,
  isInitialised,
} from './init';
import {
  hidePlacementGhost,
  renderPlacementPreview,
  renderRallyAndRange,
  renderSelectionRect,
} from './ui-renderer';

// Re-export entity renderer utilities
export { clearRecoloredTextureCache } from './entity-renderer';
// Re-export init functions and types that external modules import
// Re-export setColorBlindMode using the init module's setCbMode
export {
  destroyPixiApp,
  getTexture,
  initPixiApp,
  type PlacementPreview,
  registerSpriteTexture,
  resizePixiApp,
  setBackground,
  setCbMode as setColorBlindMode,
} from './init';

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
  if (!isInitialised()) return;

  const app = getApp();
  const screenLayer = getScreenLayer();
  const entityOverlayGfx = getEntityOverlayGfx();
  const effectGfx = getEffectGfx();
  const uiGfx = getUiGfx();
  const screenGfx = getScreenGfx();
  const entitySprites = getEntitySprites();
  const entityLayer = getEntityLayer();
  const buildingProgressTexts = getBuildingProgressTexts();

  const { camX, camY } = world;
  const { shake, frameCount } = data;

  // --- Camera transform (applied to stage) with zoom ---
  const zoom = world.zoomLevel;
  const stageX = -Math.floor(camX) * zoom + shake.offsetX;
  const stageY = -Math.floor(camY) * zoom + shake.offsetY;
  app.stage.scale.set(zoom, zoom);
  app.stage.position.set(stageX, stageY);

  // Position the screen layer inversely so its children draw in screen space.
  screenLayer.position.set(-stageX / zoom, -stageY / zoom);
  screenLayer.scale.set(1 / zoom, 1 / zoom);

  // --- Clear reusable graphics ---
  entityOverlayGfx.clear();
  effectGfx.clear();
  uiGfx.clear();
  screenGfx.clear();

  // --- Water ripple frame cycling ---
  updateWaterRipples(frameCount);

  // --- Track which entity sprites are still alive this frame ---
  const aliveEids = new Set<number>();

  // --- Set world context for entity renderer (status effects, champion lookup) ---
  setEntityRendererContext(world, spriteCanvases);

  // --- Corpses ---
  renderCorpses(data.corpses, camX, camY, world.viewWidth, world.viewHeight, spriteCanvases);

  // --- Entities (Y-sorted) ---
  const cullMargin = 64; // Buffer for sprite size overflow
  for (const eid of data.sortedEids) {
    aliveEids.add(eid);
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    // Viewport frustum cull: skip rendering for off-screen entities
    if (
      ex < camX - cullMargin ||
      ex > camX + world.viewWidth + cullMargin ||
      ey < camY - cullMargin ||
      ey > camY + world.viewHeight + cullMargin
    ) {
      // Entity is alive but off-screen: hide its sprite if it has one
      const spr = entitySprites.get(eid);
      if (spr) spr.visible = false;
      continue;
    }
    renderEntity(eid, frameCount);
  }

  // --- Remove sprites for dead/removed entities (return to pool) ---
  for (const [eid, spr] of entitySprites) {
    if (!aliveEids.has(eid)) {
      entityLayer.removeChild(spr);
      releaseSprite(spr);
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

  // --- Selection rectangle (drawn in screen space) ---
  if (data.selectionRect && data.isDragging) {
    renderSelectionRect(data.selectionRect, camX, camY);
  }

  // --- Building placement preview ---
  if (data.placement) {
    renderPlacementPreview(data.placement, spriteCanvases);
  } else {
    hidePlacementGhost();
  }

  // --- Tell PixiJS to render ---
  app.render();
}

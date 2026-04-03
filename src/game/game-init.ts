/**
 * Game Init – canvas setup, rendering pipeline, input wiring, loop state construction.
 *
 * Extracted from Game.init() to keep the orchestrator under 300 LOC.
 */

import { resetBarkState } from '@/config/barks';
import { Position, Selectable } from '@/ecs/components';
import { initFogOfWar } from '@/ecs/systems/fog-of-war';
import { resetRandomEvents } from '@/ecs/systems/random-events';
import type { GameWorld } from '@/ecs/world';
import { setZoom } from '@/game/camera';
import { installLifecycleListeners } from '@/game/game-lifecycle';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { buildKeyboardCallbacks, buildPointerCallbacks } from '@/game/input-setup';
import {
  applyVerticalMapToWorld,
  buildVerticalTerrain,
  generateVerticalMapLayout,
} from '@/game/vertical-map';
import { KeyboardHandler } from '@/input/keyboard';
import { PointerHandler } from '@/input/pointer';
import { canDockPanels } from '@/platform';
import { buildBackground, buildExploredCanvas, buildFogTexture } from '@/rendering/background';
import type { FogRendererState } from '@/rendering/fog-renderer';
import { getBgLayer } from '@/rendering/pixi/init';
import { initPixiApp, setBackground, setColorBlindMode } from '@/rendering/pixi-app';
import { generateAllSprites } from '@/rendering/sprites';
import { attachRippleSprites, initWaterRipples } from '@/rendering/water-ripple';
import type { ReplayRecorder } from '@/replay';
import { loadAchievements, resetAchievementMatchState } from '@/systems/achievements';
import type { SpriteId } from '@/types';
import * as store from '@/ui/store';
import { SeededRandom } from '@/utils/random';

let lifecycleListenersInstalled = false;

/** All canvas and rendering refs produced by initCanvases(). */
export interface CanvasRefs {
  fogCtx: CanvasRenderingContext2D;
  lightCtx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement;
  fogState: FogRendererState;
  exploredCanvas: HTMLCanvasElement;
  exploredCtx: CanvasRenderingContext2D;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>;
}

/** Set up all canvases, PixiJS, fog, and explored layer. */
export async function initCanvases(
  world: GameWorld,
  container: HTMLElement,
  gameCanvas: HTMLCanvasElement,
  fogCanvas: HTMLCanvasElement,
  lightCanvas: HTMLCanvasElement,
): Promise<CanvasRefs> {
  const fogCtx = fogCanvas.getContext('2d')!;
  const lightCtx = lightCanvas.getContext('2d')!;
  if (!fogCtx || !lightCtx) throw new Error('Failed to acquire 2D context');

  const { canvases } = generateAllSprites();

  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  world.viewWidth = w;
  world.viewHeight = h;

  // Pass viewport dimensions so the background canvas extends beyond the
  // playable area (deep water fill) if the map is smaller than the viewport.
  const bgCanvas = buildBackground(world.terrainGrid, world.worldWidth, world.worldHeight, w, h);

  fogCanvas.width = w * dpr;
  fogCanvas.height = h * dpr;
  fogCanvas.style.width = `${w}px`;
  fogCanvas.style.height = `${h}px`;
  lightCanvas.width = w * dpr;
  lightCanvas.height = h * dpr;
  lightCanvas.style.width = `${w}px`;
  lightCanvas.style.height = `${h}px`;
  fogCtx.scale(dpr, dpr);
  fogCtx.imageSmoothingEnabled = false;
  lightCtx.scale(dpr, dpr);

  await initPixiApp(gameCanvas, w, h);
  setBackground(bgCanvas);

  // Water ripple overlays (non-blocking: init in background)
  if (world.terrainGrid) {
    initWaterRipples(world.terrainGrid)
      .then(() => attachRippleSprites(getBgLayer()))
      .catch(() => {});
  }

  const { fogPattern } = buildFogTexture(fogCtx);
  const fogState: FogRendererState = { fogCtx, fogPattern };

  const explored = buildExploredCanvas(world.worldWidth, world.worldHeight);
  initFogOfWar(explored.exploredCtx);

  return {
    fogCtx,
    lightCtx,
    bgCanvas,
    fogState,
    exploredCanvas: explored.exploredCanvas,
    exploredCtx: explored.exploredCtx,
    spriteCanvases: canvases,
  };
}

/** Reset world and session state for a new game. */
export function resetSession(world: GameWorld): void {
  resetBarkState();
  resetAchievementMatchState();
  resetRandomEvents();
  loadAchievements().catch(() => {});
}

/** Wire up keyboard and pointer handlers. */
export interface InputRefs {
  keyboard: KeyboardHandler;
  pointer: PointerHandler;
}

export function setupInput(
  world: GameWorld,
  container: HTMLElement,
  gameCanvas: HTMLCanvasElement,
  minimapCanvas: HTMLCanvasElement,
  recorder: ReplayRecorder,
  syncUIStore: () => void,
  cycleSpeed: () => void,
  playUnitSelectSound: () => void,
): InputRefs {
  const keyCallbacks = buildKeyboardCallbacks({
    world,
    recorder,
    syncUIStore,
    cycleSpeed,
    playUnitSelectSound,
  });
  const keyboard = new KeyboardHandler(world, keyCallbacks);

  // Pointer needs a lazy reference since pointer isn't created yet
  let pointerRef: PointerHandler | null = null;
  const ptrCallbacks = buildPointerCallbacks({
    world,
    recorder,
    syncUIStore,
    playUnitSelectSound,
    getPointerMouse: () => pointerRef?.mouse as { worldX: number; worldY: number },
  });
  const pointer = new PointerHandler(world, container, gameCanvas, ptrCallbacks);
  pointerRef = pointer;
  pointer.attachMinimap(minimapCanvas);
  pointer.setShiftGetter(() => !!keyboard.keys.shift);
  pointer.onZoomChange = (zoom) => {
    setZoom(world, zoom);
    // Caller must call resize() after
  };

  return { keyboard, pointer };
}

/** Apply custom map seed from the store to the world. */
export function applyMapSeed(world: GameWorld): void {
  const seedStr = store.customMapSeed.value;
  if (!seedStr || seedStr.length === 0) return;
  const parsed = Number(seedStr);
  if (Number.isFinite(parsed) && parsed > 0) {
    world.mapSeed = Math.floor(parsed);
  } else {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
    }
    world.mapSeed = hash || 1;
  }
}

/** Center camera on the first selected entity (Lodge) or map center. */
export function centerCameraOnLodge(world: GameWorld): void {
  const lodge = world.selection[0];
  if (lodge != null) {
    world.camX = Position.x[lodge] - world.viewWidth / 2;
    world.camY = Position.y[lodge] - world.viewHeight / 2;
    Selectable.selected[lodge] = 1;
    world.isTracking = true;
  } else {
    world.camX = world.worldWidth / 2 - world.viewWidth / 2;
    world.camY = world.worldHeight / 2 - world.viewHeight / 2;
  }
}

/** Spawn fireflies on the world. */
export function spawnFireflies(world: GameWorld): void {
  const rng = world.gameRng;
  world.fireflies = Array.from({ length: 150 }, () => ({
    x: rng.next() * world.worldWidth,
    y: rng.next() * world.worldHeight,
    vx: rng.next() - 0.5,
    vy: (rng.next() - 0.5) * 0.5 - 0.2,
    phase: rng.next() * Math.PI * 2,
  }));
}

/** Install once-only lifecycle listeners if not already done. */
export function ensureLifecycleListeners(world: GameWorld): void {
  if (!lifecycleListenersInstalled) {
    lifecycleListenersInstalled = true;
    installLifecycleListeners(world);
  }
}

/** Set up audio init and color blind mode subscription. */
export function setupColorBlind(): () => void {
  return store.colorBlindMode.subscribe((enabled) => {
    setColorBlindMode(enabled);
  });
}

/** Set up panel dock subscription for resize. */
export function setupDockResize(resizeFn: () => void): () => void {
  return canDockPanels.subscribe(() => {
    requestAnimationFrame(resizeFn);
  });
}

/**
 * Generate and apply the v3 vertical map, spawning all entities.
 *
 * Replaces the old scenario-based spawnInitialEntities() flow.
 * - Generates vertical layout from terrain.json progression scaling
 * - Builds terrain grid with water, rocks, mud paths
 * - Spawns Lodge at bottom, resources in middle, enemies at top
 * - Updates world dimensions and terrain grid
 */
export function spawnVerticalWorld(world: GameWorld, progressionLevel = 0): void {
  const rng = new SeededRandom(world.mapSeed);

  // Generate vertical layout from terrain.json config
  const layout = generateVerticalMapLayout(progressionLevel, rng);

  // Build terrain grid for this layout
  const terrain = buildVerticalTerrain(layout, rng);

  // Apply layout to world (sets terrainGrid, world dimensions)
  applyVerticalMapToWorld(world, layout, terrain);
  world.worldWidth = layout.worldWidth;
  world.worldHeight = layout.worldHeight;

  // Spawn entities (Lodge, units, resources, enemies)
  spawnVerticalEntities(world, layout, rng);

  // Floating text announcing the map
  const lodge = world.selection[0];
  const textX = lodge != null ? Position.x[lodge] : layout.lodgeX;
  const textY = lodge != null ? Position.y[lodge] - 80 : layout.lodgeY - 80;
  world.floatingTexts.push({
    x: textX,
    y: textY,
    text: 'MAP: Vertical',
    color: '#38bdf8',
    life: 180,
  });
}

export { createGameWorld } from '@/ecs/world';
export { applyDifficultyModifiers } from '@/game/difficulty';
export { setupAudio } from '@/game/game-lifecycle';
export { startGameLoop, wireWebGLHandlers } from '@/game/game-loop-setup';
export { spawnInitialEntities } from '@/game/init-entities/index';

/**
 * Game Init – canvas setup, rendering pipeline, input wiring, loop state construction.
 *
 * Extracted from Game.init() to keep the orchestrator under 300 LOC.
 */

import { initAdvisorState } from '@/advisors/advisor-state';
import { resetBarkState } from '@/config/barks';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { Position, Selectable } from '@/ecs/components';
import { initFogOfWar } from '@/ecs/systems/fog-of-war';
import type { GameWorld } from '@/ecs/world';
import { setZoom } from '@/game/camera';
import { installLifecycleListeners } from '@/game/game-lifecycle';
import { type GameLoopState, gameLoop } from '@/game/game-loop';
import { buildKeyboardCallbacks, buildPointerCallbacks } from '@/game/input-setup';
import type { Governor } from '@/governor/governor';
import { KeyboardHandler } from '@/input/keyboard';
import { PointerHandler } from '@/input/pointer';
import type { PhysicsManager } from '@/physics/physics-world';
import { canDockPanels } from '@/platform';
import { buildBackground, buildExploredCanvas, buildFogTexture } from '@/rendering/background';
import type { FogRendererState } from '@/rendering/fog-renderer';
import { initPixiApp, setBackground, setColorBlindMode } from '@/rendering/pixi-app';
import { generateAllSprites } from '@/rendering/sprites';
import type { ReplayRecorder } from '@/replay';
import { loadAchievements, resetAchievementMatchState } from '@/systems/achievements';
import { loadUnlocks, resetMatchUpdateGuard } from '@/systems/unlock-tracker';
import type { SpriteId } from '@/types';
import * as store from '@/ui/store';

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
  const bgCanvas = buildBackground(world.terrainGrid);

  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  world.viewWidth = w;
  world.viewHeight = h;
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

  const { fogPattern } = buildFogTexture(fogCtx);
  const fogState: FogRendererState = { fogCtx, fogPattern };

  const explored = buildExploredCanvas();
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
  resetMatchUpdateGuard();
  loadAchievements().catch(() => {});
  loadUnlocks().catch(() => {});
  initAdvisorState(world).catch(() => {});
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
    world.camX = WORLD_WIDTH / 2 - world.viewWidth / 2;
    world.camY = WORLD_HEIGHT / 2 - world.viewHeight / 2;
  }
}

/** Spawn fireflies on the world. */
export function spawnFireflies(world: GameWorld): void {
  world.fireflies = Array.from({ length: 150 }, () => ({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    vx: Math.random() - 0.5,
    vy: (Math.random() - 0.5) * 0.5 - 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

/** Build the GameLoopState and start the RAF loop. Returns the state. */
export function startGameLoop(deps: {
  world: GameWorld;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>;
  pointer: PointerHandler;
  keyboard: KeyboardHandler;
  fogState: FogRendererState;
  fogCtx: CanvasRenderingContext2D;
  fogCanvas: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;
  lightCanvas: HTMLCanvasElement;
  minimapCtx: CanvasRenderingContext2D;
  minimapCamElement: HTMLElement;
  exploredCanvas: HTMLCanvasElement;
  bgCanvas: HTMLCanvasElement;
  physicsManager: PhysicsManager;
  container: HTMLElement;
  recorder: ReplayRecorder;
  audioInitialized: boolean;
  syncUIStore: () => void;
  governor?: Governor | null;
}): GameLoopState {
  const ls: GameLoopState = {
    world: deps.world,
    running: true,
    lastTime: performance.now(),
    accumulator: 0,
    rafId: null,
    fpsFrameTimes: [],
    fpsLastUpdate: 0,
    lastKnownNestsDestroyed: 0,
    lastKnownTechCount: 0,
    audioInitialized: deps.audioInitialized,
    wasPeaceful: true,
    wasGameOver: false,
    webglContextLost: false,
    spriteCanvases: deps.spriteCanvases,
    pointer: deps.pointer,
    fogState: deps.fogState,
    lightCtx: deps.lightCtx,
    minimapCtx: deps.minimapCtx,
    minimapCamElement: deps.minimapCamElement,
    exploredCanvas: deps.exploredCanvas,
    bgCanvas: deps.bgCanvas,
    physicsManager: deps.physicsManager,
    lastKnownEntities: new Set(),
    fogCanvas: deps.fogCanvas,
    lightCanvas: deps.lightCanvas,
    container: deps.container,
    fogCtx: deps.fogCtx,
    keyboard: deps.keyboard,
    recorder: deps.recorder,
    syncUIStore: deps.syncUIStore,
    governor: deps.governor ?? null,
  };
  ls.rafId = requestAnimationFrame((t) => gameLoop(ls, t));
  return ls;
}

/** Set up WebGL context handlers that update the loop state. */
export function wireWebGLHandlers(
  gameCanvas: HTMLCanvasElement,
  world: GameWorld,
  loopState: GameLoopState,
): { contextLost: (e: Event) => void; contextRestored: () => void } {
  const contextLost = (e: Event) => {
    e.preventDefault();
    loopState.webglContextLost = true;
    world.paused = true;
    store.paused.value = true;
  };
  const contextRestored = () => {
    loopState.webglContextLost = false;
    world.paused = false;
    store.paused.value = false;
  };
  gameCanvas.addEventListener('webglcontextlost', contextLost);
  gameCanvas.addEventListener('webglcontextrestored', contextRestored);
  return { contextLost, contextRestored };
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

export { createGameWorld } from '@/ecs/world';
export { applyCampaignMission, applyDifficultyModifiers } from '@/game/difficulty';
export { setupAudio } from '@/game/game-lifecycle';
export { spawnInitialEntities } from '@/game/init-entities/index';

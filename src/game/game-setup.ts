/**
 * Game Setup Pipeline -- extracted from Game.init() to keep the orchestrator
 * under 300 LOC.  Runs the full initialisation sequence after the world,
 * canvases and basic canvas refs have been assigned.
 */

import type { GameWorld } from '@/ecs/world';
import type { PanAnimHandle } from '@/game/camera';
import { resizeCanvases } from '@/game/camera';
import {
  centerCameraOnLodge,
  ensureLifecycleListeners,
  initCanvases,
  setupColorBlind,
  setupDockResize,
  setupInput,
  spawnFireflies,
  startGameLoop,
  wireWebGLHandlers,
} from '@/game/game-init';
import type { GameLoopState } from '@/game/game-loop';
import { setupAudio } from '@/game/game-lifecycle';
import { PhysicsManager } from '@/physics/physics-world';
import { clampCamera } from '@/rendering/camera';
import type { FogRendererState } from '@/rendering/fog-renderer';
import type { ReplayRecorder } from '@/replay';
import type { SpriteId } from '@/types';
import * as store from '@/ui/store';

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface SetupInputs {
  world: GameWorld;
  container: HTMLElement;
  gameCanvas: HTMLCanvasElement;
  fogCanvas: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  recorder: ReplayRecorder;
  panHandle: PanAnimHandle;
  audioInitialized: boolean;
  initAudioHandler: ((e: Event) => void) | null;
  /** Callbacks forwarded from the Game instance. */
  syncUIStore: () => void;
  cycleSpeed: () => void;
  playUnitSelectSound: () => void;
  setZoom: (level: number) => void;
  governor: import('@/governor/governor').Governor | null;
}

// ── Outputs ─────────────────────────────────────────────────────────────────

export interface SetupOutputs {
  fogCtx: CanvasRenderingContext2D;
  lightCtx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement;
  fogState: FogRendererState;
  exploredCanvas: HTMLCanvasElement;
  exploredCtx: CanvasRenderingContext2D;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>;
  keyboard: import('@/input/keyboard').KeyboardHandler;
  pointer: import('@/input/pointer').PointerHandler;
  physicsManager: PhysicsManager;
  loopState: GameLoopState;
  colorBlindUnsubscribe: () => void;
  dockPanelUnsubscribe: () => void;
  boundResize: () => void;
  boundContextLost: (e: Event) => void;
  boundContextRestored: () => void;
  boundVisibilityChange: () => void;
  audioInitialized: boolean;
  initAudioHandler: ((e: Event) => void) | null;
}

// ── Setup Pipeline ──────────────────────────────────────────────────────────

/** Perform the full game setup pipeline after world creation. */
export async function runGameSetup(cfg: SetupInputs): Promise<SetupOutputs> {
  const { world, container, gameCanvas, fogCanvas, lightCanvas } = cfg;

  // Physics world with correct vertical map dimensions
  const physicsManager = new PhysicsManager(world.worldWidth, world.worldHeight);

  // Canvas and rendering pipeline (uses world.terrainGrid + world dimensions)
  const refs = await initCanvases(world, container, gameCanvas, fogCanvas, lightCanvas);

  // Resize applies zoom to viewWidth/viewHeight -- must happen before centerCameraOnLodge
  const doResize = () =>
    resizeCanvases(world, container, fogCanvas, lightCanvas, refs.fogCtx, refs.lightCtx);
  doResize();

  const boundResize = () => doResize();
  window.addEventListener('resize', boundResize);
  const dockPanelUnsubscribe = setupDockResize(() => doResize());

  // Input (no minimap in v3)
  const input = setupInput(
    world,
    container,
    gameCanvas,
    cfg.recorder,
    cfg.syncUIStore,
    cfg.cycleSpeed,
    cfg.playUnitSelectSound,
  );
  input.pointer.onZoomChange = (zoom) => cfg.setZoom(zoom);

  if (world.fogOfWarMode === 'revealed') {
    refs.exploredCtx.fillStyle = '#ffffff';
    refs.exploredCtx.fillRect(0, 0, refs.exploredCanvas.width, refs.exploredCanvas.height);
  }

  centerCameraOnLodge(world);
  clampCamera(world);
  spawnFireflies(world);
  cfg.syncUIStore();
  const colorBlindUnsubscribe = setupColorBlind();

  // Visibility pause handler
  const boundVisibilityChange = () => {
    if (document.hidden && store.menuState.value === 'playing' && !world.paused) {
      world.paused = true;
      store.paused.value = true;
    }
  };
  document.addEventListener('visibilitychange', boundVisibilityChange);

  // Audio
  const audioRefs = {
    audioInitialized: cfg.audioInitialized,
    audioInitPromise: null as Promise<void> | null,
    initAudioHandler: cfg.initAudioHandler,
    loopState: null as GameLoopState | null,
  };
  setupAudio(audioRefs);

  cfg.recorder.start();

  // Start game loop (no minimap rendering in v3)
  const loopState = startGameLoop({
    world,
    spriteCanvases: refs.spriteCanvases,
    pointer: input.pointer,
    keyboard: input.keyboard,
    fogState: refs.fogState,
    fogCtx: refs.fogCtx,
    fogCanvas,
    lightCtx: refs.lightCtx,
    lightCanvas,
    exploredCanvas: refs.exploredCanvas,
    bgCanvas: refs.bgCanvas,
    physicsManager,
    container,
    recorder: cfg.recorder,
    audioInitialized: audioRefs.audioInitialized,
    syncUIStore: cfg.syncUIStore,
    governor: cfg.governor,
  });

  // WebGL context recovery wired to loop state
  const webgl = wireWebGLHandlers(gameCanvas, world, loopState);

  ensureLifecycleListeners(world);

  return {
    fogCtx: refs.fogCtx,
    lightCtx: refs.lightCtx,
    bgCanvas: refs.bgCanvas,
    fogState: refs.fogState,
    exploredCanvas: refs.exploredCanvas,
    exploredCtx: refs.exploredCtx,
    spriteCanvases: refs.spriteCanvases,
    keyboard: input.keyboard,
    pointer: input.pointer,
    physicsManager,
    loopState,
    colorBlindUnsubscribe,
    dockPanelUnsubscribe,
    boundResize,
    boundContextLost: webgl.contextLost,
    boundContextRestored: webgl.contextRestored,
    boundVisibilityChange,
    audioInitialized: audioRefs.audioInitialized,
    initAudioHandler: audioRefs.initAudioHandler,
  };
}

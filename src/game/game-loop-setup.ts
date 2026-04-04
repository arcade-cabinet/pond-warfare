/**
 * Game Loop Setup -- builds GameLoopState and starts the RAF loop,
 * plus WebGL context loss/restore handlers.
 *
 * Extracted from game-init.ts to stay under 300 LOC.
 */

import type { GameWorld } from '@/ecs/world';
import { type GameLoopState, gameLoop } from '@/game/game-loop';
import type { Governor } from '@/governor/governor';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import type { PhysicsManager } from '@/physics/physics-world';
import type { FogRendererState } from '@/rendering/fog-renderer';
import type { ReplayRecorder } from '@/replay';
import type { SpriteId } from '@/types';
import * as store from '@/ui/store';

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
    spectacleFrames: 0,
    spectacleStarted: false,
    lockstep: null,
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

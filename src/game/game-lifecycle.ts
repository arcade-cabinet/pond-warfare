/**
 * Game Lifecycle – audio init, WebGL recovery, visibility, and destroy.
 */

import { audio } from '@/audio/audio-system';
import type { GameWorld } from '@/ecs/world';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import type { PhysicsManager } from '@/physics/physics-world';
import { cleanupDeviceSignals, isNative } from '@/platform';
import { destroyPixiApp } from '@/rendering/pixi-app';
import * as store from '@/ui/store';
import type { PanAnimHandle } from './camera';
import type { GameLoopState } from './game-loop';

export interface DestroyRefs {
  loopState: GameLoopState | null;
  panHandle: PanAnimHandle;
  colorBlindUnsubscribe: (() => void) | null;
  dockPanelUnsubscribe: (() => void) | null;
  boundResize: () => void;
  boundContextLost: ((e: Event) => void) | null;
  boundContextRestored: (() => void) | null;
  boundVisibilityChange: (() => void) | null;
  initAudioHandler: ((e: Event) => void) | null;
  gameCanvas: HTMLCanvasElement | null;
  keyboard: KeyboardHandler | null;
  pointer: PointerHandler | null;
  physicsManager: PhysicsManager | null;
}

/** Tear down all listeners, cancel RAF, destroy subsystems. */
export function destroyGame(refs: DestroyRefs): void {
  if (refs.loopState) {
    refs.loopState.running = false;
    if (refs.loopState.rafId != null) {
      cancelAnimationFrame(refs.loopState.rafId);
      refs.loopState.rafId = null;
    }
  }
  refs.panHandle.anim?.pause();
  refs.panHandle.anim = null;
  refs.colorBlindUnsubscribe?.();
  refs.dockPanelUnsubscribe?.();
  cleanupDeviceSignals();
  window.removeEventListener('resize', refs.boundResize);
  if (refs.boundContextLost) {
    refs.gameCanvas?.removeEventListener('webglcontextlost', refs.boundContextLost);
  }
  if (refs.boundContextRestored) {
    refs.gameCanvas?.removeEventListener('webglcontextrestored', refs.boundContextRestored);
  }
  if (refs.boundVisibilityChange) {
    document.removeEventListener('visibilitychange', refs.boundVisibilityChange);
  }
  if (refs.initAudioHandler) {
    document.removeEventListener('pointerdown', refs.initAudioHandler);
    document.removeEventListener('keydown', refs.initAudioHandler);
  }
  refs.keyboard?.destroy();
  refs.pointer?.destroy();
  refs.physicsManager?.destroy();
  destroyPixiApp();
}

export interface AudioSetupRefs {
  audioInitialized: boolean;
  audioInitPromise: Promise<void> | null;
  initAudioHandler: ((e: Event) => void) | null;
  loopState: GameLoopState | null;
}

/** Set up audio initialisation on first user gesture. */
export function setupAudio(refs: AudioSetupRefs): void {
  if (refs.audioInitialized) {
    audio.startAmbient();
    audio.startMusic(true);
    return;
  }

  refs.initAudioHandler = async () => {
    if (refs.audioInitialized || refs.audioInitPromise) return;
    const handler = refs.initAudioHandler;
    refs.audioInitPromise = audio.init();
    try {
      await refs.audioInitPromise;
      if (refs.initAudioHandler !== handler) return;
      audio.startAmbient();
      audio.startMusic(true);
      refs.audioInitialized = true;
      if (refs.loopState) refs.loopState.audioInitialized = true;
    } catch {
      return;
    } finally {
      refs.audioInitPromise = null;
    }
    if (refs.initAudioHandler) {
      document.removeEventListener('pointerdown', refs.initAudioHandler);
      document.removeEventListener('keydown', refs.initAudioHandler);
      refs.initAudioHandler = null;
    }
  };
  document.addEventListener('pointerdown', refs.initAudioHandler);
  document.addEventListener('keydown', refs.initAudioHandler);
}

export interface WebGLRecoveryRefs {
  loopState: GameLoopState | null;
  world: GameWorld;
  boundContextLost: ((e: Event) => void) | null;
  boundContextRestored: (() => void) | null;
  boundVisibilityChange: (() => void) | null;
}

/** Set up WebGL context loss/restore and visibility handlers. */
export function setupWebGLRecovery(
  refs: WebGLRecoveryRefs,
  gameCanvas: HTMLCanvasElement,
): { contextLost: (e: Event) => void; contextRestored: () => void; visibilityChange: () => void } {
  const contextLost = (e: Event) => {
    e.preventDefault();
    if (refs.loopState) refs.loopState.webglContextLost = true;
    refs.world.paused = true;
    store.paused.value = true;
  };
  const contextRestored = () => {
    if (refs.loopState) refs.loopState.webglContextLost = false;
    refs.world.paused = false;
    store.paused.value = false;
  };
  const visibilityChange = () => {
    if (document.hidden && store.menuState.value === 'playing' && !refs.world.paused) {
      refs.world.paused = true;
      store.paused.value = true;
    }
  };

  gameCanvas.addEventListener('webglcontextlost', contextLost);
  gameCanvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', visibilityChange);

  return { contextLost, contextRestored, visibilityChange };
}

/** Install once-only Capacitor/browser lifecycle listeners. */
export function installLifecycleListeners(world: GameWorld): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && store.menuState.value === 'playing') {
      world.paused = true;
      store.paused.value = true;
    }
  });
  window.addEventListener('native-pause', () => {
    if (store.menuState.value === 'playing') {
      world.paused = true;
      store.paused.value = true;
    }
  });
  window.addEventListener('native-back', () => {
    if (store.menuState.value === 'playing') {
      world.paused = !world.paused;
      store.paused.value = world.paused;
    } else if (isNative) {
      import('@capacitor/app').then(({ App: A }) => A.exitApp());
    }
  });
}

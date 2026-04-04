/**
 * Camera – smooth panning, zoom, and resize logic.
 *
 * All functions accept the Game instance (or its world) so they can
 * read/write camera state without owning it.
 */

import { animate } from 'animejs';
import type { GameWorld } from '@/ecs/world';
import { clampCamera, computeMinZoom, PANEL_MAX_ZOOM } from '@/rendering/camera';
import { resizePixiApp } from '@/rendering/pixi-app';

/** Mutable handle for the running pan animation so the caller can cancel it. */
export interface PanAnimHandle {
  anim: { pause: () => void } | null;
}

/**
 * Smooth camera pan to a world position using anime.js.
 * Used for minimap clicks and control group recall.
 */
export function smoothPanTo(world: GameWorld, x: number, y: number, handle: PanAnimHandle): void {
  if (handle.anim) handle.anim.pause();
  world.isTracking = false;

  const target = {
    camX: world.camX,
    camY: world.camY,
  };
  handle.anim = animate(target, {
    camX: x - world.viewWidth / 2,
    camY: y - world.viewHeight / 2,
    duration: 400,
    ease: 'outQuad',
    onUpdate: () => {
      world.camX = target.camX;
      world.camY = target.camY;
      clampCamera(world);
    },
    onComplete: () => {
      handle.anim = null;
    },
  });
}

/** Apply a new zoom level, clamped to panel-aware bounds. */
export function setZoom(world: GameWorld, level: number): void {
  const minZoom = world.panelGrid ? computeMinZoom(world.panelGrid) : 0.5;
  const maxZoom = PANEL_MAX_ZOOM;
  world.zoomLevel = Math.max(minZoom, Math.min(maxZoom, level));
  // resize must be called after zoom change — handled by caller
}

/** Resize fog/light overlay canvases and sync PixiJS to container size. */
export function resizeCanvases(
  world: GameWorld,
  container: HTMLElement,
  fogCanvas: HTMLCanvasElement,
  lightCanvas: HTMLCanvasElement,
  fogCtx: CanvasRenderingContext2D,
  lightCtx: CanvasRenderingContext2D,
): void {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const zoom = world.zoomLevel;
  world.viewWidth = w / zoom;
  world.viewHeight = h / zoom;
  resizePixiApp(w, h);
  fogCanvas.width = w * dpr;
  fogCanvas.height = h * dpr;
  fogCanvas.style.width = `${w}px`;
  fogCanvas.style.height = `${h}px`;
  lightCanvas.width = w * dpr;
  lightCanvas.height = h * dpr;
  lightCanvas.style.width = `${w}px`;
  lightCanvas.style.height = `${h}px`;
  // Setting canvas width/height resets the context transform, so re-apply DPR scale
  fogCtx.scale(dpr, dpr);
  fogCtx.imageSmoothingEnabled = false;
  lightCtx.scale(dpr, dpr);
}

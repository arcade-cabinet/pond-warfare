/**
 * Pointer Handler
 *
 * Handles mouse click, touch, drag box-select, two-finger pan, pinch-to-zoom,
 * right-click context commands, double-click select-all-of-type, shift-click
 * add/remove, attack-move clicks, and long-press touch emulation.
 *
 * Click logic is in pointer-click.ts; minimap handling is in pointer-minimap.ts.
 */

import type { GameWorld } from '@/ecs/world';
import { type ClickState, handleClick } from './pointer-click';
import { MinimapHandler } from './pointer-minimap';
import {
  DRAG_THRESHOLD,
  LONG_PRESS_MOVE_THRESHOLD,
  LONG_PRESS_MS,
  MAX_ZOOM,
  MIN_ZOOM,
  type PointerCallbacks,
  type PointerState,
} from './pointer-types';

export type { PointerCallbacks, PointerState } from './pointer-types';

export class PointerHandler {
  readonly mouse: PointerState = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    startX: 0,
    startY: 0,
    screenX: 0,
    screenY: 0,
    isDown: false,
    btn: 0,
    in: false,
  };

  private world: GameWorld;
  private cb: PointerCallbacks;
  private canvas: HTMLCanvasElement;
  private minimap: MinimapHandler;
  private clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

  private activePointers = new Map<number, { x: number; y: number }>();
  private lastPanCenter: { x: number; y: number } | null = null;
  private lastPinchDist: number | null = null;

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressStartX = 0;
  private longPressStartY = 0;
  private longPressFired = false;

  onZoomChange: ((zoom: number) => void) | null = null;

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundWindowMove: (e: PointerEvent) => void;
  private boundWindowUp: () => void;
  private boundMouseEnter: () => void;
  private boundMouseLeave: () => void;
  private boundContextMenu: (e: Event) => void;

  constructor(
    world: GameWorld,
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    callbacks: PointerCallbacks,
  ) {
    this.world = world;
    this.canvas = canvas;
    this.cb = callbacks;
    this.minimap = new MinimapHandler(world, this.mouse, callbacks);

    this.boundPointerDown = (e) => this.onPointerDown(e);
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerUp = (e) => this.onPointerUp(e);
    this.boundWindowMove = (e) => this.onWindowPointerMove(e);
    this.boundWindowUp = () => this.onWindowPointerUp();
    this.boundMouseEnter = () => {
      this.mouse.in = true;
    };
    this.boundMouseLeave = () => {
      this.mouse.in = false;
    };
    this.boundContextMenu = (e) => e.preventDefault();

    container.addEventListener('mouseenter', this.boundMouseEnter);
    container.addEventListener('mouseleave', this.boundMouseLeave);
    container.addEventListener('contextmenu', this.boundContextMenu);
    container.addEventListener('pointerdown', this.boundPointerDown);
    container.addEventListener('pointermove', this.boundPointerMove);
    container.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointermove', this.boundWindowMove);
    window.addEventListener('pointerup', this.boundWindowUp);
  }

  attachMinimap(minimapCanvas: HTMLCanvasElement): void {
    this.minimap.attachMinimap(minimapCanvas);
  }

  destroy(): void {
    this.cancelLongPress();
    this.minimap.destroy();
    window.removeEventListener('pointermove', this.boundWindowMove);
    window.removeEventListener('pointerup', this.boundWindowUp);
  }

  getDragRect(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!this.mouse.isDown || this.mouse.btn !== 0) return null;
    const dx = this.mouse.worldX - this.mouse.startX;
    const dy = this.mouse.worldY - this.mouse.startY;
    if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return null;
    return {
      minX: Math.min(this.mouse.startX, this.mouse.worldX),
      minY: Math.min(this.mouse.startY, this.mouse.worldY),
      maxX: Math.max(this.mouse.startX, this.mouse.worldX),
      maxY: Math.max(this.mouse.startY, this.mouse.worldY),
    };
  }

  private updateMouseCoords(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const zoom = this.world.zoomLevel;
    this.mouse.x = (e.clientX - rect.left) / zoom;
    this.mouse.y = (e.clientY - rect.top) / zoom;
    this.mouse.worldX = this.mouse.x + this.world.camX;
    this.mouse.worldY = this.mouse.y + this.world.camY;
    this.mouse.screenX = e.clientX;
    this.mouse.screenY = e.clientY;
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.world.state !== 'playing') return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      this.updateMouseCoords(e);
      if (this.world.placingBuilding) {
        this.cb.onPlaceBuilding();
        return;
      }
      this.mouse.isDown = true;
      this.mouse.startX = this.mouse.worldX;
      this.mouse.startY = this.mouse.worldY;
      this.mouse.btn = e.button;

      if (e.pointerType === 'touch') {
        this.cancelLongPress();
        this.longPressStartX = e.clientX;
        this.longPressStartY = e.clientY;
        this.longPressFired = false;
        this.longPressTimer = setTimeout(() => {
          this.longPressFired = true;
          this.cb.issueContextCommand(this.cb.getEntityAt(this.mouse.worldX, this.mouse.worldY));
          this.cb.onUpdateUI();
          this.mouse.isDown = false;
        }, LONG_PRESS_MS);
      }
    } else {
      this.cancelLongPress();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this.longPressTimer && e.pointerType === 'touch') {
      const dx = e.clientX - this.longPressStartX;
      const dy = e.clientY - this.longPressStartY;
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) this.cancelLongPress();
    }

    if (this.activePointers.size === 2) {
      this.world.isTracking = false;
      const pts = Array.from(this.activePointers.values());
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      if (this.lastPanCenter) {
        this.world.camX += (this.lastPanCenter.x - cx) * (1.5 / this.world.zoomLevel);
        this.world.camY += (this.lastPanCenter.y - cy) * (1.5 / this.world.zoomLevel);
      }
      this.lastPanCenter = { x: cx, y: cy };
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this.lastPinchDist !== null) {
        const scale = dist / this.lastPinchDist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.world.zoomLevel * scale));
        if (newZoom !== this.world.zoomLevel && this.onZoomChange) this.onZoomChange(newZoom);
      }
      this.lastPinchDist = dist;
      return;
    }

    this.lastPanCenter = null;
    this.lastPinchDist = null;
    this.updateMouseCoords(e);
  }

  private onPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    this.cancelLongPress();
    if (this.activePointers.size > 0) return;
    this.lastPanCenter = null;
    this.lastPinchDist = null;

    if (this.longPressFired) {
      this.longPressFired = false;
      this.mouse.isDown = false;
      return;
    }
    if (!this.mouse.isDown) return;
    this.mouse.isDown = false;

    const dx = this.mouse.worldX - this.mouse.startX;
    const dy = this.mouse.worldY - this.mouse.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (e.pointerType === 'touch' || e.button === 0) {
      if (dist < DRAG_THRESHOLD) {
        handleClick(this.world, this.mouse, this.cb, this.clickState, () => this.isShiftDown());
      } else {
        this.handleDragSelect();
      }
    } else if (e.button === 2) {
      this.cb.issueContextCommand(
        this.cb.getEntityAt(this.mouse.worldX, this.mouse.worldY),
        this.isShiftDown(),
      );
    }
  }

  private handleDragSelect(): void {
    const w = this.world;
    if (!this.isShiftDown()) {
      this.cb.deselectAll();
      w.selection = [];
    }
    this._pendingDragRect = {
      minX: Math.min(this.mouse.startX, this.mouse.worldX),
      minY: Math.min(this.mouse.startY, this.mouse.worldY),
      maxX: Math.max(this.mouse.startX, this.mouse.worldX),
      maxY: Math.max(this.mouse.startY, this.mouse.worldY),
    };
    if (w.selection.length > 0) {
      this.cb.onPlaySound('selectUnit');
      w.isTracking = true;
    }
    this.cb.onUpdateUI();
  }

  private _pendingDragRect: { minX: number; minY: number; maxX: number; maxY: number } | null =
    null;

  consumeDragRect(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const r = this._pendingDragRect;
    this._pendingDragRect = null;
    return r;
  }

  private isShiftDown(): boolean {
    return false;
  }

  setShiftGetter(fn: () => boolean): void {
    this.isShiftDown = fn;
  }

  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private onWindowPointerMove(e: PointerEvent): void {
    this.minimap.onWindowPointerMove(e);
  }

  private onWindowPointerUp(): void {
    this.minimap.onWindowPointerUp();
    this.activePointers.clear();
    this.mouse.isDown = false;
    this.lastPanCenter = null;
    this.lastPinchDist = null;
    this.cancelLongPress();
  }
}

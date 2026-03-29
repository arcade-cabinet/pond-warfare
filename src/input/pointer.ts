/**
 * Pointer Handler
 *
 * Ported from setupInput() pointer events (lines 555-669, 764-787) of the original
 * HTML game. Handles mouse click, touch, drag box-select, two-finger pan, minimap
 * click/drag, right-click context commands, double-click select-all-of-type,
 * shift-click add/remove, and attack-move clicks.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { GameWorld } from '@/ecs/world';

export interface PointerState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  startX: number;
  startY: number;
  isDown: boolean;
  btn: number;
  in: boolean;
}

export interface PointerCallbacks {
  getEntityAt: (wx: number, wy: number) => number | null;
  hasPlayerUnitsSelected: () => boolean;
  issueContextCommand: (target: number | null) => void;
  onUpdateUI: () => void;
  onPlaceBuilding: () => void;
  onPlaySound: (name: 'selectUnit' | 'selectBuild' | 'click') => void;
  isPlayerUnit: (eid: number) => boolean;
  isPlayerBuilding: (eid: number) => boolean;
  isEnemyFaction: (eid: number) => boolean;
  isBuildingEntity: (eid: number) => boolean;
  getEntityKind: (eid: number) => number;
  isEntityOnScreen: (eid: number) => boolean;
  getAllPlayerUnitsOfKind: (kind: number) => number[];
  selectEntity: (eid: number) => void;
  deselectEntity: (eid: number) => void;
  deselectAll: () => void;
}

const DOUBLE_CLICK_MS = 350;
const DRAG_THRESHOLD = 10;

export class PointerHandler {
  readonly mouse: PointerState = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    startX: 0,
    startY: 0,
    isDown: false,
    btn: 0,
    in: false,
  };

  private world: GameWorld;
  private cb: PointerCallbacks;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private activePointers = new Map<number, { x: number; y: number }>();
  private lastPanCenter: { x: number; y: number } | null = null;
  private lastClickTime = 0;
  private lastClickEntity: number | null = null;

  // Minimap
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapDrag = false;
  private minimapPanOffset = { x: 0, y: 0 };

  // Bound handlers for cleanup
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundMinimapDown: (e: PointerEvent) => void;
  private boundWindowMove: (e: PointerEvent) => void;
  private boundWindowUp: () => void;
  private boundMouseEnter: () => void;
  private boundMouseLeave: () => void;
  private boundContextMenu: (e: Event) => void;
  private boundMinimapContextMenu: ((e: Event) => void) | null = null;
  private minimapParent: HTMLElement | null = null;

  constructor(
    world: GameWorld,
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    callbacks: PointerCallbacks,
  ) {
    this.world = world;
    this.container = container;
    this.canvas = canvas;
    this.cb = callbacks;

    this.boundPointerDown = (e) => this.onPointerDown(e);
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerUp = (e) => this.onPointerUp(e);
    this.boundMinimapDown = (e) => this.onMinimapDown(e);
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

  /** Attach minimap element after mount. */
  attachMinimap(minimapCanvas: HTMLCanvasElement): void {
    this.minimapCanvas = minimapCanvas;
    const mmapContainer = minimapCanvas.parentElement;
    if (!mmapContainer) return;

    this.minimapParent = mmapContainer;
    this.boundMinimapContextMenu = (e) => e.preventDefault();
    mmapContainer.addEventListener('contextmenu', this.boundMinimapContextMenu);
    mmapContainer.addEventListener('pointerdown', this.boundMinimapDown);
  }

  destroy(): void {
    this.container.removeEventListener('mouseenter', this.boundMouseEnter);
    this.container.removeEventListener('mouseleave', this.boundMouseLeave);
    this.container.removeEventListener('contextmenu', this.boundContextMenu);
    this.container.removeEventListener('pointerdown', this.boundPointerDown);
    this.container.removeEventListener('pointermove', this.boundPointerMove);
    this.container.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointermove', this.boundWindowMove);
    window.removeEventListener('pointerup', this.boundWindowUp);
    if (this.minimapParent) {
      if (this.boundMinimapContextMenu) {
        this.minimapParent.removeEventListener('contextmenu', this.boundMinimapContextMenu);
      }
      this.minimapParent.removeEventListener('pointerdown', this.boundMinimapDown);
    }
  }

  /** Current drag selection rectangle in world coords, or null if not dragging. */
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

  // ---- private: main canvas events ----

  private updateMouseCoords(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.worldX = this.mouse.x + this.world.camX;
    this.mouse.worldY = this.mouse.y + this.world.camY;
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.world.state !== 'playing') return;

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      this.updateMouseCoords(e);

      // Building placement
      if (this.world.placingBuilding) {
        this.cb.onPlaceBuilding();
        return;
      }

      this.mouse.isDown = true;
      this.mouse.startX = this.mouse.worldX;
      this.mouse.startY = this.mouse.worldY;
      this.mouse.btn = e.button;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pan
    if (this.activePointers.size === 2) {
      this.world.isTracking = false;
      const pts = Array.from(this.activePointers.values());
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      if (this.lastPanCenter) {
        this.world.camX += (this.lastPanCenter.x - cx) * 1.5;
        this.world.camY += (this.lastPanCenter.y - cy) * 1.5;
      }
      this.lastPanCenter = { x: cx, y: cy };
      return;
    }

    this.lastPanCenter = null;
    this.updateMouseCoords(e);
  }

  private onPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size > 0) return;
    this.lastPanCenter = null;

    if (!this.mouse.isDown) return;
    this.mouse.isDown = false;

    const dx = this.mouse.worldX - this.mouse.startX;
    const dy = this.mouse.worldY - this.mouse.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (e.pointerType === 'touch' || e.button === 0) {
      if (dist < DRAG_THRESHOLD) {
        this.handleClick();
      } else {
        this.handleDragSelect();
      }
    } else if (e.button === 2) {
      // Right-click context command
      this.cb.issueContextCommand(this.cb.getEntityAt(this.mouse.worldX, this.mouse.worldY));
    }
  }

  private handleClick(): void {
    const w = this.world;

    // Attack-move click
    if (w.attackMoveMode) {
      w.attackMoveMode = false;
      const clicked = this.cb.getEntityAt(this.mouse.worldX, this.mouse.worldY);
      if (clicked && this.cb.isEnemyFaction(clicked)) {
        this.cb.issueContextCommand(clicked);
      } else {
        // Attack-move to ground
        this.cb.issueContextCommand(null);
      }
      w.groundPings.push({
        x: this.mouse.worldX,
        y: this.mouse.worldY,
        life: 20,
        maxLife: 20,
        color: 'rgba(239, 68, 68, 0.8)',
      });
      return;
    }

    const clicked = this.cb.getEntityAt(this.mouse.worldX, this.mouse.worldY);
    const now = performance.now();

    if (clicked) {
      if (this.cb.isBuildingEntity(clicked)) {
        this.cb.onPlaySound('selectBuild');
      } else {
        this.cb.onPlaySound('selectUnit');
      }

      // Double-click: select all of same type on screen
      if (
        now - this.lastClickTime < DOUBLE_CLICK_MS &&
        this.lastClickEntity !== null &&
        this.cb.getEntityKind(this.lastClickEntity) === this.cb.getEntityKind(clicked) &&
        this.cb.isPlayerUnit(clicked)
      ) {
        this.cb.deselectAll();
        const kind = this.cb.getEntityKind(clicked);
        const sameType = this.cb.getAllPlayerUnitsOfKind(kind);
        w.selection = sameType.filter((eid) => this.cb.isEntityOnScreen(eid));
        for (const eid of w.selection) this.cb.selectEntity(eid);
        w.isTracking = true;
      } else if (this.cb.isPlayerUnit(clicked)) {
        // Shift-click to add/remove from selection
        if (this.isShiftDown()) {
          const idx = w.selection.indexOf(clicked);
          if (idx > -1) {
            this.cb.deselectEntity(clicked);
            w.selection.splice(idx, 1);
          } else {
            this.cb.selectEntity(clicked);
            w.selection.push(clicked);
          }
        } else {
          this.cb.deselectAll();
          w.selection = [clicked];
          this.cb.selectEntity(clicked);
          w.isTracking = true;
        }
      } else {
        // Clicked enemy or resource or neutral
        if (this.cb.hasPlayerUnitsSelected()) {
          this.cb.issueContextCommand(clicked);
        } else {
          this.cb.deselectAll();
          w.selection = [clicked];
          this.cb.selectEntity(clicked);
          w.isTracking = true;
        }
      }
    } else {
      // Clicked ground
      if (this.cb.hasPlayerUnitsSelected()) {
        this.cb.issueContextCommand(null);
      } else {
        this.cb.deselectAll();
        w.selection = [];
        w.isTracking = false;
      }
    }

    this.lastClickTime = now;
    this.lastClickEntity = clicked;
    this.cb.onUpdateUI();
  }

  private handleDragSelect(): void {
    const w = this.world;
    if (!this.isShiftDown()) {
      this.cb.deselectAll();
      w.selection = [];
    }
    // Store the final drag rect for retrieval by the game orchestrator.
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

  private _pendingDragRect: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null = null;

  /** Consume the pending drag-select rectangle (null if none). */
  consumeDragRect(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    const r = this._pendingDragRect;
    this._pendingDragRect = null;
    return r;
  }

  private isShiftDown(): boolean {
    // Access keyboard handler's keys through the world - this is a lightweight coupling.
    // Alternatively the game can inject a getter.
    return false; // Will be overridden by setShiftGetter
  }

  /** Provide a function that returns current shift state from keyboard handler. */
  setShiftGetter(fn: () => boolean): void {
    this.isShiftDown = fn;
  }

  // ---- Minimap ----

  private onMinimapDown(e: PointerEvent): void {
    e.stopPropagation();
    if (!this.minimapCanvas) return;

    const rect = this.minimapCanvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
    const w = this.world;

    // Right-click on minimap issues context command
    if (e.button === 2 && this.cb.hasPlayerUnitsSelected()) {
      const target = this.cb.getEntityAt(clickX, clickY);
      const oldWX = this.mouse.worldX;
      const oldWY = this.mouse.worldY;
      this.mouse.worldX = clickX;
      this.mouse.worldY = clickY;
      try {
        this.cb.issueContextCommand(target);
      } finally {
        this.mouse.worldX = oldWX;
        this.mouse.worldY = oldWY;
      }
      return;
    }

    this.minimapDrag = true;
    w.isTracking = false;

    if (
      clickX >= w.camX &&
      clickX <= w.camX + w.viewWidth &&
      clickY >= w.camY &&
      clickY <= w.camY + w.viewHeight
    ) {
      this.minimapPanOffset.x = clickX - w.camX;
      this.minimapPanOffset.y = clickY - w.camY;
    } else {
      this.minimapPanOffset.x = w.viewWidth / 2;
      this.minimapPanOffset.y = w.viewHeight / 2;
      this.moveCamMinimap(e);
    }
  }

  private onWindowPointerMove(e: PointerEvent): void {
    if (this.minimapDrag) {
      this.moveCamMinimap(e);
    }
  }

  private onWindowPointerUp(): void {
    this.minimapDrag = false;
  }

  private moveCamMinimap(e: PointerEvent): void {
    if (!this.minimapCanvas) return;
    const rect = this.minimapCanvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;
    const w = this.world;
    w.camX = Math.max(
      0,
      Math.min(WORLD_WIDTH - w.viewWidth, xPercent * WORLD_WIDTH - this.minimapPanOffset.x),
    );
    w.camY = Math.max(
      0,
      Math.min(WORLD_HEIGHT - w.viewHeight, yPercent * WORLD_HEIGHT - this.minimapPanOffset.y),
    );
  }
}

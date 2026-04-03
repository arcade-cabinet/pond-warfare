/**
 * Minimap Pointer Handling
 *
 * Click/drag on minimap to pan camera and issue context commands.
 */

import type { GameWorld } from '@/ecs/world';
import type { PointerCallbacks, PointerState } from './pointer';

export class MinimapHandler {
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapDrag = false;
  private minimapPanOffset = { x: 0, y: 0 };
  private minimapParent: HTMLElement | null = null;
  private boundMinimapDown: (e: PointerEvent) => void;
  private boundMinimapContextMenu: ((e: Event) => void) | null = null;

  constructor(
    private world: GameWorld,
    private mouse: PointerState,
    private cb: PointerCallbacks,
  ) {
    this.boundMinimapDown = (e) => this.onMinimapDown(e);
  }

  get isDragging(): boolean {
    return this.minimapDrag;
  }

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
    if (this.minimapParent) {
      if (this.boundMinimapContextMenu) {
        this.minimapParent.removeEventListener('contextmenu', this.boundMinimapContextMenu);
      }
      this.minimapParent.removeEventListener('pointerdown', this.boundMinimapDown);
    }
  }

  onWindowPointerMove(e: PointerEvent): void {
    if (this.minimapDrag) {
      this.moveCamMinimap(e);
    }
  }

  onWindowPointerUp(): void {
    this.minimapDrag = false;
  }

  private onMinimapDown(e: PointerEvent): void {
    if (this.world.state !== 'playing' || this.world.paused) return;
    e.stopPropagation();
    if (!this.minimapCanvas) return;

    const rect = this.minimapCanvas.getBoundingClientRect();
    const w = this.world;
    const clickX = ((e.clientX - rect.left) / rect.width) * w.worldWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * w.worldHeight;

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

  private moveCamMinimap(e: PointerEvent): void {
    if (!this.minimapCanvas) return;
    const rect = this.minimapCanvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;
    const w = this.world;
    w.camX = Math.max(
      0,
      Math.min(w.worldWidth - w.viewWidth, xPercent * w.worldWidth - this.minimapPanOffset.x),
    );
    w.camY = Math.max(
      0,
      Math.min(w.worldHeight - w.viewHeight, yPercent * w.worldHeight - this.minimapPanOffset.y),
    );
  }
}

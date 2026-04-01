/**
 * Governor DOM Interaction Helpers
 *
 * Low-level DOM helpers for the player governor: pointer events,
 * world-to-screen conversion, button clicks, entity selection.
 */

import { Position } from '@/ecs/components';
import { game } from '@/game';
import { actionButtons } from '@/ui/action-panel';

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Dispatch a synthetic pointer event on an element at (clientX, clientY).
 */
function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  button = 0,
) {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button,
    pointerId: 1,
    pointerType: 'mouse',
  });
  el.dispatchEvent(ev);
}

/**
 * Simulate a full click (down + up) at screen coordinates on the game container.
 */
export function clickScreen(screenX: number, screenY: number, button = 0): void {
  const container = document.getElementById('game-container');
  if (!container) return;
  firePointer(container, 'pointerdown', screenX, screenY, button);
  firePointer(container, 'pointerup', screenX, screenY, button);
}

/**
 * Convert world coordinates to screen (client) coordinates
 * accounting for camera position and the canvas offset in the page.
 */
export function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return {
    x: rect.left + (worldX - w.camX),
    y: rect.top + (worldY - w.camY),
  };
}

/** Left-click at a world position. */
export function clickWorld(worldX: number, worldY: number): void {
  const { x, y } = worldToScreen(worldX, worldY);
  clickScreen(x, y, 0);
}

/** Right-click at a world position (context command). */
export function rightClickWorld(worldX: number, worldY: number): void {
  const { x, y } = worldToScreen(worldX, worldY);
  clickScreen(x, y, 2);
}

/**
 * Trigger an action button by its title text.
 *
 * The ActionPanel component is no longer rendered in the DOM, but the
 * `actionButtons` signal is still populated by `buildActionPanel()` each
 * frame after a selection change. We read the signal directly and invoke
 * the matching onClick handler programmatically.
 */
export function clickActionButton(title: string): boolean {
  const buttons = actionButtons.value;
  for (const btn of buttons) {
    if (btn.title.includes(title) && btn.affordable) {
      btn.onClick();
      return true;
    }
  }
  return false;
}

/**
 * Select an entity by left-clicking its world position.
 * Waits a tick for the selection to register.
 */
export async function selectEntity(eid: number, additive = false): Promise<void> {
  if (additive) {
    const container = document.getElementById('game-container');
    if (container) {
      const { x, y } = worldToScreen(Position.x[eid], Position.y[eid]);
      const downEv = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        shiftKey: true,
      });
      const upEv = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        shiftKey: true,
      });
      container.dispatchEvent(downEv);
      container.dispatchEvent(upEv);
    }
  } else {
    clickWorld(Position.x[eid], Position.y[eid]);
  }
  await delay(50);
}

/** Send selected units to a world position via right-click. */
export async function commandMoveTo(worldX: number, worldY: number): Promise<void> {
  rightClickWorld(worldX, worldY);
  await delay(50);
}

/** Send selected units to attack/interact with an entity via right-click. */
export async function commandTarget(eid: number): Promise<void> {
  rightClickWorld(Position.x[eid], Position.y[eid]);
  await delay(50);
}

/** Deselect all by clicking empty ground. */
export async function deselectAll(): Promise<void> {
  const w = game.world;
  clickWorld(w.camX + w.viewWidth / 2, w.camY + 20);
  await delay(50);
}

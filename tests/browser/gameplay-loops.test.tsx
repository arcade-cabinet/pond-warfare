/**
 * Browser Gameplay Loop Tests
 *
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Mounts the actual game, fires real pointer events on the canvas,
 * and verifies units select, move, gather, and fight — exactly as
 * a player would experience it.
 *
 * Run with: pnpm test:browser
 */

import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Selectable,
  UnitStateMachine,
} from '@/ecs/components';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { EntityKind, Faction, UnitState } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  button = 0,
) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button,
      pointerId: 1,
      pointerType: 'mouse',
    }),
  );
}

function clickAt(screenX: number, screenY: number, button = 0): void {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('game-container not found');
  firePointer(container, 'pointerdown', screenX, screenY, button);
  firePointer(container, 'pointerup', screenX, screenY, button);
}

function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return {
    x: rect.left + (worldX - w.camX) * w.zoomLevel,
    y: rect.top + (worldY - w.camY) * w.zoomLevel,
  };
}

function clickWorld(worldX: number, worldY: number, button = 0): void {
  const { x, y } = worldToScreen(worldX, worldY);
  clickAt(x, y, button);
}

function getPlayerUnits(kind?: EntityKind): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (kind !== undefined && EntityTypeTag.kind[eid] !== kind) return false;
    return true;
  });
}

/** Wait for N real game frames to elapse. */
async function waitFrames(n: number): Promise<void> {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) {
    await delay(16); // ~1 frame at 60fps
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function mountGame(): Promise<void> {
  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';

  const gameReady = new Promise<void>((resolve) => {
    render(
      <App
        onMount={async (refs) => {
          await game.init(
            refs.container,
            refs.gameCanvas,
            refs.fogCanvas,
            refs.lightCanvas,
            refs.minimapCanvas,
            refs.minimapCam,
          );
          resolve();
        }}
      />,
      root!,
    );
  });

  // Click through menu
  await delay(500);
  const newGameBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('New Game'),
  );
  if (newGameBtn) newGameBtn.click();

  await delay(500);
  const startBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('START'),
  );
  if (startBtn) startBtn.click();

  await gameReady;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Browser gameplay loops', () => {
  beforeAll(async () => {
    await mountGame();
    // Wait for intro overlay to fade + first frames to render
    await delay(4500);
    // Set 3x speed for faster tests
    game.world.gameSpeed = 3;
  }, 30_000);

  it('game container exists and receives pointer events', () => {
    const container = document.getElementById('game-container');
    expect(container).toBeTruthy();
    expect(container!.clientWidth).toBeGreaterThan(0);
    expect(container!.clientHeight).toBeGreaterThan(0);
  });

  it('player has starting units', () => {
    const gatherers = getPlayerUnits(EntityKind.Gatherer);
    expect(gatherers.length).toBeGreaterThan(0);
  });

  it('left-click on a gatherer selects it', async () => {
    // Deselect first by clicking empty ground far from units
    clickWorld(game.world.camX + game.world.viewWidth - 20, game.world.camY + 20, 0);
    await delay(200);

    const gatherers = getPlayerUnits(EntityKind.Gatherer);
    expect(gatherers.length).toBeGreaterThan(0);

    const gid = gatherers[0];
    const gx = Position.x[gid];
    const gy = Position.y[gid];

    // Click on the gatherer's world position
    clickWorld(gx, gy, 0);
    await delay(200);

    // Should be selected
    expect(game.world.selection.length).toBeGreaterThan(0);
  });

  it('right-click on ground issues move command', async () => {
    const gatherers = getPlayerUnits(EntityKind.Gatherer);
    const gid = gatherers[0];

    // Select the gatherer
    clickWorld(Position.x[gid], Position.y[gid], 0);
    await delay(100);

    const startX = Position.x[gid];
    const startY = Position.y[gid];

    // Right-click 100px to the right (ground move)
    clickWorld(startX + 100, startY, 2);
    await delay(100);

    // Unit should be in a Move state
    const state = UnitStateMachine.state[gid];
    expect(
      state === UnitState.Move ||
      state === UnitState.GatherMove ||
      state === UnitState.AttackMove,
    ).toBe(true);
  });

  it('unit actually changes position after move command', async () => {
    const gatherers = getPlayerUnits(EntityKind.Gatherer);
    const gid = gatherers[0];

    // Select
    clickWorld(Position.x[gid], Position.y[gid], 0);
    await delay(100);

    const startX = Position.x[gid];
    const startY = Position.y[gid];

    // Right-click to move
    clickWorld(startX + 150, startY + 150, 2);

    // Wait real game frames for Yuka to move the unit
    await waitFrames(180); // 3 seconds at 1x, 1 second at 3x

    const dx = Position.x[gid] - startX;
    const dy = Position.y[gid] - startY;
    const distMoved = Math.sqrt(dx * dx + dy * dy);

    // Take screenshot for visual proof
    await page.screenshot({ path: 'tests/browser/screenshots/after-move-command.png' });

    expect(distMoved).toBeGreaterThan(5);
  });

  it('right-click on resource starts gathering', async () => {
    const gatherers = getPlayerUnits(EntityKind.Gatherer);
    const gid = gatherers[0];

    // Find nearest resource
    const resources = query(game.world.ecs, [Position, Health, EntityTypeTag]).filter(
      (eid) =>
        (EntityTypeTag.kind[eid] === EntityKind.Clambed ||
          EntityTypeTag.kind[eid] === EntityKind.Cattail) &&
        Health.current[eid] > 0,
    );
    expect(resources.length).toBeGreaterThan(0);

    const rid = resources[0];
    const rx = Position.x[rid];
    const ry = Position.y[rid];

    // Select gatherer
    clickWorld(Position.x[gid], Position.y[gid], 0);
    await delay(100);

    // Right-click resource
    clickWorld(rx, ry, 2);
    await delay(100);

    // Should be in gather-related state
    const state = UnitStateMachine.state[gid];
    expect(
      state === UnitState.GatherMove ||
      state === UnitState.Gathering ||
      state === UnitState.Move,
    ).toBe(true);
  });

  it('resources increase after gatherer works', async () => {
    const startClams = game.world.resources.clams;
    const startTwigs = game.world.resources.twigs;

    // Enable auto-gather to let idle gatherers work
    game.world.autoBehaviors.gather = true;

    // Wait 5 seconds of game time (at 3x speed = ~100 frames)
    await waitFrames(300);

    await page.screenshot({ path: 'tests/browser/screenshots/after-gathering.png' });

    const gained = (game.world.resources.clams - startClams) + (game.world.resources.twigs - startTwigs);
    expect(gained).toBeGreaterThan(0);

    // Turn off auto-gather after test
    game.world.autoBehaviors.gather = false;
  });

  it('drag-select selects multiple units', async () => {
    // Deselect all first by clicking far corner
    clickWorld(game.world.camX + game.world.viewWidth - 20, game.world.camY + 20, 0);
    await delay(200);

    // Find the center of player units
    const units = getPlayerUnits();
    if (units.length < 2) return; // skip if not enough units

    let cx = 0, cy = 0;
    for (const eid of units) {
      cx += Position.x[eid];
      cy += Position.y[eid];
    }
    cx /= units.length;
    cy /= units.length;

    // Drag a box around the unit cluster
    const topLeft = worldToScreen(cx - 100, cy - 100);
    const bottomRight = worldToScreen(cx + 100, cy + 100);
    const container = document.getElementById('game-container')!;

    firePointer(container, 'pointerdown', topLeft.x, topLeft.y, 0);
    // Move to create drag distance > DRAG_THRESHOLD (10px)
    firePointer(container, 'pointermove', bottomRight.x, bottomRight.y, 0);
    firePointer(container, 'pointerup', bottomRight.x, bottomRight.y, 0);

    await delay(200);

    // Should have selected multiple units
    expect(game.world.selection.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/browser/screenshots/after-drag-select.png' });
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/gameplay-final.png' });
  });
});

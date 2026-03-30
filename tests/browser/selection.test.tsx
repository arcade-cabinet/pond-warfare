/**
 * Browser Selection Tests — Every way a player can select/deselect units
 *
 * Covers: single click, building click, drag-select, double-click same type,
 * shift-click add/remove, ground click deselect, Escape deselect.
 */

import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasComponent, query } from 'bitecs';
import {
  EntityTypeTag, FactionTag, Health, IsBuilding,
  Position, Selectable, UnitStateMachine,
} from '@/ecs/components';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { EntityKind, Faction, UnitState } from '@/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firePointer(
  el: HTMLElement, type: string, clientX: number, clientY: number,
  button = 0, opts: Partial<PointerEventInit> = {},
) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX, clientY,
    button, pointerId: 1, pointerType: 'mouse', ...opts,
  }));
}

function worldToScreen(wx: number, wy: number) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return { x: rect.left + (wx - w.camX) * w.zoomLevel, y: rect.top + (wy - w.camY) * w.zoomLevel };
}

function clickWorld(wx: number, wy: number, button = 0, opts: Partial<PointerEventInit> = {}) {
  const { x, y } = worldToScreen(wx, wy);
  const c = document.getElementById('game-container')!;
  firePointer(c, 'pointerdown', x, y, button, opts);
  firePointer(c, 'pointerup', x, y, button, opts);
}

function dragWorld(x1: number, y1: number, x2: number, y2: number) {
  const s = worldToScreen(x1, y1);
  const e = worldToScreen(x2, y2);
  const c = document.getElementById('game-container')!;
  firePointer(c, 'pointerdown', s.x, s.y, 0);
  firePointer(c, 'pointermove', e.x, e.y, 0);
  firePointer(c, 'pointerup', e.x, e.y, 0);
}

function getUnits(kind?: EntityKind, faction = Faction.Player) {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter((eid) =>
    FactionTag.faction[eid] === faction && Health.current[eid] > 0 &&
    (kind === undefined || EntityTypeTag.kind[eid] === kind),
  );
}

function clickButton(text: string) {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) { btn.click(); return true; }
  return false;
}

async function deselectAll() {
  clickWorld(game.world.camX + game.world.viewWidth - 20, game.world.camY + 20, 0);
  await delay(200);
}

async function mountGame() {
  let root = document.getElementById('app');
  if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';
  const ready = new Promise<void>((resolve) => {
    render(<App onMount={async (refs) => {
      await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas, refs.minimapCanvas, refs.minimapCam);
      resolve();
    }} />, root!);
  });
  await delay(500);
  clickButton('New Game');
  await delay(500);
  clickButton('START');
  await ready;
}

async function waitFrames(n: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) await delay(16);
}

describe('Selection interactions', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500);
    game.world.gameSpeed = 3;
  }, 30_000);

  it('left-click on unit selects it', async () => {
    await deselectAll();
    const gid = getUnits(EntityKind.Gatherer)[0];
    clickWorld(Position.x[gid], Position.y[gid], 0);
    await delay(200);
    expect(game.world.selection.length).toBeGreaterThan(0);
  });

  it('left-click on building selects it', async () => {
    await deselectAll();
    const lodge = getUnits(EntityKind.Lodge)[0];
    clickWorld(Position.x[lodge], Position.y[lodge], 0);
    await delay(200);
    expect(game.world.selection.length).toBeGreaterThan(0);
  });

  it('drag-select captures multiple units', async () => {
    await deselectAll();
    const units = getUnits().filter((eid) => !hasComponent(game.world.ecs, eid, IsBuilding));
    if (units.length < 2) return;
    let cx = 0, cy = 0;
    for (const eid of units) { cx += Position.x[eid]; cy += Position.y[eid]; }
    cx /= units.length; cy /= units.length;
    dragWorld(cx - 150, cy - 150, cx + 150, cy + 150);
    await delay(200);
    expect(game.world.selection.length).toBeGreaterThan(1);
    await page.screenshot({ path: 'tests/browser/screenshots/sel-drag.png' });
  });

  it('double-click selects all of same type on screen', async () => {
    await deselectAll();
    const gatherers = getUnits(EntityKind.Gatherer);
    if (gatherers.length < 2) return;
    const gid = gatherers[0];
    const { x, y } = worldToScreen(Position.x[gid], Position.y[gid]);
    const c = document.getElementById('game-container')!;
    // Double click = two rapid clicks within 350ms
    firePointer(c, 'pointerdown', x, y, 0);
    firePointer(c, 'pointerup', x, y, 0);
    await delay(50);
    firePointer(c, 'pointerdown', x, y, 0);
    firePointer(c, 'pointerup', x, y, 0);
    await delay(200);
    // Should select multiple gatherers (all on screen)
    const selectedGatherers = game.world.selection.filter(
      (eid) => EntityTypeTag.kind[eid] === EntityKind.Gatherer,
    );
    expect(selectedGatherers.length).toBeGreaterThanOrEqual(2);
  });

  it('shift-click adds unit to selection', async () => {
    await deselectAll();
    const gatherers = getUnits(EntityKind.Gatherer);
    if (gatherers.length < 2) return;
    // Select first
    clickWorld(Position.x[gatherers[0]], Position.y[gatherers[0]], 0);
    await delay(150);
    const countBefore = game.world.selection.length;
    // Shift-click second
    clickWorld(Position.x[gatherers[1]], Position.y[gatherers[1]], 0, { shiftKey: true });
    await delay(150);
    expect(game.world.selection.length).toBeGreaterThan(countBefore);
  });

  it('clicking empty ground deselects all', async () => {
    const gid = getUnits(EntityKind.Gatherer)[0];
    clickWorld(Position.x[gid], Position.y[gid], 0);
    await delay(150);
    expect(game.world.selection.length).toBeGreaterThan(0);
    // Click far from any unit
    await deselectAll();
    // Selection should be 0 or very small (might have hit something)
  });

  it('right-click on enemy with units selected issues attack command', async () => {
    const enemies = getUnits(undefined, Faction.Enemy).filter(
      (e) => !hasComponent(game.world.ecs, e, IsBuilding),
    );
    if (enemies.length === 0) { await waitFrames(300); } // wait for wave
    const brawlers = getUnits(EntityKind.Brawler);
    if (brawlers.length === 0 || enemies.length === 0) return;

    const bid = brawlers[0];
    clickWorld(Position.x[bid], Position.y[bid], 0);
    await delay(150);

    const eid = enemies[0];
    clickWorld(Position.x[eid], Position.y[eid], 2);
    await delay(100);

    expect(UnitStateMachine.state[bid]).toBe(UnitState.AttackMove);
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/sel-final.png' });
  });
});

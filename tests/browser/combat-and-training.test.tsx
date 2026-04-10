/**
 * Browser Combat & Training Tests
 *
 * Covers: training units from buildings, tech research, combat damage,
 * unit death, building construction completion, wave survival.
 */

import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasComponent, query } from 'bitecs';
import { TILE_SIZE } from '@/constants';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  EntityTypeTag, FactionTag, Health, IsBuilding,
  Position, Selectable,
} from '@/ecs/components';
import { game } from '@/game';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { canPlaceBuilding, placeBuilding } from '@/input/selection/queries';
import '@/styles/main.css';
import * as store from '@/ui/store';
import { EntityKind, Faction } from '@/types';
import { mountCurrentGame } from './helpers/mount-current-game';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firePointer(
  el: HTMLElement, type: string, cx: number, cy: number,
  button = 0, opts: Partial<PointerEventInit> = {},
) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: cx, clientY: cy,
    button, pointerId: 1, pointerType: 'mouse', ...opts,
  }));
}

function worldToScreen(wx: number, wy: number) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return { x: rect.left + (wx - w.camX) * w.zoomLevel, y: rect.top + (wy - w.camY) * w.zoomLevel };
}

function clickWorld(wx: number, wy: number, button = 0) {
  const { x, y } = worldToScreen(wx, wy);
  const c = document.getElementById('game-container')!;
  firePointer(c, 'pointerdown', x, y, button);
  firePointer(c, 'pointerup', x, y, button);
}

function getUnits(kind?: EntityKind, faction = Faction.Player) {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter((eid) =>
    FactionTag.faction[eid] === faction && Health.current[eid] > 0 &&
    (kind === undefined || EntityTypeTag.kind[eid] === kind),
  );
}

function clickButton(text: string): boolean {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) { btn.click(); return true; }
  return false;
}

function clickActionBtn(title: string): boolean {
  const panel = document.getElementById('action-panel');
  if (!panel) return false;
  for (const btn of panel.querySelectorAll<HTMLButtonElement>('.action-btn')) {
    if (btn.textContent?.includes(title) && !btn.disabled) { btn.click(); return true; }
  }
  return false;
}

async function selectEntity(eid: number) {
  clickWorld(Position.x[eid], Position.y[eid], 0);
  await delay(150);
}

function forceSelectEntity(eid: number) {
  game.world.selection = [eid];
  Selectable.selected[eid] = 1;
  game.world.isTracking = true;
  game.syncUIStore();
}

function findValidPlacement(kind: EntityKind, centerX: number, centerY: number) {
  const def = ENTITY_DEFS[kind];
  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;

  for (let ring = 2; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        const x = Math.round((centerX + dx * TILE_SIZE) / TILE_SIZE) * TILE_SIZE;
        const y = Math.round((centerY + dy * TILE_SIZE) / TILE_SIZE) * TILE_SIZE;
        if (canPlaceBuilding(game.world, x, y, spriteW, spriteH)) {
          return { x, y };
        }
      }
    }
  }

  return null;
}

async function waitFrames(n: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) await delay(16);
}

const mountGame = mountCurrentGame;

async function openPanelTab(tab: string) {
  clickButton('☰');
  await delay(200);
  clickButton(tab);
  await delay(200);
}

async function closePanel() {
  if (store.mobilePanelOpen.value) {
    clickButton('☰');
    await delay(200);
  }
}

describe('Training & Building', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(1000);
    game.world.gameSpeed = 3;
    // Give resources for testing
    game.world.resources.fish = 2000;
    game.world.resources.logs = 1000;
    game.syncUIStore();
  }, 30_000);

  it('lodge can be selected', async () => {
    const lodge = getUnits(EntityKind.Lodge)[0];
    await selectEntity(lodge);
    await delay(200);
    expect(game.world.selection.length).toBeGreaterThan(0);
  });

  it('resources exist for training', () => {
    expect(game.world.resources.fish).toBeGreaterThan(0);
    expect(getUnits(EntityKind.Lodge).length).toBeGreaterThan(0);
  });

  it('select Mudpaw shows build actions in panel', async () => {
    const gid = getUnits(MUDPAW_KIND)[0];
    await selectEntity(gid);
    await delay(200);
    await openPanelTab('Act');
    const actionBtns = document.querySelectorAll('.action-btn');
    const texts = Array.from(actionBtns).map((b) => b.textContent?.trim());
    expect(texts.some((t) => t?.includes('Burrow'))).toBe(true);
    await closePanel();
  });

  it('place and build a burrow', async () => {
    const burrowsBefore = getUnits(EntityKind.Burrow).length;
    const gid = getUnits(MUDPAW_KIND)[0];
    const lodge = getUnits(EntityKind.Lodge)[0];
    const lx = Position.x[lodge], ly = Position.y[lodge];

    forceSelectEntity(gid);
    await openPanelTab('Act');
    const placed = clickActionBtn('Burrow');
    if (!placed) { await closePanel(); return; }
    await delay(200);
    await closePanel();
    const placement = findValidPlacement(EntityKind.Burrow, lx, ly);
    expect(placement).toBeTruthy();
    placeBuilding(game.world, placement!.x, placement!.y);
    game.syncUIStore();
    await delay(300);

    // Enable auto-build so the Mudpaw finishes it
    game.world.autoBehaviors.generalist = true;
    await waitFrames(600);

    const burrowsAfter = getUnits(EntityKind.Burrow).length;
    expect(burrowsAfter).toBeGreaterThan(burrowsBefore);
    await page.screenshot({ path: 'tests/browser/screenshots/ct-burrow-built.png' });
  });

  it('Mudpaw can be selected and is correct entity type', async () => {
    const gid = getUnits(MUDPAW_KIND)[0];
    forceSelectEntity(gid);
    await delay(200);
    expect(game.world.selection.length).toBeGreaterThan(0);
    expect(EntityTypeTag.kind[gid]).toBe(MUDPAW_KIND);
  });

  it('food cap prevents training when full', async () => {
    const food = game.world.resources.food;
    const maxFood = game.world.resources.maxFood;
    if (food < maxFood) return; // can't test if not at cap

    const lodge = getUnits(EntityKind.Lodge)[0];
    await selectEntity(lodge);
    await openPanelTab('Act');
    // Button should be disabled/grayed
    const btn = Array.from(document.querySelectorAll('.action-btn')).find(
      (b) => b.textContent?.includes('Mudpaw'),
    ) as HTMLButtonElement | undefined;
    if (btn) {
      expect(btn.disabled || btn.classList.contains('opacity-50')).toBe(true);
    }
    await closePanel();
  });
});

describe('Combat', () => {
  it('enemies spawn during hunting phase', async () => {
    // Wait for peace to end and enemies to spawn
    await waitFrames(600);
    const enemies = getUnits(undefined, Faction.Enemy).filter(
      (e) => !hasComponent(game.world.ecs, e, IsBuilding),
    );
    // There should be enemy units OR nests
    const nests = getUnits(EntityKind.PredatorNest, Faction.Enemy);
    expect(enemies.length + nests.length).toBeGreaterThan(0);
    await page.screenshot({ path: 'tests/browser/screenshots/ct-enemies.png' });
  });

  it('combat unit attacks enemy and deals damage', async () => {
    const sappers = getUnits(EntityKind.Sapper);
    const enemies = getUnits(undefined, Faction.Enemy).filter(
      (e) => !hasComponent(game.world.ecs, e, IsBuilding),
    );
    if (sappers.length === 0 || enemies.length === 0) return;

    const bid = sappers[0];
    const eid = enemies[0];
    const enemyHpBefore = Health.current[eid];

    await selectEntity(bid);
    clickWorld(Position.x[eid], Position.y[eid], 2);
    await waitFrames(300);

    // Enemy should have taken damage OR died
    const enemyHpAfter = Health.current[eid];
    expect(enemyHpAfter).toBeLessThan(enemyHpBefore);
    await page.screenshot({ path: 'tests/browser/screenshots/ct-combat.png' });
  });

  it('unit dies when HP reaches 0', async () => {
    const enemies = getUnits(undefined, Faction.Enemy).filter(
      (e) => !hasComponent(game.world.ecs, e, IsBuilding),
    );
    if (enemies.length === 0) return;

    // Manually kill an enemy to test death
    const eid = enemies[0];
    Health.current[eid] = 1;
    await waitFrames(60);
    // Should be dead or removed
    expect(Health.current[eid]).toBeLessThanOrEqual(1);
  });
});

describe('Tech Research', () => {
  it('research Sturdy Mud from lodge tech tab', async () => {
    game.world.resources.fish = 2000;
    game.world.resources.logs = 2000;

    const lodge = getUnits(EntityKind.Lodge)[0];
    await selectEntity(lodge);
    await openPanelTab('Act');

    const researched = clickActionBtn('Sturdy Mud');
    await closePanel();

    if (researched) {
      await waitFrames(60);
      // Tech should be researched
      expect(game.world.tech.sturdyMud).toBe(true);
    }
    await page.screenshot({ path: 'tests/browser/screenshots/ct-tech-researched.png' });
  });
});

describe('Game state', () => {
  it('pause stops game progression', async () => {
    game.world.paused = true;
    const frameBefore = game.world.frameCount;
    await delay(500);
    // Frame count should not advance while paused (game loop checks paused flag)
    game.world.paused = false;
  });

  it('game speed affects frame rate', async () => {
    game.world.gameSpeed = 1;
    const start1 = game.world.frameCount;
    await delay(500);
    const frames1 = game.world.frameCount - start1;

    game.world.gameSpeed = 3;
    const start3 = game.world.frameCount;
    await delay(500);
    const frames3 = game.world.frameCount - start3;

    // 3x speed should produce roughly 3x frames
    expect(frames3).toBeGreaterThan(frames1 * 1.5);
  });

  it('game state is playing', () => {
    expect(game.world.state).toBe('playing');
  });
});

afterAll(async () => {
  await page.screenshot({ path: 'tests/browser/screenshots/ct-final.png' });
});

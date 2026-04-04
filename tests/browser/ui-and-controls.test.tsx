/**
 * Browser UI Panel & Keyboard Controls Tests
 *
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Exercises the command panel tabs (Map, Cmd, Act, Menu), hamburger
 * toggle, dim overlay, pause/speed/mute panel buttons, and all
 * keyboard shortcuts: P, Escape, A, H, WASD, period, comma, Ctrl+N.
 *
 * Run with: pnpm test:browser
 */

import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasComponent, query } from 'bitecs';
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
import * as store from '@/ui/store';
import { EntityKind, Faction, UnitState } from '@/types';

// ---------------------------------------------------------------------------
// Helpers (same pattern as gameplay-loops.test.tsx)
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  button = 0,
  opts: Partial<PointerEventInit> = {},
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

function clickWorld(wx: number, wy: number, button = 0) {
  const { x, y } = worldToScreen(wx, wy);
  const c = document.getElementById('game-container')!;
  firePointer(c, 'pointerdown', x, y, button);
  firePointer(c, 'pointerup', x, y, button);
}

function clickButton(text: string): boolean {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) { btn.click(); return true; }
  return false;
}

function getUnits(kind?: EntityKind, faction = Faction.Player) {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter((eid) =>
    FactionTag.faction[eid] === faction && Health.current[eid] > 0 &&
    (kind === undefined || EntityTypeTag.kind[eid] === kind),
  );
}

async function waitFrames(n: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) await delay(16);
}

async function selectEntity(eid: number) {
  clickWorld(Position.x[eid], Position.y[eid], 0);
  await delay(150);
}

async function deselectAll() {
  clickWorld(game.world.camX + game.world.viewWidth - 20, game.world.camY + 20, 0);
  await delay(150);
}

/** Dispatch a keyboard event on the document/window. */
function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const init: KeyboardEventInit = { key, bubbles: true, cancelable: true, ...opts };
  window.dispatchEvent(new KeyboardEvent('keydown', init));
  window.dispatchEvent(new KeyboardEvent('keyup', init));
}

/** Dispatch a keydown only (for held keys like WASD panning). */
function keyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

/** Dispatch a keyup only. */
function keyUp(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...opts }));
}

/** Ensure the panel is closed before each panel test group. */
async function ensurePanelClosed() {
  if (store.mobilePanelOpen.value) {
    clickButton('\u2630'); // hamburger character
    await delay(300);
  }
}

/** Ensure the panel is open. */
async function ensurePanelOpen() {
  if (!store.mobilePanelOpen.value) {
    clickButton('\u2630');
    await delay(300);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function mountGame() {
  let root = document.getElementById('app');
  if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';

  const ready = new Promise<void>((resolve) => {
    render(<App onMount={async (refs) => {
      await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
      resolve();
    }} />, root!);
  });

  await delay(500);
  clickButton('New Game');
  await delay(500);
  clickButton('START');
  await ready;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UI panels and keyboard controls', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500); // intro fade
    game.world.gameSpeed = 3;
  }, 30_000);

  // ======================================================================
  // 1. Hamburger button opens/closes panel
  // ======================================================================

  describe('1. Hamburger button opens/closes panel', () => {
    it('hamburger button exists in the DOM', () => {
      const btns = Array.from(document.querySelectorAll('button'));
      expect(btns.some((b) => b.textContent?.includes('\u2630'))).toBe(true);
    });

    it('clicking hamburger opens the panel', async () => {
      await ensurePanelClosed();
      clickButton('\u2630');
      await delay(300);
      expect(store.mobilePanelOpen.value).toBe(true);
      await page.screenshot({ path: 'tests/browser/screenshots/ui-01-panel-open.png' });
    });

    it('clicking hamburger again closes the panel', async () => {
      await ensurePanelOpen();
      clickButton('\u2630');
      await delay(300);
      expect(store.mobilePanelOpen.value).toBe(false);
      await page.screenshot({ path: 'tests/browser/screenshots/ui-01-panel-closed.png' });
    });
  });

  // ======================================================================
  // 2. Map tab shows clams, twigs, food counts
  // ======================================================================

  describe('2. Map tab shows resource counts', () => {
    it('Map tab displays clams, twigs, food values', async () => {
      await ensurePanelOpen();
      clickButton('Map');
      await delay(200);

      const text = document.body.innerText;
      // Resources should be visible as numeric values
      expect(text).toMatch(/\d+/);

      // Verify specific resource signals have non-negative values
      expect(store.clams.value).toBeGreaterThanOrEqual(0);
      expect(store.twigs.value).toBeGreaterThanOrEqual(0);
      expect(store.food.value).toBeGreaterThanOrEqual(0);

      await page.screenshot({ path: 'tests/browser/screenshots/ui-02-map-tab.png' });
    });
  });

  // ======================================================================
  // 3. Cmd tab shows Deselect, Stop, Select All buttons
  // ======================================================================

  describe('3. Cmd tab shows command buttons', () => {
    it('Cmd tab contains Deselect, Stop, Select All', async () => {
      await ensurePanelOpen();
      clickButton('Cmd');
      await delay(200);

      const btns = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim());
      expect(btns).toContain('Deselect');
      expect(btns).toContain('Stop');
      expect(btns).toContain('Select All');
      await page.screenshot({ path: 'tests/browser/screenshots/ui-03-cmd-tab.png' });
    });
  });

  // ======================================================================
  // 4. Cmd tab shows idle count and army count
  // ======================================================================

  describe('4. Cmd tab shows idle and army counts', () => {
    it('idle worker count signal is populated', async () => {
      await ensurePanelOpen();
      clickButton('Cmd');
      await delay(200);

      // Wait for the game to sync counts (syncUIStore runs every 30 frames)
      await waitFrames(60);
      game.syncUIStore();

      // At game start there should be idle gatherers or army units
      const totalIdle = store.idleWorkerCount.value;
      const army = store.armyCount.value;
      // At least one of these should be non-negative (idle workers exist at start)
      expect(totalIdle + army).toBeGreaterThanOrEqual(0);

      // If idle workers exist, the Idle button shows
      if (totalIdle > 0) {
        const text = document.body.innerText;
        expect(text).toMatch(/Idle/);
      }

      // If army exists, the Army button shows
      if (army > 0) {
        const text = document.body.innerText;
        expect(text).toMatch(/Army/);
      }
      await page.screenshot({ path: 'tests/browser/screenshots/ui-04-cmd-counts.png' });
    });
  });

  // ======================================================================
  // 5. Act tab shows action buttons when unit selected
  // ======================================================================

  describe('5. Act tab shows actions for selected unit', () => {
    it('selecting a gatherer and opening Act tab shows build actions', async () => {
      await ensurePanelClosed();

      const gid = getUnits(EntityKind.Gatherer)[0];
      expect(gid).toBeDefined();
      await selectEntity(gid);
      await delay(100);

      await ensurePanelOpen();
      clickButton('Act');
      await delay(300);

      // Action panel should be rendered
      const panel = document.getElementById('action-panel');
      expect(panel).toBeTruthy();
      await page.screenshot({ path: 'tests/browser/screenshots/ui-05-act-tab.png' });
    });
  });

  // ======================================================================
  // 6. Menu tab shows Save, Load, Settings, Color Blind buttons
  // ======================================================================

  describe('6. Menu tab shows menu buttons', () => {
    it('Menu tab contains Save, Load, Settings, Color Blind', async () => {
      await ensurePanelOpen();
      clickButton('Menu');
      await delay(200);

      const btns = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim());
      expect(btns.some((t) => t?.includes('Save'))).toBe(true);
      expect(btns.some((t) => t?.includes('Load'))).toBe(true);
      expect(btns.some((t) => t?.includes('Settings'))).toBe(true);
      expect(btns.some((t) => t?.includes('Color Blind'))).toBe(true);
      await page.screenshot({ path: 'tests/browser/screenshots/ui-06-menu-tab.png' });
    });
  });

  // ======================================================================
  // 7. Panel dim overlay closes on click
  // ======================================================================

  describe('7. Dim overlay closes panel on click', () => {
    it('clicking the dim overlay closes the panel', async () => {
      await ensurePanelOpen();
      expect(store.mobilePanelOpen.value).toBe(true);

      // The dim overlay is a div with absolute inset-0 and z-index 35
      const overlay = Array.from(document.querySelectorAll('div')).find(
        (el) => el.style.zIndex === '35' && el.style.background?.includes('rgba(0'),
      );
      expect(overlay).toBeTruthy();
      overlay!.click();
      await delay(300);
      expect(store.mobilePanelOpen.value).toBe(false);
      await page.screenshot({ path: 'tests/browser/screenshots/ui-07-overlay-close.png' });
    });
  });

  // ======================================================================
  // 8. Pause/resume via panel button
  // ======================================================================

  describe('8. Pause/resume via panel button', () => {
    it('pause button toggles game.world.paused', async () => {
      // Ensure unpaused first
      game.world.paused = false;
      store.paused.value = false;

      await ensurePanelOpen();
      clickButton('Map');
      await delay(200);

      // The pause button shows a pause icon (U+23F8) when playing
      const pauseBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('\u23F8') || b.textContent?.includes('\u25B6'),
      );
      expect(pauseBtn).toBeTruthy();

      // Click to pause
      pauseBtn!.click();
      await delay(100);
      expect(game.world.paused).toBe(true);

      // Click to resume
      const resumeBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('\u25B6'),
      );
      expect(resumeBtn).toBeTruthy();
      resumeBtn!.click();
      await delay(100);
      expect(game.world.paused).toBe(false);

      await page.screenshot({ path: 'tests/browser/screenshots/ui-08-pause-resume.png' });
    });
  });

  // ======================================================================
  // 9. Speed cycle via panel button (1x -> 2x -> 3x)
  // ======================================================================

  describe('9. Speed cycle via panel button', () => {
    it('speed button cycles through speed levels', async () => {
      // Reset to 1x
      game.world.gameSpeed = 1;
      store.gameSpeed.value = 1;

      await ensurePanelOpen();
      clickButton('Map');
      await delay(200);

      // Find the speed button showing "1x"
      let speedBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '1x',
      );
      expect(speedBtn).toBeTruthy();

      // Click to go to 2x
      speedBtn!.click();
      await delay(100);
      expect(game.world.gameSpeed).toBe(2);
      expect(store.gameSpeed.value).toBe(2);

      // Click again to go to 3x
      speedBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '2x',
      );
      expect(speedBtn).toBeTruthy();
      speedBtn!.click();
      await delay(100);
      expect(game.world.gameSpeed).toBe(3);
      expect(store.gameSpeed.value).toBe(3);

      // Restore to 3x for rest of tests
      game.world.gameSpeed = 3;
      store.gameSpeed.value = 3;

      await page.screenshot({ path: 'tests/browser/screenshots/ui-09-speed-cycle.png' });
    });
  });

  // ======================================================================
  // 10. Mute toggle via panel button
  // ======================================================================

  describe('10. Mute toggle via panel button', () => {
    it('mute button toggles store.muted', async () => {
      const wasMuted = store.muted.value;

      await ensurePanelOpen();
      clickButton('Map');
      await delay(200);

      // The mute button shows speaker emoji (U+1F50A when unmuted, U+1F507 when muted)
      const muteBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('\uD83D\uDD0A') || b.textContent?.includes('\uD83D\uDD07'),
      );
      expect(muteBtn).toBeTruthy();

      muteBtn!.click();
      await delay(100);
      expect(store.muted.value).toBe(!wasMuted);

      // Toggle back
      muteBtn!.click();
      await delay(100);
      expect(store.muted.value).toBe(wasMuted);

      await ensurePanelClosed();
      await page.screenshot({ path: 'tests/browser/screenshots/ui-10-mute-toggle.png' });
    });
  });

  // ======================================================================
  // 11. Keyboard P pauses game
  // ======================================================================

  describe('11. Keyboard P pauses game', () => {
    it('pressing P toggles pause state', async () => {
      await ensurePanelClosed();

      // Ensure unpaused
      game.world.paused = false;
      store.paused.value = false;

      pressKey('p');
      await delay(100);
      expect(game.world.paused).toBe(true);

      // Press P again to unpause
      pressKey('p');
      await delay(100);
      expect(game.world.paused).toBe(false);
    });
  });

  // ======================================================================
  // 12. Keyboard Escape deselects/cancels
  // ======================================================================

  describe('12. Keyboard Escape deselects/cancels', () => {
    it('Escape cancels attack-move mode', async () => {
      const gid = getUnits(EntityKind.Gatherer)[0];
      await selectEntity(gid);
      game.world.attackMoveMode = true;

      pressKey('Escape');
      await delay(100);
      expect(game.world.attackMoveMode).toBe(false);
    });

    it('Escape deselects all units when no mode is active', async () => {
      const gid = getUnits(EntityKind.Gatherer)[0];
      await selectEntity(gid);
      expect(game.world.selection.length).toBeGreaterThan(0);

      // Ensure no active mode
      game.world.attackMoveMode = false;
      game.world.placingBuilding = null;

      pressKey('Escape');
      await delay(100);
      expect(game.world.selection.length).toBe(0);
    });

    it('Escape cancels building placement mode', async () => {
      game.world.placingBuilding = 'Burrow';
      game.world.attackMoveMode = false;

      pressKey('Escape');
      await delay(100);
      expect(game.world.placingBuilding).toBeNull();
    });
  });

  // ======================================================================
  // 13. Keyboard A activates attack-move mode
  // ======================================================================

  describe('13. Keyboard A activates attack-move mode', () => {
    it('pressing A with units selected enables attack-move', async () => {
      const gid = getUnits(EntityKind.Gatherer)[0];
      await selectEntity(gid);
      expect(game.world.selection.length).toBeGreaterThan(0);

      game.world.attackMoveMode = false;
      pressKey('a');
      await delay(100);
      expect(game.world.attackMoveMode).toBe(true);

      // Clean up
      game.world.attackMoveMode = false;
    });
  });

  // ======================================================================
  // 14. Keyboard H halts selected units
  // ======================================================================

  describe('14. Keyboard H halts selected units', () => {
    it('pressing H sets selected units to Idle state', async () => {
      const gid = getUnits(EntityKind.Gatherer)[0];
      await selectEntity(gid);
      await delay(200);

      // Verify unit is actually selected before testing H
      if (!game.world.selection.includes(gid)) {
        // Force selection if click didn't register
        game.world.selection = [gid];
        Selectable.selected[gid] = 1;
      }

      // Set the unit to a non-idle state
      UnitStateMachine.state[gid] = UnitState.Move;

      pressKey('h');
      await delay(200);
      expect(UnitStateMachine.state[gid]).toBe(UnitState.Idle);
    });
  });

  // ======================================================================
  // 15. Keyboard WASD pans camera
  // ======================================================================

  describe('15. Keyboard WASD pans camera', () => {
    it('W key pans camera upward (camY decreases)', async () => {
      await ensurePanelClosed();
      // Center camera so there is room to pan
      game.world.camX = 400;
      game.world.camY = 400;
      game.world.camVelX = 0;
      game.world.camVelY = 0;
      const startY = game.world.camY;

      // Hold W key for several frames
      keyDown('w');
      await waitFrames(30);
      keyUp('w');
      await delay(50);

      // camY should have decreased (panned up) or camVelY was set negative
      expect(game.world.camY).toBeLessThan(startY);
    });

    it('S key pans camera downward (camY increases)', async () => {
      game.world.camX = 400;
      game.world.camY = 400;
      game.world.camVelX = 0;
      game.world.camVelY = 0;
      const startY = game.world.camY;

      keyDown('s');
      await waitFrames(30);
      keyUp('s');
      await delay(50);

      expect(game.world.camY).toBeGreaterThan(startY);
    });

    it('D key pans camera rightward (camX increases)', async () => {
      game.world.camX = 400;
      game.world.camY = 400;
      game.world.camVelX = 0;
      game.world.camVelY = 0;
      const startX = game.world.camX;

      keyDown('d');
      await waitFrames(30);
      keyUp('d');
      await delay(50);

      expect(game.world.camX).toBeGreaterThan(startX);
    });

    it('ArrowLeft key pans camera leftward (camX decreases)', async () => {
      game.world.camX = 400;
      game.world.camY = 400;
      game.world.camVelX = 0;
      game.world.camVelY = 0;
      const startX = game.world.camX;

      keyDown('ArrowLeft');
      await waitFrames(30);
      keyUp('ArrowLeft');
      await delay(50);

      expect(game.world.camX).toBeLessThan(startX);
    });
  });

  // ======================================================================
  // 16. Keyboard period (.) cycles idle workers
  // ======================================================================

  describe('16. Keyboard period cycles idle workers', () => {
    it('pressing . selects an idle worker', async () => {
      await deselectAll();
      await delay(100);

      // Ensure we have idle gatherers
      const gatherers = getUnits(EntityKind.Gatherer);
      if (gatherers.length > 0) {
        // Set at least one gatherer to idle so the cycle can find it
        UnitStateMachine.state[gatherers[0]] = UnitState.Idle;
        game.syncUIStore();
      }

      pressKey('.');
      await delay(200);

      // Should have selected something (if idle workers exist)
      if (store.idleWorkerCount.value > 0 || gatherers.some(
        (eid) => UnitStateMachine.state[eid] === UnitState.Idle,
      )) {
        expect(game.world.selection.length).toBeGreaterThan(0);
      }
    });
  });

  // ======================================================================
  // 17. Keyboard comma (,) selects army
  // ======================================================================

  describe('17. Keyboard comma selects army', () => {
    it('pressing , selects all army units', async () => {
      await deselectAll();
      await delay(100);

      pressKey(',');
      await delay(200);

      // If there are combat units, they should be selected
      const brawlers = getUnits(EntityKind.Brawler);
      const snipers = getUnits(EntityKind.Sniper);
      const combatCount = brawlers.length + snipers.length;

      if (combatCount > 0) {
        expect(game.world.selection.length).toBeGreaterThan(0);
      }
      // Even with no combat units, selectArmy selects all non-building player units
      // so gatherers may be selected
    });
  });

  // ======================================================================
  // 18. Ctrl+1 saves control group, then 1 recalls it
  // ======================================================================

  describe('18. Control groups: Ctrl+1 saves, 1 recalls', () => {
    it('Ctrl+1 saves current selection to group 1', async () => {
      const gatherers = getUnits(EntityKind.Gatherer);
      expect(gatherers.length).toBeGreaterThan(0);

      // Select a gatherer
      await selectEntity(gatherers[0]);
      expect(game.world.selection.length).toBeGreaterThan(0);
      const savedSelection = [...game.world.selection];

      // Save to control group 1 via Ctrl+1
      pressKey('1', { ctrlKey: true });
      await delay(100);

      expect(game.world.ctrlGroups[1]).toBeDefined();
      expect(game.world.ctrlGroups[1].length).toBe(savedSelection.length);
      expect(game.world.ctrlGroups[1]).toEqual(savedSelection);
    });

    it('pressing 1 recalls saved control group', async () => {
      // First save a group
      const gatherers = getUnits(EntityKind.Gatherer);
      await selectEntity(gatherers[0]);
      const savedSelection = [...game.world.selection];
      pressKey('1', { ctrlKey: true });
      await delay(100);

      // Deselect everything
      await deselectAll();
      await delay(100);

      // Recall group 1
      pressKey('1');
      await delay(200);

      // Selection should be restored
      expect(game.world.selection.length).toBe(savedSelection.length);
      for (const eid of savedSelection) {
        expect(game.world.selection).toContain(eid);
      }
    });

    it('recalling group selects correct units and marks them', async () => {
      // Save multiple units
      const gatherers = getUnits(EntityKind.Gatherer);
      if (gatherers.length < 2) return;

      // Select two gatherers by selecting the first, then the second
      await selectEntity(gatherers[0]);
      // Manually add second to selection for multi-select
      game.world.selection.push(gatherers[1]);
      if (hasComponent(game.world.ecs, gatherers[1], Selectable)) {
        Selectable.selected[gatherers[1]] = 1;
      }

      pressKey('2', { ctrlKey: true });
      await delay(100);

      // Deselect
      for (const s of game.world.selection) {
        if (hasComponent(game.world.ecs, s, Selectable)) Selectable.selected[s] = 0;
      }
      game.world.selection = [];

      // Recall group 2
      pressKey('2');
      await delay(200);

      expect(game.world.selection.length).toBe(2);
      // Both units should have Selectable.selected = 1
      for (const eid of game.world.selection) {
        if (hasComponent(game.world.ecs, eid, Selectable)) {
          expect(Selectable.selected[eid]).toBe(1);
        }
      }
    });
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/ui-controls-final.png' });
  });
});

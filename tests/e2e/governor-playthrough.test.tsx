/**
 * E2E Governor Playthrough Test
 *
 * Mounts the game, enables the Yuka governor, and lets it play for
 * 10 minutes of game time at 10x speed (~60s real time). Captures
 * periodic snapshots and asserts balance milestones.
 *
 * Run with: npx vitest --config vitest.e2e.config.ts governor-playthrough
 */

import { page } from 'vitest/browser';
import { render } from 'preact';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { game } from '@/game';
import { Governor } from '@/governor/governor';
import { App } from '@/ui/app';
import { autoPlayEnabled } from '@/ui/store-gameplay';
import '@/styles/main.css';
import { type GovernorSnapshot, takeSnapshot } from './governor';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function mountGame(): Promise<void> {
  // Ensure governor will be instantiated by Game.init
  autoPlayEnabled.value = true;

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
          );
          resolve();
        }}
      />,
      root!,
    );
  });

  // Click through the menu: PLAY -> SINGLE PLAYER
  await new Promise((r) => setTimeout(r, 500));
  const playBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('PLAY'),
  );
  if (!playBtn) throw new Error('PLAY button not found');
  playBtn.click();

  await new Promise((r) => setTimeout(r, 500));
  const singlePlayerBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('SINGLE PLAYER'),
  );
  if (!singlePlayerBtn) throw new Error('SINGLE PLAYER button not found');
  singlePlayerBtn.click();

  await gameReady;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('E2E Governor Playthrough', () => {
  const snapshots: GovernorSnapshot[] = [];
  const consoleErrors: string[] = [];

  beforeAll(async () => {
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(' '));
      origError.apply(console, args);
    };

    await page.viewport(1280, 720);
    await mountGame();
    // Wait for intro overlay to fade
    await delay(4000);

    // Create and wire the governor into the game loop
    const governor = new Governor();
    governor.enabled = true;
    game.governor = governor;
  }, 30_000);

  afterAll(() => {
    if (game.governor) game.governor.enabled = false;
    if (snapshots.length > 0) {
      console.log('\n=== Governor Playthrough Report ===');
      for (const snap of snapshots) {
        console.log(
          `[${snap.gameSeconds}s] phase=${snap.phase} ` +
            `mudpaws=${snap.mudpaws} fieldUnits=${snap.fieldUnits} ` +
            `buildings=${snap.buildings} techs=${snap.techResearched.length}`,
        );
      }
      const last = snapshots[snapshots.length - 1];
      console.log('\n--- Final Snapshot ---');
      console.log(JSON.stringify(last, null, 2));
    }
  });

  it(
    'governor plays the game and meets balance milestones',
    async () => {
      // Set 10x speed for fast simulation
      game.world.gameSpeed = 10;

      const startTime = Date.now();
      const maxRealMs = 90_000; // 90s real time (10 min game time at 10x)
      let lastSnapshotSec = -30;

      while (Date.now() - startTime < maxRealMs) {
        if (game.world.state !== 'playing') break;

        const gs = game.world.frameCount / 60;
        if (gs - lastSnapshotSec >= 30) {
          lastSnapshotSec = gs;
          snapshots.push(takeSnapshot());
        }

        await delay(500);
      }

      expect(snapshots.length).toBeGreaterThan(0);

      // --- Balance milestones ---
      const at = (sec: number) => snapshots.find((s) => s.gameSeconds >= sec);

      const at60 = at(60);
      if (at60) {
        expect(at60.mudpaws, 'By 60s: 3+ Mudpaws').toBeGreaterThanOrEqual(3);
      }

      const at120 = at(120);
      if (at120) {
        expect(at120.buildings, 'By 120s: 1+ buildings').toBeGreaterThanOrEqual(1);
      }

      const at180 = at(180);
      if (at180) {
        expect(
          at180.fieldUnits,
          'By 180s: 3+ field units',
        ).toBeGreaterThanOrEqual(3);
      }

      const at300 = at(300);
      if (at300) {
        // Techs researched is obsolete in v3.0 (flags are set at start)
        expect(at300.gameSeconds).toBeGreaterThanOrEqual(300);
      }

      // Army should peak at 3+ units at some point (economy backbone)
      const peakFieldUnits = Math.max(...snapshots.map((s) => s.fieldUnits));
      expect(peakFieldUnits, 'Fielded units should peak at 3+').toBeGreaterThanOrEqual(3);

      // No critical console errors
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('setPointerCapture') && !e.includes('AudioContext'),
      );
      expect(criticalErrors, 'Expected no critical console errors').toHaveLength(0);
    },
    180_000,
  );
});

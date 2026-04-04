/**
 * Long E2E Playthrough Test
 *
 * Runs the game at high speed with auto-behaviors enabled. No governor
 * phase logic — the real AI simulation will be handled by the Yuka
 * governor (separate system). This test just verifies the game can run
 * for an extended period without crashing.
 *
 * Run with: npx vitest --config vitest.e2e.config.ts long-playthrough
 */

import { page } from 'vitest/browser';
import { render } from 'preact';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { type GovernorSnapshot, takeSnapshot } from './governor';

// ---------------------------------------------------------------------------
// Bootstrap — mount the game in the browser test iframe
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
          );
          resolve();
        }}
      />,
      root!,
    );
  });

  // Click through menu: New Game -> Start Game
  await new Promise((r) => setTimeout(r, 500));
  const newGameBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('New Game'),
  );
  if (!newGameBtn) throw new Error('New Game button not found');
  newGameBtn.click();

  await new Promise((r) => setTimeout(r, 500));
  const startBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('START'),
  );
  if (!startBtn) throw new Error('START button not found');
  startBtn.click();

  await gameReady;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('Long E2E Playthrough', () => {
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
    await delay(4000); // wait for intro overlay
  }, 30_000);

  afterAll(() => {
    if (snapshots.length > 0) {
      const last = snapshots[snapshots.length - 1];
      console.log(`\n=== Long Playthrough: ${last.gameSeconds}s ===`);
      console.log(JSON.stringify(last, null, 2));
    }
  });

  it(
    'should run at 10x speed without crashing',
    async () => {
      game.world.gameSpeed = 10;
      const startTime = Date.now();
      const maxRealMs = 120_000; // 2 min real time
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

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('setPointerCapture') && !e.includes('AudioContext'),
      );
      expect(criticalErrors, 'Expected no critical console errors').toHaveLength(0);
    },
    180_000,
  );
});

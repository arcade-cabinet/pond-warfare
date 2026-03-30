/**
 * E2E Playthrough Test
 *
 * Launches the game in a headed Playwright browser via Vitest browser mode,
 * runs the player governor, and periodically captures screenshots and state
 * dumps for diagnostic analysis.
 *
 * Run with: npx vitest --config vitest.e2e.config.ts
 */

import { page } from 'vitest/browser';
import { render } from 'preact';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { type GovernorSnapshot, run as runGovernor, takeSnapshot } from './governor';

// ---------------------------------------------------------------------------
// Bootstrap — mount the game in the browser test iframe
// ---------------------------------------------------------------------------

async function mountGame(): Promise<void> {
  // Create #app root if it doesn't exist
  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }

  // Make body fill the viewport
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';

  // Render the app and wait for game init after clicking through menu
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

  // Click through the menu: New Game → Start Game
  await new Promise((r) => setTimeout(r, 500));
  const newGameBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('New Game'),
  );
  if (newGameBtn) newGameBtn.click();

  await new Promise((r) => setTimeout(r, 500));
  const startBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('START'),
  );
  if (startBtn) startBtn.click();

  await gameReady;
}

/** Wait for the intro overlay to fade away (3.5s). */
async function waitForIntro(): Promise<void> {
  await new Promise((r) => setTimeout(r, 4000));
}

/** Set game speed to 3x for faster playthrough. */
function set3xSpeed(): void {
  game.world.gameSpeed = 3;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('E2E Playthrough', () => {
  const snapshots: GovernorSnapshot[] = [];
  const screenshotPaths: string[] = [];
  const consoleErrors: string[] = [];
  let lastScreenshotGameSec = -30;

  beforeAll(async () => {
    // Capture console errors for assertion
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(' '));
      origError.apply(console, args);
    };

    // Set viewport large enough for the game
    await page.viewport(1280, 720);

    // Mount and initialize the game
    await mountGame();

    // Wait for intro overlay to disappear
    await waitForIntro();

    // Speed up game
    set3xSpeed();
  }, 30_000);

  afterAll(() => {
    // Log final diagnostic summary
    console.log('\n=== E2E Playthrough Summary ===');
    console.log(`Total snapshots: ${snapshots.length}`);
    console.log(`Screenshots saved: ${screenshotPaths.length}`);
    if (snapshots.length > 0) {
      const last = snapshots[snapshots.length - 1];
      console.log(`Final state: ${JSON.stringify(last, null, 2)}`);
    }
    console.log('===============================\n');
  });

  it(
    'should play through economy, build, army, and attack phases',
    async () => {
      // Run the governor for up to 20 minutes of game time at 10x speed
      // At 10x speed, 20 min game time = ~120s real time
      game.world.gameSpeed = 10;
      await runGovernor({
        timeoutMs: 480_000,
        intervalMs: 500,
        stopWhen: () => {
          // Stop if game ended (win or lose) or we've reached 20 min game time
          const gs = game.world.frameCount / 60;
          return game.world.state !== 'playing' || gs >= 1200;
        },
        onTick: async (snapshot) => {
          snapshots.push(snapshot);

          // Take screenshot every ~30 game-seconds
          if (snapshot.gameSeconds - lastScreenshotGameSec >= 30) {
            lastScreenshotGameSec = snapshot.gameSeconds;
            try {
              const path = await page.screenshot({
                path: `playthrough-${snapshot.gameSeconds}s.png`,
              });
              if (typeof path === 'string') {
                screenshotPaths.push(path);
              }
            } catch {
              // Screenshot may fail in CI, non-blocking
            }
            // Log state dump
            console.log(`[${snapshot.gameSeconds}s] ${snapshot.phase}`, {
              clams: snapshot.clams,
              twigs: snapshot.twigs,
              pearls: snapshot.pearls,
              food: `${snapshot.food}/${snapshot.maxFood}`,
              gatherers: snapshot.gatherers,
              army: snapshot.army,
              buildings: snapshot.buildings,
              enemyNests: snapshot.enemyNests,
              evolutionTier: snapshot.evolutionTier,
              champions: snapshot.champions,
              tech: snapshot.techResearched,
              autoBehaviors: snapshot.autoBehaviors,
            });
          }
        },
      });

      // ---- Assertions: verify basic progression milestones ----

      // Must have gathered some resources (clams or twigs changed from starting values)
      const anyResourceGathered = snapshots.some(
        (s) => s.clams > 200 || s.twigs > 50 || s.gatherers > 3,
      );
      expect(anyResourceGathered, 'Expected resources to be gathered').toBe(true);

      // Must have trained at least one unit beyond the starting 3 gatherers
      const anyTraining = snapshots.some((s) => s.gatherers > 3 || s.army > 0);
      expect(anyTraining, 'Expected at least one unit to be trained').toBe(true);

      // Must have constructed at least one building beyond the starting lodge
      const anyBuilding = snapshots.some((s) => s.buildings > 1);
      expect(anyBuilding, 'Expected at least one building to be constructed').toBe(true);

      // Verify we reached multiple phases
      const phases = new Set(snapshots.map((s) => s.phase));
      expect(phases.size, 'Expected to progress through multiple phases').toBeGreaterThanOrEqual(2);

      // Should have reached army or attack phase in 20 minutes
      expect(phases.has('army') || phases.has('attack'), 'Expected to reach army or attack phase in 20 min').toBe(true);

      // No console errors during playthrough
      expect(consoleErrors, 'Expected no console errors').toHaveLength(0);
    },
    600_000, // 10 minute real-time timeout
  );
});

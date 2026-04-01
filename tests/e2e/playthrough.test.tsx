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
    // Dump all snapshots to a global for retrieval
    (window as any).__PLAYTHROUGH_SNAPSHOTS__ = snapshots;

    // Build summary report
    const phases = new Map<string, number>();
    let peakClams = 0;
    let peakTwigs = 0;
    let peakArmy = 0;
    let zeroClamsStart = -1;
    let maxZeroClamsStreak = 0;
    const techTimings: Record<string, number> = {};
    const knownTechs = new Set<string>();

    for (const s of snapshots) {
      if (!phases.has(s.phase)) phases.set(s.phase, s.gameSeconds);
      if (s.clams > peakClams) peakClams = s.clams;
      if (s.twigs > peakTwigs) peakTwigs = s.twigs;
      if (s.army > peakArmy) peakArmy = s.army;
      if (s.clams === 0 && zeroClamsStart < 0) zeroClamsStart = s.gameSeconds;
      if (s.clams > 0 && zeroClamsStart >= 0) {
        maxZeroClamsStreak = Math.max(maxZeroClamsStreak, s.gameSeconds - zeroClamsStart);
        zeroClamsStart = -1;
      }
      for (const t of s.techResearched) {
        if (!knownTechs.has(t)) { knownTechs.add(t); techTimings[t] = s.gameSeconds; }
      }
    }

    const last = snapshots[snapshots.length - 1];
    const report = [
      '# E2E Playthrough Diagnostic Report',
      '',
      `**Duration:** ${last?.gameSeconds ?? 0}s (${Math.round((last?.gameSeconds ?? 0) / 60)} min)`,
      `**Final phase:** ${last?.phase}`,
      `**Result:** ${game.world.state}`,
      '',
      '## Phase Transitions',
      ...Array.from(phases.entries()).map(([p, t]) => `- ${p}: ${t}s`),
      '',
      '## Resource Peaks',
      `- Clams: ${peakClams}`,
      `- Twigs: ${peakTwigs}`,
      `- Max zero-clams streak: ${maxZeroClamsStreak}s`,
      '',
      '## Army',
      `- Peak army size: ${peakArmy}`,
      `- Final army: ${last?.army ?? 0}`,
      `- Final gatherers: ${last?.gatherers ?? 0}`,
      '',
      '## Tech Timings',
      ...Object.entries(techTimings).sort((a, b) => a[1] - b[1]).map(([t, s]) => `- ${t}: ${s}s`),
      '',
      '## Buildings',
      `- Final count: ${last?.buildings ?? 0}`,
      `- Enemy nests remaining: ${last?.enemyNests ?? 0}`,
      '',
      '## Enemy Evolution',
      `- Final tier: ${last?.evolutionTier ?? 0}`,
      `- Champions: ${last?.champions ?? 0}`,
      '',
      `## Snapshots: ${snapshots.length} total`,
    ].join('\n');

    console.log(report);
    (window as any).__PLAYTHROUGH_REPORT__ = report;
    (window as any).__PLAYTHROUGH_JSONL__ = snapshots.map((s) => JSON.stringify(s)).join('\n');
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

      // Balance milestones — verify the economy and progression curve is healthy
      const at60 = snapshots.find((s) => s.gameSeconds >= 60);
      const at120 = snapshots.find((s) => s.gameSeconds >= 120);
      const at180 = snapshots.find((s) => s.gameSeconds >= 180);
      const at300 = snapshots.find((s) => s.gameSeconds >= 300);

      if (at60) expect(at60.gatherers, 'By 60s: should have 4+ gatherers').toBeGreaterThanOrEqual(4);
      if (at120) expect(at120.buildings, 'By 120s: should have 2+ buildings').toBeGreaterThanOrEqual(2);
      if (at180) expect(at180.army, 'By 180s: should have 2+ combat units').toBeGreaterThanOrEqual(2);
      if (at300) expect(at300.techResearched.length, 'By 300s: should have 2+ techs').toBeGreaterThanOrEqual(2);

      // No console errors during playthrough (filter out non-critical)
      const criticalErrors = consoleErrors.filter((e) => !e.includes('setPointerCapture') && !e.includes('AudioContext'));
      expect(criticalErrors, 'Expected no critical console errors').toHaveLength(0);
    },
    600_000, // 10 minute real-time timeout
  );
});

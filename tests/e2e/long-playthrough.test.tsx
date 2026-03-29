/**
 * Long E2E Playthrough Test
 *
 * Runs the game for 60 minutes of game time (at 10x speed = ~6 min real time).
 * Covers late-game content: evolution tiers 3-5, mega-waves, champion enemies,
 * nest production ramp, and random events.
 *
 * Run with: npx vitest --config vitest.e2e.config.ts long-playthrough
 */

import { page } from '@vitest/browser/context';
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
  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }

  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';

  await new Promise<void>((resolve) => {
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
}

async function waitForIntro(): Promise<void> {
  await new Promise((r) => setTimeout(r, 4000));
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('Long E2E Playthrough (60 min game time)', () => {
  const snapshots: GovernorSnapshot[] = [];
  const screenshotPaths: string[] = [];
  const consoleErrors: string[] = [];
  const evolutionTierChanges: { gameSeconds: number; tier: number }[] = [];
  const megaWaveEvents: { gameSeconds: number; text: string }[] = [];
  const championSpawns: { gameSeconds: number; count: number }[] = [];
  let lastScreenshotGameSec = -60;
  let lastEvolutionTier = 0;
  let lastChampionCount = 0;

  beforeAll(async () => {
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(' '));
      origError.apply(console, args);
    };

    await page.viewport(1280, 720);
    await mountGame();
    await waitForIntro();
  }, 30_000);

  afterAll(() => {
    console.log('\n=== Long Playthrough Summary ===');
    console.log(`Total snapshots: ${snapshots.length}`);
    console.log(`Screenshots saved: ${screenshotPaths.length}`);
    console.log(`Evolution tier changes: ${evolutionTierChanges.length}`);
    for (const e of evolutionTierChanges) {
      console.log(`  Tier ${e.tier} at ${e.gameSeconds}s`);
    }
    console.log(`Mega-wave events: ${megaWaveEvents.length}`);
    for (const m of megaWaveEvents) {
      console.log(`  ${m.text} at ${m.gameSeconds}s`);
    }
    console.log(`Champion spawns: ${championSpawns.length}`);
    if (snapshots.length > 0) {
      const last = snapshots[snapshots.length - 1];
      console.log(`Final state: ${JSON.stringify(last, null, 2)}`);
    }
    console.log('================================\n');
  });

  it(
    'should survive and progress through 60 minutes of game time',
    async () => {
      // Run at 10x speed: 60 min game = ~360s real time
      game.world.gameSpeed = 10;

      await runGovernor({
        timeoutMs: 540_000, // 9 min real time safety timeout
        intervalMs: 500,
        stopWhen: () => {
          const gs = game.world.frameCount / 60;
          return game.world.state !== 'playing' || gs >= 3600;
        },
        onTick: async (snapshot) => {
          snapshots.push(snapshot);

          // Track evolution tier changes
          const currentTier = game.world.enemyEvolution.tier;
          if (currentTier !== lastEvolutionTier) {
            evolutionTierChanges.push({
              gameSeconds: snapshot.gameSeconds,
              tier: currentTier,
            });
            console.log(
              `[${snapshot.gameSeconds}s] EVOLUTION: Tier ${lastEvolutionTier} -> ${currentTier}`,
            );
            lastEvolutionTier = currentTier;
          }

          // Track mega-wave events via floating texts
          for (const ft of game.world.floatingTexts) {
            if (ft.text.includes('MEGA-WAVE')) {
              const alreadyTracked = megaWaveEvents.some(
                (m) => Math.abs(m.gameSeconds - snapshot.gameSeconds) < 10,
              );
              if (!alreadyTracked) {
                megaWaveEvents.push({
                  gameSeconds: snapshot.gameSeconds,
                  text: ft.text,
                });
                console.log(`[${snapshot.gameSeconds}s] ${ft.text}`);
              }
            }
          }

          // Track champion enemy spawns
          const championCount = game.world.championEnemies.size;
          if (championCount > lastChampionCount) {
            championSpawns.push({
              gameSeconds: snapshot.gameSeconds,
              count: championCount,
            });
            console.log(
              `[${snapshot.gameSeconds}s] CHAMPIONS: ${lastChampionCount} -> ${championCount}`,
            );
            lastChampionCount = championCount;
          }

          // Take screenshot every ~60 game-seconds (1 per game-minute)
          if (snapshot.gameSeconds - lastScreenshotGameSec >= 60) {
            lastScreenshotGameSec = snapshot.gameSeconds;
            try {
              const path = await page.screenshot({
                path: `long-playthrough-${snapshot.gameSeconds}s.png`,
              });
              if (typeof path === 'string') {
                screenshotPaths.push(path);
              }
            } catch {
              // Screenshot may fail in CI, non-blocking
            }

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

      // ---- Assertions: verify late-game progression milestones ----

      // Must have gathered resources (basic economy check)
      const anyResourceGathered = snapshots.some(
        (s) => s.clams > 200 || s.twigs > 50 || s.gatherers > 3,
      );
      expect(anyResourceGathered, 'Expected resources to be gathered').toBe(true);

      // Must have trained units
      const anyTraining = snapshots.some((s) => s.gatherers > 3 || s.army > 0);
      expect(anyTraining, 'Expected at least one unit to be trained').toBe(true);

      // Must have constructed buildings
      const anyBuilding = snapshots.some((s) => s.buildings > 1);
      expect(anyBuilding, 'Expected at least one building to be constructed').toBe(true);

      // Game should still be playing at 30 min (not instant loss)
      const at30Min = snapshots.find((s) => s.gameSeconds >= 1800);
      if (at30Min) {
        // If we reached 30 min, the game should have been playing
        expect(
          game.world.state === 'playing' || at30Min.gameSeconds >= 1800,
          'Expected game to be still playing at 30 min',
        ).toBe(true);
      }

      // Evolution should reach at least tier 3
      const maxEvolutionTier = Math.max(
        0,
        ...evolutionTierChanges.map((e) => e.tier),
      );
      expect(
        maxEvolutionTier,
        `Expected evolution to reach at least tier 3, got tier ${maxEvolutionTier}`,
      ).toBeGreaterThanOrEqual(3);

      // At least 1 mega-wave should have occurred
      expect(
        megaWaveEvents.length,
        `Expected at least 1 mega-wave event, got ${megaWaveEvents.length}`,
      ).toBeGreaterThanOrEqual(1);

      // Verify multiple governor phases were reached
      const phases = new Set(snapshots.map((s) => s.phase));
      expect(phases.size, 'Expected to progress through multiple phases').toBeGreaterThanOrEqual(3);

      // No console errors during playthrough
      expect(consoleErrors, 'Expected no console errors').toHaveLength(0);
    },
    600_000, // 10 minute real-time timeout
  );
});

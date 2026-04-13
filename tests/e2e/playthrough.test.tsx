/**
 * E2E Playthrough Test
 *
 * Verifies the game can mount, navigate through the menu, and render
 * correctly in the browser. No governor, no long playthrough — just
 * smoke-test the app lifecycle.
 *
 * Run with: npx vitest --config vitest.e2e.config.ts
 */

import { page } from 'vitest/browser';
import { render } from 'preact';
import { beforeAll, describe, expect, it } from 'vitest';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';

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

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('E2E Playthrough', () => {
  beforeAll(async () => {
    await page.viewport(1280, 720);
    await mountGame();
    // Wait for intro overlay to fade
    await new Promise((r) => setTimeout(r, 4000));
  }, 30_000);

  it('game canvas renders at correct size (not default 300x150)', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    expect(canvas.width).toBeGreaterThan(300);
    expect(canvas.height).toBeGreaterThan(150);
  });

  it('game container exists', () => {
    const container = document.getElementById('game-container');
    expect(container).toBeTruthy();
  });

  it('HUD accordion sections are visible', () => {
    // The HUD should render accordion sections for Resources, Units, etc.
    const accordions = document.querySelectorAll('[data-accordion], .accordion-section, details');
    // At minimum the game should have some UI rendered
    const hudElements = document.querySelectorAll('.hud, .game-hud, [class*="hud"]');
    // Either accordion or hud elements should exist
    expect(accordions.length + hudElements.length).toBeGreaterThan(0);
  });

  it('game state is playing', () => {
    expect(game.world.state).toBe('playing');
  });
});

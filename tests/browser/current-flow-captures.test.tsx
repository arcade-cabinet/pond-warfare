import { query } from 'bitecs';
import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { game } from '@/game';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { calculateMatchReward } from '@/game/match-rewards';
import { App } from '@/ui/app';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import '@/styles/main.css';
import { EntityKind, Faction } from '@/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const auditOutputDir = import.meta.env.VITE_BROWSER_AUDIT_OUTPUT_DIR ?? 'audit';
let mathRandomRestore: (() => void) | null = null;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointerup',
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

function clickButton(text: string): void {
  const button = Array.from(document.querySelectorAll('button')).find(
    (node) => node.textContent?.includes(text) && !node.disabled,
  );
  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }
  button.click();
}

function clickLabel(label: string): void {
  const button = document.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  button.click();
}

function worldToScreen(worldX: number, worldY: number) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Missing #game-canvas');
  }
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return {
    x: rect.left + (worldX - w.camX) * w.zoomLevel,
    y: rect.top + (worldY - w.camY) * w.zoomLevel,
  };
}

function clickWorld(worldX: number, worldY: number, button = 0) {
  const container = document.getElementById('game-container') as HTMLElement | null;
  if (!container) {
    throw new Error('Missing #game-container');
  }
  const { x, y } = worldToScreen(worldX, worldY);
  firePointer(container, 'pointerdown', x, y, button);
  firePointer(container, 'pointerup', x, y, button);
}

async function waitFrames(count: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < count) {
    await delay(16);
  }
}

function findPlayerLodge(): number {
  const entities = query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const lodge = Array.from(entities).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0,
  );
  if (lodge == null) {
    throw new Error('Player Lodge not found');
  }
  return lodge;
}

function findFishNode(): number {
  const entities = query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const fishNode = Array.from(entities).find(
    (eid) =>
      FactionTag.faction[eid] === Faction.Neutral &&
      EntityTypeTag.kind[eid] === EntityKind.Clambed &&
      Health.current[eid] > 0,
  );
  if (fishNode == null) {
    throw new Error('Fish node not found');
  }
  return fishNode;
}

async function takeShot(name: string) {
  const canPauseGame = store.menuState.value === 'playing' && game.isRunning();
  const wasPaused = canPauseGame ? game.world.paused : false;
  try {
    if (canPauseGame) {
      game.world.particles.length = 0;
      game.world.floatingTexts.length = 0;
      game.world.groundPings.length = 0;
      game.world.corpses.length = 0;
      game.world.paused = true;
      await delay(150);
    } else {
      await delay(150);
    }
    await page.screenshot({
      path: `${auditOutputDir}/${name}.png`,
      element: document.body,
    });
  } finally {
    if (canPauseGame) {
      game.world.paused = wasPaused;
    }
  }
}

async function mountApp() {
  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#000';

  const ready = new Promise<void>((resolve) => {
    render(
      <App
        onMount={async (refs) => {
          await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
          resolve();
        }}
      />,
      root!,
    );
  });

  return { ready, root };
}

describe('Current flow captures', () => {
  afterAll(() => {
    mathRandomRestore?.();
    mathRandomRestore = null;
    localStorage.removeItem('pw_onboarding_v2');
    store.reduceVisualNoise.value = false;
    storeV3.eventAlert.value = null;
    storeV3.rewardsScreenOpen.value = false;
    storeV3.clamUpgradeScreenOpen.value = false;
    storeV3.rankUpModalOpen.value = false;
    if (game.isRunning()) {
      game.destroy();
    }
    const root = document.getElementById('app');
    if (root) {
      render(null, root);
    }
    document.body.innerHTML = '';
  });

  it('captures landing stages and six current gameplay phases', async () => {
    const seededRandom = createSeededRandom(1337);
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => seededRandom());
    mathRandomRestore = () => randomSpy.mockRestore();
    try {
      store.reduceVisualNoise.value = true;
      store.menuState.value = 'main';
      store.hasSaveGame.value = true;
      storeV3.progressionLevel.value = 0;
      storeV3.totalClams.value = 0;
      storeV3.prestigeRank.value = 1;
      storeV3.prestigeState.value = {
        rank: 1,
        pearls: 5,
        totalPearlsEarned: 5,
        upgradeRanks: {},
      };
      store.settingsOpen.value = false;
      storeV3.rewardsScreenOpen.value = false;
      storeV3.clamUpgradeScreenOpen.value = false;
      storeV3.lastRewardBreakdown.value = null;
      localStorage.setItem('pw_onboarding_v2', 'dismissed');
      const { ready } = await mountApp();

      expect(store.menuState.value).toBe('main');
      await takeShot('landing-01-main');

      clickButton('SETTINGS');
      await delay(250);
      await takeShot('landing-02-settings');
      clickLabel('Close settings');
      await delay(250);

      clickButton('PLAY');
      await delay(250);
      await takeShot('landing-03-play-mode');

      clickButton('SINGLE PLAYER');
      await ready;
      await delay(1000);
      game.world.gameSpeed = 3;

      expect(document.getElementById('game-container')).toBeTruthy();
      await takeShot('phase-01-match-start');

      const lodge = findPlayerLodge();
      const fishNode = findFishNode();
      const mudpaw = spawnEntity(
        game.world,
        MUDPAW_KIND,
        Position.x[lodge] - 80,
        Position.y[lodge] - 60,
        Faction.Player,
      );
      clickWorld(Position.x[mudpaw], Position.y[mudpaw], 0);
      await delay(200);
      clickWorld(Position.x[fishNode], Position.y[fishNode], 2);
      await waitFrames(120);
      await takeShot('phase-02-economy-gathering');

      storeV3.eventAlert.value = {
        text: 'WAVE INCOMING - FROM NORTH',
        direction: 'north',
        spawnX: Position.x[lodge],
        spawnY: Position.y[lodge] - 240,
        frame: game.world.frameCount,
      };
      await takeShot('phase-03-event-alert');

      spawnEntity(
        game.world,
        SAPPER_KIND,
        Position.x[lodge] + 40,
        Position.y[lodge] - 80,
        Faction.Player,
      );
      spawnEntity(
        game.world,
        SAPPER_KIND,
        Position.x[lodge] + 40,
        Position.y[lodge] - 150,
        Faction.Enemy,
      );
      await waitFrames(150);
      await takeShot('phase-04-defense-combat');

      const reward = calculateMatchReward({
        result: 'win',
        durationSeconds: 420,
        kills: 9,
        resourcesGathered: 140,
        eventsCompleted: 1,
        prestigeRank: storeV3.prestigeRank.value,
      });
      game.world.paused = true;
      storeV3.lastRewardBreakdown.value = reward;
      storeV3.matchEventsCompleted.value = 1;
      storeV3.canRankUpAfterMatch.value = true;
      storeV3.rewardsScreenOpen.value = true;
      await takeShot('phase-05-rewards');

      storeV3.totalClams.value = reward.totalClams;
      storeV3.rewardsScreenOpen.value = false;
      storeV3.clamUpgradeScreenOpen.value = true;
      await takeShot('phase-06-upgrade-web');
    } finally {
      mathRandomRestore?.();
      mathRandomRestore = null;
    }
  }, 120_000);
});

/**
 * Browser Game State & Modes Tests
 *
 * Covers: pause/resume, speed, win/lose conditions, wave system,
 * difficulty modifiers, permadeath, commander effects.
 */

import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { query } from 'bitecs';
import {
  EntityTypeTag, FactionTag, Health, Position,
} from '@/ecs/components';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { EntityKind, Faction } from '@/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clickButton(text: string) {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) btn.click();
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

describe('Game state & modes', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500);
    game.world.gameSpeed = 3;
    game.world.resources.clams = 5000;
    game.world.resources.twigs = 5000;
  }, 30_000);

  describe('Pause/Resume', () => {
    it('pause stops frame advancement', async () => {
      game.world.paused = true;
      const before = game.world.frameCount;
      await delay(300);
      const after = game.world.frameCount;
      expect(after - before).toBeLessThan(5);
      game.world.paused = false;
    });

    it('resume continues frame advancement', async () => {
      game.world.paused = false;
      const before = game.world.frameCount;
      await delay(500);
      const after = game.world.frameCount;
      expect(after - before).toBeGreaterThan(10);
    });
  });

  describe('Game speed', () => {
    it('3x speed produces more frames than 1x', async () => {
      game.world.gameSpeed = 1;
      const start1 = game.world.frameCount;
      await delay(400);
      const frames1 = game.world.frameCount - start1;

      game.world.gameSpeed = 3;
      const start3 = game.world.frameCount;
      await delay(400);
      const frames3 = game.world.frameCount - start3;

      expect(frames3).toBeGreaterThan(frames1 * 1.5);
    });
  });

  describe('Game state', () => {
    it('state is playing during gameplay', () => {
      expect(game.world.state).toBe('playing');
    });

    it('world has required properties', () => {
      const w = game.world;
      expect(w.resources).toBeDefined();
      expect(w.tech).toBeDefined();
      expect(w.autoBehaviors).toBeDefined();
      expect(w.yukaManager).toBeDefined();
      expect(w.selection).toBeDefined();
    });
  });

  describe('Peace & waves', () => {
    it('peace timer is set', () => {
      expect(game.world.peaceTimer).toBeGreaterThan(0);
    });

    it('game time advances', async () => {
      const before = game.world.frameCount;
      await waitFrames(60);
      expect(game.world.frameCount).toBeGreaterThan(before);
    });

    it('enemy nests exist', () => {
      const nests = getUnits(EntityKind.PredatorNest, Faction.Enemy);
      expect(nests.length).toBeGreaterThan(0);
    });
  });

  describe('Win/Lose conditions', () => {
    it.todo('all nests destroyed changes state', async () => {
      const origState = game.world.state;
      const nests = getUnits(EntityKind.PredatorNest, Faction.Enemy);
      const savedHPs = nests.map((eid) => Health.current[eid]);
      for (const eid of nests) Health.current[eid] = 0;
      await waitFrames(60);
      for (let i = 0; i < nests.length; i++) Health.current[nests[i]] = savedHPs[i];
      game.world.state = origState as 'playing';
    });

    it.todo('last lodge destroyed changes state', async () => {
      const lodges = getUnits(EntityKind.Lodge);
      if (lodges.length === 0) return;
      const origState = game.world.state;
      const savedHP = Health.current[lodges[0]];
      Health.current[lodges[0]] = 0;
      await waitFrames(60);
      Health.current[lodges[0]] = savedHP;
      game.world.state = origState as 'playing';
    });
  });

  describe('Config & difficulty', () => {
    it('starting units exist', () => {
      expect(getUnits(EntityKind.Gatherer).length).toBeGreaterThan(0);
    });

    it('resources positive', () => {
      expect(game.world.resources.clams).toBeGreaterThan(0);
    });

    it('food system works', () => {
      expect(game.world.resources.food).toBeGreaterThanOrEqual(0);
      expect(game.world.resources.maxFood).toBeGreaterThan(0);
    });

    it('permadeath flag tracked', () => {
      expect(typeof game.world.permadeath).toBe('boolean');
    });
  });

  describe('Commander & buffs', () => {
    it('commander buff sets exist', () => {
      expect(game.world.commanderSpeedBuff).toBeDefined();
      expect(game.world.commanderDamageBuff).toBeDefined();
    });

    it('kill streaks tracked', () => {
      expect(game.world.killStreak).toBeDefined();
    });

    it('auto-behaviors object exists with all fields', () => {
      const ab = game.world.autoBehaviors;
      expect(typeof ab.gather).toBe('boolean');
      expect(typeof ab.build).toBe('boolean');
      expect(typeof ab.defend).toBe('boolean');
      expect(typeof ab.attack).toBe('boolean');
      expect(typeof ab.heal).toBe('boolean');
      expect(typeof ab.scout).toBe('boolean');
    });
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/modes-final.png' });
  });
});

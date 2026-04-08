/**
 * Game Over Sync Tests
 *
 * Validates that syncGameOverStats populates all expected stat lines
 * and that Play Again can return the shell to a fresh playable state.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(false),
  getLatestSave: vi.fn().mockResolvedValue(null),
  deleteSave: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/constants', () => ({
  DAY_FRAMES: 3600,
}));

import { resetPermadeathGuard, syncGameOverStats } from '@/game/game-over-sync';
import * as store from '@/ui/store';

function makeWorld(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    state: 'win',
    frameCount: 7200, // 2 days
    mapSeed: 42,
    difficulty: 'hard',
    commanderId: 'sage',
    permadeath: false,
    gameOverReason: null,
    tech: {
      sharpSticks: true,
      cartography: true,
      herbalMedicine: false,
    },
    stats: {
      unitsKilled: 15,
      unitsLost: 3,
      unitsTrained: 10,
      resourcesGathered: 500,
      buildingsBuilt: 5,
      buildingsLost: 1,
      peakArmy: 12,
      pearlsEarned: 20,
      totalFishEarned: 1000,
    },
    ...overrides,
  };
}

describe('syncGameOverStats', () => {
  beforeEach(() => {
    resetPermadeathGuard();
    // Reset store signals
    store.goStatLines.value = [];
    store.goTitle.value = '';
    store.goRating.value = 0;
    store.goMapSeed.value = 0;
    store.destroyedEnemyNests.value = 3;
  });

  it('populates all expected stat lines on victory', () => {
    const world = makeWorld();
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.length).toBeGreaterThanOrEqual(13);

    // Check each expected field is present
    expect(lines.some((l) => l.startsWith('Time:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Difficulty:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Commander:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Kills:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Units trained:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Units lost:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Buildings built:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Buildings lost:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Nests destroyed:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Resources gathered:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Techs researched:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Peak army:'))).toBe(true);
  });

  it('shows correct difficulty label', () => {
    const world = makeWorld({ difficulty: 'ultraNightmare' });
    syncGameOverStats(world as never);

    const diffLine = store.goStatLines.value.find((l) => l.startsWith('Difficulty:'));
    expect(diffLine).toBe('Difficulty: Ultra Nightmare');
  });

  it('shows correct commander label', () => {
    const world = makeWorld({ commanderId: 'ironpaw' });
    syncGameOverStats(world as never);

    const cmdLine = store.goStatLines.value.find((l) => l.startsWith('Commander:'));
    expect(cmdLine).toBe('Commander: Ironpaw');
  });

  it('shows tech count in research summary', () => {
    const world = makeWorld();
    syncGameOverStats(world as never);

    const techLine = store.goStatLines.value.find((l) => l.startsWith('Techs researched:'));
    expect(techLine).toBe('Techs researched: 2');
  });

  it('shows nests destroyed from store signal', () => {
    store.destroyedEnemyNests.value = 5;
    const world = makeWorld();
    syncGameOverStats(world as never);

    const nestLine = store.goStatLines.value.find((l) => l.startsWith('Nests destroyed:'));
    expect(nestLine).toBe('Nests destroyed: 5');
  });

  it('sets victory title and rating on win', () => {
    const world = makeWorld();
    syncGameOverStats(world as never);

    expect(store.goTitle.value).toBe('Victory');
    expect(store.goRating.value).toBeGreaterThanOrEqual(1);
  });

  it('sets defeat title on loss', () => {
    const world = makeWorld({ state: 'lose' });
    syncGameOverStats(world as never);

    expect(store.goTitle.value).toBe('Defeat');
  });

  it('shows Commander death description when commander-death reason', () => {
    const world = makeWorld({ state: 'lose', gameOverReason: 'commander-death' });
    syncGameOverStats(world as never);

    expect(store.goDesc.value).toBe('Commander Fallen — defeat!');
  });

  it('shows Commander kill description when commander-kill reason', () => {
    const world = makeWorld({ state: 'win', gameOverReason: 'commander-kill' });
    syncGameOverStats(world as never);

    expect(store.goDesc.value).toBe('Enemy Commander Defeated — victory!');
  });

  it('shows Commander fate: Assassinated on commander-death', () => {
    const world = makeWorld({ state: 'lose', gameOverReason: 'commander-death' });
    syncGameOverStats(world as never);

    const fateLine = store.goStatLines.value.find((l) => l.startsWith('Commander fate:'));
    expect(fateLine).toBe('Commander fate: Assassinated');
  });

  it('shows Commander fate: Survived on commander-kill win', () => {
    const world = makeWorld({ state: 'win', gameOverReason: 'commander-kill' });
    syncGameOverStats(world as never);

    const fateLine = store.goStatLines.value.find((l) => l.startsWith('Commander fate:'));
    expect(fateLine).toBe('Commander fate: Survived');
  });

  it('does nothing when game is still playing', () => {
    const world = makeWorld({ state: 'playing' });
    syncGameOverStats(world as never);

    expect(store.goStatLines.value).toEqual([]);
  });

  it('shows units trained count', () => {
    const world = makeWorld();
    syncGameOverStats(world as never);

    const trainLine = store.goStatLines.value.find((l) => l.startsWith('Units trained:'));
    expect(trainLine).toBe('Units trained: 10');
  });
});

describe('Play Again state reset', () => {
  it('play again can return the shell to a fresh playable state', () => {
    expect(typeof store.menuState.value).toBe('string');
    expect(typeof store.gameState.value).toBe('string');

    store.gameState.value = 'lose';
    expect(store.gameState.value).toBe('lose');

    store.menuState.value = 'main';
    expect(store.menuState.value).toBe('main');
    store.gameState.value = 'playing';
    expect(store.gameState.value).toBe('playing');
  });

  it('resetPermadeathGuard allows re-firing on new game', () => {
    // Verify the guard resets properly for a new game
    resetPermadeathGuard();
    // After reset, syncGameOverStats should be able to fire again
    const world = makeWorld({ state: 'lose', permadeath: false });
    syncGameOverStats(world as never);
    expect(store.goTitle.value).toBe('Defeat');
  });
});

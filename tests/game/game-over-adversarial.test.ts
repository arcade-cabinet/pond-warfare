/**
 * Game Over Sync -- Adversarial Mode Tests
 *
 * Validates that adversarial-specific game-over reasons produce correct
 * descriptions and stat lines (Mode: Adversarial, commander fate).
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
    frameCount: 7200,
    mapSeed: 42,
    difficulty: 'normal',
    commanderId: 'marshal',
    permadeath: false,
    gameOverReason: null,
    adversarialMode: false,
    coopMode: false,
    waveSurvivalMode: false,
    waveSurvivalTarget: 5,
    waveNumber: 0,
    tech: {},
    stats: {
      unitsKilled: 10,
      unitsLost: 2,
      unitsTrained: 8,
      resourcesGathered: 300,
      buildingsBuilt: 3,
      buildingsLost: 0,
      peakArmy: 10,
      pearlsEarned: 0,
      totalFishEarned: 500,
    },
    ...overrides,
  };
}

describe('syncGameOverStats -- adversarial mode', () => {
  beforeEach(() => {
    resetPermadeathGuard();
    store.goStatLines.value = [];
    store.goTitle.value = '';
    store.goDesc.value = '';
    store.goRating.value = 0;
    store.goMapSeed.value = 0;
    store.destroyedEnemyNests.value = 0;
  });

  it('shows adversarial-win description on victory', () => {
    const world = makeWorld({
      state: 'win',
      gameOverReason: 'adversarial-win',
      adversarialMode: true,
    });
    syncGameOverStats(world as never);

    expect(store.goTitle.value).toBe('Victory');
    expect(store.goDesc.value).toContain('Opponent defeated');
  });

  it('shows adversarial-loss description on defeat', () => {
    const world = makeWorld({
      state: 'lose',
      gameOverReason: 'adversarial-loss',
      adversarialMode: true,
    });
    syncGameOverStats(world as never);

    expect(store.goTitle.value).toBe('Defeat');
    expect(store.goDesc.value).toContain('overwhelmed');
  });

  it('includes Mode: Adversarial in stat lines', () => {
    const world = makeWorld({
      state: 'win',
      gameOverReason: 'adversarial-win',
      adversarialMode: true,
    });
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.some((l) => l.includes('Mode: Adversarial'))).toBe(true);
  });

  it('includes Mode: Solo for non-multiplayer games', () => {
    const world = makeWorld({
      state: 'win',
      adversarialMode: false,
      coopMode: false,
    });
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.some((l) => l.includes('Mode: Solo'))).toBe(true);
  });

  it('includes Mode: Co-op for co-op games', () => {
    const world = makeWorld({
      state: 'win',
      adversarialMode: false,
      coopMode: true,
    });
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.some((l) => l.includes('Mode: Co-op'))).toBe(true);
  });

  it('sets commander fate to Assassinated for adversarial-loss', () => {
    const world = makeWorld({
      state: 'lose',
      gameOverReason: 'adversarial-loss',
      adversarialMode: true,
    });
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.some((l) => l.includes('Commander fate: Assassinated'))).toBe(true);
  });

  it('sets commander fate to Survived for adversarial-win', () => {
    const world = makeWorld({
      state: 'win',
      gameOverReason: 'adversarial-win',
      adversarialMode: true,
    });
    syncGameOverStats(world as never);

    const lines = store.goStatLines.value;
    expect(lines.some((l) => l.includes('Commander fate: Survived'))).toBe(true);
  });
});

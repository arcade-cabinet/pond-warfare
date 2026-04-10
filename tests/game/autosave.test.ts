import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/save-system', () => ({
  saveGame: vi.fn(() => '{"version":3}'),
}));

vi.mock('@/storage', () => ({
  saveGameToDb: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/errors', async () => {
  const actual = await vi.importActual<typeof import('@/errors')>('@/errors');
  return {
    ...actual,
    logError: vi.fn(),
  };
});

import { logError } from '@/errors';
import { triggerAutosave } from '@/game/autosave';
import { saveGameToDb } from '@/storage';
import * as store from '@/ui/store';

describe('triggerAutosave', () => {
  const world = {
    floatingTexts: [] as Array<{ text: string; color: string; life: number }>,
    camX: 0,
    camY: 0,
    viewWidth: 800,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    world.floatingTexts = [];
    store.selectedDifficulty.value = 'normal';
    store.goMapSeed.value = 123;
    store.hasSaveGame.value = false;
  });

  it('shows success feedback only after autosave succeeds', async () => {
    await triggerAutosave(world);

    expect(saveGameToDb).toHaveBeenCalledWith('autosave', 'normal', 123, '{"version":3}', false);
    expect(store.hasSaveGame.value).toBe(true);
    expect(world.floatingTexts).toHaveLength(1);
    expect(world.floatingTexts[0]).toMatchObject({
      text: 'Auto-saved',
      color: '#4ade80',
      life: 60,
    });
  });

  it('logs a nonfatal error and shows failure feedback when autosave fails', async () => {
    vi.mocked(saveGameToDb).mockRejectedValueOnce(new Error('db offline'));

    await triggerAutosave(world);

    expect(store.hasSaveGame.value).toBe(false);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(world.floatingTexts).toHaveLength(1);
    expect(world.floatingTexts[0]).toMatchObject({
      text: 'Auto-save Failed',
      color: '#f87171',
      life: 90,
    });
  });
});

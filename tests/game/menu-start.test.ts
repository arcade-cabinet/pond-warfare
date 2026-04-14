import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/errors', async () => {
  const actual = await vi.importActual<typeof import('@/errors')>('@/errors');
  return {
    ...actual,
    logError: vi.fn(),
  };
});

vi.mock('@/save-system', () => ({
  loadGame: vi.fn().mockReturnValue(true),
}));

vi.mock('@/storage', () => ({
  getLatestSave: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/game', () => ({
  game: {
    init: vi.fn().mockResolvedValue(undefined),
    syncUIStore: vi.fn(),
    world: {},
  },
}));

import { logError } from '@/errors';
import { game } from '@/game';
import { hydrateSaveAvailability, startMenuGame } from '@/game/menu-start';
import { loadGame } from '@/save-system';
import { getLatestSave } from '@/storage';
import * as store from '@/ui/store';

const refs = {
  container: {} as HTMLDivElement,
  gameCanvas: {} as HTMLCanvasElement,
  fogCanvas: {} as HTMLCanvasElement,
  lightCanvas: {} as HTMLCanvasElement,
};

describe('menu-start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.continueRequested.value = false;
    store.hasSaveGame.value = false;
  });

  it('hydrates save availability when a save exists', async () => {
    vi.mocked(getLatestSave).mockResolvedValue({ data: '{}' } as Awaited<
      ReturnType<typeof getLatestSave>
    >);

    await hydrateSaveAvailability();

    expect(store.hasSaveGame.value).toBe(true);
  });

  it('clears save availability when no save exists', async () => {
    vi.mocked(getLatestSave).mockResolvedValue(null);

    await hydrateSaveAvailability();

    expect(store.hasSaveGame.value).toBe(false);
  });

  it('starts a fresh match without loading a save by default', async () => {
    await expect(startMenuGame(refs)).resolves.toBe(true);

    expect(game.init).toHaveBeenCalledWith(
      refs.container,
      refs.gameCanvas,
      refs.fogCanvas,
      refs.lightCanvas,
    );
    expect(getLatestSave).not.toHaveBeenCalled();
    expect(loadGame).not.toHaveBeenCalled();
  });

  it('loads the latest save when CONTINUE was requested', async () => {
    store.continueRequested.value = true;
    vi.mocked(getLatestSave).mockResolvedValue({ data: '{"version":3}' } as Awaited<
      ReturnType<typeof getLatestSave>
    >);

    await expect(startMenuGame(refs)).resolves.toBe(true);

    expect(loadGame).toHaveBeenCalledWith(game.world, '{"version":3}');
    expect(game.syncUIStore).toHaveBeenCalled();
    expect(store.continueRequested.value).toBe(false);
    expect(store.hasSaveGame.value).toBe(true);
  });

  it('returns to the menu when CONTINUE has no save to load', async () => {
    store.continueRequested.value = true;
    store.menuState.value = 'playing';
    vi.mocked(getLatestSave).mockResolvedValue(null);

    await expect(startMenuGame(refs)).resolves.toBe(false);

    expect(game.init).not.toHaveBeenCalled();
    expect(loadGame).not.toHaveBeenCalled();
    expect(store.continueRequested.value).toBe(false);
    expect(store.hasSaveGame.value).toBe(false);
    expect(store.menuState.value).toBe('main');
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('returns to the menu when CONTINUE points to an invalid save payload', async () => {
    store.continueRequested.value = true;
    store.menuState.value = 'playing';
    vi.mocked(getLatestSave).mockResolvedValue({ data: '{"version":3}' } as Awaited<
      ReturnType<typeof getLatestSave>
    >);
    vi.mocked(loadGame).mockReturnValueOnce(false);

    await expect(startMenuGame(refs)).resolves.toBe(false);

    expect(game.init).toHaveBeenCalled();
    expect(store.hasSaveGame.value).toBe(false);
    expect(store.menuState.value).toBe('main');
    expect(logError).toHaveBeenCalledTimes(1);
  });
});

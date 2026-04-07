import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { loadGame } from '@/save-system';
import { getLatestSave } from '@/storage';
import { game } from '@/game';
import { startMenuGame, hydrateSaveAvailability } from '@/game/menu-start';
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
    await startMenuGame(refs);

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

    await startMenuGame(refs);

    expect(loadGame).toHaveBeenCalledWith(game.world, '{"version":3}');
    expect(game.syncUIStore).toHaveBeenCalled();
    expect(store.continueRequested.value).toBe(false);
    expect(store.hasSaveGame.value).toBe(true);
  });

  it('falls back to a new match when CONTINUE has no save to load', async () => {
    store.continueRequested.value = true;
    vi.mocked(getLatestSave).mockResolvedValue(null);

    await startMenuGame(refs);

    expect(loadGame).not.toHaveBeenCalled();
    expect(store.continueRequested.value).toBe(false);
    expect(store.hasSaveGame.value).toBe(false);
  });
});

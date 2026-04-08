import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/errors', async () => {
  const actual = await vi.importActual<typeof import('@/errors')>('@/errors');
  return {
    ...actual,
    clearFatalError: vi.fn(),
    logError: vi.fn(),
  };
});

vi.mock('@/game/menu-start', () => ({
  startMenuGame: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/game', () => ({
  game: {
    init: vi.fn().mockResolvedValue(undefined),
    syncUIStore: vi.fn(),
  },
}));

vi.mock('@/ui/game-init-failure', () => ({
  handleGameInitFailure: vi.fn(),
}));

import { clearFatalError, logError } from '@/errors';
import { game } from '@/game';
import { startMenuGame } from '@/game/menu-start';
import {
  registerMountedGameRefs,
  releaseMountedGameLock,
  restartMountedGameSession,
  startMountedGameFromMenu,
} from '@/game/shell-session';
import { handleGameInitFailure } from '@/ui/game-init-failure';
import * as store from '@/ui/store';

const refs = {
  container: {} as HTMLDivElement,
  gameCanvas: {} as HTMLCanvasElement,
  fogCanvas: {} as HTMLCanvasElement,
  lightCanvas: {} as HTMLCanvasElement,
};

describe('shell-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseMountedGameLock();
    registerMountedGameRefs(refs);
    store.gameLoading.value = false;
    store.continueRequested.value = true;
    store.menuState.value = 'playing';
    store.gameState.value = 'lose';
    store.paused.value = true;
    store.evacuationActive.value = true;
    store.mobilePanelOpen.value = true;
  });

  it('locks duplicate menu starts until the shell returns to the menu', async () => {
    await expect(startMountedGameFromMenu()).resolves.toBe(true);
    await expect(startMountedGameFromMenu()).resolves.toBe(false);

    expect(startMenuGame).toHaveBeenCalledTimes(1);

    releaseMountedGameLock();

    await expect(startMountedGameFromMenu()).resolves.toBe(true);
    expect(startMenuGame).toHaveBeenCalledTimes(2);
  });

  it('restarts the mounted session in-place', async () => {
    await expect(restartMountedGameSession()).resolves.toBe(true);

    expect(clearFatalError).toHaveBeenCalledTimes(1);
    expect(game.init).toHaveBeenCalledWith(
      refs.container,
      refs.gameCanvas,
      refs.fogCanvas,
      refs.lightCanvas,
    );
    expect(game.syncUIStore).toHaveBeenCalledTimes(1);
    expect(store.continueRequested.value).toBe(false);
    expect(store.menuState.value).toBe('playing');
    expect(store.gameState.value).toBe('playing');
    expect(store.paused.value).toBe(false);
    expect(store.evacuationActive.value).toBe(false);
    expect(store.mobilePanelOpen.value).toBe(false);
    expect(store.gameLoading.value).toBe(false);
  });

  it('routes restart failures through the normal init failure handler', async () => {
    vi.mocked(game.init).mockRejectedValueOnce(new Error('restart blew up'));

    await expect(restartMountedGameSession()).resolves.toBe(false);

    expect(handleGameInitFailure).toHaveBeenCalledTimes(1);
    expect(store.gameLoading.value).toBe(false);
  });

  it('logs and returns to the menu when restart is requested before refs mount', async () => {
    releaseMountedGameLock();
    registerMountedGameRefs(null);
    store.menuState.value = 'playing';

    await expect(restartMountedGameSession()).resolves.toBe(false);

    expect(logError).toHaveBeenCalledTimes(1);
    expect(store.menuState.value).toBe('main');
    expect(store.continueRequested.value).toBe(false);
    expect(store.gameLoading.value).toBe(false);
  });
});

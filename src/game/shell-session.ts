import { clearFatalError, GameError, logError } from '@/errors';
import { game } from '@/game';
import { type MenuStartRefs, startMenuGame } from '@/game/menu-start';
import { handleGameInitFailure } from '@/ui/game-init-failure';
import * as store from '@/ui/store';

let mountedRefs: MenuStartRefs | null = null;
let startLocked = false;
let sessionActive = false;

export function registerMountedGameRefs(refs: MenuStartRefs | null): void {
  mountedRefs = refs;
}

export function releaseMountedGameLock(): void {
  startLocked = false;
}

export function teardownMountedGameSession(): void {
  startLocked = false;
  store.gameLoading.value = false;
  if (!sessionActive) return;
  game.destroy();
  sessionActive = false;
}

export async function startMountedGameFromMenu(): Promise<boolean> {
  if (!mountedRefs || startLocked) return false;
  startLocked = true;
  try {
    const started = await startMenuGame(mountedRefs);
    sessionActive = started;
    if (!started) {
      startLocked = false;
    }
    return started;
  } catch (error) {
    sessionActive = false;
    startLocked = false;
    throw error;
  }
}

export async function restartMountedGameSession(): Promise<boolean> {
  if (!mountedRefs) {
    logError(
      new GameError(
        'Restart requested before the game shell mounted',
        'game/shell-session.restartMountedGameSession',
      ),
    );
    store.gameLoading.value = false;
    store.continueRequested.value = false;
    store.menuState.value = 'main';
    return false;
  }

  startLocked = true;
  clearFatalError();
  store.gameLoading.value = true;
  store.continueRequested.value = false;
  store.menuState.value = 'playing';
  store.gameState.value = 'playing';
  store.paused.value = false;
  store.evacuationActive.value = false;
  store.mobilePanelOpen.value = false;

  try {
    await game.init(
      mountedRefs.container,
      mountedRefs.gameCanvas,
      mountedRefs.fogCanvas,
      mountedRefs.lightCanvas,
    );
    sessionActive = true;
    game.syncUIStore();
    return true;
  } catch (error) {
    sessionActive = false;
    startLocked = false;
    handleGameInitFailure(error);
    return false;
  } finally {
    store.gameLoading.value = false;
  }
}

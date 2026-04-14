/**
 * Menu game startup helpers.
 *
 * Keeps menu-triggered start behavior in one place so PLAY and CONTINUE can
 * share the same init path.
 */

import { GameError, logError } from '@/errors';
import { game } from '@/game';
import { loadGame } from '@/save-system';
import { getLatestSave } from '@/storage';
import { continueRequested, hasSaveGame, menuState } from '@/ui/store';

export interface MenuStartRefs {
  container: HTMLDivElement;
  gameCanvas: HTMLCanvasElement;
  fogCanvas: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
}

/** Hydrate whether a save exists so the landing screen can show CONTINUE. */
export async function hydrateSaveAvailability(): Promise<void> {
  try {
    hasSaveGame.value = (await getLatestSave()) !== null;
  } catch {
    hasSaveGame.value = false;
  }
}

function abortContinue(message: string): false {
  continueRequested.value = false;
  hasSaveGame.value = false;
  menuState.value = 'main';
  logError(new GameError(message, 'game/menu-start.startMenuGame'));
  return false;
}

/** Start a game from the menu and optionally continue from the latest save. */
export async function startMenuGame(refs: MenuStartRefs): Promise<boolean> {
  if (!continueRequested.value) {
    await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
    return true;
  }

  const save = await getLatestSave().catch(() => null);
  continueRequested.value = false;
  if (!save?.data) {
    return abortContinue('Continue requested but no saved match was available');
  }

  await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
  hasSaveGame.value = true;
  if (!loadGame(game.world, save.data)) {
    return abortContinue('Continue requested but the latest save could not be loaded');
  }
  game.syncUIStore();
  return true;
}

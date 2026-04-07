/**
 * Menu game startup helpers.
 *
 * Keeps menu-triggered start behavior in one place so PLAY and CONTINUE can
 * share the same init path.
 */

import { loadGame } from '@/save-system';
import { getLatestSave } from '@/storage';
import { game } from '@/game';
import { continueRequested, hasSaveGame } from '@/ui/store';

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

/** Start a game from the menu and optionally continue from the latest save. */
export async function startMenuGame(refs: MenuStartRefs): Promise<void> {
  await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);

  if (!continueRequested.value) return;
  continueRequested.value = false;

  const save = await getLatestSave().catch(() => null);
  if (!save?.data) {
    hasSaveGame.value = false;
    return;
  }

  hasSaveGame.value = true;
  if (loadGame(game.world, save.data)) {
    game.syncUIStore();
  }
}

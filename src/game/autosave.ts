import type { GameWorld } from '@/ecs/world';
import { GameError, logError } from '@/errors';
import { saveGame } from '@/save-system';
import { saveGameToDb } from '@/storage';
import { COLORS } from '@/ui/design-tokens';
import * as store from '@/ui/store';

function pushAutosaveText(world: GameWorld, text: string, color: string, life = 60): void {
  world.floatingTexts.push({
    x: world.camX + (world.viewWidth || 400) / 2,
    y: world.camY + 60,
    text,
    color,
    life,
  });
}

export function triggerAutosave(world: GameWorld): Promise<void> {
  const json = saveGame(world);
  return saveGameToDb(
    'autosave',
    store.selectedDifficulty.value ?? 'normal',
    store.goMapSeed.value ?? 0,
    json,
    false,
  )
    .then(() => {
      store.hasSaveGame.value = true;
      pushAutosaveText(world, 'Auto-saved', COLORS.feedbackSuccess);
    })
    .catch((error) => {
      logError(
        new GameError('Failed to autosave game to DB', 'game/autosave.triggerAutosave', {
          cause: error,
        }),
      );
      pushAutosaveText(world, 'Auto-save Failed', COLORS.feedbackError, 90);
    });
}

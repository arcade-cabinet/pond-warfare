import { reportFatalError } from '@/errors';
import * as store from './store';

/**
 * Return the player to a safe menu state if the play-session boot path fails.
 * This prevents blank in-game shells and clears stale "continue" intent before retry.
 */
export function handleGameInitFailure(error: unknown): void {
  store.gameLoading.value = false;
  store.continueRequested.value = false;
  store.menuState.value = 'main';
  reportFatalError(error);
}

/**
 * Game-Over Sync
 *
 * Writes victory/defeat stats to UI store signals and handles
 * permadeath save-deletion when a game is lost.
 */

import { DAY_FRAMES } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { deleteSave, getLatestSave } from '@/storage';
import * as store from '@/ui/store';

/** Module-level guard so permadeath deletion only fires once per loss. */
let _permadeathDeleteFired = false;

/** Reset the permadeath guard (call at the start of a new game). */
export function resetPermadeathGuard(): void {
  _permadeathDeleteFired = false;
}

/** Sync game-over stats to UI store; handle permadeath save deletion. */
export function syncGameOverStats(world: GameWorld): void {
  const w = world;

  if (w.state !== 'win' && w.state !== 'lose') return;

  store.goTitle.value = w.state === 'win' ? 'Victory' : 'Defeat';
  store.goTitleColor.value = w.state === 'win' ? 'text-amber-400' : 'text-red-500';
  store.goDesc.value =
    w.state === 'win' ? 'All predator nests destroyed!' : 'All lodges destroyed!';

  const days = Math.floor(w.frameCount / DAY_FRAMES);
  const remainFrames = w.frameCount % DAY_FRAMES;
  const hours = Math.floor((remainFrames / DAY_FRAMES) * 24);
  store.goTimeSurvived.value = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  store.goFrameCount.value = w.frameCount;
  store.goMapSeed.value = w.mapSeed;

  const statLines = [
    `Time: ${store.goTimeSurvived.value}`,
    `Kills: ${w.stats.unitsKilled}`,
    `Losses: ${w.stats.unitsLost}`,
    `Resources gathered: ${w.stats.resourcesGathered}`,
    `Buildings built: ${w.stats.buildingsBuilt}`,
    `Peak army: ${w.stats.peakArmy}`,
  ];
  store.goStatLines.value = statLines;
  store.goStatsText.value = statLines.join(' | ');

  // Performance rating: 1-3 stars
  const daysSurvived = Math.max(1, days);
  const killRatio = w.stats.unitsLost > 0 ? w.stats.unitsKilled / w.stats.unitsLost : 10;
  let stars = 1;
  if (w.state === 'win') {
    stars = 2;
    if (daysSurvived <= 10 && killRatio >= 2) stars = 3;
    else if (daysSurvived <= 20 || killRatio >= 1.5) stars = 2;
  } else {
    if (daysSurvived >= 10 && killRatio >= 1) stars = 2;
    if (daysSurvived >= 20 && killRatio >= 2) stars = 3;
  }
  store.goRating.value = stars;

  // Permadeath: delete save on loss (guard to run only once)
  if (w.state === 'lose' && w.permadeath && !_permadeathDeleteFired) {
    _permadeathDeleteFired = true;
    store.hasSaveGame.value = false;
    getLatestSave()
      .then((save) => {
        if (save) {
          return deleteSave(save.id);
        }
      })
      .catch(() => {
        /* best-effort cleanup */
      });
  }
}

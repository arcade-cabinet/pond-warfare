/**
 * Game-Over Sync
 *
 * Writes victory/defeat stats to UI store signals and handles
 * permadeath save-deletion when a game is lost.
 * Also sets v3 store signals for rewards screen display.
 */

import { nextPrestigeThreshold } from '@/config/prestige-logic';
import { TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { DAY_FRAMES } from '@/constants';
import { getEventsCompletedCount } from '@/ecs/systems/match-event-runner';
import type { GameWorld } from '@/ecs/world';
import { deleteSave, getLatestSave } from '@/storage';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { persistCurrentRun, persistPrestigeState } from '@/ui/store-v3-persistence';
import { processGameOverRewards, resetRewardsGuard } from './game-over-rewards';
import { calculateMatchReward, checkRankUpAvailable } from './match-rewards';

/** Module-level guard so permadeath deletion only fires once per loss. */
let _permadeathDeleteFired = false;

/** Module-level guard so rewards screen signals are only set once per game. */
let _rewardsScreenFired = false;

/** Reset the permadeath guard (call at the start of a new game). */
export function resetPermadeathGuard(): void {
  _permadeathDeleteFired = false;
  _rewardsScreenFired = false;
  resetRewardsGuard();
}

/** Sync game-over stats to UI store; handle permadeath save deletion. */
export function syncGameOverStats(world: GameWorld): void {
  const w = world;

  if (w.state !== 'win' && w.state !== 'lose') return;

  store.goTitle.value = w.state === 'win' ? 'Victory' : 'Defeat';
  store.goTitleColor.value = w.state === 'win' ? 'text-amber-400' : 'text-red-500';

  // Description varies by game-over reason
  if (w.gameOverReason === 'commander-death') {
    store.goDesc.value = 'Commander Fallen — defeat!';
  } else if (w.gameOverReason === 'commander-kill') {
    store.goDesc.value = 'Enemy Commander Defeated — victory!';
  } else if (w.waveSurvivalMode) {
    store.goDesc.value =
      w.state === 'win' ? `Survived all ${w.waveSurvivalTarget} waves!` : 'The Lodge has fallen!';
  } else {
    store.goDesc.value =
      w.state === 'win' ? 'All predator nests destroyed!' : 'All lodges destroyed!';
  }

  const days = Math.floor(w.frameCount / DAY_FRAMES);
  const remainFrames = w.frameCount % DAY_FRAMES;
  const hours = Math.floor((remainFrames / DAY_FRAMES) * 24);
  store.goTimeSurvived.value = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  store.goFrameCount.value = w.frameCount;
  store.goMapSeed.value = w.mapSeed;

  // Compute researched tech names (guard against empty TECH_UPGRADES stub)
  const researchedTechs: string[] = [];
  for (const [key, val] of Object.entries(w.tech)) {
    if (val && key in TECH_UPGRADES) {
      const upgrade = TECH_UPGRADES[key as TechId];
      if (upgrade) researchedTechs.push(upgrade.name);
    }
  }
  const techSummary =
    researchedTechs.length > 0 ? `${researchedTechs.length} (${researchedTechs.join(', ')})` : '0';

  // Difficulty display label
  const diffLabels: Record<string, string> = {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    nightmare: 'Nightmare',
    ultraNightmare: 'Ultra Nightmare',
  };
  const diffLabel = diffLabels[w.difficulty] ?? w.difficulty;

  // Commander display label
  const cmdLabels: Record<string, string> = {
    marshal: 'Marshal',
    sage: 'Sage',
    ironpaw: 'Ironpaw',
    warden: 'Warden',
    governor: 'Governor',
  };
  const cmdLabel = cmdLabels[w.commanderId] ?? w.commanderId;

  const nestsDestroyed = store.destroyedEnemyNests.value;

  // Commander fate line
  const commanderFate =
    w.gameOverReason === 'commander-death'
      ? 'Assassinated'
      : w.gameOverReason === 'commander-kill'
        ? 'Survived'
        : w.state === 'lose'
          ? 'Fallen'
          : 'Survived';

  const statLines = [
    `Time: ${store.goTimeSurvived.value}`,
    `Difficulty: ${diffLabel}`,
    `Commander: ${cmdLabel}`,
    `Commander fate: ${commanderFate}`,
    `Kills: ${w.stats.unitsKilled}`,
    `Units trained: ${w.stats.unitsTrained}`,
    `Units lost: ${w.stats.unitsLost}`,
    `Buildings built: ${w.stats.buildingsBuilt}`,
    `Buildings lost: ${w.stats.buildingsLost}`,
    ...(w.waveSurvivalMode
      ? [`Waves survived: ${w.waveNumber}/${w.waveSurvivalTarget}`]
      : [`Nests destroyed: ${nestsDestroyed}`]),
    `Resources gathered: ${w.stats.resourcesGathered}`,
    `Techs researched: ${techSummary}`,
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

  // v3 rewards screen: calculate breakdown and set signals (once per game end)
  if (!_rewardsScreenFired) {
    _rewardsScreenFired = true;
    const durationSeconds = Math.round(w.frameCount / 60);
    const eventsCompleted = getEventsCompletedCount();

    const breakdown = calculateMatchReward({
      result: w.state === 'win' ? 'win' : 'loss',
      durationSeconds,
      kills: w.stats.unitsKilled,
      resourcesGathered: w.stats.resourcesGathered,
      eventsCompleted,
      prestigeRank: storeV3.prestigeRank.value,
    });

    storeV3.lastRewardBreakdown.value = breakdown;
    storeV3.matchEventsCompleted.value = eventsCompleted;
    storeV3.rewardsScreenOpen.value = true;

    // T20: Increment progression level on win (0 for loss)
    if (w.state === 'win') {
      storeV3.progressionLevel.value += 1;
    }

    // US8: Check if Rank Up should be available after this match
    const threshold = nextPrestigeThreshold(storeV3.prestigeRank.value);
    const rankUpInfo = checkRankUpAvailable(
      storeV3.progressionLevel.value,
      storeV3.prestigeRank.value,
      threshold,
    );
    storeV3.canRankUpAfterMatch.value = rankUpInfo.canRankUp;

    // T19: Add earned Clams to total and persist to SQLite
    storeV3.totalClams.value += breakdown.totalClams;

    // Persist prestige + current run state (async, best-effort)
    persistPrestigeState().catch(() => {});
    persistCurrentRun().catch(() => {});
  }

  // Process XP, match record, and daily challenge (async, best-effort)
  processGameOverRewards(w).catch(() => {
    /* best-effort -- don't block game-over display */
  });
}

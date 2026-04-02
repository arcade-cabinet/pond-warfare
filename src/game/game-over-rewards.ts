/**
 * Game-Over Rewards
 *
 * Calculates XP, saves match record, checks daily challenge completion,
 * and updates player profile after a game ends. Called once per game end.
 */

import { TECH_UPGRADES } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import { getPlayerProfile, getSetting, setSetting, updatePlayerProfile } from '@/storage';
import { type MatchRecord, saveMatchRecord } from '@/storage/match-history';
import {
  dailyChallengeKey,
  type GameEndStats,
  getDailyChallenge,
} from '@/systems/daily-challenges';
import { calculateXp, getLevel } from '@/systems/player-xp';
import * as store from '@/ui/store';

/** Guard: only process rewards once per game. */
let _rewardsProcessed = false;

/** Reset the rewards guard (call when starting a new game). */
export function resetRewardsGuard(): void {
  _rewardsProcessed = false;
}

/** Process end-of-game rewards: XP, match record, daily challenge. */
export async function processGameOverRewards(world: GameWorld): Promise<void> {
  if (_rewardsProcessed) return;
  if (world.state !== 'win' && world.state !== 'lose') return;
  _rewardsProcessed = true;

  const stats = buildGameEndStats(world);
  const durationSeconds = Math.round(world.frameCount / 60);

  // --- Daily challenge ---
  const challenge = getDailyChallenge();
  const challengeKey = dailyChallengeKey();
  const alreadyDone = (await getSetting(challengeKey)) === 'completed';
  let dailyXp = 0;
  let challengeCompleted = false;

  if (!alreadyDone && challenge.objective(stats)) {
    dailyXp = challenge.xpReward;
    challengeCompleted = true;
    await setSetting(challengeKey, 'completed');
  }

  // --- XP calculation ---
  const xpBreakdown = calculateXp(stats, dailyXp);
  const profile = await getPlayerProfile();
  const oldLevel = getLevel(profile.total_xp);
  const newTotalXp = profile.total_xp + xpBreakdown.total;
  const newLevel = getLevel(newTotalXp);

  // --- Update player profile with XP ---
  await updatePlayerProfile({
    total_xp: newTotalXp,
    player_level: newLevel,
  });

  // --- Save match record ---
  const techCount = countResearchedTechs(world);
  const record: MatchRecord = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    result: world.state === 'win' ? 'win' : 'loss',
    difficulty: world.difficulty,
    scenario: world.scenarioOverride ?? 'standard',
    commander: world.commanderId,
    duration: durationSeconds,
    kills: world.stats.unitsKilled,
    unitsLost: world.stats.unitsLost,
    buildingsBuilt: world.stats.buildingsBuilt,
    techsResearched: techCount,
    xpEarned: xpBreakdown.total,
  };
  await saveMatchRecord(record);

  // --- Update store signals for battle report ---
  store.goXpEarned.value = xpBreakdown.total;
  store.goLeveledUp.value = newLevel > oldLevel;
  store.goNewLevel.value = newLevel;
  store.goDailyChallengeCompleted.value = challengeCompleted;
}

/** Build a GameEndStats snapshot from the world. */
function buildGameEndStats(world: GameWorld): GameEndStats {
  const techCount = countResearchedTechs(world);
  const durationSeconds = Math.round(world.frameCount / 60);

  return {
    result: world.state === 'win' ? 'win' : 'loss',
    difficulty: world.difficulty,
    commander: world.commanderId,
    scenario: world.scenarioOverride ?? 'standard',
    durationSeconds,
    kills: world.stats.unitsKilled,
    unitsLost: world.stats.unitsLost,
    buildingsBuilt: world.stats.buildingsBuilt,
    techsResearched: techCount,
    nestsDestroyed: store.destroyedEnemyNests.value,
    totalClamsEarned: world.stats.totalClamsEarned,
    unitsTrained: world.stats.unitsTrained,
    pearlsEarned: world.stats.pearlsEarned,
    commanderAbilitiesUsed: 0, // tracked separately if needed
    towersBuilt: 0, // tracked separately if needed
    gameStats: { ...world.stats },
  };
}

/** Count how many techs are researched in the world. */
function countResearchedTechs(world: GameWorld): number {
  let count = 0;
  for (const [key, val] of Object.entries(world.tech)) {
    if (val && key in TECH_UPGRADES) count++;
  }
  return count;
}

/**
 * Next Unlock Hint
 *
 * Finds the closest unmet unlock requirement and returns a motivational
 * hint string for display on the main menu. Creates the "just one more
 * game" motivation loop.
 */

import { UNLOCKS, type UnlockDef } from '@/config/unlocks';
import type { PlayerProfile } from '@/storage/database';

interface HintResult {
  text: string;
  progress: number; // 0-1 ratio of completion toward this unlock
}

/**
 * Compute a 0-1 progress ratio for a given unlock definition against the profile.
 * Higher ratio means closer to unlocking. Returns -1 if already unlocked.
 */
function unlockProgress(def: UnlockDef, profile: PlayerProfile): number {
  if (def.check(profile)) return -1; // already unlocked

  switch (def.id) {
    case 'scenario_island':
      return profile.total_wins / 1;
    case 'scenario_contested':
      return difficultyProgress(profile, 'hard');
    case 'preset_sandbox':
      return profile.total_games / 3;
    case 'preset_speedrun':
      return profile.fastest_win_seconds > 0
        ? Math.min(0.9, 1200 / profile.fastest_win_seconds)
        : 0;
    case 'preset_survival':
      return profile.longest_survival_seconds / 1800;
    case 'preset_nightmare':
      return difficultyProgress(profile, 'hard');
    case 'preset_ultra':
      return difficultyProgress(profile, 'nightmare');
    case 'unit_catapult':
      return profile.total_buildings_built / 10;
    case 'unit_swimmer':
      return profile.total_kills / 50;
    case 'unit_trapper':
      return profile.total_wins / 3;
    case 'unit_shieldbearer':
      return profile.hero_units_earned / 1;
    case 'mod_hero_mode':
      return profile.wins_commander_alive / 1;
    case 'mod_permadeath':
      return difficultyProgress(profile, 'hard');
    case 'mod_fast_evolution':
      return profile.longest_survival_seconds / 2700;
    case 'cosmetic_gold_cape':
      return profile.total_wins / 10;
    case 'cosmetic_red_banner':
      return profile.total_kills / 200;
    case 'cosmetic_tidal_map':
      return Math.min(profile.total_wins / 5, profile.total_buildings_built / 20);
    case 'modifier_night_raid':
      return profile.wins_zero_losses / 1;
    case 'cosmetic_berserker':
      return profile.total_kills / 500;
    case 'cosmetic_healer_aura':
      return Math.min(profile.total_pearls / 50, profile.total_wins / 3);
    case 'cosmetic_veteran_title':
      return profile.total_wins / 15;
    default:
      return 0;
  }
}

const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
  nightmare: 3,
  ultraNightmare: 4,
};

function difficultyProgress(profile: PlayerProfile, target: string): number {
  const current = DIFFICULTY_RANK[profile.highest_difficulty_won] ?? -1;
  const goal = DIFFICULTY_RANK[target] ?? 999;
  if (current >= goal) return 1;
  return Math.max(0, (current + 1) / (goal + 1));
}

/** Get the next unlock hint for the main menu. Returns null if all unlocked. */
export function getNextUnlockHint(profile: PlayerProfile): HintResult | null {
  let bestDef: UnlockDef | null = null;
  let bestProgress = -1;

  for (const def of UNLOCKS) {
    const p = unlockProgress(def, profile);
    if (p < 0) continue; // already unlocked
    if (p > bestProgress) {
      bestProgress = p;
      bestDef = def;
    }
  }

  if (!bestDef) return null;

  return {
    text: `${bestDef.requirement} to unlock ${bestDef.name}`,
    progress: Math.min(1, bestProgress),
  };
}

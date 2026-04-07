/**
 * Cosmetic Definitions
 *
 * Defines unlockable cosmetic items (unit skins and building themes).
 * Each cosmetic maps to a recolor preset from the existing recolor system
 * and has an unlock requirement checked against the player profile.
 */

import type { RecolorPreset } from '@/rendering/recolor';
import type { PlayerProfile } from '@/storage/database';
import { EntityKind } from '@/types';

export interface CosmeticDef {
  id: string;
  category: 'unit_skin' | 'building_theme';
  name: string;
  description: string;
  targetKind: EntityKind;
  recolorPreset: RecolorPreset;
  unlock: { requirement: string; check: (profile: PlayerProfile) => boolean };
}

/** Difficulty ranking for comparison. */
const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
  nightmare: 3,
  ultraNightmare: 4,
};

function wonAtLeast(profile: PlayerProfile, level: string): boolean {
  const won = profile.highest_difficulty_won;
  if (!won) return false;
  return (DIFFICULTY_RANK[won] ?? -1) >= (DIFFICULTY_RANK[level] ?? 999);
}

export const COSMETICS: CosmeticDef[] = [
  // ---- Unit skins ----
  {
    id: 'skin_elite_mudpaw',
    category: 'unit_skin',
    name: 'Elite Mudpaw',
    description: 'Gold-tinted veteran finish for the Mudpaw',
    targetKind: EntityKind.Gatherer,
    recolorPreset: 'elite',
    unlock: {
      requirement: 'Play 10 games',
      check: (p) => p.total_games >= 10,
    },
  },
  {
    id: 'skin_crystal_medic',
    category: 'unit_skin',
    name: 'Crystal Medic',
    description: 'Ice-blue restorative glow for the Medic',
    targetKind: EntityKind.Healer,
    recolorPreset: 'shielded',
    unlock: {
      requirement: 'Win on Hard difficulty',
      check: (p) => wonAtLeast(p, 'hard'),
    },
  },
  {
    id: 'skin_bog_sapper',
    category: 'unit_skin',
    name: 'Bog Sapper',
    description: 'Marsh-green siege finish for the Sapper chassis',
    targetKind: EntityKind.Sapper,
    recolorPreset: 'hero',
    unlock: {
      requirement: 'Win 5 games',
      check: (p) => p.total_wins >= 5,
    },
  },
  {
    id: 'skin_shadow_saboteur',
    category: 'unit_skin',
    name: 'Shadow Saboteur',
    description: 'Dark purple covert finish for the Saboteur',
    targetKind: EntityKind.Saboteur,
    recolorPreset: 'champion',
    unlock: {
      requirement: 'Kill 100 enemies total',
      check: (p) => p.total_kills >= 100,
    },
  },
  {
    id: 'skin_venom_lookout',
    category: 'unit_skin',
    name: 'Venom Lookout',
    description: 'Poison-tinged vision palette for the Lookout chassis',
    targetKind: EntityKind.Scout,
    recolorPreset: 'poisoned',
    unlock: {
      requirement: 'Kill 200 enemies total',
      check: (p) => p.total_kills >= 200,
    },
  },
  {
    id: 'skin_storm_shaman',
    category: 'unit_skin',
    name: 'Storm Shaman',
    description: 'Charged blue-green glow for the Shaman',
    targetKind: EntityKind.Shaman,
    recolorPreset: 'enraged',
    unlock: {
      requirement: 'Win 10 games',
      check: (p) => p.total_wins >= 10,
    },
  },

  // ---- Building themes ----
  {
    id: 'theme_stone_lodge',
    category: 'building_theme',
    name: 'Stone Lodge',
    description: 'Gray stone tint for the Lodge',
    targetKind: EntityKind.Lodge,
    recolorPreset: 'veteran',
    unlock: {
      requirement: 'Build 20 buildings total',
      check: (p) => p.total_buildings_built >= 20,
    },
  },
  {
    id: 'theme_mossy_armory',
    category: 'building_theme',
    name: 'Mossy Armory',
    description: 'Green mossy tint for the Armory',
    targetKind: EntityKind.Armory,
    recolorPreset: 'poisoned',
    unlock: {
      requirement: 'Survive 45 minutes in a single game',
      check: (p) => p.longest_survival_seconds >= 2700,
    },
  },
  {
    id: 'theme_golden_tower',
    category: 'building_theme',
    name: 'Golden Tower',
    description: 'Bright gold finish for Towers',
    targetKind: EntityKind.Tower,
    recolorPreset: 'hero',
    unlock: {
      requirement: 'Win on Nightmare difficulty',
      check: (p) => wonAtLeast(p, 'nightmare'),
    },
  },
  {
    id: 'theme_crystal_watchtower',
    category: 'building_theme',
    name: 'Crystal Watchtower',
    description: 'Ice-blue crystalline Watchtower',
    targetKind: EntityKind.Watchtower,
    recolorPreset: 'shielded',
    unlock: {
      requirement: 'Win 15 games',
      check: (p) => p.total_wins >= 15,
    },
  },
];

/** Get a cosmetic definition by ID. */
export function getCosmeticById(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Get all cosmetics that target a specific entity kind. */
export function getCosmeticsForKind(kind: EntityKind): CosmeticDef[] {
  return COSMETICS.filter((c) => c.targetKind === kind);
}

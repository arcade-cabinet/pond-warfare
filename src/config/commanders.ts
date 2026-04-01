/**
 * Commander Definitions
 *
 * Defines all selectable commanders, their aura/passive bonuses,
 * unlock requirements, and sprite variant identifiers.
 */

import type { PlayerProfile } from '@/storage/database';

export interface CommanderDef {
  id: string;
  name: string;
  title: string;
  auraDesc: string;
  passiveDesc: string;
  auraDamageBonus: number;
  auraSpeedBonus: number;
  auraHpBonus: number;
  auraEnemyDamageReduction: number;
  passiveGatherBonus: number;
  passiveResearchSpeed: number;
  passiveTowerAttackSpeed: number;
  spriteVariant: string;
  unlock: { requirement: string; check: (profile: PlayerProfile) => boolean } | null;
}

/** Difficulty ranking for comparison (higher index = harder). */
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

export const COMMANDERS: CommanderDef[] = [
  {
    id: 'marshal',
    name: 'Otter Marshal',
    title: 'The Marshal',
    auraDesc: '+10% damage to nearby units',
    passiveDesc: 'None',
    auraDamageBonus: 0.1,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'blue',
    unlock: null,
  },
  {
    id: 'sage',
    name: 'Otter Sage',
    title: 'The Sage',
    auraDesc: '+25% tech research speed',
    passiveDesc: 'Gatherers +15% gather rate',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0.15,
    passiveResearchSpeed: 0.25,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'green',
    unlock: { requirement: 'Win 3 games', check: (p) => p.total_wins >= 3 },
  },
  {
    id: 'warden',
    name: 'Otter Warden',
    title: 'The Warden',
    auraDesc: '+200 HP to buildings in range',
    passiveDesc: 'Towers attack 20% faster',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 200,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0.2,
    spriteVariant: 'gold',
    unlock: {
      requirement: 'Win on Hard',
      check: (p) => wonAtLeast(p, 'hard'),
    },
  },
  {
    id: 'tidekeeper',
    name: 'Otter Tidekeeper',
    title: 'The Tidekeeper',
    auraDesc: '+0.4 speed to all units',
    passiveDesc: 'Swimmers cost 50% less',
    auraDamageBonus: 0,
    auraSpeedBonus: 0.4,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'cyan',
    unlock: {
      requirement: 'Collect 200 pearls total',
      check: (p) => p.total_pearls >= 200,
    },
  },
  {
    id: 'shadowfang',
    name: 'Otter Shadowfang',
    title: 'The Shadowfang',
    auraDesc: 'Enemies in range -20% damage',
    passiveDesc: 'Trapper traps last 2x longer',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0.2,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'purple',
    unlock: {
      requirement: 'Win with 0 unit losses',
      check: (p) => p.wins_zero_losses >= 1,
    },
  },
  {
    id: 'ironpaw',
    name: 'Otter Ironpaw',
    title: 'The Ironpaw',
    auraDesc: '+20% HP to all units',
    passiveDesc: 'Shieldbearers trained 2x faster',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'red',
    unlock: {
      requirement: 'Promote 5 Hero units',
      check: (p) => p.hero_units_earned >= 5,
    },
  },
  {
    id: 'stormcaller',
    name: 'Otter Stormcaller',
    title: 'The Stormcaller',
    auraDesc: 'Catapults +50% range',
    passiveDesc: 'Random lightning on enemies',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraEnemyDamageReduction: 0,
    passiveGatherBonus: 0,
    passiveResearchSpeed: 0,
    passiveTowerAttackSpeed: 0,
    spriteVariant: 'yellow',
    unlock: {
      requirement: 'Win on Nightmare',
      check: (p) => wonAtLeast(p, 'nightmare'),
    },
  },
];

/** Look up a commander definition by its id. Falls back to 'marshal'. */
export function getCommanderDef(id: string): CommanderDef {
  return COMMANDERS.find((c) => c.id === id) ?? COMMANDERS[0];
}

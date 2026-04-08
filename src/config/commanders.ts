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
  auraUnitHpBonus: number;
  auraEnemyDamageReduction: number;
  auraGatherBonus: number;
  passiveGatherBonus: number;
  passiveTowerAttackSpeed: number;
  passiveFisherCostReduction: number;
  passiveGuardCostReduction: number;
  passiveRangerProjectionBonus: number;
  passiveBombardierProjectionBonus: number;
  passiveLightningDamage: number;
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
    auraDesc: '+15% damage to nearby units',
    passiveDesc: 'None',
    auraDamageBonus: 0.15,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
    spriteVariant: 'blue',
    unlock: null,
  },
  {
    id: 'sage',
    name: 'Otter Sage',
    title: 'The Sage',
    auraDesc: '+25% gather rate to nearby Mudpaws',
    passiveDesc: 'Mudpaws +10% gather rate',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0.25,
    passiveGatherBonus: 0.1,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
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
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0.2,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
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
    passiveDesc: 'Fishers cost 50% less',
    auraDamageBonus: 0,
    auraSpeedBonus: 0.4,
    auraHpBonus: 0,
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0.5,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
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
    auraDesc: 'Enemies in range -10% damage',
    passiveDesc: 'Rangers project 50% farther',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0.1,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0.5,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
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
    passiveDesc: 'Guards cost 50% less',
    auraDamageBonus: 0,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraUnitHpBonus: 0.2,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0.5,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0,
    passiveLightningDamage: 0,
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
    auraDesc: '+10% damage to nearby units',
    passiveDesc: 'Bombardiers project 50% farther and call lightning every 15s',
    auraDamageBonus: 0.1,
    auraSpeedBonus: 0,
    auraHpBonus: 0,
    auraUnitHpBonus: 0,
    auraEnemyDamageReduction: 0,
    auraGatherBonus: 0,
    passiveGatherBonus: 0,
    passiveTowerAttackSpeed: 0,
    passiveFisherCostReduction: 0,
    passiveGuardCostReduction: 0,
    passiveRangerProjectionBonus: 0,
    passiveBombardierProjectionBonus: 0.5,
    passiveLightningDamage: 10,
    spriteVariant: 'yellow',
    unlock: {
      requirement: 'Win on Nightmare',
      check: (p) => wonAtLeast(p, 'nightmare'),
    },
  },
];

export interface ActiveAbilityDef {
  name: string;
  description: string;
  /** Cooldown duration in frames (60fps). */
  cooldownFrames: number;
  /** Duration of the active effect in frames. 0 = instant. */
  durationFrames: number;
  /** Keyboard shortcut key. */
  hotkey: string;
}

/** Active ability for each commander. Keyed by commander id. */
export const COMMANDER_ABILITIES: Record<string, ActiveAbilityDef> = {
  marshal: {
    name: 'Charge!',
    description: 'Selected units gain 2x speed for 5 seconds.',
    cooldownFrames: 5400, // 90s
    durationFrames: 300, // 5s
    hotkey: 'q',
  },
  sage: {
    name: 'Eureka!',
    description: 'Instantly grant 60 fish, 20 logs, and 10 rocks.',
    cooldownFrames: 10800, // 180s
    durationFrames: 0, // instant
    hotkey: 'q',
  },
  warden: {
    name: 'Fortify!',
    description: 'All buildings become invulnerable for 10 seconds.',
    cooldownFrames: 7200, // 120s
    durationFrames: 600, // 10s
    hotkey: 'q',
  },
  tidekeeper: {
    name: 'Tidal Wave',
    description: 'Push enemies away from the Lodge.',
    cooldownFrames: 5400, // 90s
    durationFrames: 0, // instant
    hotkey: 'q',
  },
  shadowfang: {
    name: 'Vanish',
    description: 'All units become invisible for 8 seconds.',
    cooldownFrames: 7200, // 120s
    durationFrames: 480, // 8s
    hotkey: 'q',
  },
  ironpaw: {
    name: 'Iron Will',
    description: 'All units immune to damage for 5 seconds.',
    cooldownFrames: 9000, // 150s
    durationFrames: 300, // 5s
    hotkey: 'q',
  },
  stormcaller: {
    name: 'Thunder Strike',
    description: 'Massive AoE damage at the camera center.',
    cooldownFrames: 7200, // 120s
    durationFrames: 0, // instant
    hotkey: 'q',
  },
};

/** Look up a commander definition by its id. Falls back to 'marshal'. */
export function getCommanderDef(id: string): CommanderDef {
  return COMMANDERS.find((c) => c.id === id) ?? COMMANDERS[0];
}

/** Get the COMMANDERS array index for a given commander id. Returns 0 (marshal) as fallback. */
export function getCommanderTypeIndex(id: string): number {
  const idx = COMMANDERS.findIndex((c) => c.id === id);
  return idx >= 0 ? idx : 0;
}

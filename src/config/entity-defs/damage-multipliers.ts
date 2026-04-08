import {
  COMPAT_SABOTEUR_CHASSIS_KIND,
  COMPAT_SAPPER_CHASSIS_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

/**
 * Damage multiplier table for unit counter system.
 * Entries > 1.0 mean the attacker is strong against that defender.
 * Entries < 1.0 mean the attacker is weak against that defender.
 * Missing entries default to 1.0 (neutral).
 *
 * Note: several pairings still reference historical internal otter combat
 * chassis ids. Those are compatibility-facing low-level kinds, not the
 * canonical player-facing roster names.
 */
export const DAMAGE_MULTIPLIERS: Partial<Record<EntityKind, Partial<Record<EntityKind, number>>>> =
  {
    [COMPAT_SAPPER_CHASSIS_KIND]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5,
      [MEDIC_KIND]: 1.5,
      [EntityKind.Gator]: 0.75,
      [EntityKind.FlyingHeron]: 0.5, // Melee weak vs flying
    },
    [COMPAT_SABOTEUR_CHASSIS_KIND]: {
      [MEDIC_KIND]: 1.5,
      [EntityKind.Snake]: 1.5,
      [COMPAT_SAPPER_CHASSIS_KIND]: 0.75,
      [EntityKind.FlyingHeron]: 1.5, // Ranged counters flying
    },
    [EntityKind.Gator]: {
      [COMPAT_SAPPER_CHASSIS_KIND]: 1.5,
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 0.75,
    },
    [EntityKind.Snake]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5,
      [COMPAT_SAPPER_CHASSIS_KIND]: 0.75,
    },
    [EntityKind.Shieldbearer]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5,
      [EntityKind.Gator]: 0.75,
    },
    [EntityKind.ArmoredGator]: {
      [COMPAT_SAPPER_CHASSIS_KIND]: 1.5,
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 0.75,
    },
    [EntityKind.VenomSnake]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5,
      [COMPAT_SAPPER_CHASSIS_KIND]: 0.75,
    },
    [EntityKind.SwampDrake]: {
      [MUDPAW_KIND]: 1.5,
      [EntityKind.Shieldbearer]: 0.75,
    },
    [EntityKind.SiegeTurtle]: {
      [COMPAT_SAPPER_CHASSIS_KIND]: 0.5,
    },
    [EntityKind.AlphaPredator]: {
      [COMPAT_SAPPER_CHASSIS_KIND]: 1.25,
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.25,
    },
    // v1.5.0 new units
    [EntityKind.Diver]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5, // Ambush flanker vs fragile ranged
      [EntityKind.Shieldbearer]: 0.75, // Weak vs heavy armor
    },
    [EntityKind.BurrowingWorm]: {
      [MUDPAW_KIND]: 1.5, // Targets economy
    },
    [EntityKind.FlyingHeron]: {
      [MUDPAW_KIND]: 1.5, // Harasses Mudpaws
      [EntityKind.Shieldbearer]: 0.5, // Terrible vs tanks
    },
    [EntityKind.Tower]: {
      [EntityKind.FlyingHeron]: 1.5, // Towers counter flying
    },
    // v2.0.0 new units
    [EntityKind.OtterWarship]: {
      [MUDPAW_KIND]: 1.5, // Splash damage vs clusters
      [EntityKind.Shieldbearer]: 0.75, // Armor resists splash
    },
    [EntityKind.Berserker]: {
      [COMPAT_SABOTEUR_CHASSIS_KIND]: 1.5, // Fast melee closes on ranged
      [EntityKind.Shieldbearer]: 0.75, // Armor absorbs reckless attacks
    },
  };

/** SiegeTurtle's bonus multiplier when attacking any building. */
export const SIEGE_BUILDING_MULTIPLIER = 3.0;

/**
 * Get the damage multiplier for an attacker vs. a defender.
 * Returns 1.0 for matchups not in the table (including BossCroc).
 */
export function getDamageMultiplier(attackerKind: EntityKind, defenderKind: EntityKind): number {
  return DAMAGE_MULTIPLIERS[attackerKind]?.[defenderKind] ?? 1.0;
}

/**
 * Faction Configuration
 *
 * Defines playable factions and their unit/building mappings.
 * When the player picks a faction, the other faction is controlled by the AI.
 */

import { MEDIC_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

export type PlayableFaction = 'otter' | 'predator';

export interface FactionConfig {
  name: string;
  lodgeKind: EntityKind;
  /**
   * Legacy compatibility slots retained for horizontal scenarios and older
   * adversarial helpers. The canonical player-facing otter roster is defined
   * elsewhere as Mudpaw/Medic/Sapper/Saboteur.
   */
  gathererKind: EntityKind;
  meleeKind: EntityKind;
  rangedKind: EntityKind;
  tankKind: EntityKind;
  supportKind: EntityKind;
  siegeKind: EntityKind;
  heroKind: EntityKind;
  /** Tech IDs available to this faction (v3: upgrade web categories). */
  techTree: string[];
}

/**
 * Otter faction: legacy compatibility mapping for the original player side.
 *
 * Important: the live vertical-mode roster no longer exposes the old internal
 * combat archetype split as player-facing manual units, and older helpers
 * should treat `gathererKind` as the canonical Mudpaw chassis. Those older
 * entity kinds remain here only for historical scenario support until the
 * horizontal/adversarial layer is fully reauthored.
 */
export const OTTER_FACTION: FactionConfig = {
  name: 'Otters',
  lodgeKind: EntityKind.Lodge,
  gathererKind: MUDPAW_KIND,
  meleeKind: EntityKind.Brawler,
  rangedKind: EntityKind.Sniper,
  tankKind: EntityKind.Shieldbearer,
  supportKind: MEDIC_KIND,
  siegeKind: EntityKind.Catapult,
  heroKind: EntityKind.Commander,
  techTree: ['gathering', 'combat', 'defense', 'utility', 'economy', 'siege'],
};

/** Predator faction: play as the swamp predators. */
export const PREDATOR_FACTION: FactionConfig = {
  name: 'Predators',
  lodgeKind: EntityKind.PredatorNest,
  gathererKind: EntityKind.Gatherer,
  meleeKind: EntityKind.Gator,
  rangedKind: EntityKind.VenomSnake,
  tankKind: EntityKind.ArmoredGator,
  supportKind: EntityKind.SwampDrake,
  siegeKind: EntityKind.SiegeTurtle,
  heroKind: EntityKind.BossCroc,
  techTree: ['gathering', 'combat', 'defense', 'utility'],
};

/** Look up faction config by faction key. */
export function getFactionConfig(faction: PlayableFaction): FactionConfig {
  return faction === 'predator' ? PREDATOR_FACTION : OTTER_FACTION;
}

/** Given a player faction, return the faction key the AI controls. */
export function getAIFaction(playerFaction: PlayableFaction): PlayableFaction {
  return playerFaction === 'otter' ? 'predator' : 'otter';
}

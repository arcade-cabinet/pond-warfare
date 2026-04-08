/**
 * Faction Configuration
 *
 * Defines playable factions and their unit/building mappings.
 * When the player picks a faction, the other faction is controlled by the AI.
 */

import {
  ENEMY_HARVESTER_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

export type PlayableFaction = 'otter' | 'predator';

export interface FactionConfig {
  name: string;
  lodgeKind: EntityKind;
  /**
   * Neutral role slots retained for horizontal scenarios and older adversarial
   * helpers. The canonical player-facing otter roster is defined elsewhere as
   * Mudpaw/Medic/Sapper/Saboteur.
   */
  generalistKind: EntityKind;
  frontlineKind: EntityKind;
  skirmisherKind: EntityKind;
  heavyKind: EntityKind;
  supportKind: EntityKind;
  siegeKind: EntityKind;
  commanderKind: EntityKind;
  /** Tech IDs available to this faction (v3: upgrade web categories). */
  techTree: string[];
}

/**
 * Otter faction: neutral role mapping for the original player side.
 *
 * Important: the live vertical-mode roster no longer exposes the old internal
 * combat archetype split as player-facing manual units. Older helpers should
 * treat the compatibility slots here as the closest canonical live roster
 * equivalents until the horizontal/adversarial layer is fully reauthored.
 */
export const OTTER_FACTION: FactionConfig = {
  name: 'Otters',
  lodgeKind: EntityKind.Lodge,
  generalistKind: MUDPAW_KIND,
  frontlineKind: SAPPER_KIND,
  skirmisherKind: SABOTEUR_KIND,
  heavyKind: SAPPER_KIND,
  supportKind: MEDIC_KIND,
  siegeKind: SAPPER_KIND,
  commanderKind: EntityKind.Commander,
  techTree: ['gathering', 'combat', 'defense', 'utility', 'economy', 'siege'],
};

/** Predator faction: play as the swamp predators. */
export const PREDATOR_FACTION: FactionConfig = {
  name: 'Predators',
  lodgeKind: EntityKind.PredatorNest,
  generalistKind: ENEMY_HARVESTER_KIND,
  frontlineKind: EntityKind.Gator,
  skirmisherKind: EntityKind.VenomSnake,
  heavyKind: EntityKind.ArmoredGator,
  supportKind: EntityKind.SwampDrake,
  siegeKind: EntityKind.SiegeTurtle,
  commanderKind: EntityKind.BossCroc,
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

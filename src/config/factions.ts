/**
 * Faction Configuration
 *
 * Defines playable factions and their unit/building mappings.
 * When the player picks a faction, the other faction is controlled by the AI.
 */

import { EntityKind } from '@/types';

export type PlayableFaction = 'otter' | 'predator';

export interface FactionConfig {
  name: string;
  lodgeKind: EntityKind;
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

/** Otter faction: the original player side. */
export const OTTER_FACTION: FactionConfig = {
  name: 'Otters',
  lodgeKind: EntityKind.Lodge,
  gathererKind: EntityKind.Gatherer,
  meleeKind: EntityKind.Brawler,
  rangedKind: EntityKind.Sniper,
  tankKind: EntityKind.Shieldbearer,
  supportKind: EntityKind.Healer,
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

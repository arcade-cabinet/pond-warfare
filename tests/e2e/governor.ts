/**
 * Player Governor for E2E Testing
 *
 * A state-machine AI that plays the game through mouse clicks only.
 * Reads game state from the imported game singleton, performs all
 * actions by dispatching pointer events on DOM elements (canvas clicks
 * for world interactions, button clicks for UI actions).
 *
 * Phases:
 *   1. Economy (0-60s game time): Train gatherers, assign to resources
 *   2. Build (60-120s): Place burrow for housing, then armory, FishingHut, HerbalistHut
 *   3. Army (120-240s): Train brawlers, snipers, shieldbearers, catapults; research techs
 *   4. Attack (240-300s): Use auto-attack toggle instead of manual attack-move
 *   5. Late Game (300s+): Research advanced techs across all 5 branches,
 *      build expansion Lodge, train Swimmers, enable all auto-behaviors
 */

import { hasComponent } from 'bitecs';
import { IsBuilding } from '@/ecs/components';
import { game } from '@/game';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { delay } from './governor/helpers';
import { armyPhase, buildPhase, economyPhase } from './governor/phases-early';
import { attackPhase, lateGamePhase } from './governor/phases-late';
import {
  gameSeconds,
  getEnemyNests,
  getPlayerArmyUnits,
  getPlayerEntities,
} from './governor/queries';

// Re-export helpers used by tests
export { commandMoveTo, deselectAll } from './governor/helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernorPhase = 'economy' | 'build' | 'army' | 'attack' | 'lateGame';

export interface GovernorSnapshot {
  gameSeconds: number;
  phase: GovernorPhase;
  clams: number;
  twigs: number;
  pearls: number;
  food: number;
  maxFood: number;
  gatherers: number;
  army: number;
  buildings: number;
  enemyNests: number;
  techResearched: string[];
  evolutionTier: number;
  champions: number;
  autoBehaviors: {
    gatherer: boolean;
    combat: boolean;
    healer: boolean;
    scout: boolean;
  };
}

// ---------------------------------------------------------------------------
// Phase router
// ---------------------------------------------------------------------------

/** Determine the current governor phase based on game time. */
function currentPhase(): GovernorPhase {
  const s = gameSeconds();
  if (s < 60) return 'economy';
  if (s < 120) return 'build';
  if (s < 240) return 'army';
  if (s < 300) return 'attack';
  return 'lateGame';
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/** Take a snapshot of the current game state for diagnostic reporting. */
export function takeSnapshot(): GovernorSnapshot {
  const w = game.world;
  return {
    gameSeconds: Math.round(gameSeconds()),
    phase: currentPhase(),
    clams: w.resources.clams,
    twigs: w.resources.twigs,
    pearls: w.resources.pearls,
    food: w.resources.food,
    maxFood: w.resources.maxFood,
    gatherers: getPlayerEntities(EntityKind.Gatherer).length,
    army: getPlayerArmyUnits().length,
    buildings: getPlayerEntities().filter((eid) => hasComponent(w.ecs, eid, IsBuilding)).length,
    enemyNests: getEnemyNests().length,
    techResearched: Object.entries(w.tech)
      .filter(([, v]) => v)
      .map(([k]) => k),
    evolutionTier: w.enemyEvolution.tier,
    champions: w.championEnemies.size,
    autoBehaviors: {
      gatherer: store.autoGathererEnabled.value,
      combat: store.autoCombatEnabled.value,
      healer: store.autoHealerEnabled.value,
      scout: store.autoScoutEnabled.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Governor main loop
// ---------------------------------------------------------------------------

/** Run one governor tick. */
export async function tick(): Promise<void> {
  const phase = currentPhase();

  switch (phase) {
    case 'economy':
      await economyPhase();
      break;
    case 'build':
      await buildPhase();
      break;
    case 'army':
      await armyPhase();
      break;
    case 'attack':
      await attackPhase();
      break;
    case 'lateGame':
      await lateGamePhase();
      break;
  }
}

/**
 * Run the governor continuously until the callback returns true (stop condition)
 * or the timeout is reached. Ticks every `intervalMs` milliseconds.
 */
export async function run(opts: {
  stopWhen?: () => boolean;
  timeoutMs?: number;
  intervalMs?: number;
  onTick?: (snapshot: GovernorSnapshot) => void;
}): Promise<void> {
  const { stopWhen, timeoutMs = 300_000, intervalMs = 600, onTick } = opts;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (stopWhen?.()) break;
    if (game.world.state !== 'playing') break;

    await tick();

    const snapshot = takeSnapshot();
    onTick?.(snapshot);

    await delay(intervalMs);
  }
}

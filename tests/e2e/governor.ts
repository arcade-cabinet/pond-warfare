/**
 * Governor Diagnostics
 *
 * Snapshot utility for E2E diagnostics. The phase logic and DOM
 * interaction helpers have been replaced by proper integration tests
 * under tests/integration/.
 */

import { hasComponent } from 'bitecs';
import { IsBuilding } from '@/ecs/components';
import { game } from '@/game';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { getEnemyNests, getPlayerArmyUnits, getPlayerEntities } from '../helpers/ecs-queries';

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
// Helpers
// ---------------------------------------------------------------------------

function gameSeconds(): number {
  return game.world.frameCount / 60;
}

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
    gatherers: getPlayerEntities(w, EntityKind.Gatherer).length,
    army: getPlayerArmyUnits(w).length,
    buildings: getPlayerEntities(w).filter((eid) => hasComponent(w.ecs, eid, IsBuilding)).length,
    enemyNests: getEnemyNests(w).length,
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

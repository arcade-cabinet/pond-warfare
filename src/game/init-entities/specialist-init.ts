/**
 * Specialist Auto-Deploy at Match Start (v3.0 -- US11)
 *
 * Reads Pearl upgrades from prestige state. For each auto-deploy
 * upgrade with rank > 0, spawns that many specialist units near
 * the Lodge.
 *
 * Uses specialist-deploy.ts computeSpecialistDeployPlan() and
 * getSpecialistSpawnPositions() for placement logic.
 */

import type { PrestigeState } from '@/config/prestige-logic';
import { spawnEntity } from '@/ecs/archetypes';
import { Position } from '@/ecs/components';
import {
  computeSpecialistDeployPlan,
  getSpecialistSpawnPositions,
  type SpecialistDeployPlan,
} from '@/ecs/systems/specialist-deploy';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';

/**
 * Specialist unit name -> EntityKind mapping.
 * Specialists reuse existing entity kinds where possible.
 */
const SPECIALIST_KIND_MAP: Record<string, EntityKind> = {
  fisher: EntityKind.Gatherer,
  digger: EntityKind.Gatherer,
  logger: EntityKind.Gatherer,
  guardian: EntityKind.Brawler,
  hunter: EntityKind.Brawler,
  ranger: EntityKind.Scout,
  shaman: EntityKind.Shaman,
  lookout: EntityKind.Scout,
  sapper: EntityKind.Engineer,
  saboteur: EntityKind.Diver,
};

/**
 * Deploy prestige specialist units near the Lodge at match start.
 *
 * @param world - The game world
 * @param prestigeState - Current prestige state from store-v3
 * @param lodgeEid - Entity ID of the player's Lodge
 */
export function deploySpecialistsAtMatchStart(
  world: GameWorld,
  prestigeState: PrestigeState,
  lodgeEid: number,
): void {
  const plan = computeSpecialistDeployPlan(prestigeState);

  if (plan.totalCount === 0) return;

  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];

  // Get spawn positions for all specialists in a semicircle below Lodge
  const allPositions = getSpecialistSpawnPositions(lodgeX, lodgeY, plan.totalCount);

  let posIdx = 0;
  for (const spawn of plan.spawns) {
    const kind = SPECIALIST_KIND_MAP[spawn.unitId] ?? EntityKind.Gatherer;

    for (let i = 0; i < spawn.count; i++) {
      const pos = allPositions[posIdx] ?? { x: lodgeX, y: lodgeY + 60 };
      spawnEntity(world, kind, pos.x, pos.y, Faction.Player);
      posIdx++;
    }
  }

  // Announce deployment
  if (plan.summary.length > 0) {
    pushGameEvent(`Specialists deployed: ${plan.summary.join(', ')}`, '#a78bfa', world.frameCount);
  }
}

/** Re-export the deploy plan type for testing. */
export type { SpecialistDeployPlan };

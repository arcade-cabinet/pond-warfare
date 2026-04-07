/**
 * Legacy specialist deploy helper kept for diagnostics and targeted tests.
 *
 * Player-facing gameplay now uses specialist blueprint caps plus in-match
 * spawning from the Lodge. This path still exists for simulation harnesses
 * that want an immediate snapshot of specialist value at match start.
 */

import type { PrestigeState } from '@/config/prestige-logic';
import {
  computeSpecialistDeployPlan,
  getSpecialistSpawnPositions,
  type SpecialistDeployPlan,
} from '@/ecs/systems/specialist-deploy';
import type { GameWorld } from '@/ecs/world';
import { Position } from '@/ecs/components';
import { spawnSpecialistUnit } from '@/game/init-entities/specialist-spawn';
import { pushGameEvent } from '@/ui/game-events';

export function deploySpecialistsAtMatchStart(
  world: GameWorld,
  prestigeState: PrestigeState,
  lodgeEid: number,
): void {
  const plan = computeSpecialistDeployPlan(prestigeState);
  if (plan.totalCount === 0) return;

  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  const positions = getSpecialistSpawnPositions(lodgeX, lodgeY, plan.totalCount);

  let positionIndex = 0;
  for (const spawn of plan.spawns) {
    for (let i = 0; i < spawn.count; i++) {
      const pos = positions[positionIndex] ?? { x: lodgeX, y: lodgeY + 60 };
      spawnSpecialistUnit(
        world,
        spawn.unitId,
        lodgeEid,
        pos.x,
        pos.y,
        'legacy_snapshot',
      );
      positionIndex++;
    }
  }

  if (plan.summary.length > 0) {
    pushGameEvent(`Specialists deployed: ${plan.summary.join(', ')}`, '#a78bfa', world.frameCount);
  }
}

export type { SpecialistDeployPlan };

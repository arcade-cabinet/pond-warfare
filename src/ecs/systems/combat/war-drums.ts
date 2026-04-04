/**
 * War Drums Aura
 *
 * Rebuilds on the normal 60-frame cadence. Grants +15% melee damage to
 * player units within 300px of any completed friendly building.
 */

import { hasComponent, query } from 'bitecs';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

/** War Drums aura radius in pixels. */
const WAR_DRUMS_RANGE = 300;

export function warDrumsAura(world: GameWorld): void {
  if (!world.tech.warDrums) {
    world.warDrumsBuff.clear();
    return;
  }

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const shouldRefresh = world.frameCount % 60 === 0;

  if (!shouldRefresh) {
    if (world.warDrumsBuff.size === 0) return;

    // Quick check: any completed player building still alive?
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if (!hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (!hasComponent(world.ecs, eid, Building) || Building.progress[eid] < 100) continue;
      return; // At least one building alive, keep buff
    }

    world.warDrumsBuff.clear();
    return;
  }

  world.warDrumsBuff.clear();

  // Find all living completed player buildings
  const playerBuildings: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (!hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (!hasComponent(world.ecs, eid, Building) || Building.progress[eid] < 100) continue;
    playerBuildings.push(eid);
  }

  if (playerBuildings.length === 0) return;

  // For each building, buff nearby player combat units
  for (let b = 0; b < playerBuildings.length; b++) {
    const bEid = playerBuildings[b];
    const bx = Position.x[bEid];
    const by = Position.y[bEid];

    const candidates = world.spatialHash
      ? world.spatialHash.query(bx, by, WAR_DRUMS_RANGE)
      : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === bEid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (!hasComponent(world.ecs, t, Combat)) continue;
      if (hasComponent(world.ecs, t, IsBuilding) || hasComponent(world.ecs, t, IsResource))
        continue;

      const dx = Position.x[t] - bx;
      const dy = Position.y[t] - by;
      if (Math.sqrt(dx * dx + dy * dy) <= WAR_DRUMS_RANGE) {
        world.warDrumsBuff.add(t);
      }
    }
  }
}

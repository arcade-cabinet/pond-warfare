/**
 * War Drums Aura
 *
 * Rebuilds on the normal 60-frame cadence, but clears immediately
 * if no completed living player Armory remains so buffs never
 * linger after the source is destroyed or disabled.
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
import { EntityKind, Faction } from '@/types';

export function warDrumsAura(world: GameWorld): void {
  if (!world.tech.warDrums) {
    world.warDrumsBuff.clear();
    return;
  }

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const shouldRefresh = world.frameCount % 60 === 0;

  if (!shouldRefresh) {
    if (world.warDrumsBuff.size === 0) return;

    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Armory) continue;
      if (!hasComponent(world.ecs, eid, Building) || Building.progress[eid] < 100) continue;
      return;
    }

    world.warDrumsBuff.clear();
    return;
  }

  world.warDrumsBuff.clear();

  // Find living player Armories
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Armory) continue;
    if (!hasComponent(world.ecs, eid, Building) || Building.progress[eid] < 100) continue;

    const ax = Position.x[eid];
    const ay = Position.y[eid];
    const auraRadius = 200;

    const candidates = world.spatialHash ? world.spatialHash.query(ax, ay, auraRadius) : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (!hasComponent(world.ecs, t, Combat)) continue;
      if (hasComponent(world.ecs, t, IsBuilding) || hasComponent(world.ecs, t, IsResource))
        continue;

      const dx = Position.x[t] - ax;
      const dy = Position.y[t] - ay;
      if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
        world.warDrumsBuff.add(t);
      }
    }
  }
}

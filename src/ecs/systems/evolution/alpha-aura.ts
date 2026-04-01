/**
 * Alpha Predator Damage Aura
 *
 * Buffs nearby enemy units with +20% damage when an Alpha Predator is alive.
 * Runs every 60 frames.
 */

import { hasComponent, query } from 'bitecs';
import {
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

/** Apply alpha predator damage aura to nearby enemy units. */
export function processAlphaAura(world: GameWorld): void {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.AlphaPredator) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;

    const ax = Position.x[eid];
    const ay = Position.y[eid];
    const auraRadius = 200;

    const candidates = world.spatialHash ? world.spatialHash.query(ax, ay, auraRadius) : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Enemy)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (!hasComponent(world.ecs, t, Combat)) continue;
      if (hasComponent(world.ecs, t, IsBuilding)) continue;
      if (hasComponent(world.ecs, t, IsResource)) continue;

      const dx = Position.x[t] - ax;
      const dy = Position.y[t] - ay;
      if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
        world.alphaDamageBuff.set(t, world.frameCount + 60);
      }
    }
  }

  // Clean up expired buffs
  for (const [eid, expiry] of world.alphaDamageBuff) {
    if (world.frameCount > expiry) {
      world.alphaDamageBuff.delete(eid);
    }
  }
}

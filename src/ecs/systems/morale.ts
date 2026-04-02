/**
 * Morale System
 *
 * Tracks unit morale based on local conditions:
 * - Demoralized: outnumbered 3:1 by enemies in local area → -20% dmg, -10% speed
 * - Commander death: all player units demoralized for 10 seconds (600 frames)
 *
 * Commander aura buffs (+10% dmg, +10% speed) are handled by combat/commander-aura.ts.
 * This system only handles the NEGATIVE morale effects.
 *
 * Refreshes every 60 frames to limit CPU cost.
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
import { spawnParticle } from '@/utils/particles';

/** Radius to count nearby allies and enemies for outnumbered check. */
const MORALE_CHECK_RADIUS = 200;

/** Enemy-to-ally ratio threshold for demoralization. */
const OUTNUMBER_RATIO = 3;

/** Duration of commander death demoralization in frames (10 seconds). */
export const COMMANDER_DEATH_DEMORALIZE_FRAMES = 600;

/**
 * Morale system tick. Rebuilds demoralized set every 60 frames.
 * Also spawns grey cloud particles on demoralized units.
 */
export function moraleSystem(world: GameWorld): void {
  // Commander death demoralization timer
  if (world.commanderDeathDemoralizeUntil > 0 && world.frameCount >= world.commanderDeathDemoralizeUntil) {
    world.commanderDeathDemoralizeUntil = 0;
  }

  // Only refresh demoralized set every 60 frames
  if (world.frameCount % 60 !== 0) {
    // Spawn grey cloud particles on demoralized units (every 30 frames for visual)
    if (world.frameCount % 30 === 0) {
      spawnDemoralizeClouds(world);
    }
    return;
  }

  world.demoralizedUnits.clear();

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

  // If commander death demoralization is active, mark ALL player combat units
  if (world.commanderDeathDemoralizeUntil > 0 && world.frameCount < world.commanderDeathDemoralizeUntil) {
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource)) continue;
      world.demoralizedUnits.add(eid);
    }
    spawnDemoralizeClouds(world);
    return;
  }

  // Check each player unit for outnumbered condition
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource)) continue;

    const faction = FactionTag.faction[eid] as Faction;
    // Only apply to player units for now
    if (faction !== Faction.Player) continue;

    const ex = Position.x[eid];
    const ey = Position.y[eid];

    let allies = 0;
    let enemies = 0;

    const candidates = world.spatialHash
      ? world.spatialHash.query(ex, ey, MORALE_CHECK_RADIUS)
      : allUnits;

    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (hasComponent(world.ecs, t, IsBuilding) || hasComponent(world.ecs, t, IsResource)) continue;
      if (!hasComponent(world.ecs, t, FactionTag)) continue;

      const tFaction = FactionTag.faction[t] as Faction;
      const dx = Position.x[t] - ex;
      const dy = Position.y[t] - ey;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MORALE_CHECK_RADIUS) continue;

      if (tFaction === faction) {
        allies++;
      } else if (tFaction !== Faction.Neutral) {
        enemies++;
      }
    }

    // +1 for the unit itself
    const totalAllies = allies + 1;

    if (enemies >= totalAllies * OUTNUMBER_RATIO) {
      world.demoralizedUnits.add(eid);
    }
  }

  spawnDemoralizeClouds(world);
}

/** Spawn grey cloud particles above demoralized units. */
function spawnDemoralizeClouds(world: GameWorld): void {
  for (const eid of world.demoralizedUnits) {
    if (!hasComponent(world.ecs, eid, Position)) continue;
    if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) continue;

    const x = Position.x[eid];
    const y = Position.y[eid];

    // Small grey cloud particle above unit
    spawnParticle(
      world,
      x + (Math.random() * 16 - 8),
      y - 25 - Math.random() * 5,
      (Math.random() - 0.5) * 0.5,
      -Math.random() * 0.3,
      20,
      '#9ca3af',
      4,
    );
  }
}

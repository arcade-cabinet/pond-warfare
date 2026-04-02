/**
 * Wall Gate System
 *
 * Manages Wall Gate pass-through logic:
 * - Player units pass through player gates (no collision)
 * - Enemy units are blocked (treated as wall)
 * - Destroyed gates become passable breaches
 *
 * This system runs every 30 frames and updates collider radii
 * to enable/disable collision for nearby units based on faction.
 */

import { query } from 'bitecs';
import { Building, Collider, EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Check interval in frames. */
const CHECK_INTERVAL = 30;

/**
 * Register a wall gate's faction when spawned.
 * Called from spawnEntity or building completion.
 */
export function registerWallGate(world: GameWorld, eid: number, faction: Faction): void {
  world.wallGateFaction.set(eid, faction);
}

export function wallGateSystem(world: GameWorld): void {
  if (world.frameCount % CHECK_INTERVAL !== 0) return;

  const buildings = query(world.ecs, [EntityTypeTag, Health, Building]);

  for (const eid of buildings) {
    if (EntityTypeTag.kind[eid] !== EntityKind.WallGate) continue;

    const hp = Health.current[eid];
    const progress = Building.progress[eid];

    // Destroyed gates: make collider 0 so everything passes through
    if (hp <= 0) {
      Collider.radius[eid] = 0;
      continue;
    }

    // Under construction: block everything like a wall
    if (progress < 100) {
      Collider.radius[eid] = 38; // Full wall-like collision
      continue;
    }

    // Completed gate: collision is selective
    // The gate itself has a small collider that blocks enemies
    // but friendly units get collision disabled in the movement system
    const ownerFaction = world.wallGateFaction.get(eid) ?? Faction.Player;

    // Gate has full collision; the collision system checks shouldPassThroughGate
    Collider.radius[eid] = 38;

    // Store faction for collision system to check
    FactionTag.faction[eid] = ownerFaction;
  }
}

/**
 * Check if a unit should pass through a wall gate.
 * Called from the collision system.
 */
export function shouldPassThroughGate(world: GameWorld, unitEid: number, gateEid: number): boolean {
  if (EntityTypeTag.kind[gateEid] !== EntityKind.WallGate) return false;

  // Destroyed gates: always passable
  if (Health.current[gateEid] <= 0) return true;

  // Under construction: block everything
  if (Building.progress[gateEid] < 100) return false;

  // Same faction: pass through
  const gateFaction = world.wallGateFaction.get(gateEid) ?? Faction.Player;
  const unitFaction = FactionTag.faction[unitEid];
  return unitFaction === gateFaction;
}

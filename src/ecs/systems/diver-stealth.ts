/**
 * Diver Stealth System
 *
 * Divers become invisible on Water/Shallows tiles:
 * - Stealthed Divers are untargetable by enemies.
 * - First attack from stealth deals +50% damage (ambush bonus).
 * - After attacking, stealth breaks until the Diver returns to water.
 * - Allies see stealthed Divers at 20% opacity (handled in renderer).
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, Position, UnitStateMachine } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';
import { EntityKind, Faction, UnitState } from '@/types';

/** Terrain types that grant stealth to Divers. */
const STEALTH_TERRAINS = new Set([TerrainType.Water, TerrainType.Shallows]);

/**
 * Check if an entity is in stealth (used by combat target selection to skip).
 */
export function isStealthed(world: GameWorld, eid: number): boolean {
  return world.stealthEntities.has(eid);
}

/** Ambush damage multiplier for Divers attacking from stealth. */
export const AMBUSH_DAMAGE_MULT = 1.5;

/**
 * Returns true and consumes the ambush bonus if available.
 */
export function consumeAmbushBonus(world: GameWorld, eid: number): boolean {
  if (world.stealthAmbushReady.has(eid)) {
    world.stealthAmbushReady.delete(eid);
    world.stealthEntities.delete(eid);
    return true;
  }
  return false;
}

/**
 * Run once per frame. Updates stealth state for all alive Divers.
 */
export function diverStealthSystem(world: GameWorld): void {
  const units = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, UnitStateMachine]);

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Diver) continue;
    if (Health.current[eid] <= 0) {
      world.stealthEntities.delete(eid);
      world.stealthAmbushReady.delete(eid);
      continue;
    }

    const terrain = world.terrainGrid.getAt(Position.x[eid], Position.y[eid]);
    const onWater = STEALTH_TERRAINS.has(terrain);
    const state = UnitStateMachine.state[eid] as UnitState;
    const isAttacking = state === UnitState.Attacking;

    if (onWater && !isAttacking) {
      // Grant stealth if on water and not actively attacking
      if (!world.stealthEntities.has(eid)) {
        world.stealthEntities.add(eid);
        world.stealthAmbushReady.add(eid);
        // Ripple particle for stealth entry
        if (FactionTag.faction[eid] === Faction.Player) {
          world.floatingTexts.push({
            x: Position.x[eid],
            y: Position.y[eid] - 20,
            text: 'Stealth',
            color: '#60a5fa',
            life: 40,
          });
        }
      }
    } else if (!onWater) {
      // Off water: break stealth
      world.stealthEntities.delete(eid);
      world.stealthAmbushReady.delete(eid);
    }
  }
}

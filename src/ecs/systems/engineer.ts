/**
 * Engineer System
 *
 * Special behaviors for the Engineer unit type:
 * - 2x build speed (halve build timer when builder is Engineer).
 * - Repair: heals damaged friendly buildings at 2 HP/frame.
 * - Temporary Bridge: places a bridge on Water tile (→ Shallows for 300 frames).
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';
import { EntityKind, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

/** Duration of a temporary bridge in frames (5 seconds at 60fps). */
export const BRIDGE_DURATION = 300;

/** Engineer build speed multiplier (2x = halved timer). */
export const ENGINEER_BUILD_MULT = 2;

/** Engineer repair HP per tick. */
export const ENGINEER_REPAIR_HP = 2;

/**
 * Applies Engineer-specific build/repair overrides each frame.
 * Called from the systems runner alongside buildingSystem.
 */
export function engineerSystem(world: GameWorld): void {
  engineerBuildRepairBoost(world);
  tickBridges(world);
}

/**
 * For Engineers in Building or Repairing state, apply faster progress.
 */
function engineerBuildRepairBoost(world: GameWorld): void {
  const units = query(world.ecs, [Position, UnitStateMachine, Health, EntityTypeTag, FactionTag]);

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Engineer) continue;
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;

    if (state === UnitState.Building) {
      // Engineer builds 2x faster: extra HP tick per frame
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (
        tEnt !== -1 &&
        hasComponent(world.ecs, tEnt, Health) &&
        Health.current[tEnt] < Health.max[tEnt]
      ) {
        Health.current[tEnt] = Math.min(Health.max[tEnt], Health.current[tEnt] + 1);
        if (hasComponent(world.ecs, tEnt, Building)) {
          Building.progress[tEnt] = (Health.current[tEnt] / Health.max[tEnt]) * 100;
        }
      }
    }

    if (state === UnitState.Repairing) {
      // Engineer repairs at 2 HP per tick (extra 1 HP on top of normal)
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (
        tEnt !== -1 &&
        hasComponent(world.ecs, tEnt, Health) &&
        Health.current[tEnt] < Health.max[tEnt]
      ) {
        Health.current[tEnt] = Math.min(Health.max[tEnt], Health.current[tEnt] + 1);
      }
    }
  }
}

/**
 * Place a temporary bridge at the Engineer's position.
 * Converts Water terrain to Shallows for BRIDGE_DURATION frames.
 * Returns true if bridge was placed successfully.
 */
export function placeEngineerBridge(world: GameWorld, eid: number): boolean {
  const x = Position.x[eid];
  const y = Position.y[eid];
  const terrain = world.terrainGrid.getAt(x, y);

  if (terrain !== TerrainType.Water) return false;

  const col = world.terrainGrid.worldToCol(x);
  const row = world.terrainGrid.worldToRow(y);

  // Check for existing bridge at same tile
  for (const bridge of world.engineerBridges) {
    if (bridge.col === col && bridge.row === row) return false;
  }

  world.terrainGrid.set(col, row, TerrainType.Shallows);
  world.engineerBridges.push({
    col,
    row,
    revertFrame: world.frameCount + BRIDGE_DURATION,
    original: terrain,
  });

  // Visual feedback
  audio.engineerBridge(x);
  spawnParticle(world, x, y, 0, -1, 20, '#a78bfa', 3);
  world.floatingTexts.push({
    x,
    y: y - 20,
    text: 'Bridge!',
    color: '#a78bfa',
    life: 60,
  });

  return true;
}

/**
 * Tick down bridge timers and revert expired bridges.
 */
function tickBridges(world: GameWorld): void {
  let i = 0;
  while (i < world.engineerBridges.length) {
    const bridge = world.engineerBridges[i];
    if (world.frameCount >= bridge.revertFrame) {
      world.terrainGrid.set(bridge.col, bridge.row, bridge.original as TerrainType);
      world.engineerBridges.splice(i, 1);
    } else {
      i++;
    }
  }
}

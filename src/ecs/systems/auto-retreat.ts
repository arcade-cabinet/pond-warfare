/**
 * Auto-Retreat System
 *
 * When a player unit drops below 25% HP and auto-retreat is enabled,
 * the unit automatically retreats to the nearest friendly building.
 *
 * - Player can override retreat by issuing a new command
 * - Auto-retreat can be toggled off in settings (world.autoRetreatEnabled)
 * - Retreating units have a white flag floating text indicator
 * - Checked every 30 frames to limit CPU cost
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
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';

/** HP threshold (fraction of max) below which auto-retreat triggers. */
const RETREAT_HP_THRESHOLD = 0.25;

/**
 * Auto-retreat system. Runs every 30 frames.
 * Scans player combat units below 25% HP and switches them to Retreat state
 * targeting the nearest friendly building.
 */
export function autoRetreatSystem(world: GameWorld): void {
  if (!world.autoRetreatEnabled) return;
  if (world.frameCount % 30 !== 0) return;

  const units = query(world.ecs, [
    Position,
    Health,
    Combat,
    UnitStateMachine,
    FactionTag,
    EntityTypeTag,
  ]);

  // Gather friendly buildings for retreat targets
  const buildings: number[] = [];
  const allBuildings = query(world.ecs, [Position, Health, FactionTag, IsBuilding]);
  for (let i = 0; i < allBuildings.length; i++) {
    const bid = allBuildings[i];
    if (FactionTag.faction[bid] !== Faction.Player) continue;
    if (Health.current[bid] <= 0) continue;
    buildings.push(bid);
  }

  if (buildings.length === 0) return;

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;

    const hp = Health.current[eid];
    const maxHp = Health.max[eid];
    if (maxHp <= 0) continue;

    // Only trigger on units below threshold
    if (hp >= maxHp * RETREAT_HP_THRESHOLD) continue;

    const state = UnitStateMachine.state[eid] as UnitState;

    // Don't override if already retreating
    if (state === UnitState.Retreat) continue;

    // Don't trigger retreat from certain states (building, gathering)
    // Only retreat from combat or idle states
    if (
      state !== UnitState.Idle &&
      state !== UnitState.AttackMove &&
      state !== UnitState.Attacking &&
      state !== UnitState.Move &&
      state !== UnitState.AttackMovePatrol
    ) {
      continue;
    }

    // Find nearest friendly building
    const ux = Position.x[eid];
    const uy = Position.y[eid];
    let nearestBld = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < buildings.length; j++) {
      const bid = buildings[j];
      const dx = Position.x[bid] - ux;
      const dy = Position.y[bid] - uy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBld = bid;
      }
    }

    if (nearestBld === -1) continue;

    // Set retreat state
    UnitStateMachine.state[eid] = UnitState.Retreat;
    UnitStateMachine.targetEntity[eid] = nearestBld;
    UnitStateMachine.targetX[eid] = Position.x[nearestBld];
    UnitStateMachine.targetY[eid] = Position.y[nearestBld];

    // Visual indicator: white flag floating text
    world.floatingTexts.push({
      x: ux,
      y: uy - 30,
      text: 'RETREAT!',
      color: '#f8fafc',
      life: 60,
    });
  }
}

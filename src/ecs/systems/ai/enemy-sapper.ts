/**
 * AI System - Enemy Sapper Behavior (T10)
 *
 * Sappers pathfind to player fortifications (walls/towers) and deal 3x
 * damage to them. They ignore units entirely, focusing only on breaching
 * defensive structures. Uses Yuka steering for pathfinding.
 *
 * If no fortifications exist, sappers fall back to attacking the weakest
 * player building (same as default fighter behavior).
 */

import { hasComponent, query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { getEnemyUnitRole } from '@/ecs/systems/wave-spawner';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';
import { findNearestEntity, findPlayerFortifications, findWeakestPlayerBuilding } from './helpers';

/** How often to re-evaluate sapper targets (every 5 seconds). */
const SAPPER_RETARGET_INTERVAL = 300;

/**
 * Sapper behavior tick: target player fortifications with priority.
 * Falls back to weakest player building if no fortifications exist.
 */
export function enemySapperTick(world: GameWorld): void {
  if (world.frameCount < world.peaceTimer) return;
  if (world.frameCount % SAPPER_RETARGET_INTERVAL !== 0) return;

  const allUnits = query(world.ecs, [
    Position,
    Health,
    FactionTag,
    EntityTypeTag,
    UnitStateMachine,
  ]);

  const fortifications = findPlayerFortifications(world);

  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;

    const role = getEnemyUnitRole(eid);
    if (role !== 'sapper_enemy') continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    // Don't redirect sappers already attacking
    if (state === UnitState.Attacking) continue;

    const ex = Position.x[eid];
    const ey = Position.y[eid];

    let target: number;
    if (fortifications.length > 0) {
      target = findNearestEntity(ex, ey, fortifications);
    } else {
      // Fallback: attack weakest player building
      target = findWeakestPlayerBuilding(world);
    }

    if (target === -1) continue;

    const targetX = Position.x[target];
    const targetY = Position.y[target];

    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = targetX;
    UnitStateMachine.targetY[eid] = targetY;
    UnitStateMachine.state[eid] = UnitState.AttackMove;

    const speed = Velocity.speed[eid] || 1.0;
    world.yukaManager.addUnit(eid, ex, ey, speed, targetX, targetY);
  }
}

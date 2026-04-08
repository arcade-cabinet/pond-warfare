/**
 * AI System - Enemy Raider Behavior (T8)
 *
 * Raiders pathfind to the nearest player resource node and attack it,
 * reducing/destroying the node. They ignore player units unless attacked.
 * Uses Yuka steering for pathfinding.
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
import { getEnemyBehaviorRole } from '@/ecs/systems/wave-spawner';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';
import { findNearestEntity, findResourceNodes } from './helpers';

/** How often to re-evaluate raider targets (every 3 seconds). */
const RAIDER_RETARGET_INTERVAL = 180;

/**
 * Raider behavior tick: called from enemy-combat or AI system.
 * Raiders target the nearest resource node and attack it.
 * They only fight back if directly attacked (handled by existing combat).
 */
export function enemyRaiderTick(world: GameWorld): void {
  if (world.frameCount < world.peaceTimer) return;
  if (world.frameCount % RAIDER_RETARGET_INTERVAL !== 0) return;

  const resourceNodes = findResourceNodes(world);
  if (resourceNodes.length === 0) return;

  const allUnits = query(world.ecs, [
    Position,
    Health,
    FactionTag,
    EntityTypeTag,
    UnitStateMachine,
  ]);

  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;

    // Only affect units with raider role
    const role = getEnemyBehaviorRole(eid);
    if (role !== 'raider') continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    // Don't redirect raiders that are already attacking something
    if (state === UnitState.Attacking) continue;

    // Find nearest resource node
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const target = findNearestEntity(ex, ey, resourceNodes);
    if (target === -1) continue;

    const targetX = Position.x[target];
    const targetY = Position.y[target];

    // Send raider to attack the resource node
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = targetX;
    UnitStateMachine.targetY[eid] = targetY;
    UnitStateMachine.state[eid] = UnitState.AttackMove;

    const speed = Velocity.speed[eid] || 2.5;
    world.yukaManager.addUnit(eid, ex, ey, speed, targetX, targetY);
  }
}

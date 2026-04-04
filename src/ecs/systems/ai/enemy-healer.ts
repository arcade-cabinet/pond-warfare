/**
 * AI System - Enemy Healer Behavior (T9)
 *
 * Enemy healers pathfind to the nearest damaged enemy unit and heal them.
 * They stay behind the frontline by targeting damaged allies rather than
 * engaging player units directly. Uses Yuka steering for pathfinding.
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
import { spawnParticle } from '@/utils/particles';
import { findDamagedEnemyUnits, findNearestEntity } from './helpers';

/** How often to re-evaluate healer targets (every 2 seconds). */
const HEALER_RETARGET_INTERVAL = 120;

/** Healing range in pixels. */
const HEALER_RANGE = 80;

/** HP restored per heal tick. */
const HEAL_AMOUNT = 3;

/** Max units a healer can heal per tick. */
const MAX_HEALS = 2;

/**
 * Enemy healer behavior tick.
 * Healers move toward the nearest damaged enemy unit and heal them.
 */
export function enemyHealerTick(world: GameWorld): void {
  if (world.frameCount < world.peaceTimer) return;

  const allUnits = query(world.ecs, [
    Position,
    Health,
    FactionTag,
    EntityTypeTag,
    UnitStateMachine,
  ]);

  // Collect healers
  const healers: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    if (getEnemyUnitRole(eid) === 'healer') {
      healers.push(eid);
    }
  }

  if (healers.length === 0) return;

  // Process healing aura every frame (range-based)
  processHealerAura(world, healers);

  // Re-target movement less frequently
  if (world.frameCount % HEALER_RETARGET_INTERVAL !== 0) return;

  const damagedAllies = findDamagedEnemyUnits(world);
  if (damagedAllies.length === 0) return;

  for (const hEid of healers) {
    const state = UnitStateMachine.state[hEid] as UnitState;
    // Don't redirect if already healing (staying near target)
    if (state === UnitState.Attacking) continue;

    const hx = Position.x[hEid];
    const hy = Position.y[hEid];
    const target = findNearestEntity(hx, hy, damagedAllies);
    if (target === -1) continue;

    const tx = Position.x[target];
    const ty = Position.y[target];

    // Move toward damaged ally (stay behind frontline)
    UnitStateMachine.targetEntity[hEid] = target;
    UnitStateMachine.targetX[hEid] = tx;
    UnitStateMachine.targetY[hEid] = ty;
    UnitStateMachine.state[hEid] = UnitState.Move;

    const speed = Velocity.speed[hEid] || 1.5;
    world.yukaManager.addEnemy(hEid, hx, hy, speed, tx, ty);
  }
}

/** Heal nearby damaged enemy allies within range (aura effect). */
function processHealerAura(world: GameWorld, healers: number[]): void {
  // Only process every 60 frames for performance
  if (world.frameCount % 60 !== 0) return;

  const rangeSq = HEALER_RANGE * HEALER_RANGE;

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  for (const hEid of healers) {
    const hx = Position.x[hEid];
    const hy = Position.y[hEid];
    let healed = 0;

    for (let i = 0; i < allUnits.length; i++) {
      if (healed >= MAX_HEALS) break;
      const tEid = allUnits[i];
      if (tEid === hEid) continue;
      if (FactionTag.faction[tEid] !== Faction.Enemy) continue;
      if (hasComponent(world.ecs, tEid, IsBuilding)) continue;
      if (hasComponent(world.ecs, tEid, IsResource)) continue;
      if (Health.current[tEid] <= 0) continue;
      if (Health.current[tEid] >= Health.max[tEid]) continue;

      const dx = Position.x[tEid] - hx;
      const dy = Position.y[tEid] - hy;
      if (dx * dx + dy * dy > rangeSq) continue;

      Health.current[tEid] = Math.min(Health.max[tEid], Health.current[tEid] + HEAL_AMOUNT);
      healed++;

      // Green heal particle
      spawnParticle(
        world,
        Position.x[tEid],
        Position.y[tEid] - 10,
        (Math.random() - 0.5) * 1,
        -Math.random() * 1.5,
        20,
        '#4ade80',
        3,
      );
    }
  }
}

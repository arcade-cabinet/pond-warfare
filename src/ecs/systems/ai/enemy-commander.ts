/**
 * AI System - Enemy Commander
 *
 * Controls the enemy Commander boss entity:
 * - Moves toward nearest player unit or Lodge when targets are visible
 * - Uses AoE ability periodically (damage around self)
 * - Stays near enemy Lodge area when no targets are in range
 * - Applies damage aura buff to nearby enemy units
 */

import { hasComponent, query } from 'bitecs';
import {
  Combat,
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';
import { findNearestEntity, findPlayerLodge, getEnemyNests } from './helpers';

/** Vision range for detecting player units. */
const DETECTION_RANGE = 400;

/** How close to home position before idling. */
const HOME_THRESHOLD = 80;

/** Check for targets every N frames. */
const DECISION_INTERVAL = 30;

/** Find all alive player units (non-building, non-resource). */
function findPlayerUnits(world: GameWorld): number[] {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const result: number[] = [];
  for (let i = 0; i < all.length; i++) {
    const eid = all[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    result.push(eid);
  }
  return result;
}

/** Get the home position (nearest enemy nest) for the commander. */
function getHomePosition(world: GameWorld, cmdEid: number): { x: number; y: number } {
  const nests = getEnemyNests(world);
  if (nests.length > 0) {
    const nearest = findNearestEntity(Position.x[cmdEid], Position.y[cmdEid], nests);
    if (nearest !== -1) return { x: Position.x[nearest], y: Position.y[nearest] };
  }
  // Fallback: stay where spawned
  return { x: Position.x[cmdEid], y: Position.y[cmdEid] };
}

/** AoE ability: deal damage to all player units in radius around commander. */
function useAoEAbility(world: GameWorld, cmdEid: number): void {
  const cx = Position.x[cmdEid];
  const cy = Position.y[cmdEid];
  const auraRadius = Commander.auraRadius[cmdEid] || 150;
  const dmg = Combat.damage[cmdEid];

  const candidates = world.spatialHash
    ? world.spatialHash.query(cx, cy, auraRadius)
    : query(world.ecs, [Position, Health, FactionTag]);

  let hitCount = 0;
  for (let i = 0; i < candidates.length; i++) {
    const t = candidates[i];
    if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
      continue;
    if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;

    const dx = Position.x[t] - cx;
    const dy = Position.y[t] - cy;
    if (Math.sqrt(dx * dx + dy * dy) > auraRadius) continue;

    takeDamage(world, t, dmg, cmdEid);
    hitCount++;
  }

  // Visual: shockwave particles
  if (hitCount > 0) {
    for (let j = 0; j < 12; j++) {
      const angle = (j / 12) * Math.PI * 2;
      world.particles.push({
        x: cx + Math.cos(angle) * 20,
        y: cy + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 20,
        color: '#ef4444',
        size: 4,
      });
    }
    world.floatingTexts.push({
      x: cx,
      y: cy - 30,
      text: 'COMMANDER STRIKE!',
      color: '#ef4444',
      life: 60,
    });
  }
}

/** Main enemy commander AI tick. */
export function enemyCommanderTick(world: GameWorld): void {
  const cmdEid = world.enemyCommanderEntityId;
  if (cmdEid < 0) return;
  if (Health.current[cmdEid] <= 0) return;

  // AoE ability on cooldown timer
  if (Commander.abilityTimer[cmdEid] <= 0) {
    const playerUnits = findPlayerUnits(world);
    const cx = Position.x[cmdEid];
    const cy = Position.y[cmdEid];
    const auraRadius = Commander.auraRadius[cmdEid] || 150;

    // Only fire ability if player units are nearby
    let hasNearby = false;
    for (let i = 0; i < playerUnits.length; i++) {
      const dx = Position.x[playerUnits[i]] - cx;
      const dy = Position.y[playerUnits[i]] - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
        hasNearby = true;
        break;
      }
    }

    if (hasNearby) {
      useAoEAbility(world, cmdEid);
      Commander.abilityTimer[cmdEid] = Commander.abilityCooldown[cmdEid] || 600;
    }
  } else {
    Commander.abilityTimer[cmdEid]--;
  }

  // Movement decisions at interval
  if (world.frameCount % DECISION_INTERVAL !== 0) return;

  const cx = Position.x[cmdEid];
  const cy = Position.y[cmdEid];
  const state = UnitStateMachine.state[cmdEid] as UnitState;

  // Find nearest player target within detection range
  const playerUnits = findPlayerUnits(world);
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid !== -1) playerUnits.push(lodgeEid);

  let nearestTarget = -1;
  let nearestDist = Infinity;
  for (let i = 0; i < playerUnits.length; i++) {
    const dx = Position.x[playerUnits[i]] - cx;
    const dy = Position.y[playerUnits[i]] - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestTarget = playerUnits[i];
    }
  }

  if (nearestTarget !== -1 && nearestDist <= DETECTION_RANGE) {
    // Pursue target
    const tx = Position.x[nearestTarget];
    const ty = Position.y[nearestTarget];
    UnitStateMachine.targetEntity[cmdEid] = nearestTarget;
    UnitStateMachine.targetX[cmdEid] = tx;
    UnitStateMachine.targetY[cmdEid] = ty;
    UnitStateMachine.state[cmdEid] = UnitState.AttackMove;

    const speed = Velocity.speed[cmdEid] || 1.0;
    world.yukaManager.addEnemy(cmdEid, cx, cy, speed, tx, ty);
  } else if (state === UnitState.Idle || state === UnitState.AttackMove) {
    // Return home when no targets
    const home = getHomePosition(world, cmdEid);
    const dx = home.x - cx;
    const dy = home.y - cy;
    const distHome = Math.sqrt(dx * dx + dy * dy);

    if (distHome > HOME_THRESHOLD) {
      UnitStateMachine.targetEntity[cmdEid] = -1;
      UnitStateMachine.targetX[cmdEid] = home.x;
      UnitStateMachine.targetY[cmdEid] = home.y;
      UnitStateMachine.state[cmdEid] = UnitState.Move;

      const speed = Velocity.speed[cmdEid] || 1.0;
      world.yukaManager.addEnemy(cmdEid, cx, cy, speed, home.x, home.y);
    }
  }
}

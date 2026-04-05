/**
 * Evolution System Helpers
 *
 * Shared utilities for spawning, targeting, and particle effects
 * used by mega-wave and random event sub-modules.
 */

import { hasComponent } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Combat,
  EntityTypeTag,
  Health,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, UnitState } from '@/types';
import type { SeededRandom } from '@/utils/random';

/** Pick a random unit kind from the unlocked list. */
export function pickRandomUnlocked(rng: SeededRandom, unlockedUnits: EntityKind[]): EntityKind {
  return unlockedUnits[Math.floor(rng.next() * unlockedUnits.length)];
}

/** Send an entity to attack-move toward a target entity. */
export function sendToTarget(world: GameWorld, eid: number, targetEid: number): void {
  UnitStateMachine.targetEntity[eid] = targetEid;
  UnitStateMachine.targetX[eid] = Position.x[targetEid];
  UnitStateMachine.targetY[eid] = Position.y[targetEid];
  UnitStateMachine.state[eid] = UnitState.AttackMove;

  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
  world.yukaManager.addUnit(
    eid,
    Position.x[eid],
    Position.y[eid],
    speed,
    Position.x[targetEid],
    Position.y[targetEid],
  );
}

/** Send an entity to attack-move toward a world position. */
export function sendToPosition(world: GameWorld, eid: number, tx: number, ty: number): void {
  UnitStateMachine.targetX[eid] = tx;
  UnitStateMachine.targetY[eid] = ty;
  UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
  UnitStateMachine.hasAttackMoveTarget[eid] = 1;
  UnitStateMachine.attackMoveTargetX[eid] = tx;
  UnitStateMachine.attackMoveTargetY[eid] = ty;

  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
  world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, tx, ty);
}

/** Spawn dust particles around a spawn point. */
export function spawnDustParticles(world: GameWorld, sx: number, sy: number): void {
  for (let j = 0; j < 6; j++) {
    const angle = (j / 6) * Math.PI * 2;
    world.particles.push({
      x: sx,
      y: sy + 8,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 0.5 + 0.5,
      life: 15,
      color: '#a8a29e',
      size: 2,
    });
  }
}

/** Mark an entity as a champion variant: +50% HP, +25% damage. */
export function markAsChampion(world: GameWorld, eid: number): void {
  world.championEnemies.add(eid);

  const hpBoost = Math.round(Health.max[eid] * 0.5);
  Health.max[eid] += hpBoost;
  Health.current[eid] += hpBoost;

  if (hasComponent(world.ecs, eid, Combat)) {
    Combat.damage[eid] = Math.round(Combat.damage[eid] * 1.25);
  }

  world.floatingTexts.push({
    x: Position.x[eid],
    y: Position.y[eid] - 30,
    text: 'CHAMPION!',
    color: '#a855f7',
    life: 90,
  });
}
